// ─── Navigation configuration ─────────────────────────────────────────────────
// Single source of truth for tab order, groups, icons, labels.

export const NAV_TABS = [
  // ── Core ──────────────────────────────────────────────────────────────
  { id: "dashboard",      label: "Dashboard",        icon: "⊞", group: "Core" },
  { id: "contacts",       label: "Contacts",          icon: "👥", group: "Core" },
  { id: "leads",          label: "Leads",             icon: "🎯", group: "Core" },
  // ── Work ──────────────────────────────────────────────────────────────
  { id: "projects",       label: "Projects",          icon: "🗂️",  group: "Work" },
  { id: "tasks",          label: "Tasks",             icon: "✅", group: "Work" },
  { id: "follow-ups",     label: "Follow-Ups",        icon: "📞", group: "Work" },
  { id: "notes",          label: "Notes",             icon: "📝", group: "Work" },
  { id: "documents",      label: "Documents",         icon: "📄", group: "Work" },
  { id: "calendar",       label: "Calendar",          icon: "📅", group: "Work" },
  { id: "communications", label: "Communications",   icon: "💬", group: "Work" },
  // ── Finance ───────────────────────────────────────────────────────────
  { id: "invoices",       label: "Invoices",          icon: "🧾", group: "Finance" },
  { id: "payments",       label: "Payments",          icon: "💰", group: "Finance" },
  { id: "proposals",      label: "Proposals",         icon: "📋", group: "Finance" },
  // ── Founder OS ────────────────────────────────────────────────────────
  { id: "prompts",        label: "Prompt History",    icon: "🤖", group: "Founder OS" },
  { id: "project-logs",   label: "Project Logs",      icon: "🔧", group: "Founder OS" },
  { id: "roadmap",        label: "Roadmap",           icon: "🗺️",  group: "Founder OS" },
  { id: "wa-templates",   label: "Templates",         icon: "📱", group: "Founder OS" },
  // ── System ────────────────────────────────────────────────────────────
  { id: "analytics",      label: "Analytics",         icon: "📊", group: "System" },
  { id: "support",        label: "Support Tickets",   icon: "🎫", group: "System" },
  { id: "audit",          label: "Audit Logs",        icon: "🔍", group: "System", ownerOnly: true },
  { id: "security",       label: "Security",          icon: "🔒", group: "System", ownerOnly: true },
  { id: "settings",       label: "Settings",          icon: "⚙️", group: "System", ownerOnly: true },
];

// Derived — order preserved by first appearance in NAV_TABS
export const NAV_GROUPS = [...new Map(NAV_TABS.map(t => [t.group, t.group])).keys()];
