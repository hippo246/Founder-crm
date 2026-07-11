import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage-new.js";
import { exportToCSV } from "../lib/exports.js";
import { DOC_TYPES, DOC_STATUSES } from "../config/crmConfig.js";
import { createShareToken, revokeShareToken, getClientUploads } from "../lib/shareSync.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_COLORS = {
  "Draft":     { bg: "rgba(120,120,120,0.12)", color: "var(--text-muted)", dot: "#888" },
  "Review":    { bg: "rgba(234,179,8,0.13)",   color: "#a07c00",           dot: "#d4a000" },
  "Sent":      { bg: "rgba(59,130,246,0.12)",  color: "#1d5fb5",           dot: "#3b82f6" },
  "Signed":    { bg: "rgba(34,197,94,0.13)",   color: "#166534",           dot: "#22c55e" },
  "Expired":   { bg: "rgba(239,68,68,0.12)",   color: "#991b1b",           dot: "#ef4444" },
  "Archived":  { bg: "rgba(148,163,184,0.12)", color: "#64748b",           dot: "#94a3b8" },
};

const TYPE_ICONS = {
  "Proposal":   "📋",
  "Contract":   "📝",
  "Invoice":    "🧾",
  "NDA":        "🔒",
  "Report":     "📊",
  "Agreement":  "🤝",
  "Template":   "📄",
};

const relativeTime = (dateStr) => {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7)  return `${d}d ago`;
  if (d < 30) return `${Math.floor(d/7)}w ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}y ago`;
};

const domainLabel = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Link"; }
};

const SORT_KEYS = { Name: "name", Status: "status", Created: "createdAt", Type: "type", Client: "relatedClient" };

const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0,10);

