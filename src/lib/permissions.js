// ─── Permission Matrix ─────────────────────────────────────────────────────────────

export const PERMISSIONS = {
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

export const hasPermission = (role, permission) => {
  return PERMISSIONS[role]?.[permission] || false;
};

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
