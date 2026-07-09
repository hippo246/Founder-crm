// ─── localStorage helpers ─────────────────────────────────────────────────────
import { syncSaveCollection } from "./sync.js";

export const loadLS = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

export const saveLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

export const getStorageSize = () => {
  try {
    let total = 0;
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k)) total += (localStorage[k].length + k.length) * 2;
    }
    return total < 1024 * 1024 ? `${(total / 1024).toFixed(1)} KB` : `${(total / (1024 * 1024)).toFixed(2)} MB`;
  } catch { return "Unknown"; }
};

// ─── Workspace helpers ───────────────────────────────────────────────────────

export const createDefaultWorkspace = () => ({
  id: "workspace-1",
  name: "My Business",
  currency: "INR",
  businessName: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  businessWebsite: "",
  businessId: "",
  invoicePrefix: "INV",
  proposalPrefix: "PROP",
  receiptPrefix: "REC",
  invoiceTax: 18,
  paymentTerms: "Net 30",
  paymentInstructions: "Please pay via UPI or bank transfer",
  invoiceFooter: "Thank you for your business!",
  dateFormat: "DD/MM/YYYY",
  createdAt: new Date().toISOString().slice(0, 10),
  exchangeRates: {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AED: 0.044,
    CAD: 0.016,
    AUD: 0.018,
    SGD: 0.016,
  },
});

export const loadWorkspaces = () => {
  const workspaces = loadLS("workspaces", [createDefaultWorkspace()]);
  return Array.isArray(workspaces) && workspaces.length > 0 ? workspaces : [createDefaultWorkspace()];
};

export const saveWorkspaces = (workspaces) => {
  saveLS("workspaces", workspaces);
};

export const loadCurrentWorkspaceId = () => {
  return loadLS("currentWorkspaceId", "workspace-1");
};

export const saveCurrentWorkspaceId = (workspaceId) => {
  saveLS("currentWorkspaceId", workspaceId);
};

// Load data scoped to current workspace with migration support
export const loadWorkspaceData = (key, fallback, workspaceId) => {
  const scopedKey = `${workspaceId}_${key}`;
  const scopedData = loadLS(scopedKey, null);
  
  // If scoped data exists, return it
  if (scopedData !== null) {
    return scopedData;
  }
  
  // Try to migrate old unscoped data if it exists
  const oldData = loadLS(key, null);
  if (oldData !== null) {
    // Save to scoped key and return
    saveLS(scopedKey, oldData);
    return oldData;
  }
  
  return fallback;
};

// Save data scoped to current workspace (localStorage first, then Firestore async)
export const saveWorkspaceData = (key, val, workspaceId) => {
  const scopedKey = `${workspaceId}_${key}`;
  saveLS(scopedKey, val);

  // Non-blocking dual-write to Firestore
  syncSaveCollection(workspaceId, key, val).catch(() => {});
};

// Delete data for a specific workspace
export const deleteWorkspaceData = (workspaceId) => {
  const prefix = `${workspaceId}_`;
  const keysToDelete = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
};

// Get all workspace data keys
export const getWorkspaceDataKeys = (workspaceId) => {
  const prefix = `${workspaceId}_`;
  const keys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keys.push(key.substring(prefix.length));
    }
  }
  
  return keys;
};

// ─── Currency conversion ───────────────────────────────────────────────────────

export const convertCurrency = (amount, fromCurrency, toCurrency, exchangeRates) => {
  if (!amount || fromCurrency === toCurrency) return amount;
  
  const fromRate = exchangeRates?.[fromCurrency] || 1;
  const toRate = exchangeRates?.[toCurrency] || 1;
  
  // Convert to base currency first, then to target
  const inBase = amount / fromRate;
  const result = inBase * toRate;
  
  return Number(result.toFixed(2));
};

export const formatCurrency = (amount, currency, exchangeRates, baseCurrency) => {
  const symbol = currency === "INR" ? "INR" : currency === "USD" ? "$" : currency === "EUR" ? "EUR" : currency === "GBP" ? "GBP" : currency;
  const value = Number(amount).toFixed(2);
  return `${symbol}${value}`;
};

// Safe normalization for old localStorage records
export const normalizeInvoice = (inv) => ({
  id: inv.id || "",
  invoiceNumber: inv.invoiceNumber || "",
  invoiceTitle: inv.invoiceTitle || "",
  contactId: inv.contactId || "",
  clientName: inv.clientName || "",
  clientCompany: inv.clientCompany || "",
  clientEmail: inv.clientEmail || "",
  clientPhone: inv.clientPhone || "",
  clientAddress: inv.clientAddress || "",
  projectId: inv.projectId || "",
  projectName: inv.projectName || "",
  issueDate: inv.issueDate || "",
  dueDate: inv.dueDate || "",
  status: inv.status || "Draft",
  currency: inv.currency || "INR",
  lineItems: Array.isArray(inv.lineItems) ? inv.lineItems : [],
  subtotal: Number(inv.subtotal) || 0,
  discountTotal: Number(inv.discountTotal) || 0,
  taxTotal: Number(inv.taxTotal) || 0,
  extraCharges: Number(inv.extraCharges) || 0,
  grandTotal: Number(inv.grandTotal) || 0,
  paymentTerms: inv.paymentTerms || "",
  paymentInstructions: inv.paymentInstructions || "",
  notes: inv.notes || "",
  internalNotes: inv.internalNotes || "",
  footerText: inv.footerText || "",
  createdAt: inv.createdAt || "",
});

