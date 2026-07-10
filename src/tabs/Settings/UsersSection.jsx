import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";
import { getWorkspaceMembers, addWorkspaceMember, updateWorkspaceMember, removeWorkspaceMember } from "../../lib/storage-new.js";
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, onSnapshot, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const ROLE_ORDER = ["Owner", "Admin", "Staff", "Viewer"];
const SENSITIVE_ROLES = ["Owner", "Admin"];
const INVITE_EXPIRY_DAYS = 7;

const ROLE_META = {
  Owner:  { label: "OWNER",   bg: "var(--accent)", canEdit: false },
  Admin:  { label: "ADMINS",  bg: "#8b5cf6",       canEdit: true  },
  Staff:  { label: "STAFF",   bg: "#3b82f6",       canEdit: true  },
  Viewer: { label: "VIEWERS", bg: "#64748b",       canEdit: true  },
};

const ROLE_PERMISSIONS = [
  { role: "Owner",  permissions: ["Manage workspaces", "Manage users", "Delete workspace", "All data access", "Settings"] },
  { role: "Admin",  permissions: ["Manage most data", "Settings", "All data access"] },
  { role: "Staff",  permissions: ["Add/edit contacts", "Tasks & notes", "Communications"] },
  { role: "Viewer", permissions: ["Read-only access"] },
];

