// ─── CRM-wide configuration constants ────────────────────────────────────────

export const defaultSettings = {
  businessName: "Founder OS",
  ownerName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  businessWebsite: "",
  businessId: "",
  currency: "INR",
  invoiceTax: 18,
  defaultPaymentTerms: "Net 30",
  defaultPaymentInstructions: "Please make payment via UPI or bank transfer.",
  invoicePrefix: "INV",
  proposalPrefix: "PROP",
  receiptPrefix: "RCPT",
  invoiceFooter: "Thank you for your business!",
  exportPrefix: "FOUNDER-OS",
  theme: "dark",
  glassUI: true,
  role: "Owner",
  followUpDays: 3,
  sessionTimeout: 30,
};

export const CONTACT_STATUSES = ["New", "Warm", "Active", "Client", "Lost", "Future"];
export const CONTACT_SOURCES = ["LinkedIn", "Instagram", "Website", "Friend Referral", "Cold Outreach", "Google", "Other"];

export const LEAD_STAGES = ["New", "Contacted", "Interested", "Demo Sent", "Meeting Done", "Proposal Sent", "Negotiation", "Won", "Lost", "Follow-Up Later"];
export const KANBAN_STAGES = LEAD_STAGES.filter(s => s !== "Follow-Up Later");
export const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const LEAD_SOURCES = ["LinkedIn", "Instagram", "Website", "Friend Referral", "Cold Outreach", "Google", "Other"];

export const PROJECT_STATUSES = ["Planning", "Design", "Development", "Testing", "Client Review", "Revisions", "Deployment", "Maintenance", "Completed", "On Hold"];
export const PROJECT_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const TASK_STATUSES = ["Inbox", "Todo", "Doing", "Waiting", "Blocked", "Review", "Done", "Cancelled"];
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent", "Critical"];

export const FU_TYPES = ["Call", "WhatsApp", "Email", "Meeting", "Payment", "Proposal", "Demo", "Revision"];
export const FU_STATUSES = ["Pending", "Done", "Missed", "Rescheduled"];

export const NOTE_TYPES = ["General", "Meeting", "Call", "Idea", "Technical", "Decision", "Client Requirement"];

export const DOC_TYPES = ["Proposal", "Contract", "Invoice", "NDA", "Brand Asset", "Requirement", "Deployment Note", "Compliance", "Screenshot", "Other"];
export const DOC_STATUSES = ["Draft", "Sent", "Signed", "Approved", "Archived"];

export const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];
export const PROPOSAL_STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Revised"];

export const COMM_METHODS = ["WhatsApp", "Call", "Email", "Meeting", "Instagram", "LinkedIn", "Other"];

export const CAL_TYPES = ["Meeting", "Call", "Deadline", "Payment", "Follow-Up", "Demo", "Deployment", "Maintenance", "Personal"];
export const CAL_TYPE_ICONS = {
  Meeting: "🤝", Call: "📞", Deadline: "⏰", Payment: "💰",
  "Follow-Up": "📅", Demo: "🖥️", Deployment: "🚀", Maintenance: "🔧", Personal: "👤",
};

export const TICKET_STATUSES = ["Open", "In Progress", "Waiting Client", "Fixed", "Closed"];
export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const TICKET_TYPES = ["Bug", "Change Request", "Question", "Billing", "Access", "Other"];

export const WA_CATEGORIES = ["First Message", "Follow-Up", "Payment Reminder", "Demo Sent", "Proposal Sent", "Meeting Confirmation", "Project Update", "Revision Request", "Delivery Message", "Support Reply"];

export const PROMPT_STATUSES = ["Planned", "Sent", "Applied", "Failed", "Needs Fix", "Completed"];
export const PROMPT_TOOLS = ["Claude", "ChatGPT", "Kiro", "Trae", "Cursor", "Other"];