export const normalizePayment = (pmt) => ({
  id: pmt.id || "",
  paymentNumber: pmt.paymentNumber || "",
  receiptNumber: pmt.receiptNumber || "",
  invoiceId: pmt.invoiceId || "",
  invoiceNumber: pmt.invoiceNumber || "",
  projectId: pmt.projectId || "",
  projectName: pmt.projectName || "",
  contactId: pmt.contactId || "",
  clientName: pmt.clientName || "",
  client: pmt.client || "",
  project: pmt.project || "",
  amount: Number(pmt.amount) || 0,
  method: pmt.method || "",
  date: pmt.date || "",
  reference: pmt.reference || "",
  receivedBy: pmt.receivedBy || "",
  notes: pmt.notes || "",
  createdAt: pmt.createdAt || "",
});

export const normalizeProposal = (prop) => ({
  id: prop.id || "",
  proposalNumber: prop.proposalNumber || "",
  title: prop.title || "",
  contactId: prop.contactId || "",
  clientName: prop.clientName || "",
  client: prop.client || "",
  service: prop.service || "",
  scope: prop.scope || "",
  deliverables: Array.isArray(prop.deliverables) ? prop.deliverables : [],
  timeline: prop.timeline || "",
  milestones: prop.milestones || "",
  priceBreakdown: prop.priceBreakdown || "",
  price: Number(prop.price) || 0,
  terms: prop.terms || "",
  assumptions: prop.assumptions || "",
  exclusions: prop.exclusions || "",
  status: prop.status || "Draft",
  date: prop.date || "",
  validityDate: prop.validityDate || "",
  projectId: prop.projectId || "",
  projectName: prop.projectName || "",
  createdAt: prop.createdAt || "",
});

export const normalizeContact = (c) => ({
  id: c.id || "",
  name: c.name || "",
  company: c.company || "",
  phone: c.phone || "",
  whatsapp: c.whatsapp || "",
  email: c.email || "",
  location: c.location || "",
  source: c.source || "",
  status: c.status || "Active",
  tags: Array.isArray(c.tags) ? c.tags : [],
  notes: c.notes || "",
  createdAt: c.createdAt || "",
});

export const normalizeProject = (p) => ({
  id: p.id || "",
  name: p.name || "",
  client: p.client || "",
  industry: p.industry || "",
  status: p.status || "Planning",
  budget: Number(p.budget) || 0,
  paid: Number(p.paid) || 0,
  pending: Number(p.pending) || 0,
  deadline: p.deadline || "",
  progress: Number(p.progress) || 0,
  techStack: p.techStack || "",
  priority: p.priority || "Medium",
  description: p.description || "",
  tags: Array.isArray(p.tags) ? p.tags : [],
  createdAt: p.createdAt || "",
});

export const normalizeTask = (t) => ({
  id: t.id || "",
  title: t.title || "",
  description: t.description || "",
  project: t.project || "",
  projectId: t.projectId || "",
  contact: t.contact || "",
  status: t.status || "Todo",
  priority: t.priority || "Medium",
  dueDate: t.dueDate || "",
  startDate: t.startDate || "",
  estimatedHours: t.estimatedHours || "",
  actualHours: t.actualHours || "",
  checklist: Array.isArray(t.checklist) ? t.checklist : [],
  tags: Array.isArray(t.tags) ? t.tags : [],
  notes: t.notes || "",
  blockers: t.blockers || "",
  roadmapItemId: t.roadmapItemId || "",
  supportTicketId: t.supportTicketId || "",
  promptId: t.promptId || "",
  createdAt: t.createdAt || "",
});

export const normalizeRoadmapItem = (r) => ({
  id: r.id || "",
  item: r.item || "",
  notes: r.notes || "",
  project: r.project || "",
  sector: r.sector || "",
  phase: r.phase || "",
  subPhase: r.subPhase || "",
  status: r.status || "Planned",
  priority: r.priority || "Medium",
  targetDate: r.targetDate || "",
  owner: r.owner || "",
  estimatedHours: r.estimatedHours || "",
  actualHours: r.actualHours || "",
  progress: Number(r.progress) || 0,
  blockers: r.blockers || "",
  parentItemId: r.parentItemId || "",
  createdAt: r.createdAt || "",
  updatedAt: r.updatedAt || "",
});

export const normalizeSettings = (s) => ({
  businessName: s.businessName || "Founder OS CRM",
  ownerName: s.ownerName || "",
  ownerEmail: s.ownerEmail || "",
  ownerPhone: s.ownerPhone || "",
  ownerAddress: s.ownerAddress || "",
  businessWebsite: s.businessWebsite || "",
  businessId: s.businessId || "",
  currency: s.currency || "INR",
  invoiceTax: Number(s.invoiceTax) || 18,
  paymentTerms: s.paymentTerms || "Net 30",
  paymentInstructions: s.paymentInstructions || "Please pay via UPI or bank transfer",
  invoicePrefix: s.invoicePrefix || "",
  proposalPrefix: s.proposalPrefix || "",
  receiptPrefix: s.receiptPrefix || "",
  invoiceFooter: s.invoiceFooter || "Thank you for your business!",
  theme: s.theme || "dark",
  role: s.role || "Owner",
  defaultTaskView: s.defaultTaskView || "Kanban",
  defaultPhaseType: s.defaultPhaseType || "Numeric",
  followUpDays: Number(s.followUpDays) || 3,
  dashboardDensity: s.dashboardDensity || "Comfortable",
});
