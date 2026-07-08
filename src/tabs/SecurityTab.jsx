import { useState } from "react";
import { Badge, Modal, Confirm, FormField, SectionCard, CollapsibleSection, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { fmtDate } from "../lib/helpers.js";
import { saveLS, loadLS } from "../lib/storage.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { changePassword, checkPasswordStrength, registerPasskey, removePasskey as removePasskeyAuth, isPasskeySupported } from "../lib/auth.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SECURITY — 8 subtabs
// ══════════════════════════════════════════════════════════════════════════════

const SUBTABS = [
  { id: "overview",    label: "Overview" },
  { id: "password",    label: "Login & Password" },
  { id: "passkeys",    label: "Passkeys" },
  { id: "session",     label: "Session & Lock" },
  { id: "roles",       label: "Roles & Permissions" },
  { id: "sensitive",   label: "Sensitive Actions" },
  { id: "dataprotect", label: "Data Protection" },
  { id: "activity",    label: "Activity & Risk" },
];

export default function SecurityTab({ settings, setSettings, workspaceId = "workspace-1" }) {
  const [activeSubtab, setActiveSubtab] = useState("overview");

  // Password change state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew]         = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Session & lock state
  const [sessionTimeout, setSessionTimeout]       = useState(settings.sessionTimeout || 30);
  const [requireConfirm, setRequireConfirm]       = useState(settings.requireConfirm !== false);
  const [lockSensitiveActions, setLockSensitiveActions] = useState(settings.lockSensitiveActions !== false);
  const [rememberSession, setRememberSession]     = useState(settings.rememberSession !== false);

  // Passkeys state
  const [passkeys, setPasskeys] = useState(() => loadLS("passkeys", []));
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const passkeySupported = isPasskeySupported();

  // Auth user data
  const authUser = (() => {
    try { return JSON.parse(localStorage.getItem("auth_user") || "{}"); } catch { return {}; }
  })();
  const loginHistory = (() => {
    try { return JSON.parse(localStorage.getItem("login_history") || "[]"); } catch { return []; }
  })();

  const permMatrix = [
    ["Feature", "Owner", "Admin", "Staff", "Viewer"],
    ["View all data", "✅", "✅", "✅", "✅"],
    ["Add contacts/leads", "✅", "✅", "✅", "❌"],
    ["Edit contacts/leads", "✅", "✅", "✅", "❌"],
    ["Delete contacts/leads", "✅", "✅", "❌", "❌"],
    ["Add/edit invoices", "✅", "✅", "❌", "❌"],
    ["Delete invoices", "✅", "✅", "❌", "❌"],
    ["Add tasks/notes/follow-ups", "✅", "✅", "✅", "❌"],
    ["Add communications/logs", "✅", "✅", "✅", "❌"],
    ["Delete proposals/payments", "✅", "✅", "❌", "❌"],
    ["Clear audit logs", "✅", "❌", "❌", "❌"],
    ["Reset workspace data", "✅", "❌", "❌", "❌"],
    ["Manage settings", "✅", "✅", "❌", "❌"],
  ];

  const checklist = [
    ["Role-based permissions (local)", true],
    ["Audit logging enabled", true],
    ["Delete confirmations", requireConfirm],
    ["Session inactivity lock", true],
    ["Password hash + salt (local)", true],
    ["Passkey (WebAuthn) support", passkeySupported],
    ["Login history tracking", true],
    ["Failed login lockout", true],
    ["Firebase Auth (planned)", false],
    ["Firestore security rules (planned)", false],
    ["Server-side validation (planned)", false],
    ["End-to-end encryption (planned)", false],
  ];

  const saveSecuritySettings = () => {
    const ns = { ...settings, sessionTimeout, requireConfirm, lockSensitiveActions, rememberSession };
    setSettings(ns);
    saveLS("settings", ns);
    toast("Security settings saved");
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwCurrent || !pwNew || !pwConfirm) { setPwMsg({ type: "error", text: "All fields are required." }); return; }
    if (pwNew !== pwConfirm) { setPwMsg({ type: "error", text: "New passwords do not match." }); return; }
    const strength = checkPasswordStrength(pwNew);
    if (strength.strength === "weak") { setPwMsg({ type: "error", text: strength.message }); return; }
    setPwChanging(true);
    try {
      await changePassword(pwCurrent, pwNew);
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Failed to change password." });
    }
    setPwChanging(false);
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      await registerPasskey();
      const updated = loadLS("passkeys", []);
      setPasskeys(updated);
      toast("Passkey registered");
    } catch (err) {
      toast(err.message || "Passkey registration failed", "error");
    }
    setPasskeyLoading(false);
  };

  const handleRemovePasskey = async (credId) => {
    const updated = passkeys.filter(p => p.id !== credId);
    setPasskeys(updated);
    saveLS("passkeys", updated);
    try { await removePasskeyAuth(); } catch {}
    toast("Passkey removed");
  };

  const subTabBtn = (id) => ({
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: activeSubtab === id ? 600 : 400,
    background: "transparent",
    border: "none",
    borderBottom: activeSubtab === id ? "2px solid var(--accent)" : "2px solid transparent",
    borderRadius: 0,
    cursor: "pointer",
    color: activeSubtab === id ? "var(--accent)" : "var(--text-muted)",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  const infoBox = (color, text) => (
    <div style={{ fontSize: 12, color: `var(--${color})`, background: `var(--${color}-dim)`, padding: "10px 14px", borderRadius: "var(--r-md)", borderLeft: `3px solid var(--${color})`, marginBottom: 16, lineHeight: 1.5 }}>{text}</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Security</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>Authentication, sessions, roles, and data protection settings</p>
      </div>

      {/* Subtab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24, overflowX: "auto" }}>
        {SUBTABS.map(t => <button key={t.id} style={subTabBtn(t.id)} onClick={() => setActiveSubtab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSubtab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {infoBox("warning", "⚠️ This is a local/frontend security system using browser storage. It is not backend-grade security. Passwords are hashed locally but not server-validated. Cloud auth (Firebase/backend) is planned for a future release.")}
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Current User</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Name: </span><strong>{authUser.ownerName || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Email: </span><strong>{authUser.email || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Role: </span><Badge label={settings.role || "Owner"} /></div>
              <div><span style={{ color: "var(--text-muted)" }}>Last login: </span><strong>{authUser.lastLoginAt ? new Date(authUser.lastLoginAt).toLocaleString() : "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Passkey: </span><strong style={{ color: authUser.passkeyEnabled ? "var(--success)" : "var(--text-muted)" }}>{authUser.passkeyEnabled ? "Enabled" : "Not enabled"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Failed logins: </span><strong style={{ color: authUser.failedLoginAttempts > 0 ? "var(--danger)" : "var(--text-muted)" }}>{authUser.failedLoginAttempts || 0}</strong></div>
            </div>
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Security Score</div>
            {checklist.map(([item, done]) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 13 }}>
                <span>{done ? "✅" : "⏳"}</span>
                <span style={{ color: done ? "var(--text)" : "var(--text-muted)" }}>{item}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
              {checklist.filter(([,done]) => done).length} / {checklist.length} checks passing
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── LOGIN & PASSWORD ── */}
      {activeSubtab === "password" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Change Password</div>
            {pwMsg && <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: "var(--r-sm)", marginBottom: 12, background: pwMsg.type === "error" ? "var(--danger-dim)" : "var(--success-dim)", color: pwMsg.type === "error" ? "var(--danger)" : "var(--success)", borderLeft: `3px solid var(--${pwMsg.type === "error" ? "danger" : "success"})` }}>{pwMsg.text}</div>}
            <FormField label="Current password">
              <input style={inputStyle} type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} />
            </FormField>
            <FormField label="New password">
              <input style={inputStyle} type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} />
              {pwNew && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{checkPasswordStrength(pwNew).message}</div>}
            </FormField>
            <FormField label="Confirm new password">
              <input style={inputStyle} type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
            </FormField>
            <button style={btnStyle("primary")} onClick={handleChangePassword} disabled={pwChanging}>
              {pwChanging ? "Changing…" : "Change Password"}
            </button>
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Password Info</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Last changed: </span><strong>{authUser.updatedAt ? new Date(authUser.updatedAt).toLocaleDateString() : "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Account created: </span><strong>{authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString() : "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Failed attempts: </span><strong style={{ color: authUser.failedLoginAttempts > 0 ? "var(--danger)" : "inherit" }}>{authUser.failedLoginAttempts || 0}</strong></div>
              {authUser.lockedUntil && new Date(authUser.lockedUntil) > new Date() && (
                <div style={{ color: "var(--danger)", fontWeight: 600 }}>Account locked until {new Date(authUser.lockedUntil).toLocaleString()}</div>
              )}
            </div>
            {infoBox("info", "ℹ️ Passwords are hashed with SHA-256 + salt using the Web Crypto API and stored locally. They are never stored in plain text.")}
          </SectionCard>
        </div>
      )}

      {/* ── PASSKEYS ── */}
      {activeSubtab === "passkeys" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Passkey Status</div>
            {!passkeySupported ? (
              <div style={{ fontSize: 13, color: "var(--danger)", padding: "10px 14px", background: "var(--danger-dim)", borderRadius: "var(--r-md)" }}>
                ❌ Passkeys are not supported in this browser. Use Chrome, Edge, or Safari on a modern OS.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, marginBottom: 12, color: "var(--success)" }}>✅ This browser supports passkeys (WebAuthn)</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>
                  <span style={{ color: "var(--text-muted)" }}>Passkey enabled: </span>
                  <strong style={{ color: authUser.passkeyEnabled ? "var(--success)" : "var(--text-muted)" }}>
                    {authUser.passkeyEnabled ? "Yes" : "No"}
                  </strong>
                </div>
                <button style={btnStyle("primary", "sm")} onClick={handleRegisterPasskey} disabled={passkeyLoading}>
                  {passkeyLoading ? "Registering…" : "🔑 Register Passkey"}
                </button>
              </>
            )}
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Registered Passkeys</div>
            {passkeys.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 12, background: "var(--surface-raised)", borderRadius: "var(--r-md)", textAlign: "center" }}>No passkeys registered</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {passkeys.map(pk => (
                  <div key={pk.id} style={{ padding: "10px 14px", background: "var(--surface-raised)", borderRadius: "var(--r-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{pk.name || "Passkey"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pk.device || "Device"} · {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : "—"}</div>
                    </div>
                    <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => handleRemovePasskey(pk.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <div style={{ gridColumn: "1 / -1" }}>
            {infoBox("warning", "⚠️ Local passkeys only: This WebAuthn implementation stores credential IDs locally. It is not synced across devices and is not equivalent to server-side passkey authentication. Full passkey support requires a backend. Passkeys currently work on the same device/browser where they were registered.")}
          </div>
        </div>
      )}

      {/* ── SESSION & LOCK ── */}
      {activeSubtab === "session" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Session Settings</div>
            <FormField label="Inactivity timeout (minutes)">
              <input style={inputStyle} type="number" min="5" max="480" value={sessionTimeout} onChange={e => setSessionTimeout(Number(e.target.value))} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>App will lock after this many minutes of inactivity. Set to 0 to disable.</div>
            </FormField>
            <FormField label="Remember session">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={rememberSession} onChange={e => setRememberSession(e.target.checked)} />
                Keep me logged in across browser restarts (7-day session)
              </label>
            </FormField>
            <button style={btnStyle("primary")} onClick={saveSecuritySettings}>Save Session Settings</button>
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Current Session</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 7 }}>
              <div><span style={{ color: "var(--text-muted)" }}>User: </span><strong>{authUser.ownerName || authUser.email || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Role: </span><Badge label={settings.role} /></div>
              <div><span style={{ color: "var(--text-muted)" }}>Session started: </span><strong>{(() => { try { const s = JSON.parse(localStorage.getItem("auth_session") || "{}"); return s.sessionStartedAt ? new Date(s.sessionStartedAt).toLocaleString() : "—"; } catch { return "—"; } })()}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Last active: </span><strong>{(() => { try { const s = JSON.parse(localStorage.getItem("auth_session") || "{}"); return s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : "—"; } catch { return "—"; } })()}</strong></div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── ROLES & PERMISSIONS ── */}
      {activeSubtab === "roles" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Active Role</div>
            <FormField label="Current role">
              <select style={inputStyle} value={settings.role} onChange={e => { const ns = { ...settings, role: e.target.value }; setSettings(ns); saveLS("settings", ns); toast(`Role set to ${e.target.value}`); }}>
                {["Owner", "Admin", "Staff", "Viewer"].map(r => <option key={r}>{r}</option>)}
              </select>
            </FormField>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Active permissions: {Object.entries(PERMISSIONS[settings.role] || {}).filter(([,v]) => v).length} / {Object.keys(PERMISSIONS.Owner || {}).length}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>Owner:</strong> Full access — all actions, settings, data reset, audit clear</div>
              <div><strong>Admin:</strong> Can manage most data but cannot reset workspace or clear audit logs</div>
              <div><strong>Staff:</strong> Can add contacts, tasks, notes, and communications. No invoices or deletes.</div>
              <div><strong>Viewer:</strong> Read-only. Cannot create or edit any records.</div>
            </div>
          </SectionCard>
          <CollapsibleSection title="Permission Matrix" defaultOpen={true}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr>{permMatrix[0].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: h === "Feature" ? "left" : "center", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", background: "var(--surface)", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>{permMatrix.slice(1).map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                    {row.map((cell, j) => <td key={j} style={{ padding: "8px 12px", color: j === 0 ? "var(--text)" : "var(--text-muted)", fontWeight: j === 0 ? 500 : 400, textAlign: j === 0 ? "left" : "center" }}>{cell}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* ── SENSITIVE ACTIONS ── */}
      {activeSubtab === "sensitive" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Confirmation Controls</div>
            <FormField label="Delete confirmations">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={requireConfirm} onChange={e => setRequireConfirm(e.target.checked)} />
                Require confirmation before delete / reset actions
              </label>
            </FormField>
            <FormField label="Sensitive action lock">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={lockSensitiveActions} onChange={e => setLockSensitiveActions(e.target.checked)} />
                Require role check for critical actions (export, import, reset)
              </label>
            </FormField>
            <button style={btnStyle("primary")} onClick={saveSecuritySettings}>Save Settings</button>
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sensitive Action Types</div>
            {[["Delete records", requireConfirm ? "✅ Confirmed" : "⚠️ Direct"],
              ["Reset workspace", "✅ Owner only"],
              ["Export backup", lockSensitiveActions ? "✅ Role checked" : "⚠️ Open"],
              ["Import backup", lockSensitiveActions ? "✅ Role checked" : "⚠️ Open"],
              ["Clear audit logs", "✅ Owner only"],
              ["Change password", "✅ Requires current password"],
              ["Manage passkeys", "✅ Requires authentication"]
            ].map(([action, status]) => (
              <div key={action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{action}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: status.startsWith("✅") ? "var(--success)" : "var(--warning)" }}>{status}</span>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {/* ── DATA PROTECTION ── */}
      {activeSubtab === "dataprotect" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Local Data Summary</div>
            {[["Storage type", "Browser localStorage"],
              ["Encryption", "None (browser storage is not encrypted)"],
              ["Password storage", "SHA-256 hash + random salt"],
              ["Cloud sync", "Not available (local only)"],
              ["Multi-device access", "Not available (local only)"],
              ["Automatic backup", "Not configured — export manually"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Future Cloud Security</div>
            {[["Firebase Authentication", false], ["Firestore security rules", false], ["Server-side validation", false], ["HTTPS enforcement", false], ["Data encryption at rest", false], ["Multi-user with roles", false]].map(([item, done]) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                <span>{done ? "✅" : "⏳"}</span>
                <span style={{ color: done ? "var(--text)" : "var(--text-muted)" }}>{item}</span>
              </div>
            ))}
            {infoBox("info", "ℹ️ Firebase Auth + Firestore is planned for a future release to enable cloud sync, real multi-user access, and server-grade security.")}
          </SectionCard>
        </div>
      )}

      {/* ── ACTIVITY & RISK ── */}
      {activeSubtab === "activity" && (
        <div>
          <SectionCard style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Login History</div>
            {loginHistory.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center", background: "var(--surface-raised)", borderRadius: "var(--r-md)" }}>No login history yet. Events are recorded after each login.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "var(--surface)" }}>{["Time", "IP", "Status", "Method"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{loginHistory.map((m, i) => <tr key={i} style={{ borderTop: "1px solid var(--border)" }}><td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.time}</td><td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.ip || "local"}</td><td style={{ padding: "8px 12px" }}>{m.status}</td><td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.method || "—"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </SectionCard>
          {infoBox("warning", "⚠️ Frontend-only security: IP addresses, device fingerprinting, and real-time threat detection require a backend. Login history is stored locally and could be cleared by the user. This is informational only.")}
        </div>
      )}
    </div>
  );
}