export const LOG_TYPES = ["Build", "Bug Fix", "UI Change", "Security", "Compliance", "Deployment", "Client Feedback", "Decision", "Other"];
export const LOG_STATUSES = ["Info", "Success", "Warning", "Failed"];
export const LOG_STATUS_COLORS = { Info: "var(--info)", Success: "var(--success)", Warning: "var(--warning)", Failed: "var(--danger)" };
export const LOG_STATUS_BG = { Info: "color-mix(in srgb, var(--info) 12%, transparent)", Success: "color-mix(in srgb, var(--success) 12%, transparent)", Warning: "color-mix(in srgb, var(--warning) 12%, transparent)", Failed: "color-mix(in srgb, var(--danger) 12%, transparent)" };

export const ROADMAP_STATUSES = ["Backlog", "Planned", "In Progress", "Testing", "Review", "Done", "Blocked", "On Hold"];
export const ROADMAP_PRIORITIES = ["Low", "Medium", "High", "Urgent", "Critical"];
export const ROADMAP_PROJECTS = ["Personal CRM", "Clinic CRM", "Restaurant CRM", "Semi-Cafe CRM", "Automotive CRM", "Multi-Office CRM", "Website Demos", "Other"];

export const STATUS_COLORS = {
  New: { bg: "rgba(99,102,241,0.12)", color: "#818CF8" },
  Warm: { bg: "rgba(251,146,60,0.12)", color: "#FB923C" },
  Active: { bg: "rgba(52,211,153,0.12)", color: "#34D399" },
  Client: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  Lost: { bg: "rgba(239,68,68,0.12)", color: "#F87171" },
  Future: { bg: "rgba(167,139,250,0.12)", color: "#A78BFA" },
  "Follow-Up Later": { bg: "rgba(234,179,8,0.12)", color: "#FACC15" },
  Contacted: { bg: "rgba(56,189,248,0.12)", color: "#38BDF8" },
  Interested: { bg: "rgba(52,211,153,0.12)", color: "#34D399" },
  "Demo Sent": { bg: "rgba(167,139,250,0.15)", color: "#C4B5FD" },
  "Meeting Done": { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  "Proposal Sent": { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  Negotiation: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Won: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Planning: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" },
  Design: { bg: "rgba(167,139,250,0.12)", color: "#A78BFA" },
  Development: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  Testing: { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  "Client Review": { bg: "rgba(52,211,153,0.12)", color: "#34D399" },
  Revisions: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Deployment: { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  Maintenance: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" },
  Completed: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  "On Hold": { bg: "rgba(234,179,8,0.12)", color: "#FCD34D" },
  Todo: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" },
  Doing: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  Blocked: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Done: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Low: { bg: "rgba(52,211,153,0.1)", color: "#6EE7B7" },
  Medium: { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  High: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Urgent: { bg: "rgba(239,68,68,0.18)", color: "#F87171" },
  Pending: { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  Missed: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Rescheduled: { bg: "rgba(167,139,250,0.12)", color: "#C4B5FD" },
  Draft: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" },
  Sent: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  Signed: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Approved: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  Archived: { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
  Paid: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  "Partially Paid": { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  Overdue: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Cancelled: { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
  Viewed: { bg: "rgba(56,189,248,0.12)", color: "#38BDF8" },
  Accepted: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Rejected: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Revised: { bg: "rgba(167,139,250,0.12)", color: "#C4B5FD" },
  Open: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  "In Progress": { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  "Waiting Client": { bg: "rgba(167,139,250,0.12)", color: "#C4B5FD" },
  Fixed: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Closed: { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
  Planned: { bg: "rgba(56,189,248,0.12)", color: "#38BDF8" },
  Backlog: { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" },
  Info: { bg: "rgba(96,165,250,0.12)", color: "#60A5FA" },
  Success: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  Warning: { bg: "rgba(251,191,36,0.12)", color: "#FCD34D" },
  Failed: { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Applied: { bg: "rgba(16,185,129,0.15)", color: "#6EE7B7" },
  "Needs Fix": { bg: "rgba(239,68,68,0.12)", color: "#FCA5A5" },
  Inbox:     { bg: "rgba(56,189,248,0.12)",  color: "#38BDF8" },
  Waiting:   { bg: "rgba(251,191,36,0.12)",  color: "#FCD34D" },
  Review:    { bg: "rgba(139,92,246,0.12)",  color: "#A78BFA" },
  Critical:  { bg: "rgba(239,68,68,0.25)",   color: "#F87171" },
};