const ALL_PERMISSIONS = [
  "Manage workspaces", "Manage users", "Delete workspace", "All data access",
  "Settings", "Manage most data", "Add/edit contacts", "Tasks & notes",
  "Communications", "Read-only access",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(member) {
  const name = member.displayName || member.email || "";
  const parts = name.split(/[\s@]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function memberMatchesSearch(member, search) {
  const s = search.toLowerCase();
  return (
    (member.displayName || "").toLowerCase().includes(s) ||
    (member.email || "").toLowerCase().includes(s)
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntilExpiry(invitedAt) {
  if (!invitedAt) return null;
  const expires = new Date(invitedAt).getTime() + INVITE_EXPIRY_DAYS * 86400000;
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
}

function exportMembersToCSV(members, workspaceName) {
  const headers = ["Name", "Email", "Role", "Status", "Joined"];
  const rows = members.map(m => [
    m.displayName || "",
    m.email || "",
    m.role || "",
    m.active === false ? "Inactive" : "Active",
    m.joinedAt ? formatDate(m.joinedAt) : "",
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${workspaceName || "workspace"}-members.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeActivityLog(workspaceId, actorId, actorEmail, action, targetEmail, meta = {}) {
  try {
    await addDoc(collection(db, "workspaces", workspaceId, "activityLog"), {
      actorId, actorEmail, action, targetEmail,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("Activity log write failed:", e);
  }
}

// ─── RoleConfirmModal ─────────────────────────────────────────────────────────
function RoleConfirmModal({ fromRole, toRole, memberEmail, onConfirm, onCancel }) {
  const isElevating = ROLE_ORDER.indexOf(toRole) < ROLE_ORDER.indexOf(fromRole);
  const isDemoting = !isElevating;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-primary)", borderRadius: 12, padding: 24,
          maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          {isElevating ? "⚠️ Elevating to sensitive role" : "Change role"}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
          You're changing <strong>{memberEmail}</strong> from <strong>{fromRole}</strong> to <strong>{toRole}</strong>.
          {isElevating && SENSITIVE_ROLES.includes(toRole) && (
            <span> This grants <strong>elevated permissions</strong> including the ability to manage other users and workspace settings.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={{ ...btnStyle("ghost"), padding: "6px 16px" }} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...btnStyle("primary"), padding: "6px 16px", background: isElevating ? "#f59e0b" : undefined }}
            onClick={onConfirm}
          >
            Confirm change
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MemberDrawer ─────────────────────────────────────────────────────────────
function MemberDrawer({ member, currentWorkspaceId, onClose, onChangeRole, onToggleActive, onRemove }) {
  const [activityLog, setActivityLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const canEdit = ROLE_META[member.role]?.canEdit ?? true;

  useEffect(() => {
    if (!currentWorkspaceId || !member.email) { setLogLoading(false); return; }
    const logRef = collection(db, "workspaces", currentWorkspaceId, "activityLog");
    const q = query(logRef, where("targetEmail", "==", member.email), orderBy("timestamp", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => {
      setActivityLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLogLoading(false);
    }, () => setLogLoading(false));
    return () => unsub();
  }, [currentWorkspaceId, member.email]);

  // Trap focus & close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const bg = ROLE_META[member.role]?.bg || "#64748b";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 900 }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
        background: "var(--bg-primary)", zIndex: 901,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Drawer header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: member.active === false ? "#94a3b8" : bg,
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 20, flexShrink: 0,
          }}>
            {getInitials(member)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {member.displayName || member.email}
            </div>
            {member.displayName && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{member.email}</div>
            )}
          </div>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-muted)", padding: 4, lineHeight: 1 }}
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Status row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: ROLE_META[member.role]?.bg || "#64748b", color: "white",
            }}>{member.role}</span>
            <span style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: member.active !== false ? "#22c55e" : "#94a3b8", color: "white",
            }}>{member.active !== false ? "Active" : "Inactive"}</span>
          </div>

          {/* Details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>DETAILS</div>
            {[
              ["Email", member.email],
              ["Display name", member.displayName || "—"],
              ["Joined", formatDate(member.joinedAt || member.invitedAt)],
              ["Invited by", member.invitedBy || "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontWeight: 500, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {canEdit && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>ACTIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  style={{ ...btnStyle("ghost"), textAlign: "left", padding: "8px 12px", fontSize: 13 }}
                  onClick={() => { onToggleActive(member.userId, member.active !== false); onClose(); }}
                >
                  {member.active !== false ? "Deactivate user" : "Activate user"}
                </button>
                {confirmRemove ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{ ...btnStyle("ghost"), flex: 1, padding: "8px 12px", fontSize: 13, color: "#ef4444", borderColor: "#ef4444" }}
                      onClick={() => { onRemove(member.userId); onClose(); }}
                    >
                      Confirm remove
                    </button>
                    <button
                      style={{ ...btnStyle("ghost"), padding: "8px 12px", fontSize: 13 }}
                      onClick={() => setConfirmRemove(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    style={{ ...btnStyle("ghost"), textAlign: "left", padding: "8px 12px", fontSize: 13, color: "#ef4444", borderColor: "#ef4444" }}
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remove from workspace
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Activity log */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>ACTIVITY</div>
            {logLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
            ) : activityLog.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No activity recorded yet.</div>
            ) : (
              activityLog.map(entry => (
                <div key={entry.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>{entry.action}</div>
                  <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                    {formatDate(entry.timestamp)} · by {entry.actorEmail || "system"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ member, size = 32 }) {
  const initials = getInitials(member);
  const bg = ROLE_META[member.role]?.bg || "#64748b";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: member.active === false ? "#94a3b8" : bg,
      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, userSelect: "none",
    }}
      title={member.displayName || member.email}
    >
      {initials}
    </div>
  );
}

// ─── RoleBadge / ActiveBadge ──────────────────────────────────────────────────
function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { bg: "#64748b" };
  return (
    <span style={{ padding: "3px 8px", background: meta.bg, color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em" }}>
      {role}
    </span>
  );
}

function ActiveBadge({ active }) {
  return (
    <span style={{ padding: "3px 8px", background: active ? "#22c55e" : "#94a3b8", color: "white", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── MemberRow ────────────────────────────────────────────────────────────────
function MemberRow({ member, selected, onSelect, onOpenDrawer, onChangeRole, onToggleActive, onRemove }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const canEdit = ROLE_META[member.role]?.canEdit ?? true;

  return (
    <div
      style={{
        padding: "10px 14px", background: selected ? "var(--bg-tertiary, var(--bg-secondary))" : "var(--bg-secondary)",
        borderRadius: 8, marginBottom: 8,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: member.active === false ? 0.55 : 1,
        transition: "opacity 0.2s, background 0.15s",
        outline: selected ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      {/* Identity — click opens drawer */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}
        onClick={onOpenDrawer}
        title="View profile"
      >
        <Avatar member={member} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>
            {member.displayName || member.email}
          </div>
          {member.displayName && (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{member.email}</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
        <ActiveBadge active={member.active !== false} />

        {/* Checkbox for bulk select (non-owners only) */}
        {canEdit && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            style={{ cursor: "pointer", accentColor: "var(--accent)", width: 14, height: 14 }}
            title="Select"
          />
        )}

        {canEdit ? (
          <>
            <select
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}
              value={member.role}
              onChange={(e) => onChangeRole(member.userId, e.target.value, member.role)}
            >
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
              <option value="Viewer">Viewer</option>
            </select>

            <button
              style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }}
              onClick={() => onToggleActive(member.userId, member.active !== false)}
            >
              {member.active !== false ? "Deactivate" : "Activate"}
            </button>

            {confirmRemove ? (
              <>
                <button
                  style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12, color: "#ef4444", borderColor: "#ef4444" }}
                  onClick={() => { onRemove(member.userId); setConfirmRemove(false); }}
                >
                  Sure?
                </button>
                <button
                  style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }}
                onClick={() => setConfirmRemove(true)}
              >
                Remove
              </button>
            )}
          </>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>
    </div>
  );
}

// ─── MemberGroup ──────────────────────────────────────────────────────────────
function MemberGroup({ role, members, selectedIds, onSelect, onOpenDrawer, onChangeRole, onToggleActive, onRemove }) {
  const meta = ROLE_META[role];
  const emptyLabels = { Owner: "No owner assigned", Admin: "No admins", Staff: "No staff members", Viewer: "No viewers" };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
        {meta.label}
        {members.length > 0 && (
          <span style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "1px 7px", fontWeight: 600, fontSize: 11 }}>
            {members.length}
          </span>
        )}
      </div>
      {members.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>{emptyLabels[role]}</div>
      ) : (
        members.map(member => (
          <MemberRow
            key={member.userId}
            member={member}
            selected={selectedIds.has(member.userId)}
            onSelect={() => onSelect(member.userId)}
            onOpenDrawer={() => onOpenDrawer(member)}
            onChangeRole={onChangeRole}
            onToggleActive={onToggleActive}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );
}

// ─── BulkActionBar ────────────────────────────────────────────────────────────
function BulkActionBar({ count, onDeactivate, onActivate, onRemove, onClear }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "10px 14px", background: "var(--accent)", borderRadius: 8, marginBottom: 16, color: "white",
    }}>
      <span style={{ fontWeight: 600, fontSize: 13, marginRight: 4 }}>{count} selected</span>
      <button style={{ ...btnStyle("ghost"), padding: "4px 12px", fontSize: 12, color: "white", borderColor: "rgba(255,255,255,0.4)" }} onClick={onActivate}>Activate all</button>
      <button style={{ ...btnStyle("ghost"), padding: "4px 12px", fontSize: 12, color: "white", borderColor: "rgba(255,255,255,0.4)" }} onClick={onDeactivate}>Deactivate all</button>
      {confirmRemove ? (
        <>
          <button style={{ ...btnStyle("ghost"), padding: "4px 12px", fontSize: 12, color: "#fca5a5", borderColor: "#fca5a5" }} onClick={() => { onRemove(); setConfirmRemove(false); }}>Remove {count}?</button>
          <button style={{ ...btnStyle("ghost"), padding: "4px 12px", fontSize: 12, color: "white", borderColor: "rgba(255,255,255,0.4)" }} onClick={() => setConfirmRemove(false)}>Cancel</button>
        </>
      ) : (
        <button style={{ ...btnStyle("ghost"), padding: "4px 12px", fontSize: 12, color: "#fca5a5", borderColor: "#fca5a5" }} onClick={() => setConfirmRemove(true)}>Remove all</button>
      )}
      <button style={{ marginLeft: "auto", background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1 }} onClick={onClear} title="Clear selection">×</button>
    </div>
  );
}

// ─── ActivityLog ──────────────────────────────────────────────────────────────
function ActivityLog({ currentWorkspaceId }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    const logRef = collection(db, "workspaces", currentWorkspaceId, "activityLog");
    const q = query(logRef, orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      setLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentWorkspaceId]);

  const visible = expanded ? log : log.slice(0, 5);

  return (
    <SectionCard style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Activity Log</div>
        {log.length > 5 && (
          <button style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }} onClick={() => setExpanded(p => !p)}>
            {expanded ? "Show less" : `Show all ${log.length}`}
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      ) : log.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No activity recorded yet.</div>
      ) : (
        <div>
          {visible.map((entry, i) => (
            <div key={entry.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 0", borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--bg-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}>
                {entry.action?.includes("added") ? "➕" :
                 entry.action?.includes("removed") ? "➖" :
                 entry.action?.includes("role") ? "🔄" :
                 entry.action?.includes("activated") ? "✅" :
                 entry.action?.includes("deactivated") ? "⏸️" :
                 entry.action?.includes("invited") ? "📧" : "📋"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{entry.action}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {formatDate(entry.timestamp)} · {entry.actorEmail || "system"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ─── PendingInvites ───────────────────────────────────────────────────────────
function PendingInvites({ currentWorkspaceId, currentUser, members }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(null);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    const invitesRef = collection(db, "workspaces", currentWorkspaceId, "invites");
    const q = query(invitesRef, where("status", "==", "pending"));
    const unsub = onSnapshot(q, snap => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentWorkspaceId]);

  const handleRevoke = async (inviteId, email) => {
    try {
      await deleteDoc(doc(db, "workspaces", currentWorkspaceId, "invites", inviteId));
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Revoked invite for ${email}`, email);
      toast(`Invite to ${email} revoked`);
    } catch (err) {
      console.error("Failed to revoke invite:", err);
      toast("Failed to revoke invite", "error");
    }
  };

  const handleResend = async (invite) => {
    setResending(invite.id);
    try {
      // Update invitedAt to reset expiry, mark as resent
      await updateDoc(doc(db, "workspaces", currentWorkspaceId, "invites", invite.id), {
        invitedAt: new Date().toISOString(),
        resentAt: new Date().toISOString(),
        resentBy: currentUser?.uid || "system",
      });
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Resent invite to ${invite.email}`, invite.email);
      toast(`Invite resent to ${invite.email}`, "success");
    } catch (err) {
      console.error("Failed to resend invite:", err);
      toast("Failed to resend invite", "error");
    } finally {
      setResending(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <SectionCard style={{ marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        Pending Invites
        <span style={{ background: "#f59e0b", color: "white", borderRadius: 10, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
          {invites.length}
        </span>
      </div>
      {invites.map(invite => {
        const daysLeft = daysUntilExpiry(invite.invitedAt);
        const isExpired = daysLeft === 0;
        const isExpiringSoon = daysLeft !== null && daysLeft <= 2 && !isExpired;

        return (
          <div key={invite.id} style={{
            padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 8,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderLeft: `3px solid ${isExpired ? "#ef4444" : isExpiringSoon ? "#f59e0b" : "#f59e0b"}`,
            opacity: isExpired ? 0.7 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#f59e0b22", border: "2px dashed #f59e0b",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#f59e0b", flexShrink: 0,
              }}>?</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{invite.email}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  Invited {formatDate(invite.invitedAt)}
                  {invite.resentAt && <span> · Resent {formatDate(invite.resentAt)}</span>}
                  {daysLeft !== null && (
                    <span style={{ marginLeft: 6, color: isExpired ? "#ef4444" : isExpiringSoon ? "#f59e0b" : "inherit", fontWeight: isExpired || isExpiringSoon ? 600 : 400 }}>
                      · {isExpired ? "Expired" : `Expires in ${daysLeft}d`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <RoleBadge role={invite.role} />
              <span style={{ padding: "3px 8px", background: isExpired ? "#ef444422" : "#f59e0b22", color: isExpired ? "#ef4444" : "#f59e0b", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                {isExpired ? "Expired" : "Pending"}
              </span>
              <button
                style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }}
                onClick={() => handleResend(invite)}
                disabled={resending === invite.id}
                title="Reset expiry and resend"
              >
                {resending === invite.id ? "Sending…" : "Resend"}
              </button>
              <button
                style={{ ...btnStyle("ghost"), padding: "4px 10px", fontSize: 12 }}
                onClick={() => handleRevoke(invite.id, invite.email)}
              >
                Revoke
              </button>
            </div>
          </div>
        );
      })}
    </SectionCard>
  );
}

// ─── AddUserForm ──────────────────────────────────────────────────────────────
function AddUserForm({ members, currentUser, currentWorkspaceId, onSuccess, onCancel }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) { toast("Please enter an email address", "error"); return; }
    if (!EMAIL_RE.test(email)) { toast("Please enter a valid email address", "error"); return; }
    if (members.some(m => m.email === email)) { toast("This user is already a member", "error"); return; }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const invitesRef = collection(db, "workspaces", currentWorkspaceId, "invites");
        await addDoc(invitesRef, {
          email, role,
          invitedBy: currentUser?.email || "system",
          invitedAt: new Date().toISOString(),
          status: "pending",
        });
        await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Invited ${email} as ${role}`, email, { role });
        toast(`Invite sent to ${email}. They'll be added when they sign up.`, "success");
        onSuccess(null);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userId = userDoc.data().uid;
      const displayName = userDoc.data().displayName || email.split("@")[0];

      await addWorkspaceMember(currentWorkspaceId, userId, {
        email, displayName, role, permissions: null,
        invitedBy: currentUser?.email || "system",
        joinedAt: new Date().toISOString(),
      });
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Added ${email} as ${role}`, email, { role });

      toast(`${email} added as ${role}`, "success");
      onSuccess({ userId, email, displayName, role, active: true });
    } catch (err) {
      console.error("Failed to add user:", err);
      toast("Failed to add user: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, background: "var(--bg-secondary)", borderRadius: 8, marginTop: 16 }}>
      <FormField label="User Email">
        <input
          style={inputStyle} type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="user@example.com" autoFocus
        />
      </FormField>
      <FormField label="Role">
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="Admin">Admin</option>
          <option value="Staff">Staff</option>
          <option value="Viewer">Viewer</option>
        </select>
      </FormField>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button style={btnStyle("primary")} onClick={handleSubmit} disabled={loading}>{loading ? "Adding…" : "Add User"}</button>
        <button style={btnStyle("ghost")} onClick={onCancel} disabled={loading}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UsersSection({ workspaces, currentWorkspaceId, updateWorkspace, user: currentUser }) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drawerMember, setDrawerMember] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { userId, fromRole, toRole, email }

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  const loadMembers = useCallback(async () => {
    if (!currentWorkspaceId) return;
    setLoading(true);
    try {
      const workspaceMembers = await getWorkspaceMembers(currentWorkspaceId);
      setMembers(workspaceMembers);
    } catch (error) {
      console.error("Failed to load members:", error);
      toast("Failed to load workspace members", "error");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    loadMembers();
    setSelectedIds(new Set());
    setSearch("");
    setDrawerMember(null);
  }, [loadMembers]);

  // ── Filtered view ──────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => members.filter(m => {
    if (search && !memberMatchesSearch(m, search)) return false;
    if (filterRole !== "All" && m.role !== filterRole) return false;
    if (filterStatus === "Active" && m.active === false) return false;
    if (filterStatus === "Inactive" && m.active !== false) return false;
    return true;
  }), [members, search, filterRole, filterStatus]);

  const grouped = useMemo(() => ROLE_ORDER.reduce((acc, role) => {
    acc[role] = filteredMembers.filter(m => m.role === role);
    return acc;
  }, {}), [filteredMembers]);

  const isFiltering = search || filterRole !== "All" || filterStatus !== "All";

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (userId) => {
    const member = members.find(m => m.userId === userId);
    if (member?.role === "Owner") return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChangeRole = async (userId, newRole, fromRole) => {
    // Require confirmation when changing to or from a sensitive role
    if (SENSITIVE_ROLES.includes(newRole) || SENSITIVE_ROLES.includes(fromRole)) {
      const member = members.find(m => m.userId === userId);
      setPendingRoleChange({ userId, fromRole, toRole: newRole, email: member?.email });
      return;
    }
    await commitRoleChange(userId, newRole, fromRole);
  };

  const commitRoleChange = async (userId, newRole, fromRole) => {
    const member = members.find(m => m.userId === userId);
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    if (drawerMember?.userId === userId) setDrawerMember(prev => ({ ...prev, role: newRole }));
    try {
      await updateWorkspaceMember(currentWorkspaceId, userId, { role: newRole });
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Changed ${member?.email} role from ${fromRole} to ${newRole}`, member?.email, { fromRole, toRole: newRole });
      toast(`Role changed to ${newRole}`);
    } catch (error) {
      console.error("Failed to change role:", error);
      toast("Failed to change role", "error");
      loadMembers();
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    const next = !currentActive;
    const member = members.find(m => m.userId === userId);
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, active: next } : m));
    if (drawerMember?.userId === userId) setDrawerMember(prev => ({ ...prev, active: next }));
    try {
      await updateWorkspaceMember(currentWorkspaceId, userId, { active: next });
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `${next ? "Activated" : "Deactivated"} ${member?.email}`, member?.email);
      toast(`User ${next ? "activated" : "deactivated"}`);
    } catch (error) {
      console.error("Failed to toggle active status:", error);
      toast("Failed to update user status", "error");
      loadMembers();
    }
  };

  const handleRemoveUser = async (userId) => {
    const member = members.find(m => m.userId === userId);
    setMembers(prev => prev.filter(m => m.userId !== userId));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
    if (drawerMember?.userId === userId) setDrawerMember(null);
    try {
      await removeWorkspaceMember(currentWorkspaceId, userId);
      await writeActivityLog(currentWorkspaceId, currentUser?.uid, currentUser?.email, `Removed ${member?.email} from workspace`, member?.email);
      toast("User removed from workspace");
    } catch (error) {
      console.error("Failed to remove user:", error);
      toast("Failed to remove user", "error");
      loadMembers();
    }
  };

  // ── Bulk handlers ──────────────────────────────────────────────────────────
  const handleBulkActivate = async () => {
    const ids = [...selectedIds];
    setMembers(prev => prev.map(m => ids.includes(m.userId) ? { ...m, active: true } : m));
    await Promise.allSettled(ids.map(id => updateWorkspaceMember(currentWorkspaceId, id, { active: true })));
    toast(`${ids.length} user(s) activated`);
    clearSelection();
  };

  const handleBulkDeactivate = async () => {
    const ids = [...selectedIds];
    setMembers(prev => prev.map(m => ids.includes(m.userId) ? { ...m, active: false } : m));
    await Promise.allSettled(ids.map(id => updateWorkspaceMember(currentWorkspaceId, id, { active: false })));
    toast(`${ids.length} user(s) deactivated`);
    clearSelection();
  };

  const handleBulkRemove = async () => {
    const ids = [...selectedIds];
    setMembers(prev => prev.filter(m => !ids.includes(m.userId)));
    clearSelection();
    await Promise.allSettled(ids.map(id => removeWorkspaceMember(currentWorkspaceId, id)));
    toast(`${ids.length} user(s) removed`);
  };

  const handleAddSuccess = (newMember) => {
    if (newMember) setMembers(prev => [...prev, newMember]);
    setShowAddUser(false);
  };

  if (!currentWorkspace) return <div style={{ padding: 20 }}>No workspace selected</div>;

  return (
    <div>
      {/* Role change confirmation modal */}
      {pendingRoleChange && (
        <RoleConfirmModal
          fromRole={pendingRoleChange.fromRole}
          toRole={pendingRoleChange.toRole}
          memberEmail={pendingRoleChange.email}
          onConfirm={() => {
            commitRoleChange(pendingRoleChange.userId, pendingRoleChange.toRole, pendingRoleChange.fromRole);
            setPendingRoleChange(null);
          }}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}

      {/* Member detail drawer */}
      {drawerMember && (
        <MemberDrawer
          member={drawerMember}
          currentWorkspaceId={currentWorkspaceId}
          onClose={() => setDrawerMember(null)}
          onChangeRole={handleChangeRole}
          onToggleActive={handleToggleActive}
          onRemove={handleRemoveUser}
        />
      )}

      <SectionCard>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Workspace Members
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
              {loading ? "Loading…" : `${members.length} total`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...btnStyle("ghost"), padding: "6px 12px", fontSize: 12 }}
              onClick={() => exportMembersToCSV(members, currentWorkspace?.name)}
              title="Export members to CSV"
              disabled={members.length === 0}
            >
              ↓ Export CSV
            </button>
            {!showAddUser && (
              <button style={btnStyle("primary")} onClick={() => setShowAddUser(true)}>+ Add User</button>
            )}
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 160, padding: "6px 10px", fontSize: 13 }}
            type="search" placeholder="Search members…" value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="All">All roles</option>
            {ROLE_ORDER.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {isFiltering && (
            <button style={{ ...btnStyle("ghost"), padding: "6px 10px", fontSize: 12 }} onClick={() => { setSearch(""); setFilterRole("All"); setFilterStatus("All"); }}>Clear</button>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onRemove={handleBulkRemove}
            onClear={clearSelection}
          />
        )}

        {isFiltering && filteredMembers.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 16 }}>No members match your filters.</div>
        )}

        {ROLE_ORDER.map(role => (
          <MemberGroup
            key={role}
            role={role}
            members={grouped[role]}
            selectedIds={selectedIds}
            onSelect={toggleSelect}
            onOpenDrawer={setDrawerMember}
            onChangeRole={handleChangeRole}
            onToggleActive={handleToggleActive}
            onRemove={handleRemoveUser}
          />
        ))}

        {showAddUser && (
          <AddUserForm
            members={members}
            currentUser={currentUser}
            currentWorkspaceId={currentWorkspaceId}
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddUser(false)}
          />
        )}
      </SectionCard>

      <PendingInvites currentWorkspaceId={currentWorkspaceId} currentUser={currentUser} members={members} />

      <ActivityLog currentWorkspaceId={currentWorkspaceId} />

      {/* Role Permissions */}
      <SectionCard style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Role Permissions</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 10px", color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Permission</th>
                {ROLE_ORDER.map(role => (
                  <th key={role} style={{ textAlign: "center", padding: "6px 10px", color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map(perm => (
                <tr key={perm}>
                  <td style={{ padding: "6px 10px", color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>{perm}</td>
                  {ROLE_ORDER.map(role => {
                    const has = ROLE_PERMISSIONS.find(r => r.role === role)?.permissions.includes(perm);
                    return (
                      <td key={role} style={{ textAlign: "center", padding: "6px 10px", borderBottom: "1px solid var(--border)", color: has ? "#22c55e" : "var(--text-muted)" }}>
                        {has ? "✓" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
