import { genId } from "./helpers.js";
import { saveWorkspaceData } from "./storage.js";
import { syncAddAuditLog } from "./sync.js";

// ─── Phase 14: Upgraded audit entry schema ────────────────────────────────────
//
// id, workspaceId, ts, userId, userName (role), module, action,
// recordType, recordId, recordLabel, desc, before, after, changedFields,
// severity: "Info" | "Warning" | "Critical"
// sourceTab, relatedType, relatedId, sessionId

const CRITICAL_ACTIONS = ["Delete", "Reset", "Clear", "Export", "Import", "Login Failed", "Passkey Disabled", "Passkey Removed"];
const WARNING_ACTIONS  = ["Login", "Logout", "Password Change", "Passkey Enabled", "Passkey Login", "Role Change"];

function getSeverity(action) {
  if (CRITICAL_ACTIONS.some(a => action?.includes(a))) return "Critical";
  if (WARNING_ACTIONS.some(a => action?.includes(a))) return "Warning";
  return "Info";
}

export const createAuditEntry = (role, module, action, desc, before = null, after = null, extra = {}) => ({
  id: genId(),
  workspaceId: extra.workspaceId || "",
  ts: new Date().toISOString(),
  userId: extra.userId || "",
  userName: role || "Owner",
  module,
  action,
  recordType: extra.recordType || module,
  recordId: extra.recordId || "",
  recordLabel: extra.recordLabel || "",
  desc,
  before,
  after,
  changedFields: extra.changedFields || [],
  sourceTab: extra.sourceTab || module,
  relatedType: extra.relatedType || "",
  relatedId: extra.relatedId || "",
  severity: extra.severity || getSeverity(action),
  sessionId: (() => { try { return JSON.parse(localStorage.getItem("auth_session") || "{}").currentUserId || ""; } catch { return ""; } })(),
});

// makeAddAudit returns the addAudit callback for use in App
export const makeAddAudit = (role, setAudit, workspaceId = "workspace-1") => (module, action, desc, before = null, after = null, extra = {}) => {
  const entry = createAuditEntry(role, module, action, desc, before, after, { ...extra, workspaceId });
  setAudit(prev => {
    const updated = [entry, ...prev].slice(0, 1000);
    saveWorkspaceData("audit", updated, workspaceId);
    return updated;
  });

  // Async write to Firestore auditLogs (non-blocking)
  syncAddAuditLog(workspaceId, entry).catch(() => {});
};