const TEMPLATE_HTML = {
  "Contract": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">SERVICE AGREEMENT</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<h2 style="font-size:15px;margin-top:20px">1. PARTIES</h2>
<p><strong>Service Provider:</strong> [Your Company Name]<br/><strong>Client:</strong> [Client Name]<br/><strong>Client Address:</strong> [Address]</p>
<h2 style="font-size:15px;margin-top:20px">2. SCOPE OF SERVICES</h2>
<p>[Describe the services to be provided in detail]</p>
<h2 style="font-size:15px;margin-top:20px">3. PAYMENT TERMS</h2>
<p><strong>Total Amount:</strong> ₹[Amount]<br/><strong>Payment Schedule:</strong> [e.g. 50% upfront, 50% on delivery]<br/><strong>Payment Method:</strong> [Bank transfer / UPI / Cheque]</p>
<h2 style="font-size:15px;margin-top:20px">4. TIMELINE</h2>
<p><strong>Start Date:</strong> [Date]<br/><strong>End Date / Delivery:</strong> [Date]</p>
<h2 style="font-size:15px;margin-top:20px">5. TERMINATION</h2>
<p>Either party may terminate this agreement with [30] days written notice. Any work completed up to termination shall be compensated proportionally.</p>
<h2 style="font-size:15px;margin-top:20px">6. CONFIDENTIALITY</h2>
<p>Both parties agree to keep all project information confidential and not disclose to third parties without written consent.</p>
<h2 style="font-size:15px;margin-top:20px">7. SIGNATURES</h2>
<table style="width:100%;border-collapse:collapse;margin-top:30px">
<tr><td style="width:50%;padding:8px 0"><strong>Service Provider</strong><br/><br/><br/>Signature: ___________________<br/>Name: ___________________<br/>Date: ___________________</td>
<td style="width:50%;padding:8px 0"><strong>Client</strong><br/><br/><br/>Signature: ___________________<br/>Name: ___________________<br/>Date: ___________________</td></tr></table>`,

  "Invoice": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">INVOICE</h1>
<div style="display:flex;justify-content:space-between;margin-bottom:20px">
<div><strong>From:</strong><br/>[Your Company Name]<br/>[Address]<br/>[Email] | [Phone]</div>
<div style="text-align:right"><strong>Invoice #:</strong> INV-${new Date().getFullYear()}-001<br/><strong>Date:</strong> ${new Date().toLocaleDateString()}<br/><strong>Due Date:</strong> [Due Date]</div></div>
<p><strong>Bill To:</strong><br/>[Client Name]<br/>[Client Address]<br/>[Client Email]</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<thead><tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:10px;text-align:left">Description</th><th style="border:1px solid #ddd;padding:10px;text-align:right">Qty</th><th style="border:1px solid #ddd;padding:10px;text-align:right">Rate</th><th style="border:1px solid #ddd;padding:10px;text-align:right">Amount</th></tr></thead>
<tbody>
<tr><td style="border:1px solid #ddd;padding:10px">[Service/Product 1]</td><td style="border:1px solid #ddd;padding:10px;text-align:right">1</td><td style="border:1px solid #ddd;padding:10px;text-align:right">₹0.00</td><td style="border:1px solid #ddd;padding:10px;text-align:right">₹0.00</td></tr>
<tr><td style="border:1px solid #ddd;padding:10px">[Service/Product 2]</td><td style="border:1px solid #ddd;padding:10px;text-align:right">1</td><td style="border:1px solid #ddd;padding:10px;text-align:right">₹0.00</td><td style="border:1px solid #ddd;padding:10px;text-align:right">₹0.00</td></tr>
</tbody></table>
<div style="text-align:right;margin-top:10px">
<p><strong>Subtotal:</strong> ₹0.00</p>
<p><strong>GST (18%):</strong> ₹0.00</p>
<p style="font-size:16px"><strong>TOTAL DUE: ₹0.00</strong></p></div>
<p style="margin-top:20px"><strong>Payment Instructions:</strong><br/>Bank: [Bank Name] | Account: [Account No.] | IFSC: [IFSC Code]<br/>UPI: [UPI ID]</p>
<p style="font-size:12px;color:#666;margin-top:20px">Thank you for your business. Please make payment within the due date.</p>`,

  "NDA": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">NON-DISCLOSURE AGREEMENT</h1>
<p>This Non-Disclosure Agreement ("Agreement") is entered into as of <strong>${new Date().toLocaleDateString()}</strong> between:</p>
<p><strong>Disclosing Party:</strong> [Your Company Name], located at [Address]<br/>
<strong>Receiving Party:</strong> [Recipient Name / Company], located at [Address]</p>
<h2 style="font-size:15px;margin-top:20px">1. PURPOSE</h2>
<p>The parties wish to explore a potential business relationship and may disclose certain confidential information to each other for the purpose of: [describe purpose, e.g. "evaluating a potential software development partnership"].</p>
<h2 style="font-size:15px;margin-top:20px">2. CONFIDENTIAL INFORMATION</h2>
<p>"Confidential Information" means any non-public information disclosed by either party, including but not limited to: business plans, technical data, trade secrets, customer lists, financial information, and proprietary processes.</p>
<h2 style="font-size:15px;margin-top:20px">3. OBLIGATIONS</h2>
<p>The Receiving Party agrees to:<br/>
(a) Keep all Confidential Information strictly confidential;<br/>
(b) Not disclose it to third parties without prior written consent;<br/>
(c) Use it solely for the Purpose stated above;<br/>
(d) Protect it with at least the same degree of care as its own confidential information.</p>
<h2 style="font-size:15px;margin-top:20px">4. EXCEPTIONS</h2>
<p>These obligations do not apply to information that: (a) is or becomes publicly known through no breach of this Agreement; (b) was already known to the Receiving Party; (c) is required to be disclosed by law or court order.</p>
<h2 style="font-size:15px;margin-top:20px">5. DURATION</h2>
<p>This Agreement shall remain in effect for <strong>[2] years</strong> from the date of signing.</p>
<h2 style="font-size:15px;margin-top:20px">6. GOVERNING LAW</h2>
<p>This Agreement shall be governed by the laws of [State/Country].</p>
<h2 style="font-size:15px;margin-top:20px">7. SIGNATURES</h2>
<table style="width:100%;border-collapse:collapse;margin-top:30px">
<tr><td style="width:50%;padding:8px 0"><strong>Disclosing Party</strong><br/><br/><br/>Signature: ___________________<br/>Name: ___________________<br/>Title: ___________________<br/>Date: ___________________</td>
<td style="width:50%;padding:8px 0"><strong>Receiving Party</strong><br/><br/><br/>Signature: ___________________<br/>Name: ___________________<br/>Title: ___________________<br/>Date: ___________________</td></tr></table>`,

  "Brand Asset": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">BRAND ASSET RECORD</h1>
<p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()} &nbsp;|&nbsp; <strong>Maintained by:</strong> [Name]</p>
<h2 style="font-size:15px;margin-top:20px">Asset Details</h2>
<table style="width:100%;border-collapse:collapse">
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9;width:35%"><strong>Asset Type</strong></td><td style="border:1px solid #ddd;padding:8px">[e.g. Logo / Font / Color Palette / Banner]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>File Format(s)</strong></td><td style="border:1px solid #ddd;padding:8px">[e.g. SVG, PNG, PDF]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Usage Rights</strong></td><td style="border:1px solid #ddd;padding:8px">[e.g. Internal only / Client-facing / Public]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Storage Location</strong></td><td style="border:1px solid #ddd;padding:8px">[Google Drive link / Folder path]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Version</strong></td><td style="border:1px solid #ddd;padding:8px">v1.0</td></tr>
</table>
<h2 style="font-size:15px;margin-top:20px">Brand Colors</h2>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:8px;text-align:left">Color Name</th><th style="border:1px solid #ddd;padding:8px;text-align:left">HEX</th><th style="border:1px solid #ddd;padding:8px;text-align:left">RGB</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Usage</th></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Primary</td><td style="border:1px solid #ddd;padding:8px">#______</td><td style="border:1px solid #ddd;padding:8px">rgb()</td><td style="border:1px solid #ddd;padding:8px">Buttons, headings</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Secondary</td><td style="border:1px solid #ddd;padding:8px">#______</td><td style="border:1px solid #ddd;padding:8px">rgb()</td><td style="border:1px solid #ddd;padding:8px">Accents</td></tr>
</table>
<h2 style="font-size:15px;margin-top:20px">Typography</h2>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:8px;text-align:left">Role</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Font Family</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Weight</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Size</th></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Heading</td><td style="border:1px solid #ddd;padding:8px">[Font name]</td><td style="border:1px solid #ddd;padding:8px">700</td><td style="border:1px solid #ddd;padding:8px">24–32px</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Body</td><td style="border:1px solid #ddd;padding:8px">[Font name]</td><td style="border:1px solid #ddd;padding:8px">400</td><td style="border:1px solid #ddd;padding:8px">14–16px</td></tr>
</table>
<h2 style="font-size:15px;margin-top:20px">Notes</h2>
<p>[Any additional usage guidelines, do's and don'ts, or special instructions]</p>`,

  "Requirement": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">REQUIREMENTS DOCUMENT</h1>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9;width:35%"><strong>Feature / Module</strong></td><td style="border:1px solid #ddd;padding:8px">[Feature Name]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Author</strong></td><td style="border:1px solid #ddd;padding:8px">[Name]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Date</strong></td><td style="border:1px solid #ddd;padding:8px">${new Date().toLocaleDateString()}</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Version</strong></td><td style="border:1px solid #ddd;padding:8px">v1.0</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Status</strong></td><td style="border:1px solid #ddd;padding:8px">Draft</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Background / Problem Statement</h2>
<p>[Describe the problem this feature solves and why it's needed]</p>
<h2 style="font-size:15px;margin-top:20px">Functional Requirements</h2>
<ul><li>[FR-01] [Requirement description]</li><li>[FR-02] [Requirement description]</li><li>[FR-03] [Requirement description]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Non-Functional Requirements</h2>
<ul><li>[NFR-01] Performance: [e.g. Page loads in under 2s]</li><li>[NFR-02] Security: [e.g. All data encrypted at rest]</li><li>[NFR-03] Scalability: [e.g. Must handle 10,000 concurrent users]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Out of Scope</h2>
<ul><li>[What is explicitly NOT included in this requirement]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Acceptance Criteria</h2>
<ul><li>[ ] [Criteria 1 — measurable pass/fail condition]</li><li>[ ] [Criteria 2]</li><li>[ ] [Criteria 3]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Dependencies &amp; Risks</h2>
<p>[Any dependencies on other teams, systems, or external services. Known risks.]</p>`,

  "Deployment Note": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">DEPLOYMENT NOTE</h1>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9;width:35%"><strong>Release Version</strong></td><td style="border:1px solid #ddd;padding:8px">v[X.X.X]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Deploy Date</strong></td><td style="border:1px solid #ddd;padding:8px">${new Date().toLocaleDateString()}</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Deploy Time</strong></td><td style="border:1px solid #ddd;padding:8px">[HH:MM] [Timezone]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Environment</strong></td><td style="border:1px solid #ddd;padding:8px">[Production / Staging]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Deployed By</strong></td><td style="border:1px solid #ddd;padding:8px">[Name]</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Changes Included</h2>
<ul><li>[Change 1 — brief description + ticket ID]</li><li>[Change 2]</li><li>[Change 3]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Pre-Deploy Checklist</h2>
<ul><li>[ ] Backup database taken</li><li>[ ] Staging tested and approved</li><li>[ ] All dependent services confirmed up</li><li>[ ] Maintenance window communicated to stakeholders</li><li>[ ] Rollback plan documented</li></ul>
<h2 style="font-size:15px;margin-top:20px">Deployment Steps</h2>
<ol><li>[Step 1]</li><li>[Step 2]</li><li>[Step 3]</li></ol>
<h2 style="font-size:15px;margin-top:20px">Rollback Plan</h2>
<p>[How to revert if deployment fails — specific commands or steps]</p>
<h2 style="font-size:15px;margin-top:20px">Post-Deploy Checks</h2>
<ul><li>[ ] Homepage loads correctly</li><li>[ ] Login / auth works</li><li>[ ] Key user flows tested</li><li>[ ] Error monitoring shows no new alerts</li><li>[ ] Performance metrics normal</li></ul>
<h2 style="font-size:15px;margin-top:20px">Notes</h2>
<p>[Any additional observations, known issues, or follow-up tasks]</p>`,

  "Compliance": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">COMPLIANCE RECORD</h1>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9;width:35%"><strong>Regulation / Standard</strong></td><td style="border:1px solid #ddd;padding:8px">[e.g. GDPR / ISO 27001 / PCI-DSS]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Scope</strong></td><td style="border:1px solid #ddd;padding:8px">[Department / System / Process covered]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Reviewed By</strong></td><td style="border:1px solid #ddd;padding:8px">[Name / Role]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Review Date</strong></td><td style="border:1px solid #ddd;padding:8px">${new Date().toLocaleDateString()}</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Next Review</strong></td><td style="border:1px solid #ddd;padding:8px">[Date]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Status</strong></td><td style="border:1px solid #ddd;padding:8px">[ ] Compliant &nbsp; [ ] Partial &nbsp; [ ] Non-Compliant</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Findings</h2>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:8px;text-align:left">#</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Finding</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Severity</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Status</th></tr>
<tr><td style="border:1px solid #ddd;padding:8px">1</td><td style="border:1px solid #ddd;padding:8px">[Finding description]</td><td style="border:1px solid #ddd;padding:8px">High / Med / Low</td><td style="border:1px solid #ddd;padding:8px">Open / Resolved</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px">2</td><td style="border:1px solid #ddd;padding:8px">[Finding description]</td><td style="border:1px solid #ddd;padding:8px">High / Med / Low</td><td style="border:1px solid #ddd;padding:8px">Open / Resolved</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Required Actions</h2>
<ul><li>[ ] [Action 1] — Responsible: [Name] — Due: [Date]</li><li>[ ] [Action 2] — Responsible: [Name] — Due: [Date]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Evidence / References</h2>
<p>[Links to supporting documents, audit trails, or evidence files]</p>`,

  "Screenshot": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">SCREENSHOT / SCREEN RECORD LOG</h1>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9;width:35%"><strong>Captured By</strong></td><td style="border:1px solid #ddd;padding:8px">[Name]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Date Captured</strong></td><td style="border:1px solid #ddd;padding:8px">${new Date().toLocaleDateString()}</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Device / Browser</strong></td><td style="border:1px solid #ddd;padding:8px">[e.g. Chrome 125 / iPhone 14 / Windows 11]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px;background:#f9f9f9"><strong>Environment</strong></td><td style="border:1px solid #ddd;padding:8px">[Production / Staging / Local]</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Context</h2>
<p>[What was being tested or reviewed when this screenshot was taken]</p>
<h2 style="font-size:15px;margin-top:20px">What It Shows</h2>
<p>[Describe what is visible — bug, UI state, error message, flow, etc.]</p>
<h2 style="font-size:15px;margin-top:20px">File / Link</h2>
<p>[Paste link or filename here — attach the actual file using the Files section below]</p>
<h2 style="font-size:15px;margin-top:20px">Related Issue / Ticket</h2>
<p>[Link to bug tracker, Jira, GitHub issue, etc.]</p>
<h2 style="font-size:15px;margin-top:20px">Notes</h2>
<p>[Any additional observations or follow-up needed]</p>`,

  "Other": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">DOCUMENT TITLE</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()} &nbsp;|&nbsp; <strong>Author:</strong> [Name]</p>
<hr/>
<p>[Start writing here — use the toolbar above to format your document]</p>`,

  "Proposal": `<h1 style="font-size:20px;border-bottom:2px solid #333;padding-bottom:8px">PROJECT PROPOSAL</h1>
<p><strong>Prepared for:</strong> [Client Name]<br/><strong>Prepared by:</strong> [Your Company]<br/><strong>Date:</strong> ${new Date().toLocaleDateString()}<br/><strong>Valid until:</strong> [Expiry Date]</p>
<h2 style="font-size:15px;margin-top:20px">Executive Summary</h2>
<p>[Brief overview of what you're proposing and the value it delivers]</p>
<h2 style="font-size:15px;margin-top:20px">Scope of Work</h2>
<ul><li>[Deliverable 1]</li><li>[Deliverable 2]</li><li>[Deliverable 3]</li></ul>
<h2 style="font-size:15px;margin-top:20px">Timeline</h2>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:8px;text-align:left">Phase</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Duration</th><th style="border:1px solid #ddd;padding:8px;text-align:left">Deliverable</th></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Phase 1</td><td style="border:1px solid #ddd;padding:8px">[X weeks]</td><td style="border:1px solid #ddd;padding:8px">[Deliverable]</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px">Phase 2</td><td style="border:1px solid #ddd;padding:8px">[X weeks]</td><td style="border:1px solid #ddd;padding:8px">[Deliverable]</td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Pricing</h2>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f4f4f4"><th style="border:1px solid #ddd;padding:8px;text-align:left">Item</th><th style="border:1px solid #ddd;padding:8px;text-align:right">Amount</th></tr>
<tr><td style="border:1px solid #ddd;padding:8px">[Item 1]</td><td style="border:1px solid #ddd;padding:8px;text-align:right">₹0.00</td></tr>
<tr><td style="border:1px solid #ddd;padding:8px"><strong>Total</strong></td><td style="border:1px solid #ddd;padding:8px;text-align:right"><strong>₹0.00</strong></td></tr></table>
<h2 style="font-size:15px;margin-top:20px">Terms &amp; Conditions</h2>
<p>[Payment terms, revision policy, IP ownership, etc.]</p>`,
};

const DOC_TEMPLATES = [
  { type: "Proposal",        icon: "📋", label: "Proposal",        description: "Outline scope, pricing & timeline for a client",          defaults: { status:"Draft", tags:["Client-Facing"], expiresAt: daysFromNow(30) } },
  { type: "Contract",        icon: "📝", label: "Contract",        description: "Formal agreement between two parties",                    defaults: { status:"Draft", tags:["Contract","Client-Facing"], expiresAt: daysFromNow(365) } },
  { type: "Invoice",         icon: "🧾", label: "Invoice",         description: "Bill a client for work completed",                        defaults: { status:"Draft", tags:["Client-Facing"], expiresAt: daysFromNow(30) } },
  { type: "NDA",             icon: "🔒", label: "NDA",             description: "Non-disclosure agreement to protect confidential info",    defaults: { status:"Draft", tags:["NDA","Contract","Internal"], expiresAt: daysFromNow(365) } },
  { type: "Brand Asset",     icon: "🎨", label: "Brand Asset",     description: "Logo, color palette, fonts, brand guidelines",            defaults: { status:"Draft", tags:["Internal","Template"] } },
  { type: "Requirement",     icon: "📐", label: "Requirement",     description: "Functional or technical requirements doc",                defaults: { status:"Draft", tags:["Internal"] } },
  { type: "Deployment Note", icon: "🚀", label: "Deployment Note", description: "Steps and checklist for a deployment or release",         defaults: { status:"Draft", tags:["Internal"] } },
  { type: "Compliance",      icon: "✅", label: "Compliance",      description: "Audit, policy or regulatory compliance record",           defaults: { status:"Draft", tags:["Internal","Compliance"], expiresAt: daysFromNow(365) } },
  { type: "Screenshot",      icon: "🖼️", label: "Screenshot",      description: "Link or reference to a screen capture or recording",      defaults: { status:"Draft", tags:["Internal"] } },
  { type: "Other",           icon: "📄", label: "Other",           description: "Blank document — fill in your own details",               defaults: { status:"Draft", tags:[] } },
];


// ── DocEditor ─────────────────────────────────────────────────────────────────
function DocEditor({ doc, onClose, onSave, contacts=[], workspaceId="", onSaveAsTemplate=null }) {
  const editorRef  = useRef(null);
  const imgInputRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Version history: array of { html, savedAt }
  const [versions, setVersions]       = useState(doc.editorVersions || []);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVer, setPreviewVer]   = useState(null);

  // Workflow modals
  const [showSig,        setShowSig]        = useState(false);
  const [showApproval,   setShowApproval]   = useState(false);
  const [showReminder,   setShowReminder]   = useState(false);
  const [showPassword,   setShowPassword]   = useState(false);
  const [showWatermark,  setShowWatermark]  = useState(false);
  const [showShareLink,  setShowShareLink]  = useState(false);
  const [showComments,   setShowComments]   = useState(false);

  // Local doc state (workflows mutate without closing editor)
  const [localDoc, setLocalDoc] = useState(doc);

  // Editor theme (dark/light)
  const [localEditorTheme, setLocalEditorTheme] = useState(() => { try { return localStorage.getItem(`doc-editor-theme`) || "light"; } catch { return "light"; } });
  useEffect(() => { try { localStorage.setItem(`doc-editor-theme`, localEditorTheme); } catch {} }, [localEditorTheme]);

  // Status bar
  const [wordCount, setWordCount]   = useState(0);
  const [lastSaved, setLastSaved]   = useState(doc.lastSavedAt || null);
  const [isDirty,   setIsDirty]     = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const exec = (cmd, val=null) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); };

  // ── Word count ──────────────────────────────────────────────────────────────
  const recalcWords = useCallback(() => {
    const text = editorRef.current?.innerText || "";
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    setWordCount(words);
  }, []);

  // Mark dirty + recalc on every input
  const handleInput = useCallback(() => {
    setIsDirty(true);
    recalcWords();
  }, [recalcWords]);

  useEffect(() => { recalcWords(); }, []);

  // ── Auto-save every 30 s ────────────────────────────────────────────────────
  const doSave = useCallback((isAuto = false) => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.innerText || "";
    const now  = new Date().toISOString();

    // Push to version history (keep last 20)
    const newVer = { html, savedAt: now };
    const newVersions = [newVer, ...versions].slice(0, 20);
    setVersions(newVersions);

    const saved = { ...localDoc, editorContent: html, notes: text.slice(0, 500), lastSavedAt: now, editorVersions: newVersions };
    setLocalDoc(saved);
    onSave(saved);

    setLastSaved(now);
    setIsDirty(false);
    if (isAuto) { setAutoSaving(true); setTimeout(() => setAutoSaving(false), 1200); }
    else toast("Document saved");
  }, [localDoc, onSave, versions]);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (isDirty) doSave(true);
    }, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [isDirty, doSave]);

  // ── TOC generator ───────────────────────────────────────────────────────────
  const generateTOC = () => {
    const el = editorRef.current;
    if (!el) return;
    const headings = el.querySelectorAll("h1,h2,h3");
    if (headings.length === 0) { toast("No headings found — add H1/H2/H3 to generate TOC","info"); return; }
    let toc = `<div style="border:1px solid #ddd;padding:14px 18px;border-radius:6px;margin-bottom:20px;background:#f9f9f9"><strong style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Table of Contents</strong><ol style="margin:8px 0 0;padding-left:18px;font-size:13px;line-height:2">`;
    headings.forEach((h, i) => {
      const id = `toc-heading-${i}`;
      h.id = id;
      const level = parseInt(h.tagName[1]);
      const indent = level > 1 ? `margin-left:${(level-1)*14}px;` : "";
      toc += `<li style="${indent}"><a href="#${id}" style="color:#6c63ff;text-decoration:none">${h.innerText}</a></li>`;
    });
    toc += `</ol></div>`;
    exec("insertHTML", toc);
    toast("Table of contents inserted");
  };

  // ── Insert page break ──────────────────────────────────────────────────────
  const insertPageBreak = () => {
    exec("insertHTML", `<div style="page-break-after:always;border-top:2px dashed #ccc;margin:20px 0;text-align:center;color:#999;font-size:11px;padding:6px 0">— Page Break —</div>`);
  };

  // ── Cover page ─────────────────────────────────────────────────────────────
  const [showCoverPageModal, setShowCoverPageModal] = useState(false);
  const [coverSettings, setCoverSettings] = useState({ logo:"", company:"", subtitle:"", accentColor:"#6c63ff" });

  const insertCoverPage = (settings) => {
    const html = `<div style="page-break-after:always;min-height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,${settings.accentColor}11 0%,${settings.accentColor}22 100%);border-radius:8px;padding:40px 32px;margin-bottom:24px;border:2px solid ${settings.accentColor}33">
      ${settings.logo ? `<img src="${settings.logo}" style="max-height:70px;margin-bottom:24px;object-fit:contain" alt="Logo"/>` : `<div style="width:60px;height:60px;border-radius:50%;background:${settings.accentColor};margin-bottom:24px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900">${(localDoc.name||"D")[0]}</div>`}
      ${settings.company ? `<div style="font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:${settings.accentColor};font-weight:700;margin-bottom:8px">${settings.company}</div>` : ""}
      <h1 style="font-size:28px;font-weight:900;color:#111;margin:0 0 12px;border:none;padding:0">${localDoc.name}</h1>
      ${settings.subtitle ? `<p style="font-size:14px;color:#666;margin:0 0 16px">${settings.subtitle}</p>` : ""}
      <div style="font-size:12px;color:#999;margin-top:20px;border-top:1px solid #ddd;padding-top:14px;width:100%">
        ${localDoc.type ? `<span>${localDoc.type}</span> &nbsp;|&nbsp; ` : ""}
        <span>${new Date().toLocaleDateString()}</span>
        ${localDoc.relatedClient ? ` &nbsp;|&nbsp; <span>Prepared for: ${localDoc.relatedClient}</span>` : ""}
        ${localDoc.status ? ` &nbsp;|&nbsp; <span style="font-weight:600;color:${settings.accentColor}">${localDoc.status}</span>` : ""}
      </div>
    </div>`;
    if (editorRef.current) {
      editorRef.current.innerHTML = html + (editorRef.current.innerHTML || "");
      setIsDirty(true);
      recalcWords();
    }
    setShowCoverPageModal(false);
    toast("Cover page inserted at top");
  };

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const wm = localDoc.watermark;
    const wmStyle = wm?.enabled ? `
      .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(${wm.angle||"-35"}deg);
        font-size:${wm.size||72}px;font-weight:900;color:${wm.color||"rgba(150,150,150,0.22)"};
        text-transform:uppercase;letter-spacing:0.1em;pointer-events:none;z-index:1000;white-space:nowrap;}
      @media print{.watermark{position:fixed;}}` : "";
    const wmHtml = wm?.enabled ? `<div class="watermark">${wm.text||"DRAFT"}</div>` : "";
    const hdrText = localDoc.printHeader || "";
    const ftrText = localDoc.printFooter || `${localDoc.name} — ${localDoc.status} — ${new Date().toLocaleDateString()}`;
    const brandColor = localDoc.brandColor || "#333";
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${localDoc.name}</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6;position:relative;}
      h1{font-size:22px;border-bottom:2px solid ${brandColor};padding-bottom:8px;color:${brandColor}}
      h2{font-size:17px;color:${brandColor}} h3{font-size:14px;color:${brandColor}}
      .meta{font-size:12px;color:#666;margin-bottom:24px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:6px 10px}
      @page{margin:20mm} @media print{body{margin:0}}
      .print-header{position:fixed;top:0;left:0;right:0;padding:8px 20px;border-bottom:2px solid ${brandColor};font-size:11px;color:#666;display:flex;justify-content:space-between;background:#fff;}
      .print-footer{position:fixed;bottom:0;left:0;right:0;padding:8px 20px;border-top:1px solid #ddd;font-size:11px;color:#666;display:flex;justify-content:space-between;background:#fff;}
      .print-footer .page-num:after{content:counter(page);}
      @media print{.print-header,.print-footer{position:fixed;} body{padding-top:40px;padding-bottom:40px;}}
      ${wmStyle}
    </style></head><body>
      ${wmHtml}
      ${hdrText ? `<div class="print-header"><span>${hdrText}</span><span>${localDoc.relatedClient||""}</span></div>` : ""}
      <h1>${localDoc.name}</h1>
      <div class="meta">Type: ${localDoc.type} &nbsp;|&nbsp; Status: ${localDoc.status}${localDoc.relatedClient ? ` &nbsp;|&nbsp; Client: ${localDoc.relatedClient}` : ""}${localDoc.expiresAt ? ` &nbsp;|&nbsp; Expires: ${localDoc.expiresAt}` : ""}</div>
      ${editorRef.current?.innerHTML || ""}
      <div class="print-footer"><span>${ftrText}</span><span class="page-num">Page </span></div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // ── Insert helpers ──────────────────────────────────────────────────────────
  const insertTable = () => {
    const rows = parseInt(window.prompt("Rows:", "3"), 10) || 3;
    const cols = parseInt(window.prompt("Columns:", "3"), 10) || 3;
    const hdr  = `<tr>${Array(cols).fill(0).map((_,i)=>`<th style="border:1px solid #ccc;padding:6px 10px;background:#f4f4f4;font-weight:700">Header ${i+1}</th>`).join("")}</tr>`;
    const body = Array(rows-1).fill(0).map(()=>`<tr>${Array(cols).fill(0).map(()=>`<td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td>`).join("")}</tr>`).join("");
    exec("insertHTML", `<table style="border-collapse:collapse;width:100%;margin:10px 0"><thead>${hdr}</thead><tbody>${body}</tbody></table><p></p>`);
  };

  const insertImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => exec("insertHTML", `<img src="${e.target.result}" style="max-width:100%;height:auto;border-radius:4px;margin:4px 0" />`);
    reader.readAsDataURL(file);
  };

  // ── Restore version ─────────────────────────────────────────────────────────
  const restoreVersion = (ver) => {
    if (!window.confirm("Restore this version? Your current content will be replaced.")) return;
    if (editorRef.current) editorRef.current.innerHTML = ver.html;
    setPreviewVer(null);
    setShowHistory(false);
    setIsDirty(true);
    recalcWords();
    toast("Version restored — save to keep it");
  };

  // ── Toolbar helpers ─────────────────────────────────────────────────────────
  const tbBtn = (label, action, title, active=false) => (
    <button title={title||label} onMouseDown={e=>{e.preventDefault();action();}}
      style={{ padding:"3px 8px", borderRadius:4, border:`1px solid ${active?"var(--accent,#6c63ff)":"var(--border)"}`, background: active?"var(--accent-muted,rgba(108,99,255,0.1))":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:13, lineHeight:1.4, whiteSpace:"nowrap" }}>
      {label}
    </button>
  );

  const tbSep = () => <span style={{ width:1, background:"var(--border)", margin:"0 3px", alignSelf:"stretch" }} />;

  const selStyle = { padding:"2px 5px", borderRadius:4, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12 };

  // ── Relative time ───────────────────────────────────────────────────────────
  const relTime = (iso) => {
    if (!iso) return null;
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 10)  return "just now";
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  };

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // ── Version history panel ──────────────────────────────────────────────────
  const HistoryPanel = () => (
    <div style={{ position:"absolute", top:0, right:0, bottom:0, width:320, background:"var(--card,var(--surface))", borderLeft:"1px solid var(--border)", zIndex:20, display:"flex", flexDirection:"column", boxShadow:"-4px 0 16px rgba(0,0,0,0.12)" }}>
      <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:700, fontSize:14 }}>🕐 Version History</span>
        <button onClick={()=>{setShowHistory(false);setPreviewVer(null);}} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18, lineHeight:1 }}>✕</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
        {versions.length === 0 && <div style={{ fontSize:13, color:"var(--text-muted)", textAlign:"center", marginTop:40 }}>No saved versions yet.<br/>Save the document to create one.</div>}
        {versions.map((v, i) => {
          const isPrev = previewVer === v;
          const wordLen = v.html.replace(/<[^>]+>/g,"").trim().split(/\s+/).filter(Boolean).length;
          return (
            <div key={v.savedAt} onClick={()=>setPreviewVer(isPrev ? null : v)}
              style={{ padding:"10px 12px", borderRadius:8, border:`1px solid ${isPrev?"var(--accent,#6c63ff)":"var(--border)"}`, background: isPrev?"var(--accent-muted,rgba(108,99,255,0.07))":"var(--surface)", cursor:"pointer", transition:"all 0.12s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>
                  {i === 0 ? "✦ Latest save" : `Version ${versions.length - i}`}
                </span>
                <span style={{ fontSize:10, color:"var(--text-muted)" }}>{wordLen}w</span>
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>{new Date(v.savedAt).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
              {isPrev && (
                <button onClick={e=>{e.stopPropagation();restoreVersion(v);}}
                  style={{ marginTop:8, width:"100%", padding:"5px 0", borderRadius:5, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  ↩ Restore this version
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"80vh", position:"relative" }}>

      {/* ── Cover page modal ── */}
      {showCoverPageModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowCoverPageModal(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:440, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14 }}>🎨 Insert Cover Page</div>
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Company name (optional)</label>
                <input value={coverSettings.company} onChange={e=>setCoverSettings(p=>({...p,company:e.target.value}))} placeholder="Your Company" style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Subtitle / tagline (optional)</label>
                <input value={coverSettings.subtitle} onChange={e=>setCoverSettings(p=>({...p,subtitle:e.target.value}))} placeholder="Prepared for…" style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Logo URL (optional)</label>
                <input value={coverSettings.logo} onChange={e=>setCoverSettings(p=>({...p,logo:e.target.value}))} placeholder="https://…/logo.png" style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Accent color</label>
                <input type="color" value={coverSettings.accentColor} onChange={e=>setCoverSettings(p=>({...p,accentColor:e.target.value}))} style={{ width:60, height:36, padding:2, border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", background:"var(--surface)" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18, paddingTop:12, borderTop:"1px solid var(--border)" }}>
              <button onClick={()=>setShowCoverPageModal(false)} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
              <button onClick={()=>insertCoverPage(coverSettings)} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>🎨 Insert Cover</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar row 1: font controls ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, padding:"6px 0 5px", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
        {/* Font family */}
        <select title="Font family" style={selStyle} defaultValue=""
          onChange={e=>{ exec("fontName", e.target.value); e.target.value=""; editorRef.current?.focus(); }}>
          <option value="" disabled>Font</option>
          {["Arial","Arial Black","Comic Sans MS","Courier New","Georgia","Impact","Palatino Linotype","Tahoma","Times New Roman","Trebuchet MS","Verdana"].map(f=>(
            <option key={f} value={f} style={{fontFamily:f}}>{f}</option>
          ))}
        </select>
        {tbSep()}
        {/* Font size */}
        <select title="Font size" style={selStyle} defaultValue=""
          onChange={e=>{ exec("fontSize", e.target.value); e.target.value=""; editorRef.current?.focus(); }}>
          <option value="" disabled>Size</option>
          {[["8","1"],["10","2"],["12","3"],["14","4"],["18","5"],["24","6"],["36","7"]].map(([label,val])=>(
            <option key={val} value={val}>{label}px</option>
          ))}
        </select>
        {tbSep()}
        {/* Heading / paragraph */}
        {tbBtn("H1",()=>exec("formatBlock","h1"),"Heading 1")}
        {tbBtn("H2",()=>exec("formatBlock","h2"),"Heading 2")}
        {tbBtn("¶", ()=>exec("formatBlock","p"), "Paragraph")}
        {tbSep()}
        {/* Font color */}
        <label title="Text color" style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:4, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", fontSize:12, userSelect:"none" }}>
          <span style={{ fontWeight:700 }}>A</span>
          <input type="color" defaultValue="#000000" onInput={e=>exec("foreColor", e.target.value)}
            style={{ width:18, height:14, padding:0, border:"none", background:"transparent", cursor:"pointer" }} />
        </label>
        {/* Highlight */}
        <label title="Highlight color" style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:4, border:"1px solid var(--border)", background:"var(--surface)", cursor:"pointer", fontSize:12, userSelect:"none" }}>
          <span>▐</span>
          <input type="color" defaultValue="#ffff00" onInput={e=>exec("hiliteColor", e.target.value)}
            style={{ width:18, height:14, padding:0, border:"none", background:"transparent", cursor:"pointer" }} />
        </label>
        <div style={{ marginLeft:"auto", display:"flex", gap:5, alignItems:"center" }}>
          {onSaveAsTemplate && <button onClick={onSaveAsTemplate} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontWeight:600, fontSize:12 }}>📄 Save as Template</button>}
          {/* Dark/light theme toggle */}
          <button title="Toggle editor theme" onClick={() => { const next = localEditorTheme === "light" ? "dark" : "light"; setLocalEditorTheme(next); }}
            style={{ padding:"3px 8px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontWeight:600, fontSize:12 }}>
            {localEditorTheme === "light" ? "🌙 Dark" : "☀ Light"}
          </button>
          <button onClick={handlePrint} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontWeight:600, fontSize:12 }}>🖨 Print</button>
          <button onClick={()=>doSave(false)} style={{ padding:"3px 12px", borderRadius:6, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:12 }}>💾 Save</button>
          <button onClick={onClose} style={{ padding:"3px 9px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:12 }}>✕</button>
        </div>
      </div>

      {/* ── Toolbar row 2: formatting ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, padding:"5px 0 7px", borderBottom:"1px solid var(--border)", marginBottom:8, alignItems:"center" }}>
        {tbBtn("𝐁", ()=>exec("bold"),          "Bold")}
        {tbBtn("𝐼", ()=>exec("italic"),        "Italic")}
        {tbBtn("U̲", ()=>exec("underline"),     "Underline")}
        {tbBtn("S̶", ()=>exec("strikeThrough"), "Strikethrough")}
        {tbSep()}
        {tbBtn("• List",  ()=>exec("insertUnorderedList"), "Bullet list")}
        {tbBtn("1. List", ()=>exec("insertOrderedList"),   "Numbered list")}
        {tbSep()}
        {tbBtn("≡",  ()=>exec("justifyLeft"),   "Align left")}
        {tbBtn("⊜",  ()=>exec("justifyCenter"), "Center")}
        {tbBtn("⇥",  ()=>exec("indent"),        "Indent")}
        {tbBtn("⇤",  ()=>exec("outdent"),       "Outdent")}
        {tbSep()}
        {tbBtn("🔗 Link", ()=>{ const u=window.prompt("URL:","https://"); if(u) exec("createLink",u); }, "Insert link")}
        {tbBtn("━ HR",    ()=>exec("insertHorizontalRule"), "Horizontal rule")}
        {tbBtn("⊞ Table", insertTable, "Insert table")}
        <button title="Insert image" onMouseDown={e=>e.preventDefault()} onClick={()=>imgInputRef.current?.click()}
          style={{ padding:"3px 8px", borderRadius:4, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:13, lineHeight:1.4, whiteSpace:"nowrap" }}>
          🖼 Image
        </button>
        <input ref={imgInputRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e=>{ if(e.target.files[0]) insertImage(e.target.files[0]); e.target.value=""; }} />
        {tbSep()}
        {tbBtn("↩ Undo", ()=>exec("undo"), "Undo")}
        {tbBtn("↪ Redo", ()=>exec("redo"), "Redo")}
        {tbSep()}
        {tbBtn("📑 TOC", generateTOC, "Insert table of contents from headings")}
        {tbBtn("⬛ Break", insertPageBreak, "Insert page break")}
        <button title="Insert cover page" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowCoverPageModal(true)}
          style={{ padding:"3px 8px", borderRadius:4, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:13, lineHeight:1.4, whiteSpace:"nowrap" }}>
          🎨 Cover
        </button>
        {tbSep()}
        {/* Version history toggle */}
        <button title="Version history" onMouseDown={e=>e.preventDefault()} onClick={()=>{setShowHistory(v=>!v);setPreviewVer(null);}}
          style={{ padding:"3px 8px", borderRadius:4, border:`1px solid ${showHistory?"var(--accent,#6c63ff)":"var(--border)"}`, background: showHistory?"var(--accent-muted,rgba(108,99,255,0.1))":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:13, lineHeight:1.4, whiteSpace:"nowrap" }}>
          🕐 History {versions.length > 0 && <span style={{ fontSize:10, background:"var(--accent,#6c63ff)", color:"#fff", borderRadius:999, padding:"1px 5px", marginLeft:3 }}>{versions.length}</span>}
        </button>
      </div>

      {/* ── Doc meta strip ── */}
      <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8, display:"flex", gap:14, alignItems:"center" }}>
        <span>{TYPE_ICONS[doc.type]||"📄"} <strong style={{color:"var(--text)"}}>{doc.name}</strong></span>
        {doc.relatedClient && <span>👤 {doc.relatedClient}</span>}
        {doc.status && <span style={{ color: STATUS_COLORS[doc.status]?.color||"inherit", fontWeight:600 }}>{doc.status}</span>}
      </div>

      {/* ── Editor + optional history panel ── */}
      <div style={{ flex:1, display:"flex", position:"relative", minHeight:0 }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: doc.editorContent || (doc.notes||"").replace(/\n/g,"<br/>") }}
          style={{ flex:1, overflowY:"auto", padding:"16px 20px", border:"1px solid var(--border)", borderRadius:8,
            background: localEditorTheme === "dark" ? "#1a1a2e" : "var(--surface)",
            color: localEditorTheme === "dark" ? "#e2e8f0" : "var(--text)",
            outline:"none", fontSize:14, lineHeight:1.8, minHeight:0, marginRight: showHistory ? 324 : 0, transition:"margin-right 0.2s,background 0.2s,color 0.2s" }}
        />
        {showHistory && <HistoryPanel />}
      </div>

      {/* ── Status bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"5px 2px 0", fontSize:11, color:"var(--text-muted)", borderTop:"1px solid var(--border)", marginTop:6 }}>
        <span>📝 {wordCount.toLocaleString()} word{wordCount !== 1 ? "s" : ""}</span>
        <span>⏱ ~{readingTime} min read</span>
        {localDoc.passwordProtected && <span title="Password protected">🔒</span>}
        {localDoc.watermark?.enabled && <span title={`Watermark: ${localDoc.watermark.text}`}>💧 {localDoc.watermark.text}</span>}
        {localDoc.approval?.status && (
          <span style={{ fontWeight:600, color: localDoc.approval.status==="approved"?"#166534":localDoc.approval.status==="rejected"?"#991b1b":"#a07c00" }}>
            {localDoc.approval.status==="approved"?"✅ Approved":localDoc.approval.status==="rejected"?"❌ Rejected":"⏳ In review"}
          </span>
        )}
        <span style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          {autoSaving && <span style={{ color:"var(--accent,#6c63ff)", fontWeight:600 }}>✓ Auto-saved</span>}
          {isDirty && !autoSaving && <span style={{ color:"#a07c00" }}>● Unsaved changes</span>}
          {!isDirty && lastSaved && !autoSaving && <span>✓ Saved {relTime(lastSaved)}</span>}
        </span>
      </div>

      {/* ── Workflow toolbar ── */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"7px 0 0", marginTop:4, borderTop:"1px solid var(--border)" }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", alignSelf:"center", marginRight:4 }}>Workflow:</span>
        <button title="E-Signature" onClick={()=>setShowSig(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          ✍ Sign
        </button>
        <button title="Send for approval / review" onClick={()=>setShowApproval(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${localDoc.approval?.status==="pending"?"#d4a000":"var(--border)"}`, background: localDoc.approval?.status==="pending"?"rgba(234,179,8,0.1)":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          📤 Approval
        </button>
        <button title="Expiry reminders" onClick={()=>setShowReminder(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${(localDoc.expiryReminders||[]).length?"#3b82f6":"var(--border)"}`, background: (localDoc.expiryReminders||[]).length?"rgba(59,130,246,0.08)":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          🔔 Reminders {(localDoc.expiryReminders||[]).length > 0 && <span style={{ fontSize:10, background:"#3b82f6", color:"#fff", borderRadius:999, padding:"0 4px", marginLeft:2 }}>{localDoc.expiryReminders.length}</span>}
        </button>
        <button title={localDoc.passwordProtected?"Change/remove password":"Password protect"} onClick={()=>setShowPassword(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${localDoc.passwordProtected?"var(--accent,#6c63ff)":"var(--border)"}`, background: localDoc.passwordProtected?"var(--accent-muted,rgba(108,99,255,0.1))":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          {localDoc.passwordProtected?"🔒 Protected":"🔓 Password"}
        </button>
        <button title="Watermark" onClick={()=>setShowWatermark(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${localDoc.watermark?.enabled?"var(--accent,#6c63ff)":"var(--border)"}`, background: localDoc.watermark?.enabled?"var(--accent-muted,rgba(108,99,255,0.1))":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          💧 Watermark
        </button>
        <button title="Share read-only link with client" onClick={()=>setShowShareLink(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${localDoc.shareLink?"#22c55e":"var(--border)"}`, background: localDoc.shareLink?"rgba(34,197,94,0.08)":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          🔗 {localDoc.shareLink ? "Shared" : "Share"}
        </button>
        <button title="Client comment threads" onClick={()=>setShowComments(true)}
          style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${(localDoc.comments||[]).length?"#3b82f6":"var(--border)"}`, background: (localDoc.comments||[]).length?"rgba(59,130,246,0.08)":"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          💬 Comments {(localDoc.comments||[]).length > 0 && <span style={{ fontSize:10, background:"#3b82f6", color:"#fff", borderRadius:999, padding:"0 4px", marginLeft:2 }}>{localDoc.comments.length}</span>}
        </button>
        {/* Print settings: header/footer/brand color */}
        <details style={{ display:"inline-flex", alignItems:"center", position:"relative" }}>
          <summary style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600, listStyle:"none", userSelect:"none" }}>🖨 Print setup</summary>
          <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:0, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:9, padding:14, zIndex:60, minWidth:300, boxShadow:"0 4px 18px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:10, color:"var(--text)" }}>Print / PDF Settings</div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Page header text</label>
                <input value={localDoc.printHeader||""} onChange={e=>setLocalDoc(p=>({...p,printHeader:e.target.value}))} placeholder="e.g. CONFIDENTIAL" style={{ width:"100%", padding:"5px 8px", borderRadius:5, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:12, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Page footer text</label>
                <input value={localDoc.printFooter||""} onChange={e=>setLocalDoc(p=>({...p,printFooter:e.target.value}))} placeholder={`${localDoc.name} — page number auto-added`} style={{ width:"100%", padding:"5px 8px", borderRadius:5, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:12, boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Brand color (headings & borders)</label>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="color" value={localDoc.brandColor||"#333333"} onChange={e=>setLocalDoc(p=>({...p,brandColor:e.target.value}))} style={{ width:40, height:30, padding:2, border:"1px solid var(--border)", borderRadius:5, cursor:"pointer", background:"var(--surface)" }} />
                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>Applied to headings in print output</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* ── Workflow modals ── */}
      {showSig && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowSig(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:520, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              ✍ E-Signature <button onClick={()=>setShowSig(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <ESignatureModal doc={localDoc} onClose={()=>setShowSig(false)} onSign={(sigBlock, dataUrl)=>{
              exec("insertHTML", sigBlock);
              const updated = { ...localDoc, signatures:[...(localDoc.signatures||[]), { dataUrl, signedAt: new Date().toISOString() }] };
              setLocalDoc(updated); setIsDirty(true); setShowSig(false);
              toast("✍ Signature applied");
            }} />
          </div>
        </div>
      )}

      {showApproval && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowApproval(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:500, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              📤 Approval Workflow <button onClick={()=>setShowApproval(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <ApprovalWorkflow doc={localDoc} contacts={contacts} onClose={()=>setShowApproval(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}

      {showReminder && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowReminder(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:480, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              🔔 Expiry Reminders <button onClick={()=>setShowReminder(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <ExpiryReminderModal doc={localDoc} onClose={()=>setShowReminder(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}

      {showPassword && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowPassword(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:440, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              🔒 Password Protect <button onClick={()=>setShowPassword(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <PasswordProtectModal doc={localDoc} onClose={()=>setShowPassword(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}

      {showWatermark && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowWatermark(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:480, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              💧 Watermark <button onClick={()=>setShowWatermark(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <WatermarkModal doc={localDoc} onClose={()=>setShowWatermark(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}

      {showShareLink && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowShareLink(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:520, width:"95vw" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              🔗 Share with Client <button onClick={()=>setShowShareLink(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <ShareLinkModal doc={localDoc} workspaceId={workspaceId} onClose={()=>setShowShareLink(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}

      {showComments && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowComments(false)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:14, padding:24, boxShadow:"0 8px 32px rgba(0,0,0,0.22)", maxWidth:540, width:"95vw", maxHeight:"85vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              💬 Comment Threads <button onClick={()=>setShowComments(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:18 }}>✕</button>
            </div>
            <CommentThreadsModal doc={localDoc} onClose={()=>setShowComments(false)} onUpdate={updated=>{ setLocalDoc(updated); onSave(updated); }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKFLOW COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── ESignatureModal ───────────────────────────────────────────────────────────
function ESignatureModal({ doc, onClose, onSign }) {
  const [mode, setMode]         = useState("draw"); // "draw" | "type"
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState("cursive");
  const canvasRef               = useRef(null);
  const drawing                 = useRef(false);
  const lastPos                 = useRef(null);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    lastPos.current = getPos(e, canvasRef.current);
    e.preventDefault();
  };
  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };
  const stopDraw = () => { drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const isEmpty = () => {
    if (mode === "type") return !typedName.trim();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
    return !data.some((v, i) => i % 4 === 3 && v > 0);
  };

  const getSignatureDataUrl = () => {
    if (mode === "type") {
      const canvas = document.createElement("canvas");
      canvas.width = 400; canvas.height = 100;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 400, 100);
      ctx.font = `italic 48px ${typedFont}`;
      ctx.fillStyle = "#1a1a2e";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 200, 54);
      return canvas.toDataURL();
    }
    return canvasRef.current?.toDataURL();
  };

  const handleSign = () => {
    if (isEmpty()) { toast("Please draw or type your signature first", "info"); return; }
    const dataUrl = getSignatureDataUrl();
    const sigBlock = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #ccc;display:inline-block">
      <img src="${dataUrl}" style="height:60px;display:block;margin-bottom:4px" />
      <div style="font-size:11px;color:#555">Signed: ${doc.relatedClient || "Signatory"} &nbsp;·&nbsp; ${new Date().toLocaleString()}</div>
    </div>`;
    onSign(sigBlock, dataUrl);
  };

  const btnTab = (label, val) => (
    <button onClick={()=>setMode(val)} style={{ padding:"6px 18px", borderRadius:6, border:"none", fontWeight:600, fontSize:13, cursor:"pointer",
      background: mode===val ? "var(--accent,#6c63ff)" : "var(--surface)", color: mode===val ? "#fff" : "var(--text-muted)", transition:"all 0.12s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minWidth:440 }}>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-muted)" }}>
        Add your signature to <strong style={{color:"var(--text)"}}>{doc.name}</strong>. It will be stamped at the end of the document.
      </p>

      {/* Tab toggle */}
      <div style={{ display:"flex", gap:4, marginBottom:16, background:"var(--surface)", padding:3, borderRadius:8, width:"fit-content", border:"1px solid var(--border)" }}>
        {btnTab("✍ Draw","draw")}
        {btnTab("Aa Type","type")}
      </div>

      {mode === "draw" ? (
        <div>
          <canvas ref={canvasRef} width={440} height={140}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            style={{ border:"1.5px solid var(--border)", borderRadius:8, background:"#fff", cursor:"crosshair", touchAction:"none", display:"block", width:"100%" }} />
          <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end" }}>
            <button onClick={clearCanvas} style={{ fontSize:12, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer" }}>🗑 Clear</button>
          </div>
        </div>
      ) : (
        <div>
          <input value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Type your full name…"
            style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid var(--border)", fontSize:28, fontFamily:typedFont, color:"#1a1a2e", background:"#fff", outline:"none", boxSizing:"border-box", fontStyle:"italic" }} />
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            {[["cursive","Cursive"],["'Dancing Script',cursive","Script"],["'Times New Roman',serif","Classic"],["Georgia,serif","Georgia"],["'Palatino Linotype',serif","Palatino"]].map(([f,label])=>(
              <button key={f} onClick={()=>setTypedFont(f)}
                style={{ padding:"4px 12px", borderRadius:6, border:`1.5px solid ${typedFont===f?"var(--accent,#6c63ff)":"var(--border)"}`, background: typedFont===f?"var(--accent-muted,rgba(108,99,255,0.08))":"var(--surface)", fontFamily:f, fontSize:16, cursor:"pointer", fontStyle:"italic", color:"var(--text)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20, paddingTop:14, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
        <button onClick={handleSign} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>✍ Apply Signature</button>
      </div>
    </div>
  );
}

// ── ApprovalWorkflow ──────────────────────────────────────────────────────────
function ApprovalWorkflow({ doc, contacts=[], onClose, onUpdate }) {
  const approval = doc.approval || {};
  const [reviewer, setReviewer] = useState(approval.reviewer || "");
  const [message,  setMessage]  = useState(approval.message  || "");
  const [comment,  setComment]  = useState("");
  const [tab, setTab] = useState(approval.status ? "status" : "send");

  const contactNames = [...new Set((contacts||[]).map(c=>c.name||c.company||"").filter(Boolean))];

  const sendForReview = () => {
    if (!reviewer.trim()) { toast("Enter a reviewer name","info"); return; }
    onUpdate({ ...doc, status:"Review", approval:{ status:"pending", reviewer, message, sentAt: new Date().toISOString(), history:[] } });
    toast(`Sent to ${reviewer} for review`);
    onClose();
  };

  const decide = (decision) => {
    const entry = { decision, comment, at: new Date().toISOString(), by: reviewer };
    const newHistory = [...(approval.history||[]), entry];
    const newStatus = decision === "approved" ? "Signed" : "Draft";
    onUpdate({ ...doc, status: newStatus, approval:{ ...approval, status: decision, decidedAt: new Date().toISOString(), history: newHistory } });
    toast(decision === "approved" ? "✅ Document approved" : "❌ Document rejected");
    onClose();
  };

  const timeline = (approval.history||[]);

  const chip = (label, color) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 10px", borderRadius:999, fontSize:12, fontWeight:600, background:`${color}22`, color }}>{label}</span>
  );

  return (
    <div style={{ minWidth:420 }}>
      {/* Tab bar */}
      {approval.status && (
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"var(--surface)", padding:3, borderRadius:8, width:"fit-content", border:"1px solid var(--border)" }}>
          {[["Send for Review","send"],["Review Status","status"]].map(([l,v])=>(
            <button key={v} onClick={()=>setTab(v)} style={{ padding:"5px 16px", borderRadius:6, border:"none", fontWeight:600, fontSize:12, cursor:"pointer",
              background: tab===v?"var(--accent,#6c63ff)":"transparent", color: tab===v?"#fff":"var(--text-muted)" }}>{l}</button>
          ))}
        </div>
      )}

      {tab === "send" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Reviewer *</label>
            <input value={reviewer} onChange={e=>setReviewer(e.target.value)} list="approval-contacts" placeholder="Name or email…"
              style={{ width:"100%", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
            <datalist id="approval-contacts">{contactNames.map(n=><option key={n} value={n}/>)}</datalist>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Message to reviewer (optional)</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} placeholder="Please review by end of week…"
              style={{ width:"100%", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, resize:"vertical", boxSizing:"border-box" }} />
          </div>
          <div style={{ padding:"10px 14px", borderRadius:8, background:"var(--accent-muted,rgba(108,99,255,0.07))", border:"1px solid rgba(108,99,255,0.2)", fontSize:12, color:"var(--text-muted)" }}>
            ℹ️ Document status will change to <strong>Review</strong>. Once a decision is recorded it will move to <strong>Signed</strong> or back to <strong>Draft</strong>.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
            <button onClick={sendForReview} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>📤 Send for Review</button>
          </div>
        </div>
      )}

      {tab === "status" && approval.status && (
        <div>
          {/* Current state */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
            <span style={{ fontSize:28 }}>{approval.status==="approved"?"✅":approval.status==="rejected"?"❌":"⏳"}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>
                {approval.status==="pending"?"Awaiting review":approval.status==="approved"?"Approved":"Rejected"}
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                Reviewer: <strong>{approval.reviewer}</strong>
                {approval.sentAt && <> · Sent {new Date(approval.sentAt).toLocaleDateString()}</>}
              </div>
            </div>
            <div style={{ marginLeft:"auto" }}>
              {approval.status==="pending" && chip("Pending","#d4a000")}
              {approval.status==="approved" && chip("Approved","#166534")}
              {approval.status==="rejected" && chip("Rejected","#991b1b")}
            </div>
          </div>

          {/* Record decision (only if pending) */}
          {approval.status === "pending" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"14px 16px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>Record decision</div>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2} placeholder="Comments (optional)…"
                style={{ width:"100%", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, resize:"vertical", boxSizing:"border-box" }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>decide("approved")} style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", background:"rgba(34,197,94,0.15)", color:"#166534", fontWeight:700, fontSize:13, cursor:"pointer" }}>✅ Approve</button>
                <button onClick={()=>decide("rejected")} style={{ flex:1, padding:"8px 0", borderRadius:7, border:"none", background:"rgba(239,68,68,0.12)", color:"#991b1b", fontWeight:700, fontSize:13, cursor:"pointer" }}>❌ Reject</button>
              </div>
            </div>
          )}

          {/* History */}
          {timeline.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", marginBottom:8 }}>History</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {timeline.map((e,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12 }}>
                    <span>{e.decision==="approved"?"✅":"❌"}</span>
                    <div>
                      <span style={{ fontWeight:600, color:"var(--text)" }}>{e.decision==="approved"?"Approved":"Rejected"}</span>
                      {e.comment && <span style={{ color:"var(--text-muted)" }}> — {e.comment}</span>}
                      <div style={{ color:"var(--text-muted)", marginTop:2 }}>{e.by} · {new Date(e.at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ExpiryReminderModal ───────────────────────────────────────────────────────
function ExpiryReminderModal({ doc, onClose, onUpdate }) {
  const reminders = doc.expiryReminders || [];
  const [days, setDays]     = useState("7");
  const [email, setEmail]   = useState("");
  const [note, setNote]     = useState("");

  const add = () => {
    const d = parseInt(days, 10);
    if (!d || d < 1) { toast("Enter valid days","info"); return; }
    if (!email.trim()) { toast("Enter an email or name","info"); return; }
    const r = { id: Math.random().toString(36).slice(2), days: d, email: email.trim(), note: note.trim(), createdAt: new Date().toISOString() };
    onUpdate({ ...doc, expiryReminders: [...reminders, r] });
    setEmail(""); setNote(""); setDays("7");
    toast(`Reminder set — ${d} day${d!==1?"s":""} before expiry`);
  };

  const remove = (id) => { onUpdate({ ...doc, expiryReminders: reminders.filter(r=>r.id!==id) }); toast("Reminder removed","info"); };

  const expiryStr = doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}) : null;

  return (
    <div style={{ minWidth:420 }}>
      {!doc.expiresAt ? (
        <div style={{ padding:"20px 0", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
          This document has no expiry date set.<br/>Edit the document metadata to add one first.
        </div>
      ) : (
        <>
          <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(234,179,8,0.1)", border:"1px solid rgba(234,179,8,0.3)", fontSize:13, color:"#a07c00", marginBottom:16 }}>
            ⏰ Document expires <strong>{expiryStr}</strong>
          </div>

          {/* Add reminder */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"14px 16px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
            <div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>Add reminder</div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
              <div style={{ flex:"0 0 110px" }}>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Days before</label>
                <input type="number" min="1" max="365" value={days} onChange={e=>setDays(e.target.value)}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Notify (email / name)</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="e.g. team@company.com"
                  style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Note (optional)</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Renew contract with client"
                style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={add} style={{ padding:"7px 18px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Add Reminder</button>
            </div>
          </div>

          {/* Existing reminders */}
          {reminders.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", marginBottom:8 }}>Scheduled reminders</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {reminders.map(r=>(
                  <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:13 }}>
                    <span style={{ fontSize:18 }}>🔔</span>
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight:600, color:"var(--text)" }}>{r.days} day{r.days!==1?"s":""} before</span>
                      <span style={{ color:"var(--text-muted)" }}> → {r.email}</span>
                      {r.note && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>{r.note}</div>}
                    </div>
                    <button onClick={()=>remove(r.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger,#ef4444)", fontSize:16 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {reminders.length === 0 && <div style={{ fontSize:12, color:"var(--text-muted)", textAlign:"center", padding:"8px 0" }}>No reminders set yet.</div>}
        </>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ── PasswordProtectModal ──────────────────────────────────────────────────────
function PasswordProtectModal({ doc, onClose, onUpdate }) {
  const hasPass = !!doc.passwordHash;
  const [mode, setMode]       = useState(hasPass ? "manage" : "set");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [show, setShow]       = useState(false);
  const [err, setErr]         = useState("");

  // Simple hash (not cryptographic — for in-app protection only)
  const simpleHash = (s) => {
    let h = 0x9e3779b9;
    for (let i=0;i<s.length;i++) h = Math.imul(h ^ s.charCodeAt(i), 0x517cc1b727220a95);
    return (h >>> 0).toString(36);
  };

  const setPassword = () => {
    setErr("");
    if (newPass.length < 4) { setErr("Password must be at least 4 characters"); return; }
    if (newPass !== confirm) { setErr("Passwords do not match"); return; }
    onUpdate({ ...doc, passwordHash: simpleHash(newPass), passwordProtected: true });
    toast("🔒 Document password set"); onClose();
  };

  const removePassword = () => {
    if (simpleHash(current) !== doc.passwordHash) { setErr("Incorrect current password"); return; }
    onUpdate({ ...doc, passwordHash: null, passwordProtected: false });
    toast("🔓 Password removed"); onClose();
  };

  const inputSt = { width:"100%", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" };

  return (
    <div style={{ minWidth:380 }}>
      {hasPass && (
        <div style={{ display:"flex", gap:4, marginBottom:16, background:"var(--surface)", padding:3, borderRadius:8, width:"fit-content", border:"1px solid var(--border)" }}>
          {[["Set New","set"],["Remove","manage"]].map(([l,v])=>(
            <button key={v} onClick={()=>{setMode(v);setErr("");}} style={{ padding:"5px 16px", borderRadius:6, border:"none", fontWeight:600, fontSize:12, cursor:"pointer",
              background:mode===v?"var(--accent,#6c63ff)":"transparent", color:mode===v?"#fff":"var(--text-muted)" }}>{l}</button>
          ))}
        </div>
      )}

      {mode === "set" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(108,99,255,0.08)", border:"1px solid rgba(108,99,255,0.2)", fontSize:12, color:"var(--text-muted)" }}>
            🔒 The editor will require this password before opening the document.
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>New password</label>
            <div style={{ position:"relative" }}>
              <input type={show?"text":"password"} value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min. 4 characters" style={inputSt} />
              <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:14 }}>{show?"🙈":"👁"}</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Confirm password</label>
            <input type={show?"text":"password"} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" style={inputSt} />
          </div>
          {err && <div style={{ fontSize:12, color:"var(--danger,#ef4444)" }}>⚠ {err}</div>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
            <button onClick={setPassword} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>🔒 Set Password</button>
          </div>
        </div>
      )}

      {mode === "manage" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", fontSize:12, color:"var(--text-muted)" }}>
            🔓 Enter the current password to remove protection from this document.
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Current password</label>
            <input type={show?"text":"password"} value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Enter current password" style={inputSt} />
          </div>
          {err && <div style={{ fontSize:12, color:"var(--danger,#ef4444)" }}>⚠ {err}</div>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
            <button onClick={removePassword} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"rgba(239,68,68,0.9)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>🔓 Remove Password</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WatermarkModal ────────────────────────────────────────────────────────────
function WatermarkModal({ doc, onClose, onUpdate }) {
  const wm = doc.watermark || {};
  const [text,    setText]    = useState(wm.text    || "DRAFT");
  const [color,   setColor]   = useState(wm.color   || "rgba(150,150,150,0.22)");
  const [size,    setSize]    = useState(wm.size    || 72);
  const [angle,   setAngle]   = useState(wm.angle   || -35);
  const [enabled, setEnabled] = useState(wm.enabled ?? false);

  const PRESETS = ["DRAFT","CONFIDENTIAL","INTERNAL","SAMPLE","VOID","APPROVED","DO NOT COPY","COPY"];

  const save = () => {
    onUpdate({ ...doc, watermark: { text, color, size, angle, enabled } });
    toast(enabled ? `Watermark "${text}" applied` : "Watermark disabled"); onClose();
  };

  const PreviewBox = () => (
    <div style={{ position:"relative", width:"100%", height:160, border:"1px solid var(--border)", borderRadius:8, background:"#fff", overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"12px 16px", fontSize:12, color:"#555", lineHeight:1.6 }}>
        <strong style={{ fontSize:14, borderBottom:"1px solid #ccc", display:"block", paddingBottom:4, marginBottom:6 }}>DOCUMENT PREVIEW</strong>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </div>
      {enabled && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ fontSize:size/2, fontWeight:900, color, transform:`rotate(${angle}deg)`, textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap", userSelect:"none" }}>
            {text}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minWidth:420 }}>
      <PreviewBox />

      {/* Enable toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
        <span style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>Enable watermark</span>
        <button onClick={()=>setEnabled(v=>!v)} style={{ padding:"4px 14px", borderRadius:20, border:"none", fontWeight:700, fontSize:12, cursor:"pointer",
          background: enabled?"var(--accent,#6c63ff)":"var(--surface)", color: enabled?"#fff":"var(--text-muted)", border:"1px solid var(--border)", transition:"all 0.15s" }}>
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      {/* Preset text */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", marginBottom:6 }}>Watermark text</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {PRESETS.map(p=>(
            <button key={p} onClick={()=>setText(p)} style={{ padding:"4px 10px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", border:`1.5px solid ${text===p?"var(--accent,#6c63ff)":"var(--border)"}`, background: text===p?"var(--accent-muted,rgba(108,99,255,0.1))":"var(--surface)", color: text===p?"var(--accent,#6c63ff)":"var(--text-muted)" }}>{p}</button>
          ))}
        </div>
        <input value={text} onChange={e=>setText(e.target.value.toUpperCase())} placeholder="Custom text…"
          style={{ width:"100%", padding:"7px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box", fontWeight:700 }} />
      </div>

      {/* Controls */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Color</label>
          <input type="color" value={color.startsWith("rgba")?color:"#969696"} onChange={e=>setColor(e.target.value+"55")}
            style={{ width:"100%", height:36, padding:2, border:"1px solid var(--border)", borderRadius:6, cursor:"pointer", background:"var(--surface)" }} />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Size {size}px</label>
          <input type="range" min={24} max={144} value={size} onChange={e=>setSize(+e.target.value)} style={{ width:"100%", marginTop:8 }} />
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Angle {angle}°</label>
          <input type="range" min={-90} max={90} value={angle} onChange={e=>setAngle(+e.target.value)} style={{ width:"100%", marginTop:8 }} />
        </div>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
        <button onClick={save} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>💾 Save Watermark</button>
      </div>
    </div>
  );
}

// ── ShareLinkModal ────────────────────────────────────────────────────────────
function ShareLinkModal({ doc, workspaceId, onClose, onUpdate }) {
  const existing = doc.shareLink || null;
  const [link, setLink]               = useState(existing);
  const [allowUpload, setAllowUpload] = useState(doc.shareLinkAllowUpload ?? true);
  const [copied, setCopied]           = useState(false);
  const [clientFiles, setClientFiles] = useState(doc.clientUploads || []);
  const [busy, setBusy]               = useState(false);

  // Refresh client uploads from Firestore when modal opens (if a token exists)
  useEffect(() => {
    if (!doc.shareLinkToken || !workspaceId) return;
    getClientUploads(workspaceId, doc.shareLinkToken).then(files => {
      if (files.length > 0) {
        setClientFiles(files);
        onUpdate({ ...doc, clientUploads: files });
      }
    });
  }, []);

  const generateLink = async () => {
    setBusy(true);
    try {
      // Revoke old token first if one exists
      if (doc.shareLinkToken && workspaceId) {
        await revokeShareToken(workspaceId, doc.shareLinkToken);
      }
      const token = btoa(`${doc.id}-${Date.now()}`).replace(/[^a-zA-Z0-9]/g,"").slice(0,24);
      // Hash route works without any server config
      const url = `${window.location.origin}${window.location.pathname}#/share/${workspaceId}/${token}`;
      if (workspaceId) {
        await createShareToken(workspaceId, token, doc, allowUpload);
      }
      const updated = { ...doc, shareLink: url, shareLinkToken: token, shareLinkAllowUpload: allowUpload, clientUploads: clientFiles };
      setLink(url);
      onUpdate(updated);
      toast("🔗 Shareable link generated");
    } catch (err) {
      toast("Failed to generate link: " + err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async () => {
    setBusy(true);
    try {
      if (doc.shareLinkToken && workspaceId) {
        await revokeShareToken(workspaceId, doc.shareLinkToken);
      }
      const updated = { ...doc, shareLink: null, shareLinkToken: null };
      setLink(null);
      onUpdate(updated);
      toast("Link revoked","info");
    } catch (err) {
      toast("Failed to revoke: " + err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  const removeClientFile = (id) => {
    const updated = clientFiles.filter(f=>f.id!==id);
    setClientFiles(updated);
    onUpdate({ ...doc, clientUploads: updated });
    toast("File removed","info");
  };

  const fmtSize = (b) => !b ? "" : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(2)}MB`;

  return (
    <div style={{ minWidth:460 }}>
      <p style={{ margin:"0 0 16px", fontSize:13, color:"var(--text-muted)" }}>
        Generate a read-only link to share <strong style={{color:"var(--text)"}}>{doc.name}</strong> with your client. No login required.
      </p>

      {/* Options */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>Allow client file uploads</div>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>Client can attach files via the link (no login needed)</div>
        </div>
        <button onClick={()=>setAllowUpload(v=>!v)} style={{ padding:"4px 14px", borderRadius:20, border:"1px solid var(--border)", fontWeight:700, fontSize:12, cursor:"pointer",
          background: allowUpload?"var(--accent,#6c63ff)":"var(--surface)", color: allowUpload?"#fff":"var(--text-muted)", transition:"all 0.15s" }}>
          {allowUpload ? "ON" : "OFF"}
        </button>
      </div>

      {/* Link display */}
      {link ? (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", gap:6 }}>
            <input readOnly value={link} style={{ flex:1, padding:"8px 11px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-muted)", fontSize:12, fontFamily:"monospace" }} />
            <button onClick={copyLink} style={{ padding:"7px 14px", borderRadius:7, border:"none", background: copied?"#22c55e":"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", transition:"background 0.2s" }}>
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:6 }}>
            ℹ️ This link opens a read-only view. {allowUpload ? "Client can also upload files." : ""}
          </div>
        </div>
      ) : (
        <div style={{ padding:"14px", borderRadius:8, background:"var(--surface)", border:"1px solid var(--border)", textAlign:"center", color:"var(--text-muted)", fontSize:13, marginBottom:14 }}>
          No link generated yet.
        </div>
      )}

      {/* Client-uploaded files */}
      {clientFiles.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", marginBottom:8 }}>Files uploaded by client</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {clientFiles.map(f=>(
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", border:"1px solid var(--border)", borderRadius:7, background:"var(--surface)", fontSize:13 }}>
                <span>📎</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:"var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>{fmtSize(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}</div>
                </div>
                <a href={f.dataUrl} download={f.name} style={{ padding:"3px 9px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text)", textDecoration:"none", fontSize:12 }}>⬇</a>
                <button onClick={()=>removeClientFile(f.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger,#ef4444)" }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", paddingTop:12, borderTop:"1px solid var(--border)" }}>
        {link && <button onClick={revokeLink} disabled={busy} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid rgba(239,68,68,0.4)", background:"transparent", color:"var(--danger,#ef4444)", cursor:"pointer", fontSize:13, fontWeight:600, opacity:busy?0.6:1 }}>🚫 Revoke link</button>}
        <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
        <button onClick={generateLink} disabled={busy} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", opacity:busy?0.7:1 }}>
          {busy ? "…" : link ? "🔄 Regenerate" : "🔗 Generate link"}
        </button>
      </div>
    </div>
  );
}

// ── CommentThreadsModal ───────────────────────────────────────────────────────
function CommentThreadsModal({ doc, onClose, onUpdate }) {
  const comments    = doc.comments || [];
  const [author, setAuthor]   = useState("");
  const [body, setBody]       = useState("");
  const [replyTo, setReplyTo] = useState(null); // comment id
  const [replyBody, setReplyBody] = useState("");

  const addComment = () => {
    if (!body.trim()) { toast("Enter a comment","info"); return; }
    const c = { id: Math.random().toString(36).slice(2), author: author.trim() || "You", body: body.trim(), createdAt: new Date().toISOString(), replies: [] };
    onUpdate({ ...doc, comments: [...comments, c] });
    setBody("");
    toast("Comment added");
  };

  const addReply = (parentId) => {
    if (!replyBody.trim()) return;
    const reply = { id: Math.random().toString(36).slice(2), author: author.trim() || "You", body: replyBody.trim(), createdAt: new Date().toISOString() };
    const updated = comments.map(c => c.id === parentId ? { ...c, replies: [...(c.replies||[]), reply] } : c);
    onUpdate({ ...doc, comments: updated });
    setReplyTo(null); setReplyBody("");
    toast("Reply added");
  };

  const resolveComment = (id) => {
    const updated = comments.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c);
    onUpdate({ ...doc, comments: updated });
  };

  const deleteComment = (id) => {
    onUpdate({ ...doc, comments: comments.filter(c=>c.id!==id) });
    toast("Comment removed","info");
  };

  const timeFmt = (iso) => { try { return new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); } catch { return ""; } };

  return (
    <div style={{ minWidth:460 }}>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-muted)" }}>
        Inline feedback threads on <strong style={{color:"var(--text)"}}>{doc.name}</strong>. Clients can leave comments via the shared link.
      </p>

      {/* New comment */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"12px 14px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:16 }}>
        <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Your name (optional)"
          style={{ padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:12 }} />
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3} placeholder="Leave a comment or feedback on this document…"
          style={{ padding:"8px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, resize:"vertical" }} />
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={addComment} style={{ padding:"6px 16px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Add comment</button>
        </div>
      </div>

      {/* Thread list */}
      {comments.length === 0 && <div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>No comments yet.</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {comments.map(c => (
          <div key={c.id} style={{ border:`1px solid ${c.resolved?"rgba(34,197,94,0.3)":"var(--border)"}`, borderRadius:9, overflow:"hidden", opacity: c.resolved ? 0.7 : 1 }}>
            {/* Comment header */}
            <div style={{ padding:"10px 14px", background: c.resolved?"rgba(34,197,94,0.06)":"var(--surface)", display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--accent-muted,rgba(108,99,255,0.15))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"var(--accent,#6c63ff)", flexShrink:0 }}>
                {(c.author||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{c.author || "Anonymous"}</span>
                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>{timeFmt(c.createdAt)}</span>
                  {c.resolved && <span style={{ fontSize:11, color:"#166534", fontWeight:600, background:"rgba(34,197,94,0.12)", padding:"1px 7px", borderRadius:99 }}>✓ Resolved</span>}
                </div>
                <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.5 }}>{c.body}</div>
              </div>
              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                <button onClick={()=>resolveComment(c.id)} title={c.resolved?"Reopen":"Mark resolved"}
                  style={{ padding:"3px 8px", borderRadius:5, border:"1px solid var(--border)", background:"transparent", color: c.resolved?"#166534":"var(--text-muted)", cursor:"pointer", fontSize:11, fontWeight:600 }}>
                  {c.resolved ? "↩ Reopen" : "✓ Resolve"}
                </button>
                <button onClick={()=>deleteComment(c.id)} style={{ padding:"3px 6px", borderRadius:5, border:"none", background:"transparent", color:"var(--danger,#ef4444)", cursor:"pointer", fontSize:13 }}>🗑</button>
              </div>
            </div>

            {/* Replies */}
            {(c.replies||[]).length > 0 && (
              <div style={{ borderTop:"1px solid var(--border)" }}>
                {c.replies.map(r=>(
                  <div key={r.id} style={{ padding:"8px 14px 8px 52px", display:"flex", gap:8, alignItems:"flex-start", borderTop:"1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>
                      {(r.author||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight:700, fontSize:12, color:"var(--text)" }}>{r.author || "Anonymous"}</span>
                      <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:6 }}>{timeFmt(r.createdAt)}</span>
                      <div style={{ fontSize:13, color:"var(--text)", marginTop:2, lineHeight:1.5 }}>{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyTo === c.id ? (
              <div style={{ padding:"8px 14px", borderTop:"1px solid var(--border)", display:"flex", gap:6 }}>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={2} placeholder="Write a reply…"
                  style={{ flex:1, padding:"6px 9px", borderRadius:6, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:12, resize:"none" }} />
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <button onClick={()=>addReply(c.id)} style={{ padding:"5px 12px", borderRadius:6, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer" }}>Reply</button>
                  <button onClick={()=>setReplyTo(null)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:11, cursor:"pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ padding:"6px 14px", borderTop:"1px solid var(--border)" }}>
                <button onClick={()=>{ setReplyTo(c.id); setReplyBody(""); }}
                  style={{ fontSize:11, color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>↩ Reply</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ── PasswordGate ──────────────────────────────────────────────────────────────
function PasswordGate({ doc, onUnlock, onCancel }) {
  const [pass, setPass]   = useState("");
  const [show, setShow]   = useState(false);
  const [err,  setErr]    = useState("");

  const simpleHash = (s) => {
    let h = 0x9e3779b9;
    for (let i=0;i<s.length;i++) h = Math.imul(h ^ s.charCodeAt(i), 0x517cc1b727220a95);
    return (h >>> 0).toString(36);
  };

  const tryUnlock = () => {
    if (simpleHash(pass) === doc.passwordHash) { onUnlock(); }
    else { setErr("Incorrect password"); setPass(""); }
  };

  return (
    <div style={{ minWidth:340, textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:8 }}>🔒</div>
      <div style={{ fontWeight:700, fontSize:16, color:"var(--text)", marginBottom:4 }}>Password Protected</div>
      <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>Enter the password to open <strong>{doc.name}</strong></div>
      <div style={{ position:"relative", marginBottom:10 }}>
        <input autoFocus type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&tryUnlock()}
          placeholder="Enter password…"
          style={{ width:"100%", padding:"10px 40px 10px 14px", borderRadius:8, border:`1.5px solid ${err?"var(--danger,#ef4444)":"var(--border)"}`, background:"var(--surface)", color:"var(--text)", fontSize:14, boxSizing:"border-box", textAlign:"center" }} />
        <button onClick={()=>setShow(v=>!v)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)" }}>{show?"🙈":"👁"}</button>
      </div>
      {err && <div style={{ fontSize:12, color:"var(--danger,#ef4444)", marginBottom:10 }}>⚠ {err}</div>}
      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        <button onClick={onCancel} style={{ padding:"8px 20px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
        <button onClick={tryUnlock} style={{ padding:"8px 24px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Unlock →</button>
      </div>
    </div>
  );
}

// ── FileUploader ──────────────────────────────────────────────────────────────
const SUSPICIOUS_EXTENSIONS = [".exe",".bat",".cmd",".scr",".vbs",".js",".jar",".msi",".com",".pif",".reg",".ps1",".sh",".dmg",".app"];
const FOLDER_OPTIONS = ["General","Contracts","Invoices","References","Signed Copies","Media","Other"];

function FileUploader({ attachments=[], onChange, signedReturn=null, onSignedReturn=null, canDownload=true }) {
  const inputRef      = useRef(null);
  const signedRef     = useRef(null);
  const cloudUrlRef   = useRef(null);
  const [dragging, setDragging]         = useState(false);
  const [viewing, setViewing]           = useState(null);
  const [filterFolder, setFilterFolder] = useState("All");
  const [scanWarnings, setScanWarnings] = useState({});
  const [showCloud, setShowCloud]       = useState(false);
  const [cloudUrl, setCloudUrl]         = useState("");
  const [cloudName, setCloudName]       = useState("");

  const scanFile = (file) => {
    const ext = "." + file.name.split(".").pop().toLowerCase();
    return SUSPICIOUS_EXTENSIONS.includes(ext);
  };

  const readFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: e.target.result,
      uploadedAt: new Date().toISOString(),
      folder: "General",
      suspicious: scanFile(file),
    });
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    const results = await Promise.all(Array.from(files).map(readFile));
    const flagged = results.filter(r => r.suspicious);
    if (flagged.length > 0) {
      setScanWarnings(prev => {
        const next = { ...prev };
        flagged.forEach(f => { next[f.id] = true; });
        return next;
      });
    }
    onChange([...attachments, ...results]);
    toast(`${results.length} file${results.length>1?"s":""} attached${flagged.length?" — ⚠ suspicious file(s) flagged":""}`);
  };

  const handleSignedReturn = async (files) => {
    const f = files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const sf = { id: Math.random().toString(36).slice(2), name: f.name, size: f.size, type: f.type, dataUrl: e.target.result, uploadedAt: new Date().toISOString() };
      onSignedReturn?.(sf);
      toast("✅ Signed copy uploaded");
    };
    reader.readAsDataURL(f);
  };

  const attachCloudLink = () => {
    if (!cloudUrl.trim()) { toast("Enter a URL","info"); return; }
    let displayName = cloudName.trim();
    if (!displayName) {
      try { displayName = decodeURIComponent(new URL(cloudUrl).pathname.split("/").filter(Boolean).pop() || "Cloud file"); }
      catch { displayName = "Cloud file"; }
    }
    const cloudType = cloudUrl.includes("drive.google") ? "Google Drive" : cloudUrl.includes("dropbox") ? "Dropbox" : cloudUrl.includes("nextcloud") ? "Nextcloud" : "Cloud";
    const entry = { id: Math.random().toString(36).slice(2), name: displayName, size: 0, type: "text/uri-list", dataUrl: cloudUrl, uploadedAt: new Date().toISOString(), folder: "General", cloudType };
    onChange([...attachments, entry]);
    setCloudUrl(""); setCloudName(""); setShowCloud(false);
    toast(`${cloudType} link attached`);
  };

  const removeFile   = (id) => { onChange(attachments.filter(a=>a.id!==id)); toast("File removed","info"); };
  const setFolder    = (id, folder) => onChange(attachments.map(a=>a.id===id?{...a,folder}:a));
  const dismissWarn  = (id) => setScanWarnings(prev=>{ const n={...prev}; delete n[id]; return n; });

  const fmtSize = (b) => !b ? "" : b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(2)}MB`;

  const fileIcon = (type, cloudType) => {
    if (cloudType === "Google Drive") return "🟢";
    if (cloudType === "Dropbox") return "📦";
    if (cloudType === "Nextcloud") return "☁️";
    if (type === "text/uri-list") return "🔗";
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📕";
    if (type.includes("word") || type.includes("document")) return "📘";
    if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📗";
    if (type.includes("zip") || type.includes("rar") || type.includes("7z")) return "🗜️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";
    return "📄";
  };

  const folders = ["All", ...FOLDER_OPTIONS];
  const displayed = filterFolder === "All" ? attachments : attachments.filter(a=>a.folder===filterFolder);

  const bulkDownloadZip = async () => {
    const { default: JSZip } = await import("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js").catch(()=>({ default: null }));
    if (!JSZip) { toast("ZIP library not available","info"); return; }
    const zip = new JSZip();
    for (const a of attachments) {
      if (a.type === "text/uri-list") { zip.file(a.name + ".url", a.dataUrl); continue; }
      const base64 = a.dataUrl.split(",")[1];
      if (base64) zip.file(a.name, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type:"blob" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "attachments.zip"; link.click();
    URL.revokeObjectURL(url);
    toast("ZIP downloaded");
  };

  return (
    <div>
      {/* ── Signed-return slot ── */}
      {onSignedReturn !== null && (
        <div style={{ marginBottom:14, padding:"12px 16px", borderRadius:9, border:`2px dashed ${signedReturn?"#22c55e":"rgba(34,197,94,0.4)"}`, background: signedReturn?"rgba(34,197,94,0.06)":"transparent" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color: signedReturn?"#166534":"var(--text)" }}>✍ Signed &amp; Returned Copy</div>
              {signedReturn
                ? <div style={{ fontSize:12, color:"#166534", marginTop:2 }}>📎 {signedReturn.name} · {new Date(signedReturn.uploadedAt).toLocaleDateString()}</div>
                : <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>Upload the client's signed copy here</div>}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {signedReturn && <a href={signedReturn.dataUrl} download={signedReturn.name} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #22c55e", background:"transparent", color:"#166534", fontSize:12, textDecoration:"none", fontWeight:600 }}>⬇ Download</a>}
              <button onClick={()=>signedRef.current?.click()} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                {signedReturn ? "Replace" : "Upload"}
              </button>
            </div>
          </div>
          <input ref={signedRef} type="file" style={{ display:"none" }} onChange={e=>handleSignedReturn(e.target.files)} />
        </div>
      )}

      {/* ── Cloud attach ── */}
      <div style={{ marginBottom:10, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)" }}>Attach from:</span>
        <button onClick={()=>setShowCloud(v=>!v)} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600 }}>
          ☁️ Google Drive / Dropbox / Nextcloud
        </button>
        {attachments.length > 0 && (
          <button onClick={bulkDownloadZip} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600, marginLeft:"auto" }}>
            🗜 Download all as ZIP
          </button>
        )}
      </div>

      {showCloud && (
        <div style={{ marginBottom:12, padding:"12px 14px", border:"1px solid var(--border)", borderRadius:9, background:"var(--surface)", display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>Paste a shareable link from Google Drive, Dropbox, or Nextcloud:</div>
          <input ref={cloudUrlRef} value={cloudUrl} onChange={e=>setCloudUrl(e.target.value)} placeholder="https://drive.google.com/… or https://www.dropbox.com/…"
            style={{ width:"100%", padding:"7px 11px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          <input value={cloudName} onChange={e=>setCloudName(e.target.value)} placeholder="Display name (optional)"
            style={{ width:"100%", padding:"7px 11px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={()=>setShowCloud(false)} style={{ padding:"5px 14px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:12 }}>Cancel</button>
            <button onClick={attachCloudLink} style={{ padding:"5px 14px", borderRadius:6, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>Attach link</button>
          </div>
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}
        onClick={()=>inputRef.current?.click()}
        style={{ border:`2px dashed ${dragging?"var(--accent,#6c63ff)":"var(--border)"}`, borderRadius:10, padding:"22px 16px", textAlign:"center", cursor:"pointer", background:dragging?"var(--accent-muted,rgba(108,99,255,0.06))":"transparent", transition:"all 0.15s", marginBottom:12 }}>
        <div style={{ fontSize:28, marginBottom:6 }}>📎</div>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Drop files here or click to browse</div>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>All formats supported — PDF, DOCX, XLSX, images, ZIP, video, audio…</div>
        <input ref={inputRef} type="file" multiple style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)} />
      </div>

      {/* ── Folder filter tabs ── */}
      {attachments.length > 0 && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10 }}>
          {folders.filter(f => f==="All" || attachments.some(a=>a.folder===f)).map(f=>(
            <button key={f} onClick={()=>setFilterFolder(f)}
              style={{ padding:"3px 10px", borderRadius:20, border:`1px solid ${filterFolder===f?"var(--accent,#6c63ff)":"var(--border)"}`, background: filterFolder===f?"var(--accent-muted,rgba(108,99,255,0.1))":"transparent", color: filterFolder===f?"var(--accent,#6c63ff)":"var(--text-muted)", fontSize:11, fontWeight:600, cursor:"pointer" }}>
              {f}{f!=="All" && <span style={{ marginLeft:4, opacity:0.7 }}>({attachments.filter(a=>a.folder===f).length})</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── File list ── */}
      {displayed.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {displayed.map(a => (
            <div key={a.id}>
              {(scanWarnings[a.id]) && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", borderRadius:"7px 7px 0 0", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.35)", borderBottom:"none", fontSize:12, color:"#991b1b" }}>
                  ⚠️ <strong>Suspicious file type detected</strong> — this file extension ({a.name.split(".").pop()}) can execute code. Only open if you trust the source.
                  <button onClick={()=>dismissWarn(a.id)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:"#991b1b", fontSize:13 }}>✕ Dismiss</button>
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", border:"1px solid var(--border)", borderRadius: scanWarnings[a.id]?"0 0 8px 8px":"8px", background:"var(--surface)" }}>
                <span style={{ fontSize:20 }}>{fileIcon(a.type, a.cloudType)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {a.cloudType ? <a href={a.dataUrl} target="_blank" rel="noreferrer" style={{ color:"var(--accent,#6c63ff)", textDecoration:"none" }}>{a.name} ↗</a> : a.name}
                  </div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>{a.cloudType ? a.cloudType : fmtSize(a.size)} · {new Date(a.uploadedAt).toLocaleDateString()}</div>
                </div>
                {/* Folder picker */}
                <select value={a.folder||"General"} onChange={e=>setFolder(a.id,e.target.value)}
                  style={{ fontSize:11, padding:"2px 6px", borderRadius:5, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-muted)", cursor:"pointer" }}>
                  {FOLDER_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                {!a.cloudType && <button onClick={()=>setViewing(a)} style={{ padding:"3px 8px", borderRadius:5, border:"1px solid var(--border)", background:"transparent", color:"var(--text)", cursor:"pointer", fontSize:12 }}>👁 View</button>}
                {!a.cloudType && canDownload && <a href={a.dataUrl} download={a.name} style={{ padding:"3px 8px", borderRadius:5, border:"1px solid var(--border)", background:"transparent", color:"var(--text)", cursor:"pointer", fontSize:12, textDecoration:"none" }}>⬇ Save</a>}
                {!a.cloudType && !canDownload && <span style={{ padding:"3px 8px", borderRadius:5, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:12, cursor:"not-allowed" }} title="Download disabled for your role">⬇ Save</span>}
                <button onClick={()=>removeFile(a.id)} style={{ padding:"3px 8px", borderRadius:5, border:"none", background:"transparent", color:"var(--danger,#ef4444)", cursor:"pointer", fontSize:12 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File viewer modal */}
      {viewing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setViewing(null)}>
          <div style={{ background:"var(--card,var(--surface))", borderRadius:12, padding:20, maxWidth:"90vw", maxHeight:"90vh", overflow:"auto", position:"relative" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontWeight:700, fontSize:15 }}>{viewing.name}</span>
              <div style={{ display:"flex", gap:8 }}>
                {canDownload
                  ? <a href={viewing.dataUrl} download={viewing.name} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", textDecoration:"none", fontSize:13 }}>⬇ Download</a>
                  : <span style={{ padding:"4px 12px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", fontSize:13, cursor:"not-allowed" }} title="Download disabled for your role">⬇ Download</span>
                }
                <button onClick={()=>setViewing(null)} style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer" }}>✕</button>
              </div>
            </div>
            {viewing.type.startsWith("image/") && <img src={viewing.dataUrl} alt={viewing.name} style={{ maxWidth:"80vw", maxHeight:"70vh", borderRadius:8 }} />}
            {viewing.type === "application/pdf" && <iframe src={viewing.dataUrl} title={viewing.name} style={{ width:"75vw", height:"70vh", border:"none", borderRadius:8 }} />}
            {viewing.type.startsWith("video/") && <video src={viewing.dataUrl} controls style={{ maxWidth:"80vw", maxHeight:"70vh", borderRadius:8 }} />}
            {viewing.type.startsWith("audio/") && <audio src={viewing.dataUrl} controls style={{ marginTop:10 }} />}
            {!viewing.type.startsWith("image/") && viewing.type !== "application/pdf" && !viewing.type.startsWith("video/") && !viewing.type.startsWith("audio/") && (
              <div style={{ padding:24, textAlign:"center", color:"var(--text-muted)", fontSize:14 }}>
                <div style={{ fontSize:48, marginBottom:10 }}>📄</div>
                <div>Preview not available for this file type.</div>
                {canDownload
                  ? <a href={viewing.dataUrl} download={viewing.name} style={{ display:"inline-block", marginTop:12, padding:"8px 20px", borderRadius:7, background:"var(--accent,#6c63ff)", color:"#fff", textDecoration:"none", fontWeight:600 }}>⬇ Download to open</a>
                  : <span style={{ display:"inline-block", marginTop:12, padding:"8px 20px", borderRadius:7, background:"var(--border)", color:"var(--text-muted)", cursor:"not-allowed", fontWeight:600 }} title="Download disabled for your role">⬇ Download disabled</span>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FileConverter ─────────────────────────────────────────────────────────────
function FileConverter() {
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [targetFormat, setTargetFormat] = useState("");
  const [quality, setQuality] = useState(0.75);
  const inputRef = useRef(null);

  const FORMAT_MAP = {
    "image/jpeg":  ["PNG","WEBP","BMP","GIF"],
    "image/png":   ["JPEG","WEBP","BMP","GIF"],
    "image/webp":  ["JPEG","PNG","BMP"],
    "image/gif":   ["JPEG","PNG","WEBP"],
    "image/bmp":   ["JPEG","PNG","WEBP"],
    "text/plain":  ["HTML"],
    "text/csv":    ["JSON","HTML"],
    "application/json": ["CSV","TXT"],
  };

  const fmtSize = (b) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(2)}MB`;

  const handleSelect = (f) => {
    setFile(f); setResult(null);
    const opts = FORMAT_MAP[f.type] || [];
    setTargetFormat(opts[0] || "");
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true); setResult(null);
    try {
      // Image conversions via canvas
      if (file.type.startsWith("image/") && targetFormat) {
        const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
        const canvas = document.createElement("canvas");
        canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (targetFormat==="JPEG") { ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height); }
        ctx.drawImage(img,0,0);
        const mime = targetFormat==="JPEG"?"image/jpeg":targetFormat==="WEBP"?"image/webp":targetFormat==="BMP"?"image/bmp":"image/png";
        const dataUrl = canvas.toDataURL(mime, quality);
        const bytes = atob(dataUrl.split(",")[1]).length;
        setResult({ dataUrl, name: file.name.replace(/\.[^.]+$/,`.${targetFormat.toLowerCase()}`), size: bytes, mime });
      }
      // CSV → JSON
      else if (file.type==="text/csv" && targetFormat==="JSON") {
        const text = await file.text();
        const rows = text.trim().split("\n").map(r=>r.split(",").map(c=>c.trim().replace(/^"|"$/g,"")));
        const [headers,...data] = rows;
        const json = JSON.stringify(data.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]]))), null, 2);
        const blob = new Blob([json],{type:"application/json"});
        const dataUrl = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
        setResult({ dataUrl, name: file.name.replace(/\.csv$/,".json"), size: blob.size, mime:"application/json" });
      }
      // CSV → HTML table
      else if (file.type==="text/csv" && targetFormat==="HTML") {
        const text = await file.text();
        const rows = text.trim().split("\n").map(r=>r.split(",").map(c=>c.trim().replace(/^"|"$/g,"")));
        const [headers,...data] = rows;
        const html = `<!DOCTYPE html><html><head><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}th{background:#f4f4f4}</style></head><body><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${data.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
        const blob = new Blob([html],{type:"text/html"});
        const dataUrl = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
        setResult({ dataUrl, name: file.name.replace(/\.csv$/,".html"), size: blob.size, mime:"text/html" });
      }
      // JSON → CSV
      else if (file.type==="application/json" && targetFormat==="CSV") {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (Array.isArray(arr) && arr.length) {
          const headers = Object.keys(arr[0]);
          const csv = [headers.join(","), ...arr.map(r=>headers.map(h=>JSON.stringify(r[h]??"")||"").join(","))].join("\n");
          const blob = new Blob([csv],{type:"text/csv"});
          const dataUrl = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
          setResult({ dataUrl, name: file.name.replace(/\.json$/,".csv"), size: blob.size, mime:"text/csv" });
        }
      }
      // Text → HTML
      else if (file.type==="text/plain" && targetFormat==="HTML") {
        const text = await file.text();
        const html = `<!DOCTYPE html><html><body><pre style="font-family:Arial;line-height:1.6">${text.replace(/</g,"&lt;")}</pre></body></html>`;
        const blob = new Blob([html],{type:"text/html"});
        const dataUrl = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
        setResult({ dataUrl, name: file.name.replace(/\.txt$/,".html"), size: blob.size, mime:"text/html" });
      }
      // Compress image (same format, lower quality)
      else if (file.type.startsWith("image/") && !targetFormat) {
        const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
        const canvas = document.createElement("canvas");
        canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
        canvas.getContext("2d").drawImage(img,0,0);
        const dataUrl = canvas.toDataURL(file.type, quality);
        const bytes = atob(dataUrl.split(",")[1]).length;
        setResult({ dataUrl, name: `compressed_${file.name}`, size: bytes, mime: file.type });
      }
      else { toast("Conversion not supported for this file type","info"); }
    } catch(e) { toast("Conversion failed: "+e.message,"error"); }
    setConverting(false);
  };

  const options = file ? (FORMAT_MAP[file.type] || []) : [];
  const fmtSize2 = fmtSize;

  return (
    <div>
      {/* File picker */}
      <div onClick={()=>inputRef.current?.click()} style={{ border:"2px dashed var(--border)", borderRadius:10, padding:"18px 14px", textAlign:"center", cursor:"pointer", marginBottom:14, background:"var(--surface)" }}>
        {file ? (
          <div style={{ fontSize:13, color:"var(--text)" }}>📄 <strong>{file.name}</strong> <span style={{color:"var(--text-muted)"}}>({fmtSize(file.size)})</span></div>
        ) : (
          <>
            <div style={{ fontSize:26, marginBottom:4 }}>🔄</div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>Click to pick a file to convert or compress</div>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>Images (JPEG/PNG/WEBP/BMP/GIF), CSV, JSON, TXT</div>
          </>
        )}
        <input ref={inputRef} type="file" style={{ display:"none" }} onChange={e=>e.target.files[0]&&handleSelect(e.target.files[0])} />
      </div>

      {file && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end", marginBottom:14 }}>
          {options.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:5 }}>Convert to</div>
              <select value={targetFormat} onChange={e=>setTargetFormat(e.target.value)} style={{ ...{padding:"6px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13} }}>
                {options.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {file.type.startsWith("image/") && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", marginBottom:5 }}>Quality {Math.round(quality*100)}%</div>
              <input type="range" min={0.1} max={1} step={0.05} value={quality} onChange={e=>setQuality(+e.target.value)} style={{ width:120 }} />
            </div>
          )}
          <button onClick={handleConvert} disabled={converting} style={{ padding:"7px 18px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>
            {converting ? "⏳ Converting…" : options.length > 0 ? `🔄 Convert to ${targetFormat}` : "🗜 Compress"}
          </button>
          <button onClick={()=>{setFile(null);setResult(null);}} style={{ padding:"7px 12px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>✕ Clear</button>
        </div>
      )}

      {result && (
        <div style={{ padding:"12px 16px", border:"1px solid var(--border)", borderRadius:9, background:"var(--surface)", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:28 }}>✅</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{result.name}</div>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
              {file && <span>Original: <strong>{fmtSize2(file.size)}</strong> → </span>}
              Output: <strong>{fmtSize2(result.size)}</strong>
              {file && result.size < file.size && <span style={{ color:"#166534", fontWeight:700 }}> ({Math.round((1-result.size/file.size)*100)}% smaller)</span>}
            </div>
          </div>
          <a href={result.dataUrl} download={result.name} style={{ padding:"7px 16px", borderRadius:7, background:"var(--accent,#6c63ff)", color:"#fff", textDecoration:"none", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>⬇ Download</a>
        </div>
      )}
    </div>
  );
}

// ── NewDocNameForm ─────────────────────────────────────────────────────────────
function NewDocNameForm({ tpl, contacts=[], projects=[], onConfirm, onCancel }) {
  const [name, setName] = useState(`${tpl.label} — ${new Date().toLocaleDateString()}`);
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(()=>inputRef.current?.focus(),60); }, []);
  const clientSuggestions = [...new Set((contacts).map(c=>c.name||c.company||"").filter(Boolean))];
  return (
    <div>
      <p style={{ margin:"0 0 16px", fontSize:13, color:"var(--text-muted)" }}>Fill in a few details, then the document editor opens immediately.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Document Name <span style={{color:"var(--danger,#ef4444)"}}>*</span></label>
          <input ref={inputRef} style={inputStyle} value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter" && name.trim()) onConfirm(name.trim(), client, project); }}
            placeholder={`e.g. Acme Corp ${tpl.label} 2025`} />
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Client (optional)</label>
          <input style={inputStyle} value={client} onChange={e=>setClient(e.target.value)} list="ndf-client-list" placeholder="Type or pick a contact…" />
          {clientSuggestions.length > 0 && <datalist id="ndf-client-list">{clientSuggestions.map(c=><option key={c} value={c}/>)}</datalist>}
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Project (optional)</label>
          <select style={inputStyle} value={project} onChange={e=>setProject(e.target.value)}>
            <option value="">— None —</option>
            {projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20, paddingTop:14, borderTop:"1px solid var(--border)" }}>
        <button style={btnStyle("ghost")} onClick={onCancel}>Cancel</button>
        <button style={btnStyle("primary")} disabled={!name.trim()} onClick={()=>onConfirm(name.trim(), client, project)}>
          Open Editor →
        </button>
      </div>
    </div>
  );
}

// ── DocForm ──────────────────────────────────────────────────────────────────
function DocForm({ initial={}, onSave, onClose, projects=[], tags=[], contacts=[] }) {
  const isEdit = !!initial?.id;
  const [f, setF] = useState({
    name:"", type:"Proposal", relatedClient:"", relatedProject:"",
    url:"", status:"Draft", notes:"", tags:[], expiresAt:"",
    createdAt: new Date().toISOString().slice(0,10),
    ...initial,
    tags: Array.isArray(initial?.tags) ? [...initial.tags] : [],
  });
  const [errors, setErrors] = useState({});
  const [customTagInput, setCustomTagInput] = useState("");
  const [attachments, setAttachments]   = useState(Array.isArray(initial?.attachments) ? initial.attachments : []);
  const [signedReturn, setSignedReturn] = useState(initial?.signedReturn || null);
  const [showConverter, setShowConverter] = useState(false);
  const nameRef = useRef(null);

  // Auto-focus name on mount
  useState(() => { setTimeout(() => nameRef.current?.focus(), 60); });

  // Keyboard shortcut Cmd/Ctrl+Enter → save
  useState(() => {
    const handler = (e) => { if ((e.metaKey||e.ctrlKey) && e.key==="Enter") { e.preventDefault(); handleSave(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const set = k => e => { setF(p=>({...p,[k]:e.target.value})); if (errors[k]) setErrors(p=>({...p,[k]:null})); };
  const toggleTag = t => setF(p=>({...p, tags: p.tags.includes(t) ? p.tags.filter(x=>x!==t) : [...p.tags, t]}));

  const addCustomTag = () => {
    const t = customTagInput.trim();
    if (!t || f.tags.includes(t)) { setCustomTagInput(""); return; }
    setF(p=>({...p, tags:[...p.tags, t]}));
    setCustomTagInput("");
  };

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (f.url && !/^https?:\/\/.+/.test(f.url)) e.url = "Must start with http:// or https://";
    if (f.expiresAt && f.createdAt && f.expiresAt < f.createdAt) e.expiresAt = "Expiry can't be before creation date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave({ ...f, attachments, signedReturn }); };

  const isDirty = isEdit && JSON.stringify({...initial, tags:[...(initial.tags||[])]}) !== JSON.stringify({...f});

  const allPresetTags = [...new Set([...tags, "Contract", "Signed", "Internal", "Client-Facing", "NDA", "Template"])];
  const allTags = [...new Set([...allPresetTags, ...f.tags])];

  const urlValid = f.url && /^https?:\/\/.+/.test(f.url);
  const urlDomain = urlValid ? (() => { try { return new URL(f.url).hostname.replace(/^www\./,""); } catch { return null; } })() : null;

  const clientSuggestions = [...new Set((contacts||[]).map(c=>c.name||c.company||"").filter(Boolean))];

  const sectionLabel = (text) => (
    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", margin:"16px 0 8px", paddingBottom:5, borderBottom:"1px solid var(--border)" }}>{text}</div>
  );

  const fieldErr = (k) => errors[k] ? (
    <div style={{ fontSize:11, color:"var(--danger,#ef4444)", marginTop:3 }}>⚠ {errors[k]}</div>
  ) : null;

  const inputErr = (k) => errors[k] ? { ...inputStyle, borderColor:"var(--danger,#ef4444)", outline:"none" } : inputStyle;

  // Type card picker
  const typeCards = DOC_TYPES.map(t => ({ label:t, icon: TYPE_ICONS[t]||"📄" }));

  // Status pill picker
  const statusPills = DOC_STATUSES.map(s => ({ label:s, ...STATUS_COLORS[s]||STATUS_COLORS.Draft }));

  return (
    <div onKeyDown={e => { if ((e.metaKey||e.ctrlKey) && e.key==="Enter") { e.preventDefault(); handleSave(); } }}>

      {/* ── Core Info ── */}
      {sectionLabel("Core Info")}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <FormField label={<>Name <span style={{color:"var(--danger,#ef4444)"}}>*</span></>}>
          <input ref={nameRef} style={inputErr("name")} value={f.name} onChange={set("name")} placeholder="e.g. Acme Corp NDA 2025" autoComplete="off" />
          {fieldErr("name")}
        </FormField>
        <FormField label="Client">
          <input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} list="doc-client-list" placeholder="Type or pick a contact…" />
          {clientSuggestions.length > 0 && (
            <datalist id="doc-client-list">{clientSuggestions.map(c=><option key={c} value={c}/>)}</datalist>
          )}
        </FormField>
        <FormField label="Project" style={{ gridColumn:"span 2" }}>
          <select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}>
            <option value="">— None —</option>
            {(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </FormField>
      </div>

      {/* ── Type ── */}
      {sectionLabel("Document Type")}
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
        {typeCards.map(({ label, icon }) => {
          const active = f.type === label;
          return (
            <div key={label} onClick={() => setF(p=>({...p,type:label}))}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"8px 14px", borderRadius:8, border:`1.5px solid ${active?"var(--accent,#6c63ff)":"var(--border)"}`, background: active?"var(--accent-muted,rgba(108,99,255,0.08))":"transparent", cursor:"pointer", transition:"all 0.12s", minWidth:68 }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <span style={{ fontSize:11, fontWeight: active?700:500, color: active?"var(--accent,#6c63ff)":"var(--text-muted)" }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Status ── */}
      {sectionLabel("Status")}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {statusPills.map(({ label, bg, color, dot }) => {
          const active = f.status === label;
          return (
            <span key={label} onClick={() => setF(p=>({...p,status:label}))}
              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 13px", borderRadius:999, fontSize:12, fontWeight:active?700:500, cursor:"pointer", background: active?bg:"transparent", color: active?color:"var(--text-muted)", border:`1.5px solid ${active?dot:"var(--border)"}`, transition:"all 0.12s" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:active?dot:"var(--border)", flexShrink:0 }} />{label}
            </span>
          );
        })}
      </div>

      {/* ── Details ── */}
      {sectionLabel("Details")}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <FormField label="URL / Link">
          <input style={inputErr("url")} value={f.url} onChange={set("url")} placeholder="https://…" />
          {fieldErr("url")}
          {urlDomain && !errors.url && (
            <div style={{ marginTop:4, display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"var(--accent,#6c63ff)", fontWeight:500 }}>
              🔗 <span>{urlDomain}</span>
              <a href={f.url} target="_blank" rel="noreferrer" style={{ color:"var(--text-muted)", textDecoration:"none", fontSize:10 }}>↗ test</a>
            </div>
          )}
        </FormField>
        <FormField label="Expires On">
          <input type="date" style={inputErr("expiresAt")} value={f.expiresAt||""} onChange={set("expiresAt")} />
          {fieldErr("expiresAt")}
          {f.expiresAt && !errors.expiresAt && (() => {
            const diff = new Date(f.expiresAt).getTime() - Date.now();
            const d = Math.ceil(diff / 86400000);
            const color = d < 0 ? "var(--danger,#ef4444)" : d < 7 ? "#a07c00" : "var(--text-muted)";
            const label = d < 0 ? `Expired ${Math.abs(d)}d ago` : d === 0 ? "Expires today" : `Expires in ${d}d`;
            return <div style={{ fontSize:11, color, marginTop:3, fontWeight:500 }}>{label}</div>;
          })()}
        </FormField>
      </div>

      {/* ── Notes ── */}
      {sectionLabel("Notes")}
      <div style={{ position:"relative" }}>
        <textarea
          style={{ ...inputStyle, minHeight:72, resize:"vertical", paddingRight:48 }}
          value={f.notes}
          onChange={set("notes")}
          placeholder="Internal notes, context, reminders…"
          maxLength={500}
        />
        <span style={{ position:"absolute", bottom:8, right:10, fontSize:10, color: f.notes.length > 400 ? "#d4a000" : "var(--text-muted)", pointerEvents:"none" }}>
          {f.notes.length}/500
        </span>
      </div>

      {/* ── Upload Files ── */}
      {sectionLabel("Upload Files")}
      <FileUploader attachments={attachments} onChange={setAttachments} signedReturn={signedReturn} onSignedReturn={setSignedReturn} />

      {/* ── File Converter ── */}
      <div style={{ marginTop:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)" }}>File Converter / Compressor</div>
          <button onClick={()=>setShowConverter(v=>!v)} style={{ fontSize:11, padding:"2px 9px", borderRadius:5, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer" }}>{showConverter?"▲ Hide":"▼ Show"}</button>
        </div>
        {showConverter && <FileConverter />}
      </div>

      {/* ── Tags ── */}
      {sectionLabel("Tags")}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
        {allTags.map(t => (
          <span key={t} onClick={() => toggleTag(t)}
            style={{ padding:"3px 11px", borderRadius:999, fontSize:12, fontWeight: f.tags.includes(t)?700:400, cursor:"pointer", background: f.tags.includes(t)?"var(--accent,#6c63ff)":"transparent", color: f.tags.includes(t)?"#fff":"var(--text-muted)", border:`1.5px solid ${f.tags.includes(t)?"var(--accent,#6c63ff)":"var(--border)"}`, transition:"all 0.12s ease" }}>
            {f.tags.includes(t) && <span style={{ marginRight:4, opacity:0.7 }}>✓</span>}{t}
          </span>
        ))}
      </div>
      {/* Custom tag input */}
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <input
          style={{ ...inputStyle, flex:1, fontSize:12 }}
          value={customTagInput}
          onChange={e=>setCustomTagInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addCustomTag(); } }}
          placeholder="Add custom tag…"
        />
        <button style={{ ...btnStyle("ghost","sm"), flexShrink:0 }} onClick={addCustomTag}>+ Add</button>
      </div>

      {/* ── Footer ── */}
      <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", marginTop:20, paddingTop:14, borderTop:"1px solid var(--border)" }}>
        <span style={{ fontSize:11, color:"var(--text-muted)" }}>
          {isEdit ? (isDirty ? "⬤ Unsaved changes" : "No changes") : <><kbd style={{ padding:"1px 5px", borderRadius:3, border:"1px solid var(--border)", fontSize:10 }}>⌘ Enter</kbd> to save</>}
        </span>
        <div style={{ display:"flex", gap:8 }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button style={{ ...btnStyle("primary"), opacity: isEdit && !isDirty ? 0.5 : 1 }} onClick={handleSave} disabled={isEdit && !isDirty}>
            {isEdit ? "Save changes" : "+ Add document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SMART FEATURES
// ══════════════════════════════════════════════════════════════════════════════

// ── PDFExtractModal ───────────────────────────────────────────────────────────
function PDFExtractModal({ onClose, onApply }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const PATTERNS = {
    dates: /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi,
    amounts: /(?:₹|Rs\.?|INR|USD|\$|€|£)\s?[\d,]+(?:\.\d{1,2})?|\b[\d,]+(?:\.\d{1,2})?\s?(?:lakhs?|crores?|thousand|million|billion)\b/gi,
    emails: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    names: /(?:Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
    phones: /(?:\+\d{1,3}[\s-]?)?\(?\d{3,5}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/g,
  };

  const extractFromText = (text) => {
    const found = {};
    for (const [key, pattern] of Object.entries(PATTERNS)) {
      const matches = [...new Set(text.match(pattern) || [])].slice(0, 8);
      if (matches.length) found[key] = matches;
    }
    return found;
  };

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text().catch(() => "");
      const extracted = extractFromText(text || "");
      // For binary PDFs we can only hint
      if (Object.keys(extracted).length === 0) {
        setResult({ empty: true });
      } else {
        setResult(extracted);
      }
    } catch { setResult({ empty: true }); }
    setLoading(false);
  };

  const LABELS = { dates:"📅 Dates", amounts:"💰 Amounts", emails:"📧 Emails", names:"👤 Names", phones:"📞 Phones" };

  return (
    <div style={{ minWidth: 420 }}>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-muted)" }}>
        Upload a text-based PDF or document to auto-extract key info.
      </p>
      <label style={{ display:"block", border:"2px dashed var(--border)", borderRadius:10, padding:"18px", textAlign:"center", cursor:"pointer", marginBottom:14, background:"var(--surface)" }}>
        <div style={{ fontSize:28, marginBottom:4 }}>🔍</div>
        <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{fileName || "Click to upload a file"}</div>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>TXT, CSV, JSON — or text-layer PDFs</div>
        <input type="file" style={{ display:"none" }} accept=".txt,.csv,.json,.pdf" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
      </label>
      {loading && <div style={{ textAlign:"center", padding:20, color:"var(--text-muted)", fontSize:13 }}>⏳ Extracting…</div>}
      {result?.empty && <div style={{ padding:16, textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No text could be extracted from this file. Try a plain-text document.</div>}
      {result && !result.empty && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {Object.entries(result).map(([key, vals]) => (
            <div key={key} style={{ padding:"10px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)" }}>
              <div style={{ fontWeight:700, fontSize:12, color:"var(--text-muted)", marginBottom:6 }}>{LABELS[key] || key}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {vals.map((v,i) => (
                  <span key={i} onClick={() => { navigator.clipboard?.writeText(v); toast("Copied!"); }}
                    style={{ padding:"3px 9px", borderRadius:6, fontSize:12, background:"var(--accent-muted,rgba(108,99,255,0.1))", color:"var(--accent,#6c63ff)", cursor:"pointer", fontWeight:600 }} title="Click to copy">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center" }}>Click any value to copy it to clipboard.</div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

// ── ActivityLogModal ──────────────────────────────────────────────────────────
function ActivityLogModal({ doc, onClose }) {
  const log = doc.activityLog || [];
  const typeLabels = { opened:"👁 Opened", edited:"✏️ Edited", status_changed:"🔄 Status changed", shared:"🔗 Shared", signed:"✍ Signed", file_added:"📎 File added", commented:"💬 Commented" };

  return (
    <div style={{ minWidth:420, maxHeight:"60vh", display:"flex", flexDirection:"column" }}>
      <div style={{ marginBottom:12, fontSize:13, color:"var(--text-muted)" }}>
        Activity history for <strong style={{ color:"var(--text)" }}>{doc.name}</strong>
      </div>
      {log.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8, color:"var(--text-muted)", fontSize:13, padding:30 }}>
          <div style={{ fontSize:36 }}>📋</div>
          No activity recorded yet. Activity is tracked automatically when you open, edit, share, or sign a document.
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
          {[...log].reverse().map((entry, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:13 }}>
              <span style={{ fontSize:16, lineHeight:1.4 }}>{(typeLabels[entry.type]||"📌 "+entry.type).split(" ")[0]}</span>
              <div style={{ flex:1 }}>
                <div style={{ color:"var(--text)", fontWeight:500 }}>{(typeLabels[entry.type]||entry.type).slice(2)}</div>
                {entry.detail && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>{entry.detail}</div>}
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)", whiteSpace:"nowrap" }}>
                {new Date(entry.at).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ── TimeToSignWidget ──────────────────────────────────────────────────────────
function TimeToSignWidget({ documents }) {
  const signed = (documents||[]).filter(d => d.status === "Signed" && d.sentAt && d.signedAt);
  if (signed.length === 0) return (
    <div style={{ padding:"10px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", fontSize:13, color:"var(--text-muted)", textAlign:"center" }}>
      No signed documents with timing data yet.
    </div>
  );
  const times = signed.map(d => (new Date(d.signedAt) - new Date(d.sentAt)) / 86400000);
  const avg = times.reduce((a,b)=>a+b,0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
      {[["Avg", avg], ["Fastest", min], ["Slowest", max]].map(([label, val]) => (
        <div key={label} style={{ padding:"12px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", textAlign:"center" }}>
          <div style={{ fontSize:11, textTransform:"uppercase", fontWeight:700, color:"var(--text-muted)", marginBottom:4 }}>{label}</div>
          <div style={{ fontSize:20, fontWeight:700, color:"var(--text)" }}>{val.toFixed(1)}d</div>
        </div>
      ))}
    </div>
  );
}

// ── AnalyticsDashboard ────────────────────────────────────────────────────────
function AnalyticsDashboard({ documents, onClose }) {
  const all = documents || [];

  const byStatus = Object.entries(
    all.reduce((acc, d) => { acc[d.status] = (acc[d.status]||0)+1; return acc; }, {})
  ).sort((a,b) => b[1]-a[1]);

  const byType = Object.entries(
    all.reduce((acc, d) => { acc[d.type] = (acc[d.type]||0)+1; return acc; }, {})
  ).sort((a,b) => b[1]-a[1]);

  const recentActivity = all.flatMap(d => (d.activityLog||[]).map(e => ({...e, docName: d.name}))).sort((a,b) => new Date(b.at)-new Date(a.at)).slice(0, 20);

  const most_opened = [...all].sort((a,b) => ((b.activityLog||[]).filter(e=>e.type==="opened").length) - ((a.activityLog||[]).filter(e=>e.type==="opened").length)).slice(0,5);

  const sectionHd = (t) => <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", margin:"16px 0 8px", paddingBottom:4, borderBottom:"1px solid var(--border)" }}>{t}</div>;

  return (
    <div style={{ minWidth:480, maxHeight:"70vh", overflowY:"auto" }}>
      {sectionHd("Documents by Status")}
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
        {byStatus.map(([s, n]) => {
          const sc = STATUS_COLORS[s] || STATUS_COLORS.Draft;
          const pct = Math.round(n / all.length * 100);
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:80, fontSize:12, fontWeight:600, color:sc.color }}>{s}</div>
              <div style={{ flex:1, height:8, borderRadius:99, background:"var(--border)", overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:sc.dot, borderRadius:99, transition:"width 0.4s" }} />
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", width:36, textAlign:"right" }}>{n}</div>
            </div>
          );
        })}
      </div>

      {sectionHd("Documents by Type")}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {byType.map(([t, n]) => (
          <span key={t} style={{ padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:600, background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text)" }}>
            {TYPE_ICONS[t]||"📄"} {t} <span style={{ color:"var(--text-muted)" }}>({n})</span>
          </span>
        ))}
      </div>

      {sectionHd("Time-to-Sign Metrics")}
      <TimeToSignWidget documents={all} />

      {sectionHd("Most Viewed Documents")}
      {most_opened.filter(d => (d.activityLog||[]).some(e=>e.type==="opened")).length === 0 ? (
        <div style={{ fontSize:13, color:"var(--text-muted)" }}>No view data yet — views are tracked when you open a document's preview.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {most_opened.filter(d => (d.activityLog||[]).some(e=>e.type==="opened")).map(d => {
            const opens = (d.activityLog||[]).filter(e=>e.type==="opened").length;
            return (
              <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:13 }}>
                <span>{TYPE_ICONS[d.type]||"📄"}</span>
                <div style={{ flex:1, fontWeight:500, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
                <span style={{ fontSize:11, color:"var(--text-muted)" }}>👁 {opens} view{opens!==1?"s":""}</span>
              </div>
            );
          })}
        </div>
      )}

      {sectionHd("Recent Activity Log")}
      {recentActivity.length === 0 ? (
        <div style={{ fontSize:13, color:"var(--text-muted)" }}>No activity recorded yet.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {recentActivity.map((e, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12 }}>
              <span style={{ color:"var(--text-muted)", flexShrink:0 }}>{new Date(e.at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
              <span style={{ flex:1, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}><strong>{e.docName}</strong> — {e.type.replace(/_/g," ")}{e.detail ? `: ${e.detail}` : ""}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REMINDERS & NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── FollowUpSchedulerModal ────────────────────────────────────────────────────
function FollowUpSchedulerModal({ doc, onClose, onUpdate }) {
  const followUps = doc.followUps || [];
  const [date, setDate] = useState(new Date(Date.now() + 3*86400000).toISOString().slice(0,10));
  const [note, setNote] = useState("");
  const [whom, setWhom] = useState("");

  const add = () => {
    if (!date) { toast("Pick a date","info"); return; }
    const fu = { id: Math.random().toString(36).slice(2), date, note: note.trim(), whom: whom.trim(), createdAt: new Date().toISOString(), done: false };
    onUpdate({ ...doc, followUps: [...followUps, fu] });
    setNote(""); setWhom(""); setDate(new Date(Date.now() + 3*86400000).toISOString().slice(0,10));
    toast("Follow-up scheduled");
  };
  const toggleDone = (id) => onUpdate({ ...doc, followUps: followUps.map(f => f.id===id ? {...f, done:!f.done} : f) });
  const remove = (id) => { onUpdate({ ...doc, followUps: followUps.filter(f => f.id!==id) }); toast("Removed","info"); };

  const overdue = followUps.filter(f => !f.done && f.date < new Date().toISOString().slice(0,10));
  const upcoming = followUps.filter(f => !f.done && f.date >= new Date().toISOString().slice(0,10));
  const done = followUps.filter(f => f.done);

  const FUItem = ({ f }) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:7, border:`1px solid ${f.date < new Date().toISOString().slice(0,10) && !f.done ? "rgba(239,68,68,0.4)" : "var(--border)"}`, background:"var(--surface)", fontSize:13, opacity: f.done ? 0.6 : 1 }}>
      <input type="checkbox" checked={f.done} onChange={() => toggleDone(f.id)} style={{ cursor:"pointer", width:15, height:15 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, color:"var(--text)", textDecoration: f.done ? "line-through" : "none" }}>{new Date(f.date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}{f.whom ? ` — ${f.whom}` : ""}</div>
        {f.note && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:1 }}>{f.note}</div>}
      </div>
      <button onClick={() => remove(f.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger,#ef4444)", fontSize:14 }}>✕</button>
    </div>
  );

  return (
    <div style={{ minWidth:420 }}>
      <div style={{ marginBottom:14, fontSize:13, color:"var(--text-muted)" }}>Schedule follow-up reminders for <strong style={{color:"var(--text)"}}>{doc.name}</strong></div>

      {overdue.length > 0 && (
        <div style={{ padding:"8px 12px", borderRadius:7, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", color:"#991b1b", fontSize:13, fontWeight:600, marginBottom:12 }}>
          ⚠ {overdue.length} follow-up{overdue.length>1?"s":""} overdue!
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"12px 14px", borderRadius:9, border:"1px solid var(--border)", background:"var(--surface)", marginBottom:14 }}>
        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>Schedule new follow-up</div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:"0 0 150px" }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:"100%", padding:"6px 8px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Chase who (optional)</label>
            <input value={whom} onChange={e=>setWhom(e.target.value)} placeholder="e.g. client name" style={{ width:"100%", padding:"6px 8px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Ask if they've reviewed the contract" style={{ width:"100%", padding:"6px 8px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={add} style={{ padding:"6px 16px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Schedule</button>
        </div>
      </div>

      {[["Overdue", overdue], ["Upcoming", upcoming], ["Done", done]].map(([label, items]) => items.length > 0 && (
        <div key={label} style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", marginBottom:6 }}>{label}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>{items.map(f => <FUItem key={f.id} f={f} />)}</div>
        </div>
      ))}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ── OverdueDashboard ──────────────────────────────────────────────────────────
function OverdueDashboard({ documents, onClose, onDocClick }) {
  const today = new Date().toISOString().slice(0,10);
  const overdueFollowUps = (documents||[]).flatMap(d =>
    (d.followUps||[]).filter(f => !f.done && f.date < today).map(f => ({...f, doc: d}))
  ).sort((a,b) => a.date.localeCompare(b.date));

  const expiredDocs = (documents||[]).filter(d => d.expiresAt && d.expiresAt < today && d.status !== "Archived");
  const expiringSoon = (documents||[]).filter(d => d.expiresAt && d.expiresAt >= today && d.expiresAt <= new Date(Date.now()+7*86400000).toISOString().slice(0,10));

  const sectionHd = (t, badge) => (
    <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", margin:"14px 0 7px", paddingBottom:4, borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
      {t}{badge > 0 && <span style={{ background:"var(--danger,#ef4444)", color:"#fff", borderRadius:999, fontSize:10, padding:"0 6px", fontWeight:700 }}>{badge}</span>}
    </div>
  );

  return (
    <div style={{ minWidth:460, maxHeight:"65vh", overflowY:"auto" }}>
      {sectionHd("Overdue Follow-ups", overdueFollowUps.length)}
      {overdueFollowUps.length === 0 ? <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:8 }}>No overdue follow-ups. 🎉</div> : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {overdueFollowUps.map((f,i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", borderRadius:7, border:"1px solid rgba(239,68,68,0.35)", background:"rgba(239,68,68,0.05)", fontSize:13 }}>
              <span style={{ fontSize:16 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"var(--text)" }}>{f.doc.name}{f.whom ? ` — chase ${f.whom}` : ""}</div>
                <div style={{ fontSize:11, color:"#991b1b", marginTop:1 }}>Due {new Date(f.date+"T12:00:00").toLocaleDateString()}{f.note ? ` · ${f.note}` : ""}</div>
              </div>
              <button onClick={() => onDocClick(f.doc)} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12 }}>Open</button>
            </div>
          ))}
        </div>
      )}

      {sectionHd("Expired Documents", expiredDocs.length)}
      {expiredDocs.length === 0 ? <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:8 }}>No expired documents.</div> : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {expiredDocs.map(d => (
            <div key={d.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", borderRadius:7, border:"1px solid rgba(239,68,68,0.25)", background:"var(--surface)", fontSize:13 }}>
              <span>{TYPE_ICONS[d.type]||"📄"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"var(--text)" }}>{d.name}</div>
                <div style={{ fontSize:11, color:"var(--danger,#ef4444)" }}>Expired {relativeTime(d.expiresAt)}</div>
              </div>
              <button onClick={() => onDocClick(d)} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12 }}>View</button>
            </div>
          ))}
        </div>
      )}

      {sectionHd("Expiring Within 7 Days", expiringSoon.length)}
      {expiringSoon.length === 0 ? <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:8 }}>None expiring soon.</div> : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {expiringSoon.map(d => (
            <div key={d.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", borderRadius:7, border:"1px solid rgba(234,179,8,0.4)", background:"rgba(234,179,8,0.05)", fontSize:13 }}>
              <span>{TYPE_ICONS[d.type]||"📄"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:"var(--text)" }}>{d.name}</div>
                <div style={{ fontSize:11, color:"#a07c00" }}>Expires {relativeTime(d.expiresAt)}</div>
              </div>
              <button onClick={() => onDocClick(d)} style={{ padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", cursor:"pointer", fontSize:12 }}>View</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

// ── SaveAsTemplateModal ───────────────────────────────────────────────────────
function SaveAsTemplateModal({ doc, onClose, onSave }) {
  const [name, setName] = useState(`${doc.name} (Template)`);
  const [category, setCategory] = useState("General");
  const [variables, setVariables] = useState([]);

  const CATEGORIES = ["General","Legal","Finance","HR","Sales","Operations","Technical"];

  // Auto-detect placeholders like {{variable_name}}
  const detected = useMemo(() => {
    const html = doc.editorContent || "";
    const matches = [...new Set([...html.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))];
    return matches;
  }, [doc.editorContent]);

  useState(() => { setVariables(detected.map(v => ({ name: v, label: v.replace(/_/g," "), defaultVal: "" }))); }, [detected.join(",")]);

  const save = () => {
    if (!name.trim()) { toast("Name required","info"); return; }
    onSave({ id: Math.random().toString(36).slice(2), name: name.trim(), category, variables, html: doc.editorContent, type: doc.type, createdAt: new Date().toISOString() });
    toast(`Template "${name.trim()}" saved`);
    onClose();
  };

  return (
    <div style={{ minWidth:420 }}>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-muted)" }}>Save this document as a reusable template. Any <code style={{background:"var(--surface)",padding:"1px 4px",borderRadius:3}}>{"{{variable}}"}</code> placeholders will become fillable fields.</p>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Template Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Category</label>
          <select value={category} onChange={e=>setCategory(e.target.value)} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13 }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {detected.length > 0 && (
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", marginBottom:6 }}>Detected placeholders ({detected.length})</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {detected.map(v => (
                <span key={v} style={{ padding:"3px 9px", borderRadius:6, fontSize:12, background:"var(--accent-muted,rgba(108,99,255,0.1))", color:"var(--accent,#6c63ff)", fontWeight:600 }}>
                  {"{{"+v+"}}"}
                </span>
              ))}
            </div>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:5 }}>These will become fill-in fields when the template is used.</div>
          </div>
        )}
        {detected.length === 0 && (
          <div style={{ padding:"8px 12px", borderRadius:7, background:"var(--surface)", border:"1px solid var(--border)", fontSize:12, color:"var(--text-muted)" }}>
            💡 Tip: Add <code>{"{{client_name}}"}</code>, <code>{"{{amount}}"}</code>, or <code>{"{{date}}"}</code> anywhere in your document to create auto-fill placeholders.
          </div>
        )}
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
        <button onClick={save} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>📄 Save Template</button>
      </div>
    </div>
  );
}

// ── TemplateLibraryModal ──────────────────────────────────────────────────────
function TemplateLibraryModal({ customTemplates, onClose, onUseTemplate, onDeleteTemplate }) {
  const [filterCat, setFilterCat] = useState("All");
  const [fillTarget, setFillTarget] = useState(null);
  const [fillVals, setFillVals] = useState({});

  const categories = ["All", ...new Set((customTemplates||[]).map(t => t.category))];

  const filtered = (customTemplates||[]).filter(t => filterCat === "All" || t.category === filterCat);

  const startFill = (tpl) => {
    setFillTarget(tpl);
    const vals = {};
    (tpl.variables||[]).forEach(v => { vals[v.name] = v.defaultVal || ""; });
    setFillVals(vals);
  };

  const applyFill = () => {
    let html = fillTarget.html;
    Object.entries(fillVals).forEach(([k, v]) => {
      html = html.replaceAll(`{{${k}}}`, v || `{{${k}}}`);
    });
    onUseTemplate({ ...fillTarget, html });
    toast(`Template "${fillTarget.name}" applied`);
    setFillTarget(null);
    onClose();
  };

  if (fillTarget) {
    const hasFills = (fillTarget.variables||[]).length > 0;
    return (
      <div style={{ minWidth:420 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>Fill in: {fillTarget.name}</div>
        {!hasFills && <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>This template has no variable placeholders. It will be inserted as-is.</div>}
        {hasFills && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
            {(fillTarget.variables||[]).map(v => (
              <div key={v.name}>
                <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:3 }}>{v.label || v.name}</label>
                <input value={fillVals[v.name]||""} onChange={e=>setFillVals(p=>({...p,[v.name]:e.target.value}))}
                  placeholder={`{{${v.name}}}`} style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={() => setFillTarget(null)} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>← Back</button>
          <button onClick={applyFill} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Use Template →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minWidth:500, maxHeight:"65vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
            border:`1px solid ${filterCat===c?"var(--accent,#6c63ff)":"var(--border)"}`,
            background: filterCat===c?"var(--accent-muted,rgba(108,99,255,0.1))":"transparent",
            color: filterCat===c?"var(--accent,#6c63ff)":"var(--text-muted)" }}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8, color:"var(--text-muted)", fontSize:13, padding:30, textAlign:"center" }}>
          <div style={{ fontSize:36 }}>📄</div>
          No custom templates yet.<br/>In the document editor, use the <strong>Save as Template</strong> button to create one.
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {filtered.map(tpl => (
            <div key={tpl.id} style={{ padding:"14px", borderRadius:10, border:"1px solid var(--border)", background:"var(--surface)", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"var(--text)", lineHeight:1.3 }}>{tpl.name}</div>
                <button onClick={() => onDeleteTemplate(tpl.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--danger,#ef4444)", fontSize:14, flexShrink:0 }} title="Delete template">🗑</button>
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)" }}>
                {TYPE_ICONS[tpl.type]||"📄"} {tpl.type} · {tpl.category}
                {(tpl.variables||[]).length > 0 && <span style={{ marginLeft:6, color:"var(--accent,#6c63ff)" }}>· {tpl.variables.length} var{tpl.variables.length!==1?"s":""}</span>}
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)" }}>Created {relativeTime(tpl.createdAt)}</div>
              <button onClick={() => startFill(tpl)} style={{ padding:"5px 0", borderRadius:6, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", marginTop:"auto" }}>Use Template</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLABORATION
// ══════════════════════════════════════════════════════════════════════════════

// ── AssignDocModal ────────────────────────────────────────────────────────────
function AssignDocModal({ doc, contacts, onClose, onUpdate }) {
  const [assignee, setAssignee] = useState(doc.assignedTo || "");
  const [note, setNote] = useState("");
  const suggestions = [...new Set((contacts||[]).map(c => c.name||c.company||"").filter(Boolean))];

  const save = () => {
    onUpdate({ ...doc, assignedTo: assignee.trim() || null, assignedNote: note.trim() || null, assignedAt: assignee.trim() ? new Date().toISOString() : null });
    toast(assignee.trim() ? `Assigned to ${assignee.trim()}` : "Assignment cleared");
    onClose();
  };

  return (
    <div style={{ minWidth:380 }}>
      <p style={{ margin:"0 0 14px", fontSize:13, color:"var(--text-muted)" }}>Assign <strong style={{color:"var(--text)"}}>{doc.name}</strong> to a team member.</p>
      {doc.assignedTo && (
        <div style={{ padding:"8px 12px", borderRadius:7, background:"rgba(108,99,255,0.08)", border:"1px solid rgba(108,99,255,0.2)", fontSize:13, marginBottom:12 }}>
          Currently assigned to <strong>{doc.assignedTo}</strong>{doc.assignedNote ? ` — "${doc.assignedNote}"` : ""}
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Assignee</label>
          <input value={assignee} onChange={e=>setAssignee(e.target.value)} list="assign-list" placeholder="Name or email…" style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          {suggestions.length > 0 && <datalist id="assign-list">{suggestions.map(s=><option key={s} value={s}/>)}</datalist>}
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>Note (optional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Please review Section 3" style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        {doc.assignedTo && <button onClick={() => { setAssignee(""); }} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--danger,#ef4444)", cursor:"pointer", fontSize:13, marginRight:"auto" }}>✕ Clear</button>}
        <button onClick={onClose} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
        <button onClick={save} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>Save</button>
      </div>
    </div>
  );
}

// ── DocChatModal ──────────────────────────────────────────────────────────────
function DocChatModal({ doc, currentUser, onClose, onUpdate }) {
  const thread = doc.chatThread || [];
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(currentUser || "Me");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [thread.length]);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    const msg = { id: Math.random().toString(36).slice(2), author, body: text, at: new Date().toISOString() };
    onUpdate({ ...doc, chatThread: [...thread, msg] });
    setBody("");
  };

  return (
    <div style={{ minWidth:420, display:"flex", flexDirection:"column", height:480 }}>
      <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>Thread for <strong style={{color:"var(--text)"}}>{doc.name}</strong></div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8, paddingBottom:4 }}>
        {thread.length === 0 && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:6, color:"var(--text-muted)", fontSize:13 }}>
            <div style={{ fontSize:32 }}>💬</div>
            No messages yet. Start the conversation below.
          </div>
        )}
        {thread.map(msg => (
          <div key={msg.id} style={{ display:"flex", gap:9, alignItems:"flex-start" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--accent-muted,rgba(108,99,255,0.15))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"var(--accent,#6c63ff)", flexShrink:0 }}>
              {(msg.author||"?")[0].toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:2 }}>
                <span style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{msg.author}</span>
                <span style={{ fontSize:10, color:"var(--text-muted)" }}>{new Date(msg.at).toLocaleString([],{hour:"2-digit",minute:"2-digit",month:"short",day:"numeric"})}</span>
              </div>
              <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.5, background:"var(--surface)", padding:"7px 10px", borderRadius:8, border:"1px solid var(--border)", display:"inline-block", maxWidth:"100%", wordBreak:"break-word" }}>{msg.body}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ borderTop:"1px solid var(--border)", paddingTop:10, marginTop:8 }}>
        <div style={{ display:"flex", gap:6, marginBottom:6 }}>
          <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Your name" style={{ flex:"0 0 120px", padding:"6px 8px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:12 }} />
          <div style={{ fontSize:11, color:"var(--text-muted)", alignSelf:"center" }}>posting as</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <textarea value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }} rows={2} placeholder="Type a message… (Enter to send)" style={{ flex:1, padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--card,var(--surface))", color:"var(--text)", fontSize:13, resize:"none" }} />
          <button onClick={send} disabled={!body.trim()} style={{ padding:"0 16px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, cursor:"pointer", alignSelf:"stretch" }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── IntegrationsModal ─────────────────────────────────────────────────────────
function IntegrationsModal({ doc, contacts=[], onClose, onUpdate }) {
  const ig = doc.integrations || {};
  const [emailTo, setEmailTo] = useState(ig.lastEmailTo || "");
  const [webhookUrl, setWebhookUrl] = useState(ig.webhookUrl || "");
  const [webhookEvent, setWebhookEvent] = useState(ig.webhookEvent || "status_change");
  const [slackEnabled, setSlackEnabled] = useState(ig.slackEnabled ?? false);
  const [slackChannel, setSlackChannel] = useState(ig.slackChannel || "#deals");
  const [tab, setTab] = useState("email");

  // collects whatever fields are currently set, so any action also persists current form state
  const pendingSave = () => ({ webhookUrl, webhookEvent, slackEnabled, slackChannel, lastEmailTo: emailTo });

  const log = (type, detail) => {
    const entry = { type, detail, at: new Date().toISOString() };
    onUpdate({ ...doc, integrations: { ...ig, ...pendingSave(), lastEvent: entry }, activityLog: [...(doc.activityLog||[]), { type:"shared", detail: `Integration: ${detail}`, at: entry.at }] });
  };

  const sendEmail = (via) => {
    if (!emailTo.trim()) { toast("Enter a recipient email","info"); return; }
    log("email_sent", `${via} → ${emailTo}`);
    toast(`Queued email via ${via} to ${emailTo}`);
  };

  const waLink = `https://wa.me/?text=${encodeURIComponent(`${doc.name} — ${doc.url || "(link on request)"}`)}`;

  const saveWebhook = () => {
    onUpdate({ ...doc, integrations: { ...ig, ...pendingSave() } });
    toast("Webhook saved");
  };
  const testWebhook = () => {
    if (!webhookUrl.trim()) { toast("Enter a webhook URL first","info"); return; }
    log("webhook_test", `Test ping → ${webhookUrl} (${webhookEvent})`);
    toast("Test payload sent (simulated)");
  };

  const saveSlack = () => {
    onUpdate({ ...doc, integrations: { ...ig, ...pendingSave() } });
    toast(slackEnabled ? `Slack notifications on for ${slackChannel}` : "Slack notifications off");
  };

  const addToCalendar = () => {
    if (!doc.expiresAt) { toast("This document has no expiry date set","info"); return; }
    const dt = doc.expiresAt.replace(/-/g,"");
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(doc.name+" expires")}&dates=${dt}/${dt}`;
    window.open(gcalUrl, "_blank");
    log("calendar_event", `Expiry event created for ${doc.expiresAt}`);
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid var(--border)", background: tab===id ? "var(--accent,#6c63ff)" : "transparent", color: tab===id ? "#fff" : "var(--text-muted)", fontSize:12, fontWeight:600, cursor:"pointer" }}>{label}</button>
  );

  return (
    <div style={{ minWidth:440 }}>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <TabBtn id="email" label="📧 Email" />
        <TabBtn id="whatsapp" label="🟢 WhatsApp" />
        <TabBtn id="webhook" label="⚡ Zapier / Webhook" />
        <TabBtn id="slack" label="💬 Slack" />
        <TabBtn id="calendar" label="📅 Calendar" />
      </div>

      {tab === "email" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Send <strong style={{color:"var(--text)"}}>{doc.name}</strong> directly from the CRM.</div>
          <FormField label="Recipient email"><input style={inputStyle} value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="client@example.com" /></FormField>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button style={btnStyle("primary")} onClick={() => sendEmail("Gmail")}>Send via Gmail</button>
            <button style={btnStyle("ghost")} onClick={() => sendEmail("Outlook")}>Send via Outlook</button>
          </div>
          {ig.lastEvent?.type === "email_sent" && <div style={{ marginTop:10, fontSize:12, color:"var(--text-muted)" }}>Last sent: {ig.lastEvent.detail} ({new Date(ig.lastEvent.at).toLocaleString()})</div>}
        </div>
      )}

      {tab === "whatsapp" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Share a link to this document over WhatsApp.</div>
          <div style={{ display:"flex", gap:8 }}>
            <a href={waLink} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}><button style={btnStyle("primary")} onClick={() => log("whatsapp_share", "Opened WhatsApp share")}>🟢 Open WhatsApp</button></a>
            <button style={btnStyle("ghost")} onClick={() => { navigator.clipboard?.writeText(doc.url || doc.name); toast("Link copied"); log("whatsapp_share","Copied share link"); }}>Copy link</button>
          </div>
        </div>
      )}

      {tab === "webhook" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Fire a webhook (e.g. Zapier) whenever this document's status changes.</div>
          <FormField label="Webhook URL"><input style={inputStyle} value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" /></FormField>
          <FormField label="Trigger event">
            <select style={inputStyle} value={webhookEvent} onChange={e=>setWebhookEvent(e.target.value)}>
              <option value="status_change">Status changes</option>
              <option value="signed">Document signed</option>
              <option value="expired">Document expires</option>
              <option value="created">Document created</option>
            </select>
          </FormField>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button style={btnStyle("primary")} onClick={saveWebhook}>Save</button>
            <button style={btnStyle("ghost")} onClick={testWebhook}>Send test ping</button>
          </div>
        </div>
      )}

      {tab === "slack" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Post a Slack notification when this document is signed.</div>
          <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, fontSize:13, color:"var(--text)" }}>
            <input type="checkbox" checked={slackEnabled} onChange={e=>setSlackEnabled(e.target.checked)} /> Notify Slack on signature
          </label>
          <FormField label="Channel"><input style={inputStyle} value={slackChannel} onChange={e=>setSlackChannel(e.target.value)} placeholder="#deals" /></FormField>
          <button style={{ ...btnStyle("primary"), marginTop:10 }} onClick={saveSlack}>Save</button>
        </div>
      )}

      {tab === "calendar" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>
            {doc.expiresAt ? <>Create a calendar reminder for the expiry on <strong style={{color:"var(--text)"}}>{fmtDate ? fmtDate(doc.expiresAt) : doc.expiresAt}</strong>.</> : "Set an expiry date on this document (via Edit details) to enable calendar reminders."}
          </div>
          <button style={btnStyle("primary")} disabled={!doc.expiresAt} onClick={addToCalendar}>📅 Add expiry to calendar</button>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT & COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════

// Simple deterministic string hash to simulate a tamper-evident checksum for the exported log.
const tamperHash = (str) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8,"0") + (h1 >>> 0).toString(16).padStart(8,"0");
};

function ComplianceModal({ documents, setDocuments, workspaceId, userId, addAudit, retentionDays, setRetentionDays, onClose }) {
  const [tab, setTab] = useState("audit");
  const [gdprContact, setGdprContact] = useState("");
  const [retentionInput, setRetentionInput] = useState(retentionDays || 0);

  const allEvents = useMemo(() => {
    return (documents||[]).flatMap(d => (d.activityLog||[]).map(e => ({ ...e, docName: d.name, docId: d.id })))
      .sort((a,b) => new Date(b.at) - new Date(a.at));
  }, [documents]);

  const exportTamperProof = () => {
    const payload = { exportedAt: new Date().toISOString(), workspaceId, events: allEvents };
    const json = JSON.stringify(payload);
    const checksum = tamperHash(json);
    const full = JSON.stringify({ ...payload, checksum }, null, 2);
    const blob = new Blob([full], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${workspaceId}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    addAudit("Documents","AuditExport",`Exported tamper-proof audit log (${allEvents.length} events, checksum ${checksum.slice(0,8)}…)`);
    toast("Audit log exported with checksum");
  };

  const gdprDelete = () => {
    const name = gdprContact.trim().toLowerCase();
    if (!name) { toast("Enter a contact name","info"); return; }
    const matches = (documents||[]).filter(d => (d.relatedClient||"").toLowerCase() === name);
    if (matches.length === 0) { toast("No documents found for that contact","info"); return; }
    if (!window.confirm(`GDPR delete: permanently remove ${matches.length} document(s) tied to "${gdprContact}"? This cannot be undone.`)) return;
    const u = (documents||[]).filter(d => (d.relatedClient||"").toLowerCase() !== name);
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","GDPRDelete",`Bulk-deleted ${matches.length} docs for contact "${gdprContact}"`);
    toast(`${matches.length} document(s) deleted`, "info");
    setGdprContact("");
  };

  const saveRetention = () => {
    const days = Number(retentionInput) || 0;
    setRetentionDays(days);
    try { localStorage.setItem(`doc-retention-${workspaceId}`, String(days)); } catch {}
    addAudit("Documents","RetentionPolicy", days > 0 ? `Retention policy set to auto-archive after ${days} days` : "Retention policy disabled");
    toast(days > 0 ? `Documents older than ${days} days will auto-archive` : "Retention policy disabled");
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid var(--border)", background: tab===id ? "var(--accent,#6c63ff)" : "transparent", color: tab===id ? "#fff" : "var(--text-muted)", fontSize:12, fontWeight:600, cursor:"pointer" }}>{label}</button>
  );

  return (
    <div style={{ minWidth:480, maxHeight:"70vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <TabBtn id="audit" label="📜 Audit trail" />
        <TabBtn id="gdpr" label="🛡 GDPR deletion" />
        <TabBtn id="retention" label="🗄 Retention policy" />
      </div>

      {tab === "audit" && (
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:12, color:"var(--text-muted)" }}>Every open, edit, download, and status change — logged with a timestamp.</div>
            <button style={btnStyle("ghost","sm")} onClick={exportTamperProof}>⬇ Export tamper-proof log</button>
          </div>
          {allEvents.length === 0 ? (
            <div style={{ padding:30, textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No audit events recorded yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {allEvents.slice(0,150).map((e,i) => (
                <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"6px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12 }}>
                  <span style={{ color:"var(--text-muted)", flexShrink:0, whiteSpace:"nowrap" }}>{new Date(e.at).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  <span style={{ flex:1, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}><strong>{e.docName}</strong> — {e.type.replace(/_/g," ")}{e.detail ? `: ${e.detail}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "gdpr" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Bulk-remove all documents tied to a contact, to fulfil a GDPR "right to erasure" request. This deletes the document records permanently.</div>
          <FormField label="Contact name"><input style={inputStyle} value={gdprContact} onChange={e=>setGdprContact(e.target.value)} placeholder="Exact client name as shown on documents" /></FormField>
          <button style={{ ...btnStyle("primary"), marginTop:10, background:"var(--danger,#ef4444)" }} onClick={gdprDelete}>🛡 Delete all documents for this contact</button>
        </div>
      )}

      {tab === "retention" && (
        <div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:10 }}>Automatically move documents to "Archived" status after a set number of days from creation. Set to 0 to disable.</div>
          <FormField label="Auto-archive after (days)"><input type="number" min="0" style={inputStyle} value={retentionInput} onChange={e=>setRetentionInput(e.target.value)} /></FormField>
          <button style={{ ...btnStyle("primary"), marginTop:10 }} onClick={saveRetention}>Save retention policy</button>
          {retentionDays > 0 && <div style={{ marginTop:10, fontSize:12, color:"var(--text-muted)" }}>Currently active: documents auto-archive after {retentionDays} days.</div>}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT RELATIONSHIPS
// ══════════════════════════════════════════════════════════════════════════════

function RelationshipsModal({ doc, documents, onClose, onUpdate, onOpenTimeline }) {
  const others = (documents||[]).filter(d => d.id !== doc.id);
  const [linkTarget, setLinkTarget] = useState("");
  const [bundleName, setBundleName] = useState(doc.bundleName || "");
  const [parentId, setParentId] = useState(doc.parentDocId || "");

  const linkedIds = doc.linkedDocIds || [];
  const linkedDocs = others.filter(d => linkedIds.includes(d.id));
  const children = others.filter(d => d.parentDocId === doc.id);
  const bundleMates = doc.bundleName ? others.filter(d => d.bundleName === doc.bundleName) : [];

  const addLink = () => {
    if (!linkTarget) return;
    onUpdate({ ...doc, linkedDocIds: [...new Set([...linkedIds, linkTarget])] });
    setLinkTarget("");
  };
  const removeLink = (id) => onUpdate({ ...doc, linkedDocIds: linkedIds.filter(x => x !== id) });

  const saveBundle = () => {
    onUpdate({ ...doc, bundleName: bundleName.trim() || null });
    toast(bundleName.trim() ? `Added to bundle "${bundleName.trim()}"` : "Removed from bundle");
  };

  const saveParent = () => {
    onUpdate({ ...doc, parentDocId: parentId || null });
    toast(parentId ? "Linked as amendment to parent document" : "Parent link removed");
  };

  const sectionHd = (t) => <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", margin:"16px 0 8px" }}>{t}</div>;

  return (
    <div style={{ minWidth:460, maxHeight:"70vh", overflowY:"auto" }}>
      <div style={{ fontSize:13, color:"var(--text-muted)" }}>Relationships for <strong style={{color:"var(--text)"}}>{doc.name}</strong></div>

      {sectionHd("Linked documents (e.g. Invoice ↔ Contract)")}
      <div style={{ display:"flex", gap:8, marginBottom:8 }}>
        <select style={{ ...inputStyle, flex:1 }} value={linkTarget} onChange={e=>setLinkTarget(e.target.value)}>
          <option value="">Select a document to link…</option>
          {others.filter(d => !linkedIds.includes(d.id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button style={btnStyle("primary")} onClick={addLink}>+ Link</button>
      </div>
      {linkedDocs.length === 0 ? (
        <div style={{ fontSize:12, color:"var(--text-muted)" }}>No linked documents yet.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {linkedDocs.map(d => (
            <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12 }}>
              <span>{TYPE_ICONS[d.type]||"📄"}</span><span style={{ flex:1, color:"var(--text)" }}>{d.name}</span>
              <button style={{ ...btnStyle("ghost","sm"), padding:"2px 6px" }} onClick={() => removeLink(d.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {sectionHd("Document bundle")}
      <div style={{ display:"flex", gap:8 }}>
        <input style={{ ...inputStyle, flex:1 }} value={bundleName} onChange={e=>setBundleName(e.target.value)} placeholder="e.g. Acme Onboarding Package" />
        <button style={btnStyle("primary")} onClick={saveBundle}>Save</button>
      </div>
      {bundleMates.length > 0 && (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:5 }}>
          {bundleMates.map(d => (
            <div key={d.id} style={{ padding:"6px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12, color:"var(--text)" }}>{TYPE_ICONS[d.type]||"📄"} {d.name}</div>
          ))}
        </div>
      )}

      {sectionHd("Parent document (this is an amendment of…)")}
      <div style={{ display:"flex", gap:8 }}>
        <select style={{ ...inputStyle, flex:1 }} value={parentId} onChange={e=>setParentId(e.target.value)}>
          <option value="">No parent</option>
          {others.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button style={btnStyle("primary")} onClick={saveParent}>Save</button>
      </div>
      {children.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:5 }}>Amendments linked to this document:</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {children.map(d => (
              <div key={d.id} style={{ padding:"6px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", fontSize:12, color:"var(--text)" }}>{TYPE_ICONS[d.type]||"📄"} {d.name}</div>
            ))}
          </div>
        </div>
      )}

      {doc.relatedClient && (
        <>
          {sectionHd("Client timeline")}
          <button style={btnStyle("ghost")} onClick={() => onOpenTimeline(doc.relatedClient)}>🕐 View all documents for {doc.relatedClient}</button>
        </>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

// ── CameraScanner ─────────────────────────────────────────────────────────────
function CameraScanner({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream]     = useState(null);
  const [captured, setCaptured] = useState(null);
  const [error, setError]       = useState(null);
  const [fileName, setFileName] = useState("scanned-document.png");

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Camera access denied or unavailable. Upload a file instead."));
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setCaptured(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
  };

  const attach = () => {
    if (!captured) return;
    // Convert data URL to a File-like attachment object
    const att = {
      id: Math.random().toString(36).slice(2),
      name: fileName,
      type: "image/png",
      dataUrl: captured,
      size: Math.round(captured.length * 0.75),
      uploadedAt: new Date().toISOString(),
      folder: "General",
    };
    onCapture(att);
    onClose();
  };

  const retake = () => {
    setCaptured(null);
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then(s => { setStream(s); if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Camera unavailable."));
  };

  // Fallback: file upload
  const fileInput = useRef(null);
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCaptured(ev.target.result);
    reader.readAsDataURL(file);
    setFileName(file.name);
  };

  return (
    <div style={{ minWidth: 340 }}>
      {error ? (
        <div style={{ padding: "16px 0", textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
          {error}
          <br/><br/>
          <label style={{ padding:"6px 16px", borderRadius:7, background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            📁 Upload image instead
            <input type="file" accept="image/*" style={{ display:"none" }} ref={fileInput} onChange={handleFileSelect} />
          </label>
        </div>
      ) : captured ? (
        <div>
          <img src={captured} alt="Scanned" style={{ width:"100%", borderRadius:8, marginBottom:12, border:"1px solid var(--border)" }} />
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:4 }}>File name</label>
            <input value={fileName} onChange={e=>setFileName(e.target.value)}
              style={{ width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontSize:13, boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={retake} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>🔄 Retake</button>
            <button onClick={attach} style={{ padding:"7px 18px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>📎 Attach to document</button>
          </div>
        </div>
      ) : (
        <div>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", borderRadius:8, background:"#000", marginBottom:10, maxHeight:300, objectFit:"cover" }} />
          <canvas ref={canvasRef} style={{ display:"none" }} />
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={snap} style={{ padding:"9px 24px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>📸 Capture</button>
            <label style={{ padding:"9px 16px", borderRadius:7, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text)", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              📁 Upload instead
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileSelect} />
            </label>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:"var(--text-muted)", textAlign:"center" }}>Point your camera at a physical document and tap Capture.</div>
        </div>
      )}
      {captured && (
        <div>
          <canvas ref={canvasRef} style={{ display:"none" }} />
        </div>
      )}
    </div>
  );
}

// ── TimelineModal ──────────────────────────────────────────────────────────────
function TimelineModal({ client, documents, onClose, onDocClick }) {
  const docs = (documents||[]).filter(d => d.relatedClient === client).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  return (
    <div style={{ minWidth:440, maxHeight:"65vh", overflowY:"auto" }}>
      <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:14 }}>All documents for <strong style={{color:"var(--text)"}}>{client}</strong>, in order.</div>
      {docs.length === 0 ? (
        <div style={{ padding:30, textAlign:"center", color:"var(--text-muted)", fontSize:13 }}>No documents found for this client.</div>
      ) : (
        <div style={{ position:"relative", paddingLeft:22 }}>
          <div style={{ position:"absolute", left:6, top:6, bottom:6, width:2, background:"var(--border)" }} />
          {docs.map(d => {
            const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Draft;
            return (
              <div key={d.id} style={{ position:"relative", marginBottom:16, cursor:"pointer" }} onClick={() => onDocClick?.(d)}>
                <div style={{ position:"absolute", left:-22, top:3, width:10, height:10, borderRadius:"50%", background:sc.dot, border:"2px solid var(--card,var(--surface))" }} />
                <div style={{ fontSize:11, color:"var(--text-muted)" }}>{d.createdAt}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{TYPE_ICONS[d.type]||"📄"} {d.name} {d.parentDocId && <span style={{ fontSize:11, fontWeight:400, color:"var(--text-muted)" }}>(amendment)</span>}</div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color, marginTop:3 }}>{d.status}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:16, paddingTop:12, borderTop:"1px solid var(--border)" }}>
        <button onClick={onClose} style={{ padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
      </div>
    </div>
  );
}

export default function DocumentsTab({ documents, setDocuments, addAudit, role, contacts, projects, tags, workspaceId = "workspace-1", onLinkedSave, userId, currentUser }) {

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [inlineStatusFor, setInlineStatusFor] = useState(null);
  const [colVis, setColVis] = useState({ Type:true, Client:true, Project:true, Created:true, Link:true });
  const [showColMenu, setShowColMenu] = useState(false);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards" | "kanban" | "calendar" | "portal" | "archive"
  const [viewingDoc, setViewingDoc] = useState(null); // slide-in preview panel
  const [templateInitial, setTemplateInitial] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);   // open DocEditor
  const [fileManagerDoc, setFileManagerDoc] = useState(null); // open file manager
  const [newDocTemplate, setNewDocTemplate] = useState(null); // { tpl } — name prompt before opening editor

  // ── Smart Features state ──────────────────────────────────────────────────
  const [showPDFExtract, setShowPDFExtract]   = useState(false);

  // ── Analytics state ───────────────────────────────────────────────────────
  const [activityLogDoc, setActivityLogDoc]   = useState(null);
  const [showAnalytics, setShowAnalytics]     = useState(false);

  // ── Reminders state ───────────────────────────────────────────────────────
  const [followUpDoc, setFollowUpDoc]         = useState(null);
  const [showOverdue, setShowOverdue]         = useState(false);

  // ── Templates state ───────────────────────────────────────────────────────
  const [customTemplates, setCustomTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem(`doc-templates-${workspaceId}`) || "[]"); } catch { return []; } });
  const [saveAsTplDoc, setSaveAsTplDoc]       = useState(null);
  const [showTplLibrary, setShowTplLibrary]   = useState(false);

  // ── Collaboration state ───────────────────────────────────────────────────
  const [assignDoc, setAssignDoc]             = useState(null);
  const [chatDoc, setChatDoc]                 = useState(null);
  const [lockedBy, setLockedBy]               = useState({});

  // ── Integrations state ────────────────────────────────────────────────────
  const [integrationsDoc, setIntegrationsDoc] = useState(null);

  // ── Audit & compliance state ──────────────────────────────────────────────
  const [showCompliance, setShowCompliance]   = useState(false);
  const [retentionDays, setRetentionDays]     = useState(() => { try { return Number(localStorage.getItem(`doc-retention-${workspaceId}`)) || 0; } catch { return 0; } });

  // ── Document relationships state ──────────────────────────────────────────
  const [relationshipsDoc, setRelationshipsDoc] = useState(null);
  const [timelineClient, setTimelineClient]     = useState(null);

  // ── Starred / pinned ─────────────────────────────────────────────────────
  const [starred, setStarred] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(`doc-starred-${workspaceId}`) || "[]")); } catch { return new Set(); } });

  // ── Security state ────────────────────────────────────────────────────────
  const [twoFaDoc, setTwoFaDoc]           = useState(null);   // doc pending 2FA unlock
  const [twoFaCode, setTwoFaCode]         = useState("");
  const [twoFaError, setTwoFaError]       = useState(false);
  const [unlockedSensitive, setUnlockedSensitive] = useState(new Set()); // doc IDs unlocked via 2FA
  const SENSITIVE_TYPES = ["NDA", "Contract"];
  const DOWNLOAD_ALLOWED_ROLES = ["Owner", "Admin", "Editor"]; // "Viewer" cannot download
  const canDownload = DOWNLOAD_ALLOWED_ROLES.includes(role);
  const SIMULATED_2FA_CODE = "123456"; // In production this would be a real TOTP/OTP

  // ── Mobile / offline state ────────────────────────────────────────────────
  const [offlineQueue, setOfflineQueue]   = useState(() => { try { return JSON.parse(localStorage.getItem(`doc-offline-queue-${workspaceId}`) || "[]"); } catch { return []; } });
  const [isOnline, setIsOnline]           = useState(() => navigator.onLine);
  const [scanModal, setScanModal]         = useState(false);
  const [scanTargetDoc, setScanTargetDoc] = useState(null);

  // Track online/offline status
  useEffect(() => {
    const setOnline  = () => { setIsOnline(true);  syncOfflineQueue(); };
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online",  setOnline);
    window.addEventListener("offline", setOffline);
    return () => { window.removeEventListener("online", setOnline); window.removeEventListener("offline", setOffline); };
  }, []);

  const syncOfflineQueue = useCallback(() => {
    const queue = (() => { try { return JSON.parse(localStorage.getItem(`doc-offline-queue-${workspaceId}`) || "[]"); } catch { return []; } })();
    if (!queue.length) return;
    // Apply queued status changes
    let docs = documents || [];
    queue.forEach(op => {
      if (op.type === "status") docs = docs.map(d => d.id === op.docId ? { ...d, status: op.status, updatedAt: op.at } : d);
    });
    setDocuments(docs);
    saveWorkspaceData("documents", docs, workspaceId, userId).catch(() => {});
    setOfflineQueue([]);
    try { localStorage.removeItem(`doc-offline-queue-${workspaceId}`); } catch {}
    toast(`✅ Synced ${queue.length} offline change${queue.length !== 1 ? "s" : ""}`);
  }, [documents, workspaceId, userId]);

  const enqueueOffline = (op) => {
    const q = [...offlineQueue, { ...op, at: new Date().toISOString() }];
    setOfflineQueue(q);
    try { localStorage.setItem(`doc-offline-queue-${workspaceId}`, JSON.stringify(q)); } catch {}
    toast("💾 Saved offline — will sync when reconnected", "info");
  };

  // Expiry auto-lock: mark docs as read-only after expiry date
  const isExpiryLocked = (doc) => doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now();

  // 2FA gate: opens 2FA prompt for sensitive doc types; calls callback if already unlocked
  const require2FA = (doc, callback) => {
    if (!SENSITIVE_TYPES.includes(doc.type)) { callback(); return; }
    if (unlockedSensitive.has(doc.id)) { callback(); return; }
    setTwoFaDoc({ doc, callback });
    setTwoFaCode(""); setTwoFaError(false);
  };

  const confirm2FA = () => {
    if (twoFaCode.trim() !== SIMULATED_2FA_CODE) { setTwoFaError(true); return; }
    setUnlockedSensitive(prev => new Set([...prev, twoFaDoc.doc.id]));
    const cb = twoFaDoc.callback;
    setTwoFaDoc(null); setTwoFaCode(""); setTwoFaError(false);
    cb();
  };

  // ── Bulk status change ────────────────────────────────────────────────────
  const [showBulkStatus, setShowBulkStatus] = useState(false);

  // ── Branding per-client portal ────────────────────────────────────────────
  const [portalClient, setPortalClient] = useState("All");

  // ── Cover page / print settings ──────────────────────────────────────────
  const [showCoverPage, setShowCoverPage] = useState(false);
  const [coverPageDoc, setCoverPageDoc] = useState(null);

  // ── Editor theme ─────────────────────────────────────────────────────────
  const [editorTheme, setEditorTheme] = useState(() => { try { return localStorage.getItem(`doc-editor-theme-${workspaceId}`) || "light"; } catch { return "light"; } });

  // Retention policy: auto-archive documents older than the configured window.
  useEffect(() => {
    if (!retentionDays) return;
    const cutoff = Date.now() - retentionDays * 86400000;
    const toArchive = (documents||[]).filter(d => d.status !== "Archived" && d.createdAt && new Date(d.createdAt).getTime() < cutoff);
    if (toArchive.length === 0) return;
    const ids = new Set(toArchive.map(d => d.id));
    const u = (documents||[]).map(d => ids.has(d.id) ? { ...d, status: "Archived", updatedAt: new Date().toISOString() } : d);
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","AutoArchive",`Auto-archived ${toArchive.length} doc(s) per retention policy`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retentionDays, workspaceId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addActivity = useCallback((doc, type, detail) => {
    const entry = { type, detail, at: new Date().toISOString() };
    const updated = { ...doc, activityLog: [...(doc.activityLog||[]), entry] };
    const u = (documents||[]).map(d => d.id===doc.id ? updated : d);
    setDocuments(u);
    saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    return updated;
  }, [documents, workspaceId]);

  const saveCustomTemplates = (tpls) => {
    setCustomTemplates(tpls);
    try { localStorage.setItem(`doc-templates-${workspaceId}`, JSON.stringify(tpls)); } catch {}
  };

  const updateDoc = useCallback((updated) => {
    const u = (documents||[]).map(d => d.id===updated.id ? {...updated, updatedAt:new Date().toISOString()} : d);
    setDocuments(u);
    saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
  }, [documents, workspaceId]);

  const toggleStar = (id) => {
    setStarred(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      try { localStorage.setItem(`doc-starred-${workspaceId}`, JSON.stringify([...s])); } catch {}
      return s;
    });
  };

  const bulkStatusChange = (status) => {
    const u = (documents||[]).map(d => selected.has(d.id) ? {...d, status, updatedAt: new Date().toISOString()} : d);
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","BulkStatus",`Set ${selected.size} docs → ${status}`);
    toast(`${selected.size} documents → ${status}`);
    setShowBulkStatus(false);
    setSelected(new Set());
  };

  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return (documents||[]).reduce((acc, d) => acc + (d.followUps||[]).filter(f => !f.done && f.date < today).length, 0);
  }, [documents]);

  const filtered = useMemo(() => {
    const docs = (documents||[]).filter(d => {
      const q = search.toLowerCase();
      // Archive view: only show archived
      if (viewMode === "archive") return d.status === "Archived";
      return (!q || d.name?.toLowerCase().includes(q) || d.relatedClient?.toLowerCase().includes(q) || d.relatedProject?.toLowerCase().includes(q) || (d.tags||[]).some(t=>t.toLowerCase().includes(q)) || d.notes?.toLowerCase().includes(q) || (d.editorContent||'').replace(/<[^>]+>/g,'').toLowerCase().includes(q))
        && (filterType === "All" || d.type === filterType)
        && (filterStatus === "All" || d.status === filterStatus)
        && (viewMode !== "starred" || starred.has(d.id))
        && (viewMode === "portal" ? (portalClient === "All" || d.relatedClient === portalClient) : true);
    });
    return [...docs].sort((a,b) => {
      const av = (a[sortKey]||"").toLowerCase?.() ?? a[sortKey] ?? "";
      const bv = (b[sortKey]||"").toLowerCase?.() ?? b[sortKey] ?? "";
      return sortDir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
  }, [documents, search, filterType, filterStatus, sortKey, sortDir]);

  const handleSort = useCallback((key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  // Stats
  const stats = useMemo(() => {
    const all = documents || [];
    const now = Date.now();
    const soon = 7 * 86400000;
    return {
      total: all.length,
      draft: all.filter(d => d.status === "Draft").length,
      signed: all.filter(d => d.status === "Signed").length,
      sent: all.filter(d => d.status === "Sent").length,
      expiringSoon: all.filter(d => d.expiresAt && new Date(d.expiresAt).getTime() > now && new Date(d.expiresAt).getTime() - now < soon).length,
    };
  }, [documents]);

  const activeFilters = (filterType !== "All" ? 1 : 0) + (filterStatus !== "All" ? 1 : 0) + (search ? 1 : 0);

  // Expiry helpers
  const expiryState = (d) => {
    if (!d.expiresAt) return null;
    const diff = new Date(d.expiresAt).getTime() - Date.now();
    if (diff < 0) return "expired";
    if (diff < 7 * 86400000) return "soon";
    return null;
  };

  // Bulk helpers
  const allSelected = filtered.length > 0 && filtered.every(d => selected.has(d.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(d => d.id)));
  const toggleOne = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} document(s)?`)) return;
    const u = (documents||[]).filter(d => !selected.has(d.id));
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","BulkDelete",`Deleted ${selected.size} docs`);
    toast(`${selected.size} documents deleted`, "info"); setSelected(new Set());
  };
  const bulkExport = () => { exportToCSV("documents", filtered.filter(d => selected.has(d.id))); toast("Exported selected"); };

  // Inline status update (offline-aware)
  const updateStatus = (id, status) => {
    const u = (documents||[]).map(d => d.id===id ? {...d, status, updatedAt: new Date().toISOString()} : d);
    setDocuments(u);
    if (isOnline) {
      saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
      addAudit("Documents","StatusChange",`Status → ${status}`);
      toast(`Status set to ${status}`);
    } else {
      enqueueOffline({ type:"status", docId: id, status });
    }
    setInlineStatusFor(null);
  };

  // Duplicate
  const duplicate = (d) => {
    const nd = {...d, id: genId(), name: `${d.name} (copy)`, createdAt: new Date().toISOString().slice(0,10), updatedAt: undefined};
    const u = [nd, ...(documents||[])]; setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","Duplicate",`Duplicated: ${d.name}`); toast("Document duplicated");
  };


  const closeForm = () => { setShowForm(false); setEditing(null); setTemplateInitial(null); };

  const save = (f) => {
    if (editing) { const u = (documents||[]).map(d=>d.id===editing.id?{...editing,...f,updatedAt:new Date().toISOString()}:d); setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info")); addAudit("Documents","Update",`Updated doc: ${f.name}`); toast("Document updated"); }
    else {
      // Duplicate detection
      const similar = (documents||[]).find(d => d.name.toLowerCase().trim() === f.name.toLowerCase().trim() || (d.name.toLowerCase().includes(f.name.toLowerCase().slice(0,12)) && d.relatedClient === f.relatedClient && d.relatedClient));
      if (similar && !window.confirm(`A similar document "${similar.name}" already exists. Add anyway?`)) return;
      const nd = {...f, id: genId(), createdAt: new Date().toISOString().slice(0,10)}; const u = [nd,...(documents||[])]; setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info")); addAudit("Documents","Create",`Added doc: ${f.name}`); toast("Document added"); }
    closeForm();
  };
  const del = (id) => { const d = (documents||[]).find(x=>x.id===id); const u = (documents||[]).filter(x=>x.id!==id); setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info")); addAudit("Documents","Delete",`Deleted doc: ${d?.name}`); toast("Deleted","info"); setConfirm(null); };
  
  const handleExport = () => { exportToCSV("documents", filtered); toast("Documents exported to CSV"); };

  const saveEditorDoc = (updated) => {
    const u = (documents||[]).map(d => d.id===updated.id ? {...updated, updatedAt: new Date().toISOString()} : d);
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","Edit",`Edited content: ${updated.name}`);
    setEditingDoc(null);
  };

  const saveDocFiles = (docId, newAttachments) => {
    const u = (documents||[]).map(d => d.id===docId ? {...d, attachments: newAttachments, updatedAt: new Date().toISOString()} : d);
    setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
    addAudit("Documents","Files",`Updated files on doc ${docId}`);
  };

  const SortTh = ({ label, sk }) => {
    const active = sortKey === sk;
    return (
      <th onClick={sk ? () => handleSort(sk) : undefined} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: active ? "var(--text)" : "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap", cursor: sk ? "pointer" : "default", userSelect: "none", transition: "color 0.1s" }}>
        {label}{sk && <span style={{ marginLeft: 4, opacity: active ? 1 : 0.35 }}>{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>}
      </th>
    );
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this document?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}

      {/* ── 2FA unlock modal ── */}
      {twoFaDoc && (
        <Modal title={`🔐 Two-Factor Verification — ${twoFaDoc.doc.name}`} onClose={() => setTwoFaDoc(null)}>
          <div style={{ minWidth: 340 }}>
            <div style={{ padding:"10px 14px", borderRadius:8, background:"rgba(108,99,255,0.08)", border:"1px solid rgba(108,99,255,0.25)", fontSize:13, color:"var(--text)", marginBottom:16 }}>
              <strong>{SENSITIVE_TYPES.includes(twoFaDoc.doc.type) ? `🔒 ${twoFaDoc.doc.type}` : twoFaDoc.doc.name}</strong> requires two-factor verification before opening.
              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>Enter your 6-digit code to proceed. <em>(Demo code: 123456)</em></div>
            </div>
            <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:6 }}>Verification Code</label>
            <input
              autoFocus
              value={twoFaCode}
              onChange={e => { setTwoFaCode(e.target.value.replace(/\D/g,"")); setTwoFaError(false); }}
              onKeyDown={e => e.key === "Enter" && confirm2FA()}
              maxLength={6}
              placeholder="••••••"
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:`1.5px solid ${twoFaError ? "var(--danger,#ef4444)" : "var(--border)"}`, background:"var(--surface)", color:"var(--text)", fontSize:22, letterSpacing:"0.3em", textAlign:"center", boxSizing:"border-box", fontWeight:700 }}
            />
            {twoFaError && <div style={{ marginTop:6, fontSize:12, color:"var(--danger,#ef4444)", fontWeight:600 }}>❌ Incorrect code. Try again.</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:18, paddingTop:14, borderTop:"1px solid var(--border)" }}>
              <button onClick={() => setTwoFaDoc(null)} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Cancel</button>
              <button onClick={confirm2FA} disabled={twoFaCode.length !== 6} style={{ padding:"7px 20px", borderRadius:7, border:"none", background:"var(--accent,#6c63ff)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", opacity: twoFaCode.length !== 6 ? 0.5 : 1 }}>🔓 Verify & Open</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Camera scan modal ── */}
      {scanModal && (
        <Modal title={`📷 Scan Document${scanTargetDoc ? ` — attach to ${scanTargetDoc.name}` : ""}`} onClose={() => { setScanModal(false); setScanTargetDoc(null); }}>
          <CameraScanner
            onCapture={(att) => {
              if (scanTargetDoc) {
                const newAtts = [...(scanTargetDoc.attachments || []), att];
                saveDocFiles(scanTargetDoc.id, newAtts);
                toast(`📎 Scanned image attached to ${scanTargetDoc.name}`);
              } else {
                toast("📎 Scan captured — attach a document to save it", "info");
              }
            }}
            onClose={() => { setScanModal(false); setScanTargetDoc(null); }}
          />
        </Modal>
      )}

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div style={{ marginBottom:12, padding:"9px 16px", borderRadius:8, background:"rgba(234,179,8,0.12)", border:"1px solid rgba(234,179,8,0.4)", fontSize:13, color:"#92610a", display:"flex", alignItems:"center", gap:8, fontWeight:600 }}>
          📶 You are offline — status changes will be queued and synced when reconnected.
          {offlineQueue.length > 0 && <span style={{ marginLeft:4, fontSize:12, fontWeight:400 }}>({offlineQueue.length} pending)</span>}
        </div>
      )}
      {isOnline && offlineQueue.length > 0 && (
        <div style={{ marginBottom:12, padding:"9px 16px", borderRadius:8, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", fontSize:13, color:"#166534", display:"flex", alignItems:"center", gap:8, fontWeight:600 }}>
          ✅ Back online — <button onClick={syncOfflineQueue} style={{ background:"none", border:"none", cursor:"pointer", color:"#166534", fontWeight:700, fontSize:13, textDecoration:"underline", padding:0 }}>sync {offlineQueue.length} pending change{offlineQueue.length!==1?"s":""}</button>
        </div>
      )}

      {/* ── View-only banner ── */}
      {role === "Viewer" && (
        <div style={{ marginBottom:14, padding:"9px 16px", borderRadius:8, background:"rgba(148,163,184,0.13)", border:"1px solid var(--border)", fontSize:13, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:8 }}>
          👁 <strong style={{ color:"var(--text)" }}>View-only mode</strong> — you have read-only access to this workspace. Editing, downloading, and deleting are disabled.
        </div>
      )}

      {/* ── Smart Features Modals ── */}
      {showPDFExtract && <Modal title="🔍 PDF / File Extractor" onClose={() => setShowPDFExtract(false)}><PDFExtractModal onClose={() => setShowPDFExtract(false)} /></Modal>}

      {/* ── Analytics Modals ── */}
      {activityLogDoc && <Modal title={`📋 Activity Log — ${activityLogDoc.name}`} onClose={() => setActivityLogDoc(null)}><ActivityLogModal doc={activityLogDoc} onClose={() => setActivityLogDoc(null)} /></Modal>}
      {showAnalytics && <Modal title="📊 Document Analytics" onClose={() => setShowAnalytics(false)}><AnalyticsDashboard documents={documents} onClose={() => setShowAnalytics(false)} /></Modal>}

      {/* ── Reminders Modals ── */}
      {followUpDoc && <Modal title={`📅 Follow-up Scheduler — ${followUpDoc.name}`} onClose={() => setFollowUpDoc(null)}><FollowUpSchedulerModal doc={followUpDoc} onClose={() => setFollowUpDoc(null)} onUpdate={(updated) => { updateDoc(updated); setFollowUpDoc(updated); }} /></Modal>}
      {showOverdue && <Modal title="⚠ Overdue Alerts" onClose={() => setShowOverdue(false)}><OverdueDashboard documents={documents} onClose={() => setShowOverdue(false)} onDocClick={(d) => { setShowOverdue(false); setViewingDoc(d); }} /></Modal>}

      {/* ── Template Modals ── */}
      {saveAsTplDoc && <Modal title="📄 Save as Template" onClose={() => setSaveAsTplDoc(null)}><SaveAsTemplateModal doc={saveAsTplDoc} onClose={() => setSaveAsTplDoc(null)} onSave={(tpl) => saveCustomTemplates([...customTemplates, tpl])} /></Modal>}
      {showTplLibrary && <Modal title="📄 Template Library" onClose={() => setShowTplLibrary(false)}><TemplateLibraryModal customTemplates={customTemplates} onClose={() => setShowTplLibrary(false)} onDeleteTemplate={(id) => saveCustomTemplates(customTemplates.filter(t=>t.id!==id))} onUseTemplate={(tpl) => { const nd = { id: genId(), name: tpl.name, type: tpl.type||"Template", status:"Draft", editorContent: tpl.html, tags:[], attachments:[], createdAt: new Date().toISOString().slice(0,10) }; const u = [nd,...(documents||[])]; setDocuments(u); saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info")); addAudit("Documents","Create",`From template: ${tpl.name}`); setEditingDoc(nd); }} /></Modal>}

      {/* ── Collaboration Modals ── */}
      {assignDoc && <Modal title={`👤 Assign Document`} onClose={() => setAssignDoc(null)}><AssignDocModal doc={assignDoc} contacts={contacts||[]} onClose={() => setAssignDoc(null)} onUpdate={(updated) => { updateDoc(updated); setAssignDoc(null); toast("Assignment saved"); }} /></Modal>}
      {chatDoc && <Modal title={`💬 Document Chat — ${chatDoc.name}`} onClose={() => setChatDoc(null)}><DocChatModal doc={chatDoc} currentUser={currentUser} onClose={() => setChatDoc(null)} onUpdate={(updated) => { updateDoc(updated); setChatDoc(updated); }} /></Modal>}

      {/* ── Integrations Modal ── */}
      {integrationsDoc && <Modal title={`🔌 Integrations — ${integrationsDoc.name}`} onClose={() => setIntegrationsDoc(null)}><IntegrationsModal doc={integrationsDoc} contacts={contacts||[]} onClose={() => setIntegrationsDoc(null)} onUpdate={(updated) => { updateDoc(updated); setIntegrationsDoc(updated); }} /></Modal>}

      {/* ── Audit & Compliance Modal ── */}
      {showCompliance && <Modal title="🛡 Audit & Compliance" onClose={() => setShowCompliance(false)}><ComplianceModal documents={documents} setDocuments={setDocuments} workspaceId={workspaceId} userId={userId} addAudit={addAudit} retentionDays={retentionDays} setRetentionDays={setRetentionDays} onClose={() => setShowCompliance(false)} /></Modal>}

      {/* ── Document Relationships Modal ── */}
      {relationshipsDoc && (
        <Modal title={`🔗 Relationships — ${relationshipsDoc.name}`} onClose={() => setRelationshipsDoc(null)}>
          <RelationshipsModal
            doc={relationshipsDoc}
            documents={documents}
            onClose={() => setRelationshipsDoc(null)}
            onUpdate={(updated) => { updateDoc(updated); setRelationshipsDoc(updated); }}
            onOpenTimeline={(client) => { setRelationshipsDoc(null); setTimelineClient(client); }}
          />
        </Modal>
      )}
      {timelineClient && (
        <Modal title={`🕐 Timeline — ${timelineClient}`} onClose={() => setTimelineClient(null)}>
          <TimelineModal client={timelineClient} documents={documents} onClose={() => setTimelineClient(null)} onDocClick={(d) => { setTimelineClient(null); setViewingDoc(d); }} />
        </Modal>
      )}

      {/* ── Doc Editor modal ── */}
      {editingDoc && (
        <Modal title={`✏️ Edit — ${editingDoc.name}`} onClose={()=>setEditingDoc(null)}>
          {isExpiryLocked(editingDoc) ? (
            <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--text-muted)", fontSize:14 }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔒</div>
              <div style={{ fontWeight:700, color:"var(--text)", marginBottom:6 }}>Document locked</div>
              <div>This document expired on {new Date(editingDoc.expiresAt).toLocaleDateString()} and is now read-only.</div>
              <div style={{ fontSize:12, marginTop:8 }}>To unlock it, update the expiry date via <strong>Edit details</strong>.</div>
              <button onClick={()=>setEditingDoc(null)} style={{ marginTop:16, padding:"7px 18px", borderRadius:7, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer", fontSize:13 }}>Close</button>
            </div>
          ) : (
            <DocEditor doc={editingDoc} onClose={()=>setEditingDoc(null)} onSave={saveEditorDoc} workspaceId={workspaceId} onSaveAsTemplate={() => setSaveAsTplDoc(editingDoc)} />
          )}
        </Modal>
      )}

      {/* ── File Manager modal ── */}
      {fileManagerDoc && (
        <Modal title={`📎 Files — ${fileManagerDoc.name}`} onClose={()=>setFileManagerDoc(null)}>
          <FileUploader
            attachments={fileManagerDoc.attachments||[]}
            onChange={(newAtts)=>{ const updated={...fileManagerDoc,attachments:newAtts}; setFileManagerDoc(updated); saveDocFiles(fileManagerDoc.id, newAtts); }}
            canDownload={canDownload}
          />
          <div style={{ marginTop:18 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", marginBottom:8, borderTop:"1px solid var(--border)", paddingTop:14 }}>File Converter / Compressor</div>
            <FileConverter />
          </div>
        </Modal>
      )}

      {/* ── Template picker ── */}
      {showTemplates && (
        <Modal title="Create document" onClose={() => setShowTemplates(false)}>
          <p style={{ margin:"0 0 16px", fontSize:13, color:"var(--text-muted)" }}>Pick a template — you'll name it, then edit it directly.</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px,1fr))", gap:10 }}>
            {DOC_TEMPLATES.map(tpl => (
              <div key={tpl.label} onClick={() => {
                setShowTemplates(false);
                setNewDocTemplate(tpl);
              }} style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 14px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--surface)", cursor:"pointer", transition:"border-color 0.12s, background 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--accent,#6c63ff)"; e.currentTarget.style.background="var(--accent-muted,rgba(108,99,255,0.06))"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--surface)"; }}>
                <span style={{ fontSize:24 }}>{tpl.icon}</span>
                <span style={{ fontWeight:700, fontSize:13, color:"var(--text)" }}>{tpl.label}</span>
                <span style={{ fontSize:11, color:"var(--text-muted)", lineHeight:1.4 }}>{tpl.description}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── New doc: name prompt → DocEditor ── */}
      {newDocTemplate && (
        <Modal title={`New ${newDocTemplate.icon} ${newDocTemplate.label}`} onClose={()=>setNewDocTemplate(null)}>
          <NewDocNameForm
            tpl={newDocTemplate}
            contacts={contacts||[]}
            projects={projects||[]}
            onConfirm={(name, client, project) => {
              const nd = {
                id: genId(),
                name,
                type: newDocTemplate.type,
                relatedClient: client,
                relatedProject: project,
                status: "Draft",
                tags: newDocTemplate.defaults?.tags || [],
                expiresAt: newDocTemplate.defaults?.expiresAt || "",
                attachments: [],
                editorContent: TEMPLATE_HTML[newDocTemplate.type] || TEMPLATE_HTML["Other"],
                createdAt: new Date().toISOString().slice(0,10),
              };
              const u = [nd, ...(documents||[])];
              setDocuments(u);
              saveWorkspaceData("documents", u, workspaceId, userId).catch(err => toast(`Sync failed: ${err.message}`, "info"));
              addAudit("Documents","Create",`Created ${newDocTemplate.type}: ${name}`);
              toast(`${newDocTemplate.label} created`);
              setNewDocTemplate(null);
              setEditingDoc(nd);
            }}
            onCancel={()=>setNewDocTemplate(null)}
          />
        </Modal>
      )}

      {(showForm||editing) && <Modal title={editing ? "Edit document" : (templateInitial ? `New ${templateInitial.type}` : "Add document")} onClose={closeForm}><DocForm initial={editing || templateInitial || {}} onSave={save} onClose={closeForm} projects={projects||[]} tags={tags||[]} contacts={contacts||[]} /></Modal>}

      {/* ── Doc preview slide-in panel ── */}
      {viewingDoc && (() => {
        const d = viewingDoc;
        const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Draft;
        const exp = expiryState(d);
        return (
          <>
            {/* Backdrop */}
            <div onClick={() => setViewingDoc(null)}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:200, backdropFilter:"blur(2px)" }} />
            {/* Panel */}
            <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(560px,95vw)", background:"var(--card,var(--surface))",
              boxShadow:"-4px 0 32px rgba(0,0,0,0.18)", zIndex:201, display:"flex", flexDirection:"column",
              animation:"slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)" }}>

              {/* Panel header */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"18px 20px 14px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
                <div style={{ fontSize:32, lineHeight:1, flexShrink:0 }}>{TYPE_ICONS[d.type] || "📄"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:17, color:"var(--text)", lineHeight:1.3, wordBreak:"break-word" }}>{d.name}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6, alignItems:"center" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:999,
                      fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:sc.dot }} />{d.status}
                    </span>
                    <span style={{ fontSize:11, color:"var(--text-muted)", background:"var(--surface)", padding:"2px 8px", borderRadius:999, border:"1px solid var(--border)" }}>{d.type}</span>
                    {exp === "expired" && <span style={{ fontSize:11, fontWeight:600, color:"var(--danger,#ef4444)" }}>⚠ Expired</span>}
                    {exp === "soon"    && <span style={{ fontSize:11, fontWeight:600, color:"#a07c00" }}>⚠ Expiring soon</span>}
                  </div>
                </div>
                <button onClick={() => setViewingDoc(null)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:20, padding:"2px 4px", flexShrink:0, lineHeight:1 }}>✕</button>
              </div>

              {/* Meta strip */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 20px", padding:"12px 20px", borderBottom:"1px solid var(--border)", fontSize:12, color:"var(--text-muted)", flexShrink:0 }}>
                {d.relatedClient  && <span>👤 <strong style={{color:"var(--text)"}}>{d.relatedClient}</strong></span>}
                {d.relatedProject && <span>🗂 <strong style={{color:"var(--text)"}}>{d.relatedProject}</strong></span>}
                {d.expiresAt      && <span>📅 Expires {relativeTime(d.expiresAt)}</span>}
                {(d.attachments||[]).length > 0 && <span>📎 {d.attachments.length} attachment{d.attachments.length!==1?"s":""}</span>}
                {d.shareLink      && <span style={{color:"var(--accent,#6c63ff)"}}>🔗 Shared</span>}
                {d.assignedTo     && <span style={{color:"var(--accent,#6c63ff)"}}>👤 {d.assignedTo}</span>}
                {(d.chatThread||[]).length > 0 && <span>💬 {d.chatThread.length} msg{d.chatThread.length!==1?"s":""}</span>}
                {lockedBy[d.id]   && <span style={{color:"#a07c00"}}>🔒 Locked{lockedBy[d.id]==="Me"?" by you":` by ${lockedBy[d.id]}`}</span>}
                <span style={{marginLeft:"auto"}}>Created {relativeTime(d.createdAt)}</span>
              </div>

              {/* Tags */}
              {(d.tags||[]).length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"10px 20px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
                  {d.tags.map(t => (
                    <span key={t} style={{ fontSize:11, padding:"2px 8px", borderRadius:999,
                      background:"var(--accent-muted,rgba(108,99,255,0.1))", color:"var(--accent,#6c63ff)", fontWeight:600 }}>{t}</span>
                  ))}
                </div>
              )}

              {/* Document content */}
              <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
                {d.editorContent ? (
                  <div dangerouslySetInnerHTML={{ __html: d.editorContent }}
                    style={{ lineHeight:1.7, color:"var(--text)", fontSize:13 }} />
                ) : (
                  <div style={{ color:"var(--text-muted)", fontSize:13, fontStyle:"italic", textAlign:"center", marginTop:40 }}>
                    No content yet — open the editor to add some.
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div style={{ display:"flex", gap:8, padding:"14px 20px", borderTop:"1px solid var(--border)", flexShrink:0, flexWrap:"wrap" }}>
                {role !== "Viewer" && <>
                  <button style={{ ...btnStyle("primary"), opacity: isExpiryLocked(d) ? 0.5 : 1 }}
                    title={isExpiryLocked(d) ? "Expired — read only" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "Requires 2FA verification" : "Open editor")}
                    onClick={() => { if (isExpiryLocked(d)) { toast("🔒 Document expired and is read-only","info"); return; } require2FA(d, () => { setViewingDoc(null); setEditingDoc(d); }); }}>
                    {isExpiryLocked(d) ? "🔒 Locked" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "🔐 Edit (2FA)" : "📝 Edit content")}
                  </button>
                  <button style={btnStyle("ghost")} onClick={() => { setViewingDoc(null); setEditing(d); setShowForm(true); }}>✏️ Edit details</button>
                  <button style={btnStyle("ghost")} onClick={() => { setViewingDoc(null); setFileManagerDoc(d); }}>📎 Files</button>
                  <button style={btnStyle("ghost")} title="Scan physical document and attach" onClick={() => { setViewingDoc(null); setScanTargetDoc(d); setScanModal(true); }}>📷 Scan</button>
                </>}
                {(role==="Owner"||role==="Admin") && (
                  <button style={{ ...btnStyle("ghost"), color:"var(--danger)", marginLeft:"auto" }}
                    onClick={() => { setViewingDoc(null); setConfirm(d.id); }}>🗑 Delete</button>
                )}
                <button style={btnStyle("ghost")} onClick={() => setFollowUpDoc(d)} title="Schedule follow-up">📅 Follow-up</button>
                <button style={btnStyle("ghost")} onClick={() => setAssignDoc(d)} title="Assign">{d.assignedTo ? `👤 ${d.assignedTo}` : "👥 Assign"}</button>
                <button style={btnStyle("ghost")} onClick={() => setChatDoc(d)} title="Document chat">💬 Chat{(d.chatThread||[]).length > 0 ? ` (${d.chatThread.length})` : ""}</button>
                <button style={btnStyle("ghost")} onClick={() => setActivityLogDoc(d)} title="Activity log">📋 Log</button>
                <button style={btnStyle("ghost")} onClick={() => setIntegrationsDoc(d)} title="Integrations — email, WhatsApp, webhooks, Slack, calendar">🔌 Integrations</button>
                <button style={btnStyle("ghost")} onClick={() => setRelationshipsDoc(d)} title="Linked documents, bundles, parent/child, timeline">🔗 Relationships</button>
              </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
          </>
        );
      })()}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Documents</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{filtered.length} of {(documents||[]).length} documents</p></div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center", position:"relative" }}>
          <div style={{ display:"flex", borderRadius:7, border:"1px solid var(--border)", overflow:"hidden" }}>
            {[["table","☰","Table"],["cards","⊞","Cards"],["kanban","⬛","Kanban"],["calendar","📅","Calendar"],["portal","🏢","Client portal"],["starred","⭐","Starred"],["archive","🗃","Archive"]].map(([mode,icon,label]) => (
              <button key={mode} title={label} onClick={() => setViewMode(mode)}
                style={{ padding:"5px 10px", border:"none", cursor:"pointer", fontSize:14, lineHeight:1,
                  background: viewMode===mode ? "var(--accent,#6c63ff)" : "transparent",
                  color: viewMode===mode ? "#fff" : "var(--text-muted)",
                  transition:"background 0.15s,color 0.15s" }}>
                {icon}
              </button>
            ))}
          </div>
          <div style={{ position:"relative" }}>
            <button title="Column visibility" style={{ ...btnStyle("ghost","sm"), padding:"5px 9px" }} onClick={() => setShowColMenu(v=>!v)}>⚙ Cols</button>
            {showColMenu && (
              <div style={{ position:"absolute", right:0, top:"100%", marginTop:4, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", zIndex:50, minWidth:130, boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}>
                {Object.keys(colVis).map(col => (
                  <label key={col} style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 0", cursor:"pointer", fontSize:13, color:"var(--text)", userSelect:"none" }}>
                    <input type="checkbox" checked={colVis[col]} onChange={() => setColVis(v=>({...v,[col]:!v[col]}))} />
                    {col}
                  </label>
                ))}
              </div>
            )}
          </div>
          {canDownload && <button style={btnStyle("ghost","sm")} onClick={handleExport}>↓ Export CSV</button>}
          <button style={btnStyle("ghost","sm")} title="Scan a physical document with camera" onClick={() => { setScanTargetDoc(null); setScanModal(true); }}>📷 Scan</button>
          <button style={btnStyle("ghost","sm")} onClick={() => setShowPDFExtract(true)} title="Extract key info from a PDF">🔍 Extract</button>
          <button style={{ ...btnStyle("ghost","sm"), position:"relative" }} onClick={() => setShowOverdue(true)} title="Overdue alerts dashboard">
            ⚠ Alerts{overdueCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, minWidth:14, height:14, borderRadius:99, background:"var(--danger,#ef4444)", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>{overdueCount}</span>}
          </button>
          <button style={btnStyle("ghost","sm")} onClick={() => setShowAnalytics(true)} title="Analytics dashboard">📊 Analytics</button>
          <button style={btnStyle("ghost","sm")} onClick={() => setShowTplLibrary(true)} title="Custom template library">📄 Templates</button>
          <button style={btnStyle("ghost","sm")} onClick={() => setShowCompliance(true)} title="Audit trail, GDPR deletion, and retention policy">🛡 Compliance</button>
          {role !== "Viewer" && (
            <div style={{ position:"relative", display:"flex" }}>
              <button style={{ ...btnStyle("primary"), borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:"1px solid rgba(255,255,255,0.2)" }} onClick={() => { setTemplateInitial(null); setShowForm(true); setShowAddDropdown(false); }}>+ Add document</button>
              <button style={{ ...btnStyle("primary"), borderTopLeftRadius:0, borderBottomLeftRadius:0, padding:"0 9px" }} onClick={() => setShowAddDropdown(v=>!v)} title="More options">▾</button>
              {showAddDropdown && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:8, zIndex:50, minWidth:190, boxShadow:"0 4px 16px rgba(0,0,0,0.13)", overflow:"hidden" }}>
                  <div onClick={() => { setTemplateInitial(null); setShowForm(true); setShowAddDropdown(false); }}
                    style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"var(--text)", display:"flex", alignItems:"center", gap:9, borderBottom:"1px solid var(--border)" }}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    📄 <span><div style={{ fontWeight:600 }}>Blank document</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>Start from scratch</div></span>
                  </div>
                  <div onClick={() => { setShowAddDropdown(false); setShowTemplates(true); }}
                    style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"var(--text)", display:"flex", alignItems:"center", gap:9 }}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    ✨ <span><div style={{ fontWeight:600 }}>Create document</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>Pick a template</div></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row — clickable to filter ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Total", value: stats.total, sub: "all documents", filterVal: null, accent: null },
          { label: "Draft", value: stats.draft, sub: "in progress", filterVal: "Draft", accent: STATUS_COLORS.Draft.dot },
          { label: "Sent", value: stats.sent, sub: "awaiting client", filterVal: "Sent", accent: STATUS_COLORS.Sent.dot },
          { label: "Signed", value: stats.signed, sub: "completed", filterVal: "Signed", accent: STATUS_COLORS.Signed.dot },
        ].map(s => {
          const isActive = filterStatus === s.filterVal || (s.filterVal === null && filterStatus === "All");
          return (
            <div key={s.label} onClick={() => { setFilterStatus(s.filterVal || "All"); }}
              style={{ background: isActive ? (s.accent ? `${s.accent}18` : "var(--surface)") : "var(--surface)", border: `1px solid ${isActive ? (s.accent || "var(--accent,#6c63ff)") : "var(--border)"}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "border-color 0.12s, background 0.12s" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.accent || "var(--text)", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>
      {/* Expiring-soon alert strip */}
      {stats.expiringSoon > 0 && (
        <div style={{ marginBottom:14, padding:"8px 14px", borderRadius:7, background:"rgba(234,179,8,0.1)", border:"1px solid rgba(234,179,8,0.35)", fontSize:13, color:"#92610a", display:"flex", alignItems:"center", gap:8 }}>
          ⚠️ <strong>{stats.expiringSoon} document{stats.expiringSoon>1?"s":""}</strong> expiring within 7 days.
          <button style={{ marginLeft:"auto", ...btnStyle("ghost","sm"), color:"#92610a", borderColor:"rgba(234,179,8,0.4)" }} onClick={() => { setFilterStatus("All"); setSearch(""); }}>View all</button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, client, tag…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All types</option>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All statuses</option>{DOC_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        {activeFilters > 0 && (
          <button style={{ ...btnStyle("ghost","sm"), color: "var(--accent)", fontWeight: 600 }} onClick={() => { setSearch(""); setFilterType("All"); setFilterStatus("All"); }}>
            ✕ Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"8px 14px", borderRadius:7, background:"var(--accent-muted,rgba(108,99,255,0.08))", border:"1px solid rgba(108,99,255,0.2)", flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"var(--accent,#6c63ff)" }}>{selected.size} selected</span>
          <button style={{ ...btnStyle("ghost","sm") }} onClick={bulkExport}>↓ Export</button>
          <div style={{ position:"relative" }}>
            <button style={{ ...btnStyle("ghost","sm") }} onClick={() => setShowBulkStatus(v=>!v)}>🔄 Set status ▾</button>
            {showBulkStatus && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:8, zIndex:50, minWidth:140, boxShadow:"0 4px 16px rgba(0,0,0,0.13)", overflow:"hidden" }}>
                {DOC_STATUSES.map(s => {
                  const c = STATUS_COLORS[s] || STATUS_COLORS.Draft;
                  return (
                    <div key={s} onClick={() => bulkStatusChange(s)}
                      style={{ padding:"7px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:c.color, display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:c.dot }} />{s}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={bulkDelete}>🗑 Delete</button>}
          <button style={{ ...btnStyle("ghost","sm"), marginLeft:"auto" }} onClick={() => setSelected(new Set())}>✕ Deselect all</button>
        </div>
      )}

      {/* ── Kanban view ── */}
      {viewMode === "kanban" && (
        <div style={{ overflowX:"auto", paddingBottom:16 }}>
          <div style={{ display:"flex", gap:14, minWidth:"max-content" }}>
            {DOC_STATUSES.map(status => {
              const col = STATUS_COLORS[status] || STATUS_COLORS.Draft;
              const colDocs = (documents||[]).filter(d => d.status === status && (filterType==="All"||d.type===filterType) && (!search || d.name?.toLowerCase().includes(search.toLowerCase())));
              return (
                <div key={status} style={{ width:240, flexShrink:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 10px", borderRadius:"8px 8px 0 0", background:col.bg, border:`1px solid ${col.dot}40`, borderBottom:"none", marginBottom:0 }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:col.dot, flexShrink:0 }} />
                    <span style={{ fontWeight:700, fontSize:12, color:col.color, textTransform:"uppercase", letterSpacing:"0.06em" }}>{status}</span>
                    <span style={{ marginLeft:"auto", fontSize:11, color:col.color, fontWeight:600, background:`${col.dot}22`, padding:"1px 7px", borderRadius:999 }}>{colDocs.length}</span>
                  </div>
                  <div style={{ minHeight:120, background:"var(--surface)", border:`1px solid var(--border)`, borderRadius:"0 0 8px 8px", padding:8, display:"flex", flexDirection:"column", gap:7 }}>
                    {colDocs.length === 0 && <div style={{ fontSize:12, color:"var(--text-muted)", textAlign:"center", padding:"20px 0", opacity:0.6 }}>No documents</div>}
                    {colDocs.map(d => (
                      <div key={d.id} onClick={() => { setViewingDoc(d); addActivity(d, "opened"); }}
                        style={{ padding:"10px 12px", borderRadius:7, background:"var(--card,var(--surface))", border:"1px solid var(--border)", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"box-shadow 0.12s" }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"}>
                        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", marginBottom:4, lineHeight:1.3 }}>{TYPE_ICONS[d.type]||"📄"} {d.name}</div>
                        {d.relatedClient && <div style={{ fontSize:11, color:"var(--text-muted)" }}>👤 {d.relatedClient}</div>}
                        {d.expiresAt && <div style={{ fontSize:11, color: expiryState(d) ? "#a07c00" : "var(--text-muted)", marginTop:3 }}>📅 {relativeTime(d.expiresAt)}</div>}
                        {(d.tags||[]).length > 0 && <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginTop:4 }}>{d.tags.slice(0,2).map(t => <span key={t} style={{ fontSize:9, padding:"1px 5px", borderRadius:999, background:"var(--accent-muted,rgba(108,99,255,0.1))", color:"var(--accent,#6c63ff)", fontWeight:600 }}>{t}</span>)}</div>}
                        <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4, display:"flex", alignItems:"center", gap:6 }}>
                          <span>{relativeTime(d.createdAt)}</span>
                          {starred.has(d.id) && <span style={{ color:"#f59e0b" }}>⭐</span>}
                          {(d.attachments||[]).length > 0 && <span>📎{d.attachments.length}</span>}
                          {role !== "Viewer" && (
                            <span style={{ marginLeft:"auto", display:"flex", gap:3 }}>
                              <button title="Change status" style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, padding:"1px 4px", color:"var(--text-muted)", borderRadius:4 }}
                                onClick={e => { e.stopPropagation(); setInlineStatusFor(inlineStatusFor===d.id ? null : d.id); }}>⟳</button>
                              {inlineStatusFor === d.id && (
                                <div style={{ position:"absolute", zIndex:40, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:7, overflow:"hidden", boxShadow:"0 4px 14px rgba(0,0,0,0.13)", minWidth:120 }}>
                                  {DOC_STATUSES.map(s => {
                                    const c = STATUS_COLORS[s]||STATUS_COLORS.Draft;
                                    return <div key={s} onClick={() => updateStatus(d.id, s)} style={{ padding:"7px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:c.color, background:d.status===s?c.bg:"transparent", display:"flex", alignItems:"center", gap:7 }}><span style={{ width:7, height:7, borderRadius:"50%", background:c.dot }} />{s}</div>;
                                  })}
                                </div>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendar view ── */}
      {viewMode === "calendar" && (() => {
        const now = new Date();
        const [calYear, setCalYear] = useState(now.getFullYear());
        const [calMonth, setCalMonth] = useState(now.getMonth());
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const allDocs = documents||[];
        const docsWithDate = allDocs.filter(d => d.expiresAt || d.createdAt);
        const docsByDate = {};
        docsWithDate.forEach(d => {
          const dt = d.expiresAt || d.createdAt;
          if (dt?.slice(0,7) === `${calYear}-${String(calMonth+1).padStart(2,"0")}`) {
            const day = parseInt(dt.slice(8,10));
            docsByDate[day] = docsByDate[day] || [];
            docsByDate[day].push({ doc:d, isExpiry:!!d.expiresAt&&dt===d.expiresAt });
          }
        });
        const cells = [];
        for (let i=0; i<firstDay; i++) cells.push(null);
        for (let i=1; i<=daysInMonth; i++) cells.push(i);
        return (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }} style={{ ...btnStyle("ghost","sm") }}>◀</button>
              <span style={{ fontWeight:700, fontSize:15, color:"var(--text)" }}>{monthNames[calMonth]} {calYear}</span>
              <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }} style={{ ...btnStyle("ghost","sm") }}>▶</button>
              <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()); }} style={{ ...btnStyle("ghost","sm"), marginLeft:4 }}>Today</button>
              <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:8 }}>📅 expiry &nbsp; ✦ created</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", color:"var(--text-muted)", textAlign:"center", padding:"4px 0" }}>{d}</div>
              ))}
              {cells.map((day, i) => {
                const todayStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const isToday = day && todayStr === new Date().toISOString().slice(0,10);
                const entries = day ? (docsByDate[day]||[]) : [];
                return (
                  <div key={i} style={{ minHeight:80, borderRadius:7, border:`1px solid ${isToday?"var(--accent,#6c63ff)":"var(--border)"}`, background: isToday ? "var(--accent-muted,rgba(108,99,255,0.07))" : day ? "var(--surface)" : "transparent", padding:"5px 6px", opacity: day ? 1 : 0 }}>
                    {day && <div style={{ fontSize:12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--accent,#6c63ff)" : "var(--text-muted)", marginBottom:3 }}>{day}</div>}
                    {entries.slice(0,2).map(({doc,isExpiry},j) => {
                      const sc = STATUS_COLORS[doc.status]||STATUS_COLORS.Draft;
                      return (
                        <div key={j} title={doc.name} onClick={() => { setViewingDoc(doc); addActivity(doc,"opened"); }}
                          style={{ fontSize:10, fontWeight:600, color:sc.color, background:sc.bg, borderRadius:3, padding:"1px 4px", marginBottom:2, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {isExpiry?"📅":"✦"} {doc.name}
                        </div>
                      );
                    })}
                    {entries.length > 2 && <div style={{ fontSize:10, color:"var(--text-muted)" }}>+{entries.length-2} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Client portal view ── */}
      {viewMode === "portal" && (() => {
        const allClients = [...new Set((documents||[]).map(d => d.relatedClient).filter(Boolean))].sort();
        const portalDocs = (documents||[]).filter(d => portalClient==="All" ? true : d.relatedClient===portalClient);
        const groupedByClient = {};
        (portalClient==="All" ? allClients : [portalClient]).forEach(c => {
          groupedByClient[c] = portalDocs.filter(d => d.relatedClient===c);
        });
        return (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"var(--text-muted)" }}>Client:</span>
              <select value={portalClient} onChange={e => setPortalClient(e.target.value)} style={{ ...inputStyle, width:"auto" }}>
                <option value="All">All clients</option>
                {allClients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {portalClient !== "All" && (
                <div style={{ marginLeft:"auto", fontSize:13, color:"var(--text-muted)" }}>
                  {portalDocs.length} document{portalDocs.length!==1?"s":""} for <strong style={{ color:"var(--text)" }}>{portalClient}</strong>
                </div>
              )}
            </div>
            {Object.entries(groupedByClient).length === 0 && <EmptyState icon="🏢" title="No clients found" sub="Documents with a linked client will appear here." />}
            {Object.entries(groupedByClient).map(([client, docs]) => (
              <div key={client} style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, paddingBottom:8, borderBottom:"2px solid var(--border)" }}>
                  <span style={{ fontSize:16 }}>👤</span>
                  <span style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>{client}</span>
                  <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:4 }}>{docs.length} doc{docs.length!==1?"s":""}</span>
                  <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                    {DOC_STATUSES.map(s => {
                      const n = docs.filter(d=>d.status===s).length;
                      if (!n) return null;
                      const c = STATUS_COLORS[s]||STATUS_COLORS.Draft;
                      return <span key={s} style={{ fontSize:11, padding:"2px 8px", borderRadius:999, background:c.bg, color:c.color, fontWeight:600 }}>{s}: {n}</span>;
                    })}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
                  {docs.map(d => {
                    const sc = STATUS_COLORS[d.status]||STATUS_COLORS.Draft;
                    const exp = expiryState(d);
                    return (
                      <div key={d.id} onClick={() => { setViewingDoc(d); addActivity(d,"opened"); }}
                        style={{ padding:"12px 14px", borderRadius:8, border:`1px solid ${exp?"#d4a000":"var(--border)"}`, background:"var(--surface)", cursor:"pointer", display:"flex", flexDirection:"column", gap:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:18 }}>{TYPE_ICONS[d.type]||"📄"}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
                            <div style={{ fontSize:11, color:"var(--text-muted)" }}>{d.type}</div>
                          </div>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color, flexShrink:0 }}>
                            <span style={{ width:5, height:5, borderRadius:"50%", background:sc.dot }} />{d.status}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:"var(--text-muted)", display:"flex", gap:10 }}>
                          <span>{relativeTime(d.createdAt)}</span>
                          {d.expiresAt && <span style={{ color:exp?"#a07c00":"inherit" }}>📅 {relativeTime(d.expiresAt)}</span>}
                          {(d.attachments||[]).length > 0 && <span>📎{d.attachments.length}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Starred view ── */}
      {viewMode === "starred" && filtered.length === 0 && (
        <EmptyState icon="⭐" title="No starred documents" sub="Click the ☆ star icon on any document to pin it here." />
      )}

      {/* ── Archive view ── */}
      {viewMode === "archive" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, padding:"10px 14px", borderRadius:8, background:"rgba(148,163,184,0.08)", border:"1px solid var(--border)" }}>
            <span style={{ fontSize:20 }}>🗃</span>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>Archive</div>
              <div style={{ fontSize:12, color:"var(--text-muted)" }}>{filtered.length} archived document{filtered.length!==1?"s":""}. To restore, change a document's status.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table / Cards (also used by starred & archive views) ── */}
      {(viewMode === "table" || viewMode === "cards" || viewMode === "starred" || viewMode === "archive") && filtered.length === 0 && viewMode !== "starred" && viewMode !== "archive" ? (
        <EmptyState icon="📄" title={activeFilters ? "No matching documents" : "No documents"} sub={activeFilters ? "Try adjusting your filters." : "Track your proposals, contracts, and files."} action={!activeFilters && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add document</button>} />
      ) : (viewMode === "cards" || viewMode === "starred") && filtered.length > 0 ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14 }}>
          {filtered.map(d => {
            const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Draft;
            const exp = expiryState(d);
            const isSel = selected.has(d.id);
            const statusList = ["Draft","Review","Sent","Signed","Expired","Archived"];
            const curIdx = statusList.indexOf(d.status);
            // Swipe handlers
            let swipeStartX = null;
            const onTouchStart = (e) => { swipeStartX = e.touches[0].clientX; };
            const onTouchEnd  = (e) => {
              if (swipeStartX === null || role === "Viewer") return;
              const dx = e.changedTouches[0].clientX - swipeStartX;
              swipeStartX = null;
              if (Math.abs(dx) < 60) return; // ignore small swipes
              const nextIdx = dx < 0
                ? Math.min(curIdx + 1, statusList.length - 1)   // swipe left → next status
                : Math.max(curIdx - 1, 0);                        // swipe right → prev status
              if (nextIdx === curIdx) return;
              const newStatus = statusList[nextIdx];
              if (isOnline) updateStatus(d.id, newStatus);
              else enqueueOffline({ type:"status", docId:d.id, status:newStatus });
            };
            return (
              <div key={d.id}
                onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
                onClick={() => { setViewingDoc(d); addActivity(d, "opened"); }}
                style={{ position:"relative", borderRadius:10, border:`1.5px solid ${isSel ? "var(--accent,#6c63ff)" : exp==="expired" ? "var(--danger,#ef4444)" : exp==="soon" ? "#d4a000" : "var(--border)"}`,
                  background: isSel ? "rgba(108,99,255,0.05)" : "var(--surface)", padding:"16px", cursor:"pointer",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"box-shadow 0.15s,border-color 0.15s",
                  display:"flex", flexDirection:"column", gap:10 }}>

                {/* Card header */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ fontSize:24, lineHeight:1 }}>{TYPE_ICONS[d.type] || "📄"}</div>
                    <button title={starred.has(d.id) ? "Unstar" : "Star"} onClick={e => { e.stopPropagation(); toggleStar(d.id); }}
                      style={{ position:"absolute", top:-6, right:-8, background:"none", border:"none", cursor:"pointer", fontSize:12, padding:0, lineHeight:1, color: starred.has(d.id) ? "#f59e0b" : "var(--text-muted)" }}>
                      {starred.has(d.id) ? "⭐" : "☆"}
                    </button>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", lineHeight:1.3, wordBreak:"break-word",
                      overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>{d.type}</div>
                  </div>
                  {/* Status badge */}
                  <span style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:999,
                    fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:sc.dot }} />{d.status}
                  </span>
                </div>

                {/* Meta row */}
                <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:12, color:"var(--text-muted)" }}>
                  {d.relatedClient && <div>👤 {d.relatedClient}</div>}
                  {d.assignedTo && <div style={{ color:"var(--accent,#6c63ff)", fontSize:11 }}>↳ Assigned: {d.assignedTo}</div>}
                  {(d.chatThread||[]).length > 0 && <div style={{ fontSize:11 }}>💬 {d.chatThread.length} message{d.chatThread.length!==1?"s":""}</div>}
                  {d.relatedProject && <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>🗂 {d.relatedProject}</div>}
                  {exp === "expired" && <div style={{ color:"var(--danger,#ef4444)", fontWeight:600 }}>⚠ Expired {relativeTime(d.expiresAt)}</div>}
                  {exp === "soon"    && <div style={{ color:"#a07c00", fontWeight:600 }}>⚠ Expires {relativeTime(d.expiresAt)}</div>}
                  {!exp && d.expiresAt && <div>📅 Expires {relativeTime(d.expiresAt)}</div>}
                  {(d.attachments||[]).length > 0 && <div>📎 {d.attachments.length} file{d.attachments.length!==1?"s":""}</div>}
                  {d.shareLink && <div style={{ color:"var(--accent,#6c63ff)" }}>🔗 Shared</div>}
                </div>

                {/* Tags */}
                {(d.tags||[]).length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {d.tags.map(t => (
                      <span key={t} style={{ fontSize:10, padding:"2px 7px", borderRadius:999, background:"var(--accent-muted,rgba(108,99,255,0.1))", color:"var(--accent,#6c63ff)", fontWeight:600 }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Footer: date + actions */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"auto", paddingTop:10, borderTop:"1px solid var(--border)" }}>
                  <span style={{ fontSize:11, color:"var(--text-muted)" }}>
                    {relativeTime(d.updatedAt || d.createdAt)}
                    {role !== "Viewer" && <span style={{ marginLeft:6, opacity:0.5, fontSize:10 }} title="Swipe left/right to change status">⟵⟶</span>}
                  </span>
                  <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                    {role !== "Viewer" && <>
                      <button title={isExpiryLocked(d) ? "Expired — read only" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "Requires 2FA" : "Open editor")}
                        style={{ ...btnStyle("ghost","sm"), padding:"3px 7px" }}
                        onClick={() => { if (isExpiryLocked(d)) { toast("🔒 Document expired","info"); return; } require2FA(d, () => setEditingDoc(d)); }}>
                        {isExpiryLocked(d) ? "🔒" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "🔐" : "📝")}
                      </button>
                      <button title="Files" style={{ ...btnStyle("ghost","sm"), padding:"3px 7px" }} onClick={() => setFileManagerDoc(d)}>📎</button>
                      <button title="Scan physical document" style={{ ...btnStyle("ghost","sm"), padding:"3px 7px" }} onClick={() => { setScanTargetDoc(d); setScanModal(true); }}>📷</button>
                      <button title="Edit metadata" style={{ ...btnStyle("ghost","sm"), padding:"3px 7px" }} onClick={() => { setEditing(d); setShowForm(true); }}>✏️</button>
                    </>}
                    {(role==="Owner"||role==="Admin") && (
                      <button title="Delete" style={{ ...btnStyle("ghost","sm"), padding:"3px 7px", color:"var(--danger)" }} onClick={() => setConfirm(d.id)}>🗑</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (viewMode === "table" || viewMode === "archive") && filtered.length > 0 ? (
        <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th style={{ padding:"10px 10px 10px 14px", width:32 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} title="Select all" /></th>
                <SortTh label="Name" sk="name" />
                {colVis.Type    && <SortTh label="Type" sk="type" />}
                {colVis.Client  && <SortTh label="Client" sk="relatedClient" />}
                {colVis.Project && <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>Project</th>}
                <SortTh label="Status" sk="status" />
                {colVis.Created && <SortTh label="Created" sk="createdAt" />}
                {colVis.Link    && <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>Link</th>}
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Draft;
                const isHovered = hoveredRow === d.id;
                const isSel = selected.has(d.id);
                const exp = expiryState(d);
                const showInlineStatus = inlineStatusFor === d.id;
                const dateLabel = d.updatedAt && d.updatedAt > d.createdAt
                  ? `Updated ${relativeTime(d.updatedAt)}`
                  : relativeTime(d.createdAt);
                const dateFull = d.updatedAt && d.updatedAt > d.createdAt
                  ? `Updated: ${fmtDate(d.updatedAt)}`
                  : (d.createdAt ? fmtDate(d.createdAt) : "");
                return (
                  <tr key={d.id}
                    onMouseEnter={() => setHoveredRow(d.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderTop: "1px solid var(--border)",
                      borderLeft: exp === "expired" ? "3px solid var(--danger,#ef4444)" : exp === "soon" ? "3px solid #d4a000" : "3px solid transparent",
                      background: isSel ? "rgba(108,99,255,0.06)" : isHovered ? "var(--surface)" : (i%2===0 ? "transparent" : "var(--stripe,rgba(0,0,0,0.018))"),
                      transition: "background 0.1s"
                    }}>

                    {/* Checkbox */}
                    <td style={{ padding:"11px 10px 11px 14px", width:32 }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleOne(d.id)} />
                    </td>

                    {/* Name + tags + note snippet + expiry badge */}
                    <td style={{ padding: "11px 14px", maxWidth: 240 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button title={starred.has(d.id) ? "Unstar" : "Star"} onClick={e => { e.stopPropagation(); toggleStar(d.id); }}
                          style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"0 2px", lineHeight:1, color: starred.has(d.id) ? "#f59e0b" : "var(--text-muted)", flexShrink:0, opacity: starred.has(d.id) ? 1 : 0.35 }}>
                          {starred.has(d.id) ? "⭐" : "☆"}
                        </button>
                        <span title="Click to preview" onClick={() => { setViewingDoc(d); addActivity(d, "opened"); }} style={{ fontWeight: 600, color: "var(--accent,#6c63ff)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}>{d.name}</span>
                        {exp === "expired" && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"rgba(239,68,68,0.12)", color:"#991b1b", fontWeight:700, flexShrink:0 }}>EXPIRED</span>}
                        {exp === "soon"    && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:999, background:"rgba(234,179,8,0.13)", color:"#a07c00", fontWeight:700, flexShrink:0 }}>EXPIRING</span>}
                      </div>
                      {(d.tags||[]).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                          {(d.tags||[]).map(t => (
                            <span key={t} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "var(--accent-muted,rgba(108,99,255,0.1))", color: "var(--accent,#6c63ff)", fontWeight: 600, border: "1px solid rgba(108,99,255,0.2)" }}>{t}</span>
                          ))}
                        </div>
                      )}
                      {d.notes && (
                        <div title={d.notes} onClick={() => setExpandedNote(expandedNote === d.id ? null : d.id)}
                          style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, cursor: "pointer", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: expandedNote === d.id ? "normal" : "nowrap", lineHeight: 1.4 }}>
                          💬 {d.notes}
                        </div>
                      )}
                      {d.expiresAt && (
                        <div style={{ fontSize:11, color: exp ? "#a07c00" : "var(--text-muted)", marginTop:2 }}>
                          Expires {relativeTime(d.expiresAt)}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    {colVis.Type && (
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                          <span>{TYPE_ICONS[d.type] || "📄"}</span>{d.type}
                        </span>
                      </td>
                    )}

                    {/* Client */}
                    {colVis.Client && (
                      <td style={{ padding: "11px 14px", color: d.relatedClient ? "var(--text)" : "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>{d.relatedClient || "—"}</td>
                    )}

                    {/* Project */}
                    {colVis.Project && (
                      <td style={{ padding: "11px 14px", color: d.relatedProject ? "var(--text)" : "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{d.relatedProject || "—"}</td>
                    )}

                    {/* Status — inline editable */}
                    <td style={{ padding: "11px 14px", position:"relative" }}>
                      <span
                        title={role !== "Viewer" ? "Click to change status" : d.status}
                        onClick={() => role !== "Viewer" && setInlineStatusFor(showInlineStatus ? null : d.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color, cursor: role !== "Viewer" ? "pointer" : "default" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />{d.status}
                        {role !== "Viewer" && <span style={{ fontSize:9, opacity:0.6 }}>▾</span>}
                      </span>
                      {showInlineStatus && (
                        <div style={{ position:"absolute", top:"100%", left:14, zIndex:40, background:"var(--card,var(--surface))", border:"1px solid var(--border)", borderRadius:7, overflow:"hidden", boxShadow:"0 4px 14px rgba(0,0,0,0.13)", minWidth:120 }}>
                          {DOC_STATUSES.map(s => {
                            const c = STATUS_COLORS[s] || STATUS_COLORS.Draft;
                            return (
                              <div key={s} onClick={() => updateStatus(d.id, s)}
                                style={{ padding:"7px 12px", cursor:"pointer", fontSize:12, fontWeight:600, color:c.color, background: d.status===s ? c.bg : "transparent", display:"flex", alignItems:"center", gap:7 }}>
                                <span style={{ width:7, height:7, borderRadius:"50%", background:c.dot }} />{s}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Created / Updated */}
                    {colVis.Created && (
                      <td style={{ padding: "11px 14px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }} title={dateFull}>
                        {dateLabel}
                      </td>
                    )}

                    {/* Link */}
                    {colVis.Link && (
                      <td style={{ padding: "11px 14px" }}>
                        {d.url
                          ? <a href={d.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent,#6c63ff)", textDecoration: "none", fontWeight: 500 }}>
                              🔗 <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domainLabel(d.url)}</span>
                            </a>
                          : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                      </td>
                    )}

                    {/* Actions */}
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 4, opacity: isHovered || isSel ? 1 : 0.45, transition: "opacity 0.1s" }}>
                        {role !== "Viewer" && <>
                          <button title={isExpiryLocked(d) ? "Expired — read only" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "Requires 2FA" : "Open editor")}
                            style={{ ...btnStyle("ghost","sm"), padding: "4px 8px", opacity: isExpiryLocked(d) ? 0.45 : 1 }}
                            onClick={() => { if (isExpiryLocked(d)) { toast("🔒 Document expired and is read-only","info"); return; } require2FA(d, () => setEditingDoc(d)); }}>
                            {isExpiryLocked(d) ? "🔒" : (SENSITIVE_TYPES.includes(d.type) && !unlockedSensitive.has(d.id) ? "🔐" : "📝")}
                          </button>
                          <button title="Files & attachments" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setFileManagerDoc(d)}>
                            📎{(d.attachments||[]).length > 0 && <span style={{ fontSize:9, marginLeft:2, background:"var(--accent,#6c63ff)", color:"#fff", borderRadius:999, padding:"0 4px" }}>{d.attachments.length}</span>}
                          </button>
                          <button title="Scan physical document with camera" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => { setScanTargetDoc(d); setScanModal(true); }}>📷</button>
                          <button title="Edit metadata" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setEditing(d)}>✏️</button>
                          <button title="Duplicate" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => duplicate(d)}>⧉</button>
                        </>}
                        {(role === "Owner" || role === "Admin") && (
                          <button title="Delete" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px", color: "var(--danger)" }} onClick={() => setConfirm(d.id)}>🗑</button>
                        )}
                        {onLinkedSave && role !== "Viewer" && <>
                          <button title="Add note" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => onLinkedSave("note",{ title:`Note — ${d.name}`, relatedTo:d.name, relatedType:"Document", body:"", tags:[] })}>📝</button>
                          <button title="Log communication" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => onLinkedSave("communication",{ contact:d.relatedClient||"", relatedTo:d.name, method:"Email", date:new Date().toISOString().slice(0,10), summary:"" })}>💬</button>
                        </>}
                        <button title="Schedule follow-up" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px", position:"relative" }} onClick={() => setFollowUpDoc(d)}>
                          📅{(d.followUps||[]).filter(f=>!f.done&&f.date<new Date().toISOString().slice(0,10)).length > 0 && <span style={{ position:"absolute",top:0,right:0,width:6,height:6,borderRadius:"50%",background:"var(--danger,#ef4444)" }} />}
                        </button>
                        <button title="Assign to team member" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setAssignDoc(d)}>
                          {d.assignedTo ? "👤" : "👥"}
                        </button>
                        <button title="Document chat" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px", position:"relative" }} onClick={() => setChatDoc(d)}>
                          💬{(d.chatThread||[]).length > 0 && <span style={{ fontSize:9, marginLeft:1, background:"#3b82f6", color:"#fff", borderRadius:999, padding:"0 3px" }}>{d.chatThread.length}</span>}
                        </button>
                        <button title="Activity log" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setActivityLogDoc(d)}>📋</button>
                        <button title="Integrations — email, WhatsApp, webhooks, Slack, calendar" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setIntegrationsDoc(d)}>🔌</button>
                        <button title="Linked documents, bundles, parent/child, timeline" style={{ ...btnStyle("ghost","sm"), padding: "4px 8px" }} onClick={() => setRelationshipsDoc(d)}>🔗</button>
                        {lockedBy[d.id] && lockedBy[d.id] !== "Me" ? (
                          <span style={{ fontSize:10, color:"var(--text-muted)", padding:"2px 5px" }} title={`Locked by ${lockedBy[d.id]}`}>🔒 {lockedBy[d.id]}</span>
                        ) : (
                          <button title={lockedBy[d.id]==="Me" ? "Release lock" : "Lock for editing"} style={{ ...btnStyle("ghost","sm"), padding: "4px 8px", color: lockedBy[d.id]==="Me" ? "var(--accent,#6c63ff)" : "var(--text-muted)" }}
                            onClick={() => setLockedBy(prev => { const n={...prev}; n[d.id]=n[d.id]==="Me"?undefined:"Me"; return n; })}>
                            {lockedBy[d.id]==="Me" ? "🔒" : "🔓"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ── Footer count ── */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
          Showing {filtered.length} document{filtered.length !== 1 ? "s" : ""}{activeFilters ? ` (filtered from ${(documents||[]).length})` : ""}
        </div>
      )}
    </div>
  );

}
