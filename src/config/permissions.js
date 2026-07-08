// ─── Role permission helpers ──────────────────────────────────────────────────

export const can = (role, action) => {
  const rules = {
    viewAll:          ["Owner", "Admin", "Staff", "Viewer"],
    addBasic:         ["Owner", "Admin", "Staff"],
    editBasic:        ["Owner", "Admin", "Staff"],
    deleteBasic:      ["Owner", "Admin"],
    addFinance:       ["Owner", "Admin"],
    editFinance:      ["Owner", "Admin"],
    deleteFinance:    ["Owner"],
    clearAudit:       ["Owner"],
    resetData:        ["Owner"],
    manageSettings:   ["Owner", "Admin"],
    addOperational:   ["Owner", "Admin", "Staff"],
    deleteProposals:  ["Owner", "Admin"],
  };
  return (rules[action] || []).includes(role);
};

export const ROLES = ["Owner", "Admin", "Staff", "Viewer"];
