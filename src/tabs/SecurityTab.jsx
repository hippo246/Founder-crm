import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge, Modal, Confirm, FormField, SectionCard, CollapsibleSection, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { fmtDate } from "../lib/helpers.js";
import { saveLS, loadLS, getStorageSize } from "../lib/storage.js";
import { getPermissionsMatrix, PERMISSION_KEYS, saveCustomRoles, hasPermission } from "../lib/permissions.js";
import { changePassword, checkPasswordStrength, registerPasskey, removePasskey as removePasskeyAuth, isPasskeySupported } from "../lib/auth.js";
import { getWorkspaceMembers, addWorkspaceMember, updateWorkspaceMember, removeWorkspaceMember, getAuditLogs } from "../lib/storage-new.js";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase.js";

import APIKeysSection from "./Security/APIKeysSection.jsx";
import DeviceManagementSection from "./Security/DeviceManagementSection.jsx";
import IPAllowlistSection from "./Security/IPAllowlistSection.jsx";
import TwoFactorSection from "./Security/TwoFactorSection.jsx";

// ─────────────────────────────────────────────────────────────────────────
// MODULE: SECURITY — 8 subtabs
// ─────────────────────────────────────────────────────────────────────────

const SUBTABS = [
  { id: "overview",    label: "Overview" },
  { id: "password",    label: "Login & Password" },
  { id: "passkeys",    label: "Passkeys" },
  { id: "session",     label: "Session & Lock" },
  { id: "roles",       label: "Roles & Permissions" },
  { id: "2fa",         label: "Two-Factor Auth" },
  { id: "devices",     label: "Devices & Sessions" },
  { id: "apikeys",     label: "API Keys" },
  { id: "ip_allowlist",label: "IP Allowlist" },
  { id: "sensitive",   label: "Sensitive Actions" },
  { id: "dataprotect", label: "Data Protection" },
  { id: "activity",    label: "Advanced Audit Log" },
];

