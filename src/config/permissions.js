// ─── Role permission helpers ──────────────────────────────────────────────────

export const ROLES = ["Owner", "Admin", "Staff", "Viewer"];

// Hierarchy index — higher index = more restricted
const ROLE_RANK = Object.fromEntries(ROLES.map((r, i) => [r, i]));

// Returns true if role is at least as privileged as minRole
export const hasRole = (role, minRole) =>
  (ROLE_RANK[role] ?? 99) <= (ROLE_RANK[minRole] ?? 99);

// Module-level constant — not recreated on every call
const RULES = {
  viewAll:            ["Owner", "Admin", "Staff", "Viewer"],
  viewFinance:        ["Owner", "Admin"],
  addBasic:           ["Owner", "Admin", "Staff"],
  editBasic:          ["Owner", "Admin", "Staff"],
  deleteBasic:        ["Owner", "Admin"],
  addFinance:         ["Owner", "Admin"],
  editFinance:        ["Owner", "Admin"],
  deleteFinance:      ["Owner"],
  addOperational:     ["Owner", "Admin", "Staff"],
  deleteOperational:  ["Owner", "Admin"],
  deleteProposals:    ["Owner", "Admin"],
  manageSettings:     ["Owner", "Admin"],
  clearAudit:         ["Owner"],
  resetData:          ["Owner"],
};

export const can = (role, action) => (RULES[action] ?? []).includes(role);
