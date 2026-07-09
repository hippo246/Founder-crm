import { loadLS, saveLS } from "./storage.js";

// ─── Default Permission Matrix ───────────────────────────────────────────────────

export const DEFAULT_PERMISSIONS = {
  Owner: {
    viewAll: true,
    addContactsLeads: true,
    editContactsLeads: true,
    deleteContactsLeads: true,
    addEditInvoices: true,
    deleteInvoices: true,
    addTasksNotesFollowUps: true,
    addCommunicationsLogs: true,
    deleteProposalsPayments: true,
    clearAuditLogs: true,
    resetWorkspaceData: true,
    manageSettings: true,
  },
  Admin: {
    viewAll: true,
    addContactsLeads: true,
    editContactsLeads: true,
    deleteContactsLeads: true,
    addEditInvoices: true,
    deleteInvoices: true,
    addTasksNotesFollowUps: true,
    addCommunicationsLogs: true,
    deleteProposalsPayments: true,
    clearAuditLogs: false,
    resetWorkspaceData: false,
    manageSettings: true,
  },
  Staff: {
    viewAll: true,
    addContactsLeads: true,
    editContactsLeads: true,
    deleteContactsLeads: false,
    addEditInvoices: false,
    deleteInvoices: false,
    addTasksNotesFollowUps: true,
    addCommunicationsLogs: true,
    deleteProposalsPayments: false,
    clearAuditLogs: false,
    resetWorkspaceData: false,
    manageSettings: false,
  },
  Viewer: {
    viewAll: true,
    addContactsLeads: false,
    editContactsLeads: false,
    deleteContactsLeads: false,
    addEditInvoices: false,
    deleteInvoices: false,
    addTasksNotesFollowUps: false,
    addCommunicationsLogs: false,
    deleteProposalsPayments: false,
    clearAuditLogs: false,
    resetWorkspaceData: false,
    manageSettings: false,
  },
};

// Permission keys metadata for UI rendering
export const PERMISSION_KEYS = [
  { key: "viewAll", label: "View all CRM data", group: "General" },
  { key: "addContactsLeads", label: "Add Contacts & Leads", group: "CRM" },
  { key: "editContactsLeads", label: "Edit Contacts & Leads", group: "CRM" },
  { key: "deleteContactsLeads", label: "Delete Contacts & Leads", group: "CRM" },
  { key: "addTasksNotesFollowUps", label: "Add Tasks & Notes", group: "Activity" },
  { key: "addCommunicationsLogs", label: "Add Communications", group: "Activity" },
  { key: "addEditInvoices", label: "Add/Edit Invoices", group: "Finance" },
  { key: "deleteInvoices", label: "Delete Invoices", group: "Finance" },
  { key: "deleteProposalsPayments", label: "Delete Proposals/Payments", group: "Finance" },
  { key: "manageSettings", label: "Manage Settings", group: "System" },
  { key: "clearAuditLogs", label: "Clear Audit Logs", group: "System" },
  { key: "resetWorkspaceData", label: "Reset Workspace Data", group: "System" },
];

/**
 * Get the current active permission matrix (Defaults + Custom Roles)
 */
export const getPermissionsMatrix = () => {
  const customRoles = loadLS("custom_roles", {});
  return { ...DEFAULT_PERMISSIONS, ...customRoles };
};

export const saveCustomRoles = (customRoles) => {
  saveLS("custom_roles", customRoles);
};

export const hasPermission = (role, permission) => {
  const matrix = getPermissionsMatrix();
  return matrix[role]?.[permission] || false;
};

// Granular check wrappers used across the app
export const canAddContacts = (role) => hasPermission(role, 'addContactsLeads');
export const canEditContacts = (role) => hasPermission(role, 'editContactsLeads');
export const canDeleteContacts = (role) => hasPermission(role, 'deleteContactsLeads');
export const canAddEditInvoices = (role) => hasPermission(role, 'addEditInvoices');
export const canDeleteInvoices = (role) => hasPermission(role, 'deleteInvoices');
export const canAddTasksNotes = (role) => hasPermission(role, 'addTasksNotesFollowUps');
export const canAddCommunications = (role) => hasPermission(role, 'addCommunicationsLogs');
export const canDeleteProposalsPayments = (role) => hasPermission(role, 'deleteProposalsPayments');
export const canClearAuditLogs = (role) => hasPermission(role, 'clearAuditLogs');
export const canResetDemoData = (role) => hasPermission(role, 'resetWorkspaceData'); // legacy alias
export const canResetWorkspaceData = (role) => hasPermission(role, 'resetWorkspaceData');
export const canManageSettings = (role) => hasPermission(role, 'manageSettings');