export default function SecurityTab({ 
  settings = {}, setSettings = () => {}, role = "Owner", 
  audit = [], setAudit = () => {}, workspaceId = "workspace-1",
  contacts = [], leads = [], projects = [], tasks = [],
  followUps = [], notes = [], documents = [],
  invoices = [], payments = [], proposals = [],
  communications = [], calendarEvents = [],
  supportTickets = [], whatsappTemplates = [],
  promptHistory = [], projectLogs = [], roadmapItems = [],
  tags = [], customFields = [],
  user = {}, addAudit = () => {}
}) {
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
  const passkeySupported = useMemo(() => isPasskeySupported(), []);

  // Auth user data — memoised so localStorage isn't re-parsed on every render.
  // authUserVersion is bumped after passkey changes to force a re-read.
  const [authUserVersion, setAuthUserVersion] = useState(0);
  const authUser     = useMemo(() => { try { return JSON.parse(localStorage.getItem("auth_user")    || "{}"); } catch { return {}; } }, [authUserVersion]);
  const authSession  = useMemo(() => { try { return JSON.parse(localStorage.getItem("auth_session") || "{}"); } catch { return {}; } }, []);
  const loginHistory = useMemo(() => { try { return JSON.parse(localStorage.getItem("login_history") || "[]"); } catch { return []; } }, []);

  // Users state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Staff");
  const [workspaceUsers, setWorkspaceUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [firebaseAudit, setFirebaseAudit] = useState([]);
  
  // Advanced Audit Log state
  const [auditFilterMod, setAuditFilterMod] = useState("All");
  const [auditFilterSev, setAuditFilterSev] = useState("All");

  const loadMembersAndAudit = useCallback(async () => {
    if (!workspaceId) return;
    setUsersLoading(true);
    try {
      const [members, logs] = await Promise.all([
        getWorkspaceMembers(workspaceId),
        isFirebaseConfigured() ? getAuditLogs(workspaceId) : Promise.resolve([])
      ]);
      setWorkspaceUsers(members);
      if (logs && logs.length > 0) {
        setFirebaseAudit(logs);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembersAndAudit();
  }, [loadMembersAndAudit]);

  // Use Firebase audit logs if available, otherwise fallback to local audit logs
  const displayAudit = firebaseAudit.length > 0 ? firebaseAudit : (audit || []);

  const [permissionsMatrix, setPermissionsMatrix] = useState(getPermissionsMatrix());
  const [editingMatrix, setEditingMatrix] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  
  const handleSaveMatrix = () => {
    // Save to LS via permissions.js
    const customRolesOnly = {};
    const defaultRoles = ["Owner", "Admin", "Staff", "Viewer"];
    for (const r in permissionsMatrix) {
      if (!defaultRoles.includes(r)) customRolesOnly[r] = permissionsMatrix[r];
    }
    saveCustomRoles(customRolesOnly);
    setEditingMatrix(false);
    toast("Permissions matrix saved");
    addAudit("Security", "Update Permissions", "Updated custom roles and permissions matrix");
  };

  const handleTogglePermission = (r, key) => {
    if (r === "Owner") return; // Owner is immutable
    setPermissionsMatrix(prev => ({
      ...prev,
      [r]: {
        ...prev[r],
        [key]: !prev[r]?.[key]
      }
    }));
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const r = newRoleName.trim();
    if (permissionsMatrix[r]) {
      toast("Role already exists", "error");
      return;
    }
    setPermissionsMatrix(prev => ({
      ...prev,
      [r]: { ...prev.Viewer } // inherit from Viewer
    }));
    setNewRoleName("");
  };

  const handleDeleteRole = (r) => {
    if (["Owner", "Admin", "Staff", "Viewer"].includes(r)) return;
    setPermissionsMatrix(prev => {
      const next = { ...prev };
      delete next[r];
      return next;
    });
  };

  const checklist = [
    ["Firebase Authentication active", isFirebaseConfigured()],
    ["Firestore security rules active", isFirebaseConfigured()],
    ["Role-based access control (RBAC)", true],
    ["Audit logging enabled", true],
    ["Delete confirmations", requireConfirm],
    ["Session inactivity lock", true],
    ["Passkey (WebAuthn) support", passkeySupported],
    ["Login history tracking", true],
  ];

  const saveSecuritySettings = () => {
    const ns = { ...settings, sessionTimeout, requireConfirm, lockSensitiveActions, rememberSession };
    setSettings(ns);
    saveLS("settings", ns);
    addAudit("Security", "Update Settings", "Updated security settings");
    toast("Security settings saved");
  };

  const downloadAuditCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,Module,Action,Description,Severity\n"
      + displayAudit.map(e => `"${e.ts || e.timestamp}","${e.module}","${e.action}","${e.desc || e.description}","${e.severity || 'Info'}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Audit log downloaded");
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
      addAudit("Auth", "Password Change", "User changed their password");
      setPwMsg({ type: "success", text: "Password changed successfully." });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPwChanging(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const result = await registerPasskey();
      // Build a normalised entry from whatever registerPasskey returns,
      // falling back to re-reading localStorage if it returns nothing.
      const newEntry = result && result.id
        ? { id: result.id, name: result.name || "Passkey", device: result.device || navigator.platform || "Device", createdAt: result.createdAt || new Date().toISOString() }
        : null;
      const updated = newEntry
        ? [...passkeys, newEntry]
        : loadLS("passkeys", []);
      setPasskeys(updated);
      if (newEntry) saveLS("passkeys", updated);
      setAuthUserVersion(v => v + 1); // re-read authUser so passkeyEnabled reflects the change
      addAudit("Auth", "Passkey Registered", "User registered a new passkey");
      toast("Passkey registered");
    } catch (err) {
      toast(err.message || "Passkey registration failed", "error");
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRemovePasskey = async (credId) => {
    const updated = passkeys.filter(p => p.id !== credId);
    setPasskeys(updated);
    saveLS("passkeys", updated);
    try { await removePasskeyAuth(credId); } catch {}
    setAuthUserVersion(v => v + 1); // re-read authUser so passkeyEnabled reflects the change
    addAudit("Auth", "Passkey Removed", "User removed a passkey");
    toast("Passkey removed");
  };

  const handleAddUser = async () => {
    if (!newUserEmail) {
      toast("Please enter an email address", "error");
      return;
    }
    
    setUsersLoading(true);
    try {
      // Look up user by email in /users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newUserEmail));
      const querySnapshot = await getDocs(q);

      let userId;
      let displayName;

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        userId = userDoc.data().uid;
        displayName = userDoc.data().displayName || newUserEmail.split('@')[0];
      } else {
        const invitesRef = collection(db, 'workspaces', workspaceId, 'invites');
        await addDoc(invitesRef, {
          email: newUserEmail,
          role: newUserRole,
          invitedBy: user?.uid || authUser?.userId || 'system',
          invitedAt: new Date().toISOString(),
          status: 'pending'
        });
        
        addAudit("Security", "Invite User", `Sent invite to ${newUserEmail} as ${newUserRole}`);
        toast(`Invite sent to ${newUserEmail}.`, "success");
        setNewUserEmail("");
        setShowAddUser(false);
        setUsersLoading(false);
        return;
      }

      await addWorkspaceMember(workspaceId, userId, {
        email: newUserEmail,
        displayName: displayName,
        role: newUserRole,
        permissions: null,
        invitedBy: user?.uid || authUser?.userId || 'system',
      });
      
      addAudit("Security", "Add User", `Added user ${newUserEmail} as ${newUserRole}`);
      toast(`User ${newUserEmail} added as ${newUserRole}`);
      setNewUserEmail("");
      setShowAddUser(false);
      loadMembersAndAudit();
    } catch (error) {
      console.error('Failed to add user:', error);
      toast('Failed to add user: ' + error.message, 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await updateWorkspaceMember(workspaceId, userId, { role: newRole });
      addAudit("Security", "Update User Role", `Changed user role to ${newRole}`);
      toast(`User role updated to ${newRole}`);
      loadMembersAndAudit();
    } catch (error) {
      toast('Failed to update role', 'error');
    }
  };

  const handleToggleUserActive = async (userId, currentActive) => {
    try {
      await updateWorkspaceMember(workspaceId, userId, { active: !currentActive });
      addAudit("Security", "Toggle User Active", `Toggled user active status`);
      toast(`User ${!currentActive ? 'activated' : 'deactivated'}`);
      loadMembersAndAudit();
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await removeWorkspaceMember(workspaceId, userId);
      addAudit("Security", "Remove User", "Removed user from workspace");
      toast("User removed");
      loadMembersAndAudit();
    } catch (error) {
      toast('Failed to remove user', 'error');
    }
  };

  // Calculate data stats for Data Protection tab
  const dataStats = useMemo(() => [
    { label: "Contacts", count: (contacts || []).length },
    { label: "Leads", count: (leads || []).length },
    { label: "Projects", count: (projects || []).length },
    { label: "Tasks", count: (tasks || []).length },
    { label: "Follow-Ups", count: (followUps || []).length },
    { label: "Notes", count: (notes || []).length },
    { label: "Documents", count: (documents || []).length },
    { label: "Invoices", count: (invoices || []).length },
    { label: "Payments", count: (payments || []).length },
    { label: "Proposals", count: (proposals || []).length },
    { label: "Communications", count: (communications || []).length },
    { label: "Calendar Events", count: (calendarEvents || []).length },
    { label: "Support Tickets", count: (supportTickets || []).length },
    { label: "WhatsApp Templates", count: (whatsappTemplates || []).length },
    { label: "Prompt History", count: (promptHistory || []).length },
    { label: "Project Logs", count: (projectLogs || []).length },
    { label: "Roadmap Items", count: (roadmapItems || []).length },
    { label: "Tags", count: (tags || []).length },
    { label: "Custom Fields", count: (customFields || []).length },
    { label: "Audit Logs", count: displayAudit.length },
  ], [contacts, leads, projects, tasks, followUps, notes, documents, invoices, payments, proposals, communications, calendarEvents, supportTickets, whatsappTemplates, promptHistory, projectLogs, roadmapItems, tags, customFields, displayAudit]);

  // Severity helpers — avoid repeating case-insensitive arrays throughout JSX
  const isCritical  = sev => sev?.toLowerCase() === "critical";
  const isWarning   = sev => sev?.toLowerCase() === "warning";
  const isSensitive = sev => ["critical", "warning", "high"].includes(sev?.toLowerCase());

  // Derived once; used in both Quick Stats and Data Overview
  const totalRecords = dataStats.reduce((sum, s) => sum + s.count, 0);

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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="module-header">
        <div className="module-header-left">
          <h2>Security & Settings</h2>
          <p>Authentication, sessions, roles, and data protection settings</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flex: 1 }}>
        {/* Vertical Subtab Nav (Glassmorphic) */}
        <div style={{ 
          width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6,
          background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)",
          padding: 16, boxShadow: "var(--shadow-md)"
        }}>
          {SUBTABS.map(t => {
            const isActive = activeSubtab === t.id;
            return (
              <button 
                key={t.id} 
                onClick={() => setActiveSubtab(t.id)} 
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  background: isActive ? "var(--nav-active-bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text)",
                  borderRadius: "var(--r-md)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "inset 0 1px 1px rgba(255,255,255,0.05), 0 0 10px var(--accent-dim)" : "none",
                  transform: isActive ? "translateX(4px)" : "none"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>

      {/* ── OVERVIEW ── */}
      {activeSubtab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {isFirebaseConfigured() ? (
            infoBox("success", "✅ Secured by Firebase Authentication and Firestore. Real-time protection and cloud backups are active.")
          ) : (
            infoBox("warning", "⚠️ Connected to local storage. Backend security features (Firebase) are not fully configured.")
          )}
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Current User</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Name: </span><strong>{authUser.ownerName || user?.ownerName || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Email: </span><strong>{authUser.email || user?.email || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Role: </span><Badge label={role || "Owner"} /></div>
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
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Quick Stats</div>
            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Workspace users: </span><strong>{workspaceUsers.length}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Audit logs: </span><strong>{displayAudit.length}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Login attempts: </span><strong>{(loginHistory || []).length}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Total records: </span><strong>{totalRecords}</strong></div>
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
            {infoBox("info", "ℹ️ Passwords are hashed with SHA-256 + random salt using the Web Crypto API and stored locally. They are never stored in plain text.")}
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
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center", background: "var(--surface-raised)", borderRadius: "var(--r-md)" }}>No passkeys registered</div>
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
              <div><span style={{ color: "var(--text-muted)" }}>User: </span><strong>{authUser.ownerName || authUser.email || user?.ownerName || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Role: </span><Badge label={role} /></div>
              <div><span style={{ color: "var(--text-muted)" }}>Session started: </span><strong>{authSession.sessionStartedAt ? new Date(authSession.sessionStartedAt).toLocaleString() : "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Last active: </span><strong>{authSession.lastActiveAt ? new Date(authSession.lastActiveAt).toLocaleString() : "—"}</strong></div>
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
              <select style={inputStyle} value={role} onChange={e => { 
                const ns = { ...settings, role: e.target.value }; 
                setSettings(ns); 
                saveLS("settings", ns); 
                addAudit("Security", "Change Role", `Changed active role to ${e.target.value}`);
                toast(`Role set to ${e.target.value}`); 
              }}>
                {Object.keys(permissionsMatrix).map(r => <option key={r}>{r}</option>)}
              </select>
            </FormField>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Active permissions: {Object.entries(permissionsMatrix[role] || {}).filter(([,v]) => v).length} / {PERMISSION_KEYS.length}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>Owner:</strong> Full access (Immutable)</div>
              <div><strong>Admin:</strong> Can manage most data but cannot reset workspace</div>
              <div><strong>Staff:</strong> Can add items, but cannot delete or edit invoices</div>
              <div><strong>Viewer:</strong> Read-only access</div>
              <div><em>Custom roles inherit from Viewer by default.</em></div>
            </div>
          </SectionCard>

          <SectionCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Workspace Users</div>
              <button style={btnStyle("primary", "sm")} onClick={() => setShowAddUser(true)}>+ Add User</button>
            </div>

            {showAddUser && (
              <div style={{ padding: 12, background: "var(--surface-raised)", borderRadius: 8, marginBottom: 12 }}>
                <FormField label="Email">
                  <input style={inputStyle} type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="user@example.com" />
                </FormField>
                <FormField label="Role">
                  <select style={inputStyle} value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                    {Object.keys(permissionsMatrix).filter(r => r !== "Owner").map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={btnStyle("primary", "sm")} onClick={handleAddUser}>Add User</button>
                  <button style={btnStyle("ghost", "sm")} onClick={() => setShowAddUser(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {usersLoading && <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 10 }}>Loading users...</div>}
              {!usersLoading && workspaceUsers.map(u => (
                <div key={u.userId} style={{ padding: "10px 14px", background: "var(--surface-raised)", borderRadius: "var(--r-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.displayName || u.email}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge label={u.role} />
                    <Badge label={u.active ? "Active" : "Inactive"} style={{ background: u.active ? "var(--success-dim)" : "var(--text-muted-dim)", color: u.active ? "var(--success)" : "var(--text-muted)" }} />
                    {u.role !== "Owner" && (
                      <>
                        <select style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} value={u.role} onChange={(e) => handleUpdateUserRole(u.userId, e.target.value)}>
                          {Object.keys(permissionsMatrix).filter(r => r !== "Owner").map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button style={{ ...btnStyle("ghost", "xs") }} onClick={() => handleToggleUserActive(u.userId, u.active)}>
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                        <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => handleRemoveUser(u.userId)}>Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <CollapsibleSection title="Custom Permissions Matrix" defaultOpen={true} style={{ gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input 
                  style={{ ...inputStyle, width: 200 }} 
                  placeholder="New role name..." 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value)} 
                />
                <button style={btnStyle("ghost")} onClick={handleAddRole}>Add Role</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {editingMatrix ? (
                  <>
                    <button style={btnStyle("ghost")} onClick={() => { setEditingMatrix(false); setPermissionsMatrix(getPermissionsMatrix()); }}>Cancel</button>
                    <button style={btnStyle("primary")} onClick={handleSaveMatrix}>Save Matrix</button>
                  </>
                ) : (
                  <button style={btnStyle("outline")} onClick={() => setEditingMatrix(true)}>Edit Permissions</button>
                )}
              </div>
            </div>

            <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Feature</th>
                    {Object.keys(permissionsMatrix).map(r => (
                      <th key={r} style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          {r}
                          {editingMatrix && !["Owner", "Admin", "Staff", "Viewer"].includes(r) && (
                            <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)", padding: "2px 4px" }} onClick={() => handleDeleteRole(r)}>Delete</button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_KEYS.map((perm, i) => (
                    <tr key={perm.key} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                      <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>
                        {perm.label}
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{perm.group}</div>
                      </td>
                      {Object.keys(permissionsMatrix).map(r => (
                        <td key={r} style={{ padding: "12px 16px", textAlign: "center" }}>
                          {editingMatrix && r !== "Owner" ? (
                            <input 
                              type="checkbox" 
                              checked={!!permissionsMatrix[r]?.[perm.key]}
                              onChange={() => handleTogglePermission(r, perm.key)}
                              style={{ cursor: "pointer", width: 16, height: 16 }}
                            />
                          ) : (
                            permissionsMatrix[r]?.[perm.key] ? "✅" : "❌"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
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
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Recent Sensitive Actions</div>
            {(() => { const sensitiveEntries = displayAudit.filter(a => isSensitive(a.severity)); return sensitiveEntries.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center", background: "var(--surface-raised)", borderRadius: "var(--r-md)" }}>No recent sensitive actions</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sensitiveEntries.slice(0, 10).map((entry, idx) => (
                  <div key={entry.id || idx} style={{ padding: "10px 14px", background: "var(--surface-raised)", borderRadius: "var(--r-md)", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 600 }}>{entry.action}</div>
                      <Badge label={entry.severity} style={{ 
                        background: isCritical(entry.severity) ? "var(--danger-dim)" : "var(--warning-dim)", 
                        color: isCritical(entry.severity) ? "var(--danger)" : "var(--warning)" 
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      {entry.desc || entry.description} · {entry.ts || entry.timestamp ? new Date(entry.ts || entry.timestamp).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            ); })()}
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sensitive Action Types</div>
            {[["Delete records", requireConfirm ? "✅ Confirmed" : "⚠️ Direct"],
              ["Reset workspace data", "✅ Owner only"],
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
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Data Overview</div>
            {[
              { label: "Storage type", value: isFirebaseConfigured() ? "Firebase Firestore + Local Cache" : "Browser localStorage" },
              { label: "Storage used", value: getStorageSize() + " (Local)" },
              { label: "Workspace ID", value: workspaceId },
              { label: "Total records", value: totalRecords },
              { label: "Password storage", value: isFirebaseConfigured() ? "Firebase Auth (scrypt)" : "SHA-256 hash + random salt" },
              { label: "Cloud sync", value: isFirebaseConfigured() ? "Active (Realtime)" : "Not available (local only)" },
              { label: "Multi-device access", value: isFirebaseConfigured() ? "Supported" : "Not available (local only)" },
              { label: "Automatic backup", value: isFirebaseConfigured() ? "Firebase managed" : "Not configured — export manually" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </SectionCard>
          <SectionCard>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Record Counts</div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {dataStats.map(({ label, count }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <div style={{ gridColumn: "1 / -1" }}>
            {isFirebaseConfigured() ? 
              infoBox("info", "ℹ️ All data is securely stored in Firebase Firestore with offline persistence enabled. Your data is synced automatically across devices.") :
              infoBox("info", "ℹ️ All data is stored locally in your browser's localStorage. No data is sent to any external servers. For cloud backup, use the export feature in Settings.")
            }
          </div>
        </div>
      )}

      {/* ── ACTIVITY & RISK (ADVANCED AUDIT LOG) ── */}
      {activeSubtab === "activity" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
            <SectionCard>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Risk Summary</div>
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <div><span style={{ color: "var(--text-muted)" }}>Critical actions: </span><strong style={{ color: "var(--danger)" }}>{displayAudit.filter(a => isCritical(a.severity)).length}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Warning actions: </span><strong style={{ color: "var(--warning)" }}>{displayAudit.filter(a => isWarning(a.severity)).length}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Failed logins: </span><strong style={{ color: authUser.failedLoginAttempts > 0 ? "var(--danger)" : "var(--text-muted)" }}>{(loginHistory || []).filter(l => l.status?.includes("Failed")).length}</strong></div>
                <div><span style={{ color: "var(--text-muted)" }}>Successful logins: </span><strong style={{ color: "var(--success)" }}>{(loginHistory || []).filter(l => l.status?.includes("Success")).length}</strong></div>
              </div>
            </SectionCard>
            <SectionCard>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Recent Activity</div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {displayAudit.slice(0, 10).map((entry, idx) => (
                  <div key={entry.id || idx} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 600 }}>{entry.action}</div>
                      <Badge label={entry.severity} style={{ 
                        background: isCritical(entry.severity) ? "var(--danger-dim)" : isWarning(entry.severity) ? "var(--warning-dim)" : "var(--surface-raised)", 
                        color: isCritical(entry.severity) ? "var(--danger)" : isWarning(entry.severity) ? "var(--warning)" : "var(--text-muted)" 
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {entry.module} · {entry.ts || entry.timestamp ? new Date(entry.ts || entry.timestamp).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Advanced Audit Log</div>
              <button style={btnStyle("ghost", "sm")} onClick={downloadAuditCSV}>📥 Export CSV</button>
            </div>
            
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <select style={inputStyle} value={auditFilterMod} onChange={e => setAuditFilterMod(e.target.value)}>
                <option value="All">All Modules</option>
                <option value="Security">Security</option>
                <option value="Auth">Auth</option>
                <option value="Contacts">Contacts</option>
                <option value="Invoices">Invoices</option>
              </select>
              <select style={inputStyle} value={auditFilterSev} onChange={e => setAuditFilterSev(e.target.value)}>
                <option value="All">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Time</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Module / Action</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Details</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)" }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAudit
                    .filter(a => auditFilterMod === "All" || a.module === auditFilterMod)
                    .filter(a => auditFilterSev === "All" || (a.severity || "info").toLowerCase() === auditFilterSev.toLowerCase())
                    .map((entry, idx) => (
                    <tr key={entry.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{entry.ts || entry.timestamp ? new Date(entry.ts || entry.timestamp).toLocaleString() : ""}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{entry.action}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.module}</div>
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text)" }}>{entry.desc || entry.description}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge label={entry.severity || "info"} style={{ 
                          background: isCritical(entry.severity) ? "var(--danger-dim)" : isWarning(entry.severity) ? "var(--warning-dim)" : "var(--surface-raised)", 
                          color: isCritical(entry.severity) ? "var(--danger)" : isWarning(entry.severity) ? "var(--warning)" : "var(--text-muted)" 
                        }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Login History</div>
            {(loginHistory || []).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 16, textAlign: "center", background: "var(--surface-raised)", borderRadius: "var(--r-md)" }}>No login history yet. Events are recorded after each login.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "var(--surface)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Time</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>IP</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Method</th>
                  </tr></thead>
                  <tbody>{(loginHistory || []).map((m, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.time}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.ip || "cloud"}</td>
                      <td style={{ padding: "8px 12px" }}>{m.status}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.method || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {!isFirebaseConfigured() && infoBox("warning", "⚠️ Frontend-only security: IP addresses, device fingerprinting, and real-time threat detection require a backend. Login history is stored locally and could be cleared by the user. This is informational only.")}
        </div>
      )}
      {activeSubtab === "2fa" && <TwoFactorSection addAudit={addAudit} />}
      {activeSubtab === "devices" && <DeviceManagementSection addAudit={addAudit} />}
      {activeSubtab === "apikeys" && <APIKeysSection addAudit={addAudit} />}
      {activeSubtab === "ip_allowlist" && <IPAllowlistSection addAudit={addAudit} />}
        </div>
      </div>
    </div>
  );
}
