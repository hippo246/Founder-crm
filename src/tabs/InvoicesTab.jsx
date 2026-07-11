import { useState, useMemo, useEffect } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast, CollapsibleSection } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday, calculateDaysBetween } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData, loadWorkspaceData, formatCurrency } from "../lib/storage.js";
import { exportToCSV, openPrintView } from "../lib/exports.js";
import { INVOICE_STATUSES, STATUS_COLORS } from "../config/crmConfig.js";

// ==============================================================================
// INVOICE DETAIL — top-level component so React never remounts it on re-renders
// ==============================================================================
function InvoiceDetail({ invoice, onClose, onLinkedSave, payments, role, invoices, setInvoices, saveWorkspaceData, workspaceId, addAudit, onAddPayment, onDuplicate, onPrint, formatCurrency, fmtDate, currSymbol, STATUS_COLORS, Badge, Modal, SectionCard, btnStyle, setTab }) {
  const paidMap = {};
  (payments||[]).forEach(p => { if (p.invoiceId) paidMap[p.invoiceId] = (paidMap[p.invoiceId]||0) + (Number(p.amount)||0); });
  const paid = paidMap[invoice.id] || 0;
  const grandTotal = Number(invoice.grandTotal || 0);
  const pending = Math.max(0, grandTotal - paid);

  const today = new Date();
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const daysDiff = dueDate ? Math.floor((dueDate - today) / (1000*60*60*24)) : null;
  const aging = !dueDate || invoice.status === "Paid" || invoice.status === "Cancelled"
    ? "Not due"
    : daysDiff > 0 ? `Due in ${daysDiff} days`
    : daysDiff === 0 ? "Due today"
    : `Overdue by ${Math.abs(daysDiff)} days`;

  const linkedPayments = (payments||[]).filter(p => p.invoiceId === invoice.id);
  const sym = currSymbol(invoice.currency);

  return (
    <Modal title={`Invoice: ${invoice.invoiceNumber}`} onClose={onClose} width={800}>
      <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 10 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{invoice.invoiceTitle || invoice.invoiceNumber}</h3>
            <p style={{ margin: "5px 0 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              {invoice.clientName} {invoice.clientCompany ? `(${invoice.clientCompany})` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button data-testid="invoice-print" style={btnStyle("ghost", "sm")} onClick={() => onPrint(invoice)}>🖨️ Print/PDF</button>
            {role !== "Viewer" && invoice.status === "Draft" && (
              <button style={btnStyle("soft", "sm")} onClick={() => {
                const updated = (invoices||[]).map(i => i.id === invoice.id ? {...i, status: "Sent"} : i);
                setInvoices(updated); saveWorkspaceData("invoices", updated, workspaceId);
                addAudit("Invoices","Status",`Invoice ${invoice.invoiceNumber} marked Sent`);
                onClose();
              }}>✉️ Mark Sent</button>
            )}
            {role !== "Viewer" && invoice.status !== "Cancelled" && invoice.status !== "Paid" && (
              <button style={{...btnStyle("ghost", "sm"), color:"var(--danger)"}} onClick={() => {
                const updated = (invoices||[]).map(i => i.id === invoice.id ? {...i, status: "Cancelled"} : i);
                setInvoices(updated); saveWorkspaceData("invoices", updated, workspaceId);
                addAudit("Invoices","Status",`Invoice ${invoice.invoiceNumber} cancelled`);
                onClose();
              }}>✗ Cancel</button>
            )}
            {role !== "Viewer" && invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
              <button data-testid="invoice-add-payment" style={btnStyle("primary", "sm")} onClick={() => onAddPayment(invoice, pending)}>💳 Add Payment</button>
            )}
          </div>
        </div>

        {/* Status & Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
          <SectionCard title="Status">
            <Badge label={invoice.status} color={STATUS_COLORS[invoice.status]} />
            <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>{aging}</p>
          </SectionCard>
          <SectionCard title="Amounts">
            <div style={{ fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Grand Total:</span><span style={{ fontWeight: 600 }}>{formatCurrency(grandTotal, invoice.currency||"INR",{},"INR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span>Paid:</span><span style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(paid, invoice.currency||"INR",{},"INR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span>Pending:</span><span style={{ color: pending > 0 ? "var(--warning)" : "var(--success)", fontWeight: 600 }}>{formatCurrency(pending, invoice.currency||"INR",{},"INR")}</span>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Dates">
            <div style={{ fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Issue Date:</span><span>{fmtDate(invoice.issueDate)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span>Due Date:</span><span>{invoice.dueDate ? fmtDate(invoice.dueDate) : "--"}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Client & Project Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <SectionCard title="Client Details">
            <div style={{ fontSize: 13 }}>
              <p style={{ margin: "5px 0", fontWeight: 600 }}>{invoice.clientName}</p>
              {invoice.clientCompany && <p style={{ margin: "5px 0" }}>{invoice.clientCompany}</p>}
              {invoice.clientEmail && <p style={{ margin: "5px 0" }}>{invoice.clientEmail}</p>}
              {invoice.clientPhone && <p style={{ margin: "5px 0" }}>{invoice.clientPhone}</p>}
              {invoice.clientAddress && <p style={{ margin: "5px 0", whiteSpace: "pre-wrap" }}>{invoice.clientAddress}</p>}
            </div>
          </SectionCard>
          <SectionCard title="Project Details">
            <div style={{ fontSize: 13 }}>
              {invoice.projectName
                ? <><p style={{ margin: "5px 0", fontWeight: 600 }}>{invoice.projectName}</p><p style={{ margin: "5px 0", color: "var(--text-muted)" }}>Project ID: {invoice.projectId}</p></>
                : <p style={{ margin: "5px 0", color: "var(--text-muted)" }}>No project linked</p>}
            </div>
          </SectionCard>
        </div>

        {/* Line Items */}
        <SectionCard title="Line Items" style={{ marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Item</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Qty</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Discount</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Tax %</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lineItems||[]).map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px" }}>{item.itemName||"--"}</td>
                    <td style={{ padding: "10px" }}>{item.description||"--"}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{sym}{Number(item.unitPrice||0).toFixed(2)}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{sym}{Number(item.discount||0).toFixed(2)}</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>{item.taxRate}%</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>{sym}{Number(item.total||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>Subtotal:</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>{sym}{Number(invoice.subtotal||0).toFixed(2)}</td>
                </tr>
                {invoice.discountTotal > 0 && <tr><td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>Discount:</td><td style={{ padding: "10px", textAlign: "right", color: "var(--danger)" }}>-{sym}{Number(invoice.discountTotal||0).toFixed(2)}</td></tr>}
                {invoice.taxTotal > 0 && <tr><td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>Tax:</td><td style={{ padding: "10px", textAlign: "right" }}>{sym}{Number(invoice.taxTotal||0).toFixed(2)}</td></tr>}
                {invoice.extraCharges > 0 && <tr><td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>Extra Charges:</td><td style={{ padding: "10px", textAlign: "right" }}>{sym}{Number(invoice.extraCharges||0).toFixed(2)}</td></tr>}
                <tr style={{ background: "var(--surface)" }}>
                  <td colSpan="6" style={{ padding: "10px", textAlign: "right", fontWeight: 700, fontSize: 14 }}>Grand Total:</td>
                  <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, fontSize: 14, color: "var(--success)" }}>{sym}{grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        {/* Payment History */}
        {linkedPayments.length > 0 && (
          <SectionCard title="Payment History" style={{ marginBottom: 20 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    <th style={{ padding: "10px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Amount</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Method</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Reference</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedPayments.map((payment, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px" }}>{fmtDate(payment.date)}</td>
                      <td style={{ padding: "10px", fontWeight: 600, color: "var(--success)" }}>{sym}{Number(payment.amount||0).toFixed(2)}</td>
                      <td style={{ padding: "10px" }}>{payment.method||"--"}</td>
                      <td style={{ padding: "10px" }}>{payment.reference||"--"}</td>
                      <td style={{ padding: "10px" }}>{payment.notes||"--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* Payment Terms & Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <SectionCard title="Payment Terms"><div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{invoice.paymentTerms||"--"}</div></SectionCard>
          <SectionCard title="Notes"><div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{invoice.notes||"--"}</div></SectionCard>
        </div>

        {invoice.footerText && (
          <div style={{ marginTop: 20, padding: "15px", background: "var(--surface)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
            {invoice.footerText}
          </div>
        )}

        {/* Linked Actions */}
        {role !== "Viewer" && (
          <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--surface-raised)", borderRadius: 8, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Linked Actions</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
                <button style={btnStyle("soft","sm")} onClick={() => onAddPayment(invoice, pending)}>💳 Add Payment</button>
              )}
              <button style={btnStyle("soft","sm")} onClick={() => {
                if (onLinkedSave) { onLinkedSave("note", { title: `Note — Invoice ${invoice.invoiceNumber}`, relatedTo: invoice.invoiceNumber, relatedType: "Invoice", body: "", tags: [] }); onClose(); if (setTab) setTab("notes"); }
              }}>📝 Add Note</button>
              <button style={btnStyle("soft","sm")} onClick={() => {
                if (onLinkedSave) { onLinkedSave("communication", { contact: invoice.clientName, relatedTo: invoice.invoiceNumber, method: "Email", date: new Date().toISOString().slice(0,10), summary: "", invoiceId: invoice.id }); onClose(); if (setTab) setTab("communications"); }
              }}>💬 Add Communication</button>
              <button style={btnStyle("soft","sm")} onClick={() => {
                if (onLinkedSave) { onLinkedSave("document", { name: `Doc — ${invoice.invoiceNumber}`, relatedProject: invoice.projectName, relatedClient: invoice.clientName }); onClose(); if (setTab) setTab("documents"); }
              }}>📄 Add Document</button>
              <button style={btnStyle("ghost","sm")} onClick={() => { onDuplicate(invoice); onClose(); }}>📋 Duplicate</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ==============================================================================
// MODULE: INVOICES - FULL SYSTEM
// ==============================================================================

export default function InvoicesTab({ invoices, setInvoices, addAudit, role, projects, contacts, settings, payments, setPayments, workspaceId = "workspace-1", onLinkedSave, setTab }) {

  const [view, setView] = useState(() => {
        // Default to cards view on mobile
        if (typeof window !== "undefined") {
          return window.innerWidth < 768 ? "cards" : "table";
        }
        return "cards";
      });

      // Auto-switch to cards view on mobile
      useEffect(() => {
        const handleResize = () => {
          if (window.innerWidth < 768 && view !== "cards") {
            setView("cards");
          }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      }, [view]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [filterClient, setFilterClient] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailView, setDetailView] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [prefillPayment, setPrefillPayment] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImportMenu, setShowImportMenu] = useState(false);

  // Currency symbol helper
  const currSymbol = (currency) => {
    if (currency === "INR") return "₹";
    if (currency === "USD") return "$";
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    return currency || "₹";
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortTh = ({ label, colKey }) => (
    <th
      style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
      onClick={() => handleSort(colKey)}
    >
      {label} {sortKey === colKey ? (sortDir === "asc" ? "↑" : "↓") : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  // Filter invoices
  const filtered = useMemo(() => (invoices||[]).filter(inv => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      inv.invoiceNumber?.toLowerCase().includes(q) || 
      inv.clientName?.toLowerCase().includes(q) || 
      inv.clientCompany?.toLowerCase().includes(q) ||
      inv.projectName?.toLowerCase().includes(q) ||
      inv.invoiceTitle?.toLowerCase().includes(q);
    
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;
    const matchesProject = filterProject === "All" || inv.projectId === filterProject || inv.projectName === filterProject;
    const matchesClient = filterClient === "All" || inv.contactId === filterClient || inv.clientName === filterClient;
    
    return matchesSearch && matchesStatus && matchesProject && matchesClient;
  }), [invoices, search, filterStatus, filterProject, filterClient]);

  // Calculate invoice paid amount from linked payments
  const getInvoicePaid = useMemo(() => {
    const paidMap = {};
    (payments||[]).forEach(payment => {
      if (payment.invoiceId) {
        paidMap[payment.invoiceId] = (paidMap[payment.invoiceId] || 0) + (Number(payment.amount) || 0);
      }
    });
    return paidMap;
  }, [payments]);

  // Calculate invoice pending amount
  const getInvoicePending = (invoice) => {
    const paid = getInvoicePaid[invoice.id] || 0;
    const grandTotal = Number(invoice.grandTotal) || 0;
    return Math.max(0, grandTotal - paid);
  };

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortKey === "grandTotal") { aVal = Number(a.grandTotal || 0); bVal = Number(b.grandTotal || 0); }
      else if (sortKey === "paid") { aVal = getInvoicePaid[a.id] || 0; bVal = getInvoicePaid[b.id] || 0; }
      else if (sortKey === "pending") { aVal = getInvoicePending(a); bVal = getInvoicePending(b); }
      else if (sortKey === "dueDate") { aVal = a.dueDate || ""; bVal = b.dueDate || ""; }
      else if (sortKey === "issueDate") { aVal = a.issueDate || ""; bVal = b.issueDate || ""; }
      else { aVal = (a[sortKey] || "").toString().toLowerCase(); bVal = (b[sortKey] || "").toString().toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir, getInvoicePaid]);

  // Calculate invoice aging
  const getInvoiceAging = (invoice) => {
    if (!invoice.dueDate || invoice.status === "Paid" || invoice.status === "Cancelled") return "Not due";
    
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysDiff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 0) return `Due in ${daysDiff} days`;
    if (daysDiff === 0) return "Due today";
    return `Overdue by ${Math.abs(daysDiff)} days`;
  };

  // Auto-update invoice status based on payments
  useEffect(() => {
    const updatedInvoices = (invoices||[]).map(invoice => {
      const paid = getInvoicePaid[invoice.id] || 0;
      const grandTotal = Number(invoice.grandTotal) || 0;
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const today = new Date();
      
      let newStatus = invoice.status;
      
      if (invoice.status === "Cancelled") return invoice;
      
      if (paid >= grandTotal) {
        newStatus = "Paid";
      } else if (paid > 0) {
        newStatus = "Partially Paid";
      } else if (invoice.status === "Draft") {
        newStatus = "Draft";
      } else {
        newStatus = "Sent";
      }
      
      // Check if overdue
      if (dueDate && dueDate < today && newStatus !== "Paid" && newStatus !== "Cancelled") {
        newStatus = "Overdue";
      }
      
      if (newStatus !== invoice.status) {
        return { ...invoice, status: newStatus };
      }
      return invoice;
    });
    
    // Only update if there are changes
    const hasChanges = updatedInvoices.some((inv, i) => inv.status !== (invoices||[])[i]?.status);
    if (hasChanges) {
      setInvoices(updatedInvoices);
      saveWorkspaceData("invoices", updatedInvoices, workspaceId);
    }
  }, [payments, getInvoicePaid, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate financial stats
  const financialStats = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let unpaidCount = 0;
    let overdueCount = 0;
    
    (invoices||[]).forEach(invoice => {
      const grandTotal = Number(invoice.grandTotal) || 0;
      const paid = getInvoicePaid[invoice.id] || 0;
      const pending = Math.max(0, grandTotal - paid);
      
      totalInvoiced += grandTotal;
      totalPaid += paid;
      totalPending += pending;
      
      if (invoice.status === "Overdue") {
        totalOverdue += pending;
        overdueCount++;
      }
      
      if (invoice.status !== "Paid" && invoice.status !== "Cancelled") {
        unpaidCount++;
      }
    });
    
    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      unpaidCount,
      overdueCount,
      paidCount: (invoices||[]).filter(i => i.status === "Paid").length,
      draftCount: (invoices||[]).filter(i => i.status === "Draft").length
    };
  }, [invoices, getInvoicePaid]);

  // Invoice Form Component
  const InvoiceForm = ({ initial={}, onSave, onClose }) => {
    const defaultLineItem = { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: settings.invoiceTax || 18, total: 0 };
    
    const [form, setForm] = useState({
      invoiceNumber: initial.invoiceNumber || `INV-${String((invoices||[]).length+1).padStart(4,"0")}`,
      invoiceTitle: initial.invoiceTitle || "",
      contactId: initial.contactId || "",
      clientName: initial.clientName || "",
      clientCompany: initial.clientCompany || "",
      clientEmail: initial.clientEmail || "",
      clientPhone: initial.clientPhone || "",
      clientAddress: initial.clientAddress || "",
      projectId: initial.projectId || "",
      projectName: initial.projectName || "",
      issueDate: initial.issueDate || new Date().toISOString().slice(0,10),
      dueDate: initial.dueDate || "",
      status: initial.status || "Draft",
      currency: initial.currency || settings.currency || "INR",
      lineItems: initial.lineItems?.length ? initial.lineItems : [defaultLineItem],
      subtotal: initial.subtotal || 0,
      discountTotal: initial.discountTotal || 0,
      taxTotal: initial.taxTotal || 0,
      extraCharges: initial.extraCharges || 0,
      grandTotal: initial.grandTotal || 0,
      paymentTerms: initial.paymentTerms || settings.paymentTerms || "Net 30",
      paymentInstructions: initial.paymentInstructions || settings.paymentInstructions || "Please pay via UPI or bank transfer",
      notes: initial.notes || "",
      internalNotes: initial.internalNotes || "",
      footerText: initial.footerText || settings.invoiceFooter || "Thank you for your business!",
      ...initial
    });

    // Calculate totals when form changes
    useEffect(() => {
      const subtotal = form.lineItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;
        const itemTotal = (quantity * unitPrice) - discount;
        return sum + itemTotal;
      }, 0);
      
      const discountTotal = form.lineItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
      
      const taxTotal = form.lineItems.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const taxableAmount = (quantity * unitPrice) - discount;
        return sum + (taxableAmount * taxRate / 100);
      }, 0);
      
      const extraCharges = Number(form.extraCharges) || 0;
      const grandTotal = subtotal + taxTotal + extraCharges;
      
      // Update line item totals
      const updatedLineItems = form.lineItems.map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const taxableAmount = (quantity * unitPrice) - discount;
        const taxAmount = taxableAmount * taxRate / 100;
        const total = taxableAmount + taxAmount;
        
        return { ...item, total };
      });
      
      setForm(prev => ({
        ...prev,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        lineItems: updatedLineItems
      }));
    }, [form.lineItems, form.extraCharges]);

    const updateForm = (key, value) => {
      setForm(prev => ({ ...prev, [key]: value }));
    };

    const updateLineItem = (index, key, value) => {
      const updatedLineItems = [...form.lineItems];
      updatedLineItems[index] = { ...updatedLineItems[index], [key]: value };
      setForm(prev => ({ ...prev, lineItems: updatedLineItems }));
    };

    const addLineItem = () => {
      setForm(prev => ({
        ...prev,
        lineItems: [...prev.lineItems, { ...defaultLineItem }]
      }));
    };

    const removeLineItem = (index) => {
      if (form.lineItems.length > 1) {
        const updatedLineItems = form.lineItems.filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, lineItems: updatedLineItems }));
      }
    };

    const handleClientChange = (contactId) => {
      const contact = (contacts||[]).find(c => c.id === contactId);
      if (contact) {
        setForm(prev => ({
          ...prev,
          contactId,
          clientName: contact.name || "",
          clientCompany: contact.company || "",
          clientEmail: contact.email || "",
          clientPhone: contact.phone || "",
          clientAddress: contact.address || ""
        }));
      } else {
        setForm(prev => ({
          ...prev,
          contactId,
          clientName: "",
          clientCompany: "",
          clientEmail: "",
          clientPhone: "",
          clientAddress: ""
        }));
      }
    };

    const handleProjectChange = (projectId) => {
      const project = (projects||[]).find(p => p.id === projectId);
      if (project) {
        setForm(prev => ({
          ...prev,
          projectId,
          projectName: project.name || ""
        }));
      } else {
        setForm(prev => ({
          ...prev,
          projectId,
          projectName: ""
        }));
      }
    };

    const handleSubmit = () => {
      // Validate required fields
      if (!form.invoiceNumber.trim()) {
        toast("Invoice number is required", "error");
        return;
      }
      
      if (!form.clientName.trim() && !form.contactId) {
        toast("Client name is required", "error");
        return;
      }
      
      onSave(form);
    };

    return (
      <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 20 }}>
          <FormField label="Invoice Number *">
            <input data-testid="invoice-number" style={inputStyle} value={form.invoiceNumber} onChange={e => updateForm("invoiceNumber", e.target.value)} />
          </FormField>
          <FormField label="Invoice Title">
            <input data-testid="invoice-title" style={inputStyle} value={form.invoiceTitle} onChange={e => updateForm("invoiceTitle", e.target.value)} placeholder="e.g., Website Development Services" />
          </FormField>

          <FormField label="Client *">
            <select data-testid="invoice-client-select" style={inputStyle} value={form.contactId} onChange={e => handleClientChange(e.target.value)}>
              <option value="">Select client</option>
              {(contacts||[]).map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
            </select>
          </FormField>
          <FormField label="Project">
            <select data-testid="invoice-project-select" style={inputStyle} value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
              <option value="">None</option>
              {projects && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>

          <FormField label="Issue Date *">
            <input data-testid="invoice-issue-date" style={inputStyle} type="date" value={form.issueDate} onChange={e => updateForm("issueDate", e.target.value)} />
          </FormField>
          <FormField label="Due Date">
            <input data-testid="invoice-due-date" style={inputStyle} type="date" value={form.dueDate} onChange={e => updateForm("dueDate", e.target.value)} />
          </FormField>
          
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => updateForm("status", e.target.value)}>
              {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Currency">
            <select style={inputStyle} value={form.currency} onChange={e => updateForm("currency", e.target.value)}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </FormField>
        </div>

        {/* Client Details Section */}
        <CollapsibleSection title="Client Details" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Client Name">
              <input data-testid="invoice-client-name" style={inputStyle} value={form.clientName} onChange={e => updateForm("clientName", e.target.value)} />
            </FormField>
            <FormField label="Company">
              <input data-testid="invoice-client-company" style={inputStyle} value={form.clientCompany} onChange={e => updateForm("clientCompany", e.target.value)} />
            </FormField>
            <FormField label="Email">
              <input data-testid="invoice-client-email" style={inputStyle} type="email" value={form.clientEmail} onChange={e => updateForm("clientEmail", e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <input data-testid="invoice-client-phone" style={inputStyle} value={form.clientPhone} onChange={e => updateForm("clientPhone", e.target.value)} />
            </FormField>
            <FormField label="Address" fullWidth>
              <textarea data-testid="invoice-client-address" style={{ ...inputStyle, minHeight: 60 }} value={form.clientAddress} onChange={e => updateForm("clientAddress", e.target.value)} />
            </FormField>
          </div>
        </CollapsibleSection>

        {/* Line Items Section */}
        <CollapsibleSection title="Line Items" defaultOpen={true}>
          <div style={{ marginBottom: 15 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Description</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Qty</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Unit Price</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Discount</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Tax %</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Total</th>
                  <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px" }}>
                      <input data-testid={`line-item-desc-${index}`} style={{ ...inputStyle, width: "100%" }} value={item.description} onChange={e => updateLineItem(index, "description", e.target.value)} placeholder="Description" />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input data-testid={`line-item-qty-${index}`} style={{ ...inputStyle, width: "70px" }} type="number" min="1" value={item.quantity} onChange={e => updateLineItem(index, "quantity", e.target.value)} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input data-testid={`line-item-price-${index}`} style={{ ...inputStyle, width: "100px" }} type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(index, "unitPrice", e.target.value)} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input data-testid={`line-item-discount-${index}`} style={{ ...inputStyle, width: "90px" }} type="number" min="0" step="0.01" value={item.discount} onChange={e => updateLineItem(index, "discount", e.target.value)} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <input data-testid={`line-item-tax-${index}`} style={{ ...inputStyle, width: "70px" }} type="number" min="0" step="0.01" value={item.taxRate} onChange={e => updateLineItem(index, "taxRate", e.target.value)} />
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600, color: "var(--success)" }}>
                      {currSymbol(form.currency)}{Number(item.total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {form.lineItems.length > 1 && (
                        <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => removeLineItem(index)}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button data-testid="invoice-add-line-item" style={{ ...btnStyle("ghost", "sm"), marginTop: 10 }} onClick={addLineItem}>+ Add Line Item</button>
          </div>
        </CollapsibleSection>

        {/* Totals Section */}
        <CollapsibleSection title="Totals" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Subtotal">
              <div style={{ ...inputStyle, background: "var(--surface)" }}>
                {currSymbol(form.currency)}{Number(form.subtotal || 0).toFixed(2)}
              </div>
            </FormField>
            <FormField label="Discount Total">
              <div style={{ ...inputStyle, background: "var(--surface)" }}>
                {currSymbol(form.currency)}{Number(form.discountTotal || 0).toFixed(2)}
              </div>
            </FormField>
            <FormField label="Tax Total">
              <div style={{ ...inputStyle, background: "var(--surface)" }}>
                {currSymbol(form.currency)}{Number(form.taxTotal || 0).toFixed(2)}
              </div>
            </FormField>
            <FormField label="Extra Charges">
              <input data-testid="invoice-extra-charges" style={inputStyle} type="number" min="0" step="0.01" value={form.extraCharges} onChange={e => updateForm("extraCharges", e.target.value)} />
            </FormField>
            <FormField label="Grand Total *" fullWidth>
              <div data-testid="invoice-grand-total" style={{ ...inputStyle, background: "var(--surface)", color: "var(--success)", fontWeight: 700, fontSize: 16 }}>
                {currSymbol(form.currency)}{Number(form.grandTotal || 0).toFixed(2)}
              </div>
            </FormField>
          </div>
        </CollapsibleSection>

        {/* Payment Terms & Notes */}
        <CollapsibleSection title="Payment Terms & Notes" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <FormField label="Payment Terms">
                <textarea data-testid="invoice-payment-terms" style={{ ...inputStyle, minHeight: 80 }} value={form.paymentTerms} onChange={e => updateForm("paymentTerms", e.target.value)} />
              </FormField>
              <FormField label="Payment Instructions">
                <textarea data-testid="invoice-payment-instructions" style={{ ...inputStyle, minHeight: 80 }} value={form.paymentInstructions} onChange={e => updateForm("paymentInstructions", e.target.value)} />
              </FormField>
            </div>
            <div>
              <FormField label="Notes to Client">
                <textarea data-testid="invoice-notes" style={{ ...inputStyle, minHeight: 80 }} value={form.notes} onChange={e => updateForm("notes", e.target.value)} />
              </FormField>
              <FormField label="Internal Notes">
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.internalNotes} onChange={e => updateForm("internalNotes", e.target.value)} />
              </FormField>
            </div>
          </div>
        </CollapsibleSection>

        {/* Footer Text */}
        <CollapsibleSection title="Footer Text" defaultOpen={false}>
          <FormField label="Invoice Footer">
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.footerText} onChange={e => updateForm("footerText", e.target.value)} />
          </FormField>
        </CollapsibleSection>

        {/* Form Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button data-testid="invoice-save" style={btnStyle("primary")} onClick={handleSubmit}>
            {initial.id ? "Update Invoice" : "Create Invoice"}
          </button>
        </div>
      </div>
    );
  };

  // Payment Form Component
  const PaymentForm = ({ initial={}, onSave, onClose }) => {
    const [form, setForm] = useState({
      paymentNumber: `PAY-${String((payments||[]).length+1).padStart(4,"0")}`,
      invoiceId: "",
      invoiceNumber: "",
      projectId: "",
      contactId: "",
      clientName: "",
      amount: 0,
      method: "UPI",
      date: new Date().toISOString().slice(0,10),
      reference: "",
      receivedBy: settings.ownerName || "",
      notes: "",
      ...initial
    });

    const updateForm = (key, value) => {
      setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleInvoiceChange = (invoiceId) => {
      const invoice = (invoices||[]).find(i => i.id === invoiceId);
      if (invoice) {
        setForm(prev => ({
          ...prev,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          projectId: invoice.projectId,
          contactId: invoice.contactId,
          clientName: invoice.clientName,
          amount: getInvoicePending(invoice)
        }));
      }
    };

    const handleSubmit = () => {
      if (!form.amount || Number(form.amount) <= 0) {
        toast("Payment amount must be greater than 0", "error");
        return;
      }
      
      if (!form.invoiceId) {
        toast("Please select an invoice", "error");
        return;
      }
      
      onSave(form);
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 20 }}>
          <FormField label="Payment/Receipt #">
            <input data-testid="payment-number" style={inputStyle} value={form.paymentNumber} onChange={e => updateForm("paymentNumber", e.target.value)} />
          </FormField>
          <FormField label="Invoice *">
            <select data-testid="payment-invoice-select" style={inputStyle} value={form.invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
              <option value="">Select invoice</option>
              {(invoices||[]).filter(i => i.status !== "Paid" && i.status !== "Cancelled").map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} - {i.clientName} (Pending: {currSymbol(i.currency)}{getInvoicePending(i).toFixed(2)})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Amount *">
            <input data-testid="payment-amount" style={inputStyle} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => updateForm("amount", e.target.value)} />
          </FormField>
          <FormField label="Payment Method">
            <select style={inputStyle} value={form.method} onChange={e => updateForm("method", e.target.value)}>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          
          <FormField label="Payment Date *">
            <input style={inputStyle} type="date" value={form.date} onChange={e => updateForm("date", e.target.value)} />
          </FormField>
          <FormField label="Reference Number">
            <input style={inputStyle} value={form.reference} onChange={e => updateForm("reference", e.target.value)} placeholder="Transaction/Cheque #" />
          </FormField>
          
          <FormField label="Received By">
            <input style={inputStyle} value={form.receivedBy} onChange={e => updateForm("receivedBy", e.target.value)} />
          </FormField>
          <FormField label="Client Name">
            <input style={inputStyle} value={form.clientName} onChange={e => updateForm("clientName", e.target.value)} />
          </FormField>
        </div>
        
        <FormField label="Notes">
          <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.notes} onChange={e => updateForm("notes", e.target.value)} />
        </FormField>
        
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button data-testid="payment-save" style={btnStyle("primary")} onClick={handleSubmit}>
            {initial.id ? "Update Payment" : "Record Payment"}
          </button>
        </div>
      </div>
    );
  };

  // Bulk actions
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === sortedFiltered.length ? [] : sortedFiltered.map(i => i.id));
  const bulkDelete = () => {
    if (role === "Staff") { toast("Staff cannot delete invoices", "error"); return; }
    const updated = (invoices||[]).filter(x => !selectedIds.includes(x.id));
    setInvoices(updated);
    saveWorkspaceData("invoices", updated, workspaceId);
    addAudit("Invoices", "BulkDelete", `Deleted ${selectedIds.length} invoices`);
    toast(`${selectedIds.length} invoice(s) deleted`, "info");
    setSelectedIds([]);
  };
  const bulkExport = () => {
    const toExport = (invoices||[]).filter(x => selectedIds.includes(x.id));
    const dataForExport = toExport.map(inv => ({
      "Invoice #": inv.invoiceNumber, "Client": inv.clientName || "", "Project": inv.projectName || "",
      "Grand Total": Number(inv.grandTotal || 0).toFixed(2), "Paid": (getInvoicePaid[inv.id] || 0).toFixed(2),
      "Pending": getInvoicePending(inv).toFixed(2), "Status": inv.status,
      "Due Date": inv.dueDate ? fmtDate(inv.dueDate) : "", "Currency": inv.currency || "INR"
    }));
    exportToCSV("invoices_selected", dataForExport);
    toast("Selected invoices exported");
  };

  // Save invoice
  const saveInvoice = (form) => {
    const invoiceData = {
      ...form,
      id: form.id || genId(),
      updatedAt: new Date().toISOString().slice(0,10),
      createdAt: form.createdAt || new Date().toISOString().slice(0,10)
    };

    if (editing) {
      const updated = (invoices||[]).map(i => i.id === editing.id ? invoiceData : i);
      setInvoices(updated);
      saveWorkspaceData("invoices", updated, workspaceId);
      addAudit("Invoices", "Update", `Updated invoice: ${invoiceData.invoiceNumber}`);
      toast("Invoice updated");
    } else {
      const updated = [invoiceData, ...(invoices||[])];
      setInvoices(updated);
      saveWorkspaceData("invoices", updated, workspaceId);
      addAudit("Invoices", "Create", `Created invoice: ${invoiceData.invoiceNumber}`);
      toast("Invoice created");
    }
    
    setShowForm(false);
    setEditing(null);
  };

  // Save payment
  const savePayment = (form) => {
    const paymentData = {
      ...form,
      id: form.id || genId(),
      updatedAt: new Date().toISOString().slice(0,10),
      createdAt: form.createdAt || new Date().toISOString().slice(0,10)
    };

    const updated = [paymentData, ...(payments||[])];
    setPayments(updated);
    saveWorkspaceData("payments", updated, workspaceId);
    addAudit("Payments", "Create", `Recorded payment: ${paymentData.paymentNumber} for invoice ${paymentData.invoiceNumber}`);
    toast("Payment recorded");
    
    setShowPaymentForm(false);
    setPrefillPayment(null);
  };

  // Delete invoice
  const deleteInvoice = (id) => {
    if (role === "Staff") {
      toast("Staff cannot delete invoices", "error");
      setConfirm(null);
      return;
    }
    
    const invoice = (invoices||[]).find(x => x.id === id);
    const updated = (invoices||[]).filter(x => x.id !== id);
    setInvoices(updated);
    saveWorkspaceData("invoices", updated, workspaceId);
    addAudit("Invoices", "Delete", `Deleted invoice: ${invoice?.invoiceNumber}`);
    toast("Invoice deleted", "info");
    setConfirm(null);
  };

  // Duplicate invoice
  const duplicateInvoice = (invoice) => {
    const duplicated = {
      ...invoice,
      id: genId(),
      invoiceNumber: `INV-${String((invoices||[]).length+1).padStart(4,"0")}`,
      status: "Draft",
      issueDate: new Date().toISOString().slice(0,10),
      dueDate: "",
      createdAt: new Date().toISOString().slice(0,10),
      updatedAt: new Date().toISOString().slice(0,10)
    };
    
    const updated = [duplicated, ...(invoices||[])];
    setInvoices(updated);
    saveWorkspaceData("invoices", updated, workspaceId);
    addAudit("Invoices", "Duplicate", `Duplicated invoice: ${invoice.invoiceNumber} to ${duplicated.invoiceNumber}`);
    toast("Invoice duplicated");
  };

  // Import functions
  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Invoice #": "INV-0001",
        "Title": "Website Development",
        "Client": "John Doe",
        "Company": "Tech Corp",
        "Project": "Website Redesign",
        "Issue Date": new Date().toISOString().split('T')[0],
        "Due Date": "",
        "Status": "Draft",
        "Currency": "INR",
        "Subtotal": "1000",
        "Discount": "0",
        "Tax": "180",
        "Grand Total": "1180",
        "Notes": ""
      }
    ];
    exportToCSV("invoice-import-template", templateData);
    toast("Template downloaded");
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target.result;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const importedInvoices = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
          const invoice = {};
          
          headers.forEach((header, index) => {
            invoice[header] = values[index] || '';
          });
          
          importedInvoices.push({
            id: genId(),
            invoiceNumber: invoice["Invoice #"] || `INV-${(invoices.length + importedInvoices.length + 1).toString().padStart(4, '0')}`,
            invoiceTitle: invoice["Title"] || "",
            clientName: invoice["Client"] || "",
            clientCompany: invoice["Company"] || "",
            projectName: invoice["Project"] || "",
            issueDate: invoice["Issue Date"] || new Date().toISOString().split('T')[0],
            dueDate: invoice["Due Date"] || "",
            status: invoice["Status"] || "Draft",
            currency: invoice["Currency"] || "INR",
            subtotal: Number(invoice["Subtotal"]) || 0,
            discountTotal: Number(invoice["Discount"]) || 0,
            taxTotal: Number(invoice["Tax"]) || 0,
            grandTotal: Number(invoice["Grand Total"]) || 0,
            paymentTerms: settings.paymentTerms || "Net 30",
            notes: invoice["Notes"] || "",
            internalNotes: "",
            footerText: settings.invoiceFooter || "Thank you for your business!",
            lineItems: []
          });
        }
        
        const newInvoices = [...invoices, ...importedInvoices];
        setInvoices(newInvoices);
        saveWorkspaceData("invoices", newInvoices, workspaceId);
        addAudit("Invoices", "Import", `Imported ${importedInvoices.length} invoice(s)`);
        toast(`${importedInvoices.length} invoice(s) imported successfully`);
        setShowImportMenu(false);
      } catch (error) {
        console.error("Import error:", error);
        toast("Failed to import CSV", "error");
      }
    };
    reader.readAsText(file);
  };

  // Export CSV
  const handleExport = () => {
    const dataForExport = filtered.map(inv => ({
      "Invoice #": inv.invoiceNumber,
      "Title": inv.invoiceTitle || "",
      "Client": inv.clientName || "",
      "Company": inv.clientCompany || "",
      "Project": inv.projectName || "",
      "Issue Date": fmtDate(inv.issueDate),
      "Due Date": inv.dueDate ? fmtDate(inv.dueDate) : "",
      "Status": inv.status,
      "Subtotal": Number(inv.subtotal || 0).toFixed(2),
      "Discount": Number(inv.discountTotal || 0).toFixed(2),
      "Tax": Number(inv.taxTotal || 0).toFixed(2),
      "Grand Total": Number(inv.grandTotal || 0).toFixed(2),
      "Paid": (getInvoicePaid[inv.id] || 0).toFixed(2),
      "Pending": getInvoicePending(inv).toFixed(2),
      "Currency": inv.currency || "INR",
      "Notes": inv.notes || ""
    }));
    
    exportToCSV("invoices", dataForExport);
    toast("Invoices exported to CSV");
  };

  // Rich print invoice
  const handlePrintInvoice = (invoice) => {
    const paid = getInvoicePaid[invoice.id] || 0;
    const pending = getInvoicePending(invoice);
    const sym = currSymbol(invoice.currency || settings.currency || "INR");
    const businessName = settings.businessName || "Founder OS CRM";
    const businessLogo = settings.businessLogo || settings.logoUrl || "";
    const linkedPmts = (payments||[]).filter(p => p.invoiceId === invoice.id);
    const grandTotal = Number(invoice.grandTotal || 0);
    const paidPct = grandTotal > 0 ? Math.min(100, (paid / grandTotal) * 100) : 0;
    const isPaid = invoice.status === "Paid";
    const isCancelled = invoice.status === "Cancelled";
    const watermarkText = isPaid ? "PAID" : isCancelled ? "CANCELLED" : "";
    const watermarkColor = isPaid ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)";
    const paymentLink = settings.paymentLink || settings.upiId ? `UPI: ${settings.upiId}` : "";

    const lineItemsHTML = (invoice.lineItems || []).map((item, idx) => `
      <tr style="border-bottom:1px solid #e5e7eb;${idx%2===1?'background:#f9fafb':''}">
        <td style="padding:9px 10px">${item.itemName || item.description || "--"}</td>
        <td style="padding:9px 10px;color:#6b7280">${item.description && item.itemName ? item.description : ""}</td>
        <td style="padding:9px 10px;text-align:right">${Number(item.quantity||0)}</td>
        <td style="padding:9px 10px;text-align:right">${sym}${Number(item.unitPrice||0).toFixed(2)}</td>
        <td style="padding:9px 10px;text-align:right;color:#ef4444">${item.discount > 0 ? `-${sym}${Number(item.discount||0).toFixed(2)}` : "—"}</td>
        <td style="padding:9px 10px;text-align:right;color:#6b7280">${Number(item.taxRate||0)}%</td>
        <td style="padding:9px 10px;text-align:right;font-weight:700">${sym}${Number(item.total||0).toFixed(2)}</td>
      </tr>`).join("");

    const paymentsHTML = linkedPmts.length > 0 ? `
      <div style="margin-top:28px">
        <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#374151;margin:0 0 10px 0;padding-bottom:6px;border-bottom:2px solid #e5e7eb">Payment History</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f3f4f6">
            <th style="padding:8px 10px;text-align:left;font-weight:600;color:#374151">Date</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600;color:#374151">Method</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600;color:#374151">Reference</th>
            <th style="padding:8px 10px;text-align:right;font-weight:600;color:#374151">Amount</th>
          </tr></thead>
          <tbody>${linkedPmts.map((p,i) => `
            <tr style="border-bottom:1px solid #e5e7eb;${i%2===1?'background:#f9fafb':''}">
              <td style="padding:8px 10px">${p.date || "--"}</td>
              <td style="padding:8px 10px">${p.method || "--"}</td>
              <td style="padding:8px 10px;color:#6b7280">${p.reference || "--"}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:700;color:#10b981">${sym}${Number(p.amount||0).toFixed(2)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>` : "";

    const qrSection = (settings.upiId || settings.paymentLink) ? `
      <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;display:flex;align-items:center;gap:14px">
        <div style="font-size:36px">📲</div>
        <div>
          <div style="font-weight:700;font-size:13px;color:#166534;margin-bottom:4px">Pay Online</div>
          ${settings.upiId ? `<div style="font-size:12px;color:#15803d">UPI ID: <strong>${settings.upiId}</strong></div>` : ""}
          ${settings.paymentLink ? `<div style="font-size:12px;color:#15803d">Link: <a href="${settings.paymentLink}" style="color:#15803d">${settings.paymentLink}</a></div>` : ""}
        </div>
      </div>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#111827;background:#fff;font-size:14px}
      @media print{body{padding:0}.no-print{display:none!important}@page{margin:18mm}}
      .page{max-width:800px;margin:0 auto;padding:32px}
      .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:110px;font-weight:900;color:${watermarkColor};pointer-events:none;z-index:0;letter-spacing:8px;white-space:nowrap}
      .content{position:relative;z-index:1}
    </style></head><body>
    <div class="page">
      ${watermarkText ? `<div class="watermark">${watermarkText}</div>` : ""}
      <div class="content">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #111827">
          <div style="display:flex;align-items:center;gap:14px">
            ${businessLogo ? `<img src="${businessLogo}" alt="Logo" style="height:56px;width:auto;object-fit:contain;border-radius:6px" onerror="this.style.display='none'" />` : `<div style="width:48px;height:48px;background:#6366f1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff">${businessName.charAt(0)}</div>`}
            <div>
              <div style="font-size:20px;font-weight:800;color:#111827">${businessName}</div>
              ${settings.ownerEmail ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${settings.ownerEmail}</div>` : ""}
              ${settings.ownerPhone ? `<div style="font-size:12px;color:#6b7280">${settings.ownerPhone}</div>` : ""}
              ${settings.ownerAddress ? `<div style="font-size:12px;color:#6b7280;white-space:pre-wrap">${settings.ownerAddress}</div>` : ""}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:900;color:#111827;letter-spacing:-1px">INVOICE</div>
            <div style="font-size:16px;font-weight:700;color:#6366f1;margin-top:4px">${invoice.invoiceNumber}</div>
            ${invoice.invoiceTitle ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${invoice.invoiceTitle}</div>` : ""}
            <div style="margin-top:10px;display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${isPaid?'#d1fae5':isCancelled?'#fee2e2':invoice.status==='Overdue'?'#fee2e2':'#ede9fe'};color:${isPaid?'#065f46':isCancelled?'#991b1b':invoice.status==='Overdue'?'#991b1b':'#4338ca'}">${invoice.status}</div>
          </div>
        </div>

        <!-- Bill To / Dates -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-bottom:28px">
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:8px">Bill To</div>
            <div style="font-weight:700;font-size:14px;color:#111827">${invoice.clientName || "--"}</div>
            ${invoice.clientCompany ? `<div style="font-size:13px;color:#374151;margin-top:2px">${invoice.clientCompany}</div>` : ""}
            ${invoice.clientEmail ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${invoice.clientEmail}</div>` : ""}
            ${invoice.clientPhone ? `<div style="font-size:12px;color:#6b7280">${invoice.clientPhone}</div>` : ""}
            ${invoice.clientAddress ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;white-space:pre-wrap">${invoice.clientAddress}</div>` : ""}
          </div>
          ${invoice.projectName ? `<div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:8px">Project</div>
            <div style="font-weight:700;font-size:14px;color:#111827">${invoice.projectName}</div>
          </div>` : "<div></div>"}
          <div style="text-align:right">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:8px">Details</div>
            <table style="font-size:12px;margin-left:auto">
              <tr><td style="color:#6b7280;padding:2px 8px 2px 0">Issue Date:</td><td style="font-weight:600">${invoice.issueDate || "--"}</td></tr>
              <tr><td style="color:#6b7280;padding:2px 8px 2px 0">Due Date:</td><td style="font-weight:600;color:${invoice.status==='Overdue'?'#dc2626':'inherit'}">${invoice.dueDate || "--"}</td></tr>
              <tr><td style="color:#6b7280;padding:2px 8px 2px 0">Currency:</td><td style="font-weight:600">${invoice.currency || "INR"}</td></tr>
            </table>
          </div>
        </div>

        <!-- Line Items -->
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:0">
          <thead><tr style="background:#111827;color:#fff">
            <th style="padding:10px;text-align:left;font-weight:600">Item</th>
            <th style="padding:10px;text-align:left;font-weight:600">Description</th>
            <th style="padding:10px;text-align:right;font-weight:600">Qty</th>
            <th style="padding:10px;text-align:right;font-weight:600">Unit Price</th>
            <th style="padding:10px;text-align:right;font-weight:600">Discount</th>
            <th style="padding:10px;text-align:right;font-weight:600">Tax%</th>
            <th style="padding:10px;text-align:right;font-weight:600">Total</th>
          </tr></thead>
          <tbody>${lineItemsHTML}</tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end;margin-top:0">
          <table style="font-size:13px;min-width:280px;border:1px solid #e5e7eb;border-top:none">
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">Subtotal</td><td style="padding:8px 12px;text-align:right;font-weight:600">${sym}${Number(invoice.subtotal||0).toFixed(2)}</td></tr>
            ${invoice.discountTotal > 0 ? `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">Discount</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#ef4444">-${sym}${Number(invoice.discountTotal||0).toFixed(2)}</td></tr>` : ""}
            ${invoice.taxTotal > 0 ? `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">Tax</td><td style="padding:8px 12px;text-align:right;font-weight:600">${sym}${Number(invoice.taxTotal||0).toFixed(2)}</td></tr>` : ""}
            ${invoice.extraCharges > 0 ? `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px 12px;color:#6b7280">Extra Charges</td><td style="padding:8px 12px;text-align:right;font-weight:600">${sym}${Number(invoice.extraCharges||0).toFixed(2)}</td></tr>` : ""}
            <tr style="background:#111827;color:#fff"><td style="padding:12px;font-weight:700;font-size:15px">Grand Total</td><td style="padding:12px;text-align:right;font-weight:800;font-size:16px">${sym}${grandTotal.toFixed(2)}</td></tr>
            <tr style="background:#d1fae5"><td style="padding:8px 12px;color:#065f46;font-weight:600">Amount Paid</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#065f46">${sym}${paid.toFixed(2)}</td></tr>
            <tr style="background:${pending > 0 ? '#fef9c3' : '#d1fae5'}"><td style="padding:8px 12px;font-weight:700;color:${pending>0?'#92400e':'#065f46'}">Balance Due</td><td style="padding:8px 12px;text-align:right;font-weight:800;font-size:15px;color:${pending>0?'#92400e':'#065f46'}">${sym}${pending.toFixed(2)}</td></tr>
          </table>
        </div>

        <!-- Progress Bar -->
        ${grandTotal > 0 ? `
        <div style="margin-top:20px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:6px">
            <span>Payment Progress</span><span>${paidPct.toFixed(0)}% paid</span>
          </div>
          <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${paidPct}%;background:${paidPct>=100?'#10b981':'#6366f1'};border-radius:4px"></div>
          </div>
        </div>` : ""}

        <!-- Payment History -->
        ${paymentsHTML}

        <!-- QR / Payment Link -->
        ${qrSection}

        <!-- Payment Terms & Notes -->
        ${invoice.paymentTerms || invoice.notes ? `
        <div style="display:grid;grid-template-columns:${invoice.paymentTerms && invoice.notes ? '1fr 1fr' : '1fr'};gap:20px;margin-top:24px">
          ${invoice.paymentTerms ? `<div style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:6px">Payment Terms</div><div style="font-size:13px;white-space:pre-wrap;color:#374151">${invoice.paymentTerms}</div></div>` : ""}
          ${invoice.notes ? `<div style="padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:6px">Notes</div><div style="font-size:13px;white-space:pre-wrap;color:#374151">${invoice.notes}</div></div>` : ""}
        </div>` : ""}

        <!-- Footer -->
        ${invoice.footerText ? `<div style="margin-top:24px;padding:14px;text-align:center;background:#f9fafb;border-top:2px solid #e5e7eb;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px">${invoice.footerText}</div>` : ""}

        <div class="no-print" style="margin-top:30px;display:flex;gap:10px;justify-content:center">
          <button onclick="window.print()" style="padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="padding:10px 24px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
        </div>
      </div>
    </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this invoice?" onYes={() => deleteInvoice(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && (
        <Modal data-testid="invoice-modal" title={editing ? "Edit Invoice" : "Create Invoice"} onClose={() => { setShowForm(false); setEditing(null); }} width={900}>
          <InvoiceForm initial={editing || {}} onSave={saveInvoice} onClose={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}
      {showPaymentForm && (
        <Modal data-testid="payment-modal" title="Record Payment" onClose={() => { setShowPaymentForm(false); setPrefillPayment(null); }} width={600}>
          <PaymentForm initial={prefillPayment || {}} onSave={savePayment} onClose={() => { setShowPaymentForm(false); setPrefillPayment(null); }} />
        </Modal>
      )}
      {detailView && (
        <InvoiceDetail
          invoice={detailView}
          onClose={() => setDetailView(null)}
          onLinkedSave={onLinkedSave}
          payments={payments}
          role={role}
          invoices={invoices}
          setInvoices={setInvoices}
          saveWorkspaceData={saveWorkspaceData}
          workspaceId={workspaceId}
          addAudit={addAudit}
          onAddPayment={(inv, pending) => {
            setPrefillPayment({
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              clientName: inv.clientName,
              projectName: inv.projectName,
              amount: pending || "",
            });
            setShowPaymentForm(true);
          }}
          onDuplicate={duplicateInvoice}
          onPrint={handlePrintInvoice}
          formatCurrency={formatCurrency}
          fmtDate={fmtDate}
          currSymbol={currSymbol}
          STATUS_COLORS={STATUS_COLORS}
          Badge={Badge}
          Modal={Modal}
          SectionCard={SectionCard}
          btnStyle={btnStyle}
          setTab={setTab}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Invoices</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(invoices||[]).length} invoices • Manage billing and payments</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "cards" ? "var(--primary,#6366f1)" : "transparent", color: view === "cards" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("cards")}
            >⊞ Cards</button>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "table" ? "var(--primary,#6366f1)" : "transparent", color: view === "table" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("table")}
            >≡ Table</button>
          </div>
          <div style={{ position: "relative" }}>
            <button style={btnStyle("ghost", "sm")} onClick={() => setShowImportMenu(!showImportMenu)}>↑ Import</button>
            {showImportMenu && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-md)",
                padding: "8px 0",
                minWidth: "200px",
                zIndex: 100
              }}>
                <button style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13
                }} onClick={downloadImportTemplate}>
                  📄 Download Template
                </button>
                <label style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "block",
                  fontSize: 13
                }}>
                  📂 Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleImportCSV}
                  />
                </label>
              </div>
            )}
          </div>
          <button data-testid="invoice-export-csv" style={btnStyle("ghost", "sm")} onClick={handleExport}>↓ Export</button>
          {(role === "Owner" || role === "Admin") && (
            <button data-testid="invoice-create" style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Create Invoice</button>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatMini label="Total Invoiced" value={`${financialStats.totalInvoiced >= 1000 ? "₹" + (financialStats.totalInvoiced/1000).toFixed(1) + "k" : "₹" + financialStats.totalInvoiced.toFixed(0)}`} color="var(--accent)" />
        <StatMini label="Total Paid" value={`${financialStats.totalPaid >= 1000 ? "₹" + (financialStats.totalPaid/1000).toFixed(1) + "k" : "₹" + financialStats.totalPaid.toFixed(0)}`} color="var(--success)" />
        <StatMini label="Pending" value={`${financialStats.totalPending >= 1000 ? "₹" + (financialStats.totalPending/1000).toFixed(1) + "k" : "₹" + financialStats.totalPending.toFixed(0)}`} color={financialStats.totalPending > 0 ? "var(--warning)" : "var(--success)"} />
        <StatMini label="Overdue" value={`${financialStats.totalOverdue >= 1000 ? "₹" + (financialStats.totalOverdue/1000).toFixed(1) + "k" : "₹" + financialStats.totalOverdue.toFixed(0)}`} color={financialStats.totalOverdue > 0 ? "#DC2626" : "#374151"} />
        <StatMini label="Unpaid Invoices" value={financialStats.unpaidCount} color={financialStats.unpaidCount > 0 ? "var(--warning)" : "var(--success)"} />
        <StatMini label="Paid Invoices" value={financialStats.paidCount} color="var(--success)" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices by number, client, project…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All statuses</option>
          {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="All">All projects</option>
          {(projects||[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="All">All clients</option>
          {(contacts||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--accent-subtle, #eef2ff)", border: "1px solid var(--accent, #6366f1)", borderRadius: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--accent, #6366f1)" }}>{selectedIds.length} selected</span>
          <button style={btnStyle("ghost", "sm")} onClick={bulkExport}>↓ Export Selected</button>
          {(role === "Owner" || role === "Admin") && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={() => { if (window.confirm(`Delete ${selectedIds.length} invoice(s)?`)) bulkDelete(); }}>🗑 Delete Selected</button>
          )}
          <button style={{ ...btnStyle("ghost", "sm"), marginLeft: "auto" }} onClick={() => setSelectedIds([])}>✕ Clear</button>
        </div>
      )}

      {/* Invoices Table / Cards */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon="🧾" 
          title="No invoices found" 
          sub="Create your first invoice or adjust your filters." 
          action={(role === "Owner" || role === "Admin") && (
            <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Create Invoice</button>
          )} 
        />
      ) : view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {sortedFiltered.map((inv) => {
            const paid = getInvoicePaid[inv.id] || 0;
            const pending = getInvoicePending(inv);
            const isOverdueInv = inv.status === "Overdue";
            const grandTotal = Number(inv.grandTotal || 0);
            const paidPct = grandTotal > 0 ? Math.min(100, (paid / grandTotal) * 100) : 0;
            const aging = getInvoiceAging(inv);
            const isSelected = selectedIds.includes(inv.id);
            const sym = currSymbol(inv.currency);
            return (
              <div key={inv.id} style={{ background: "var(--surface)", border: `1px solid ${isSelected ? "var(--accent,#6366f1)" : isOverdueInv?"#FCA5A5":inv.status==="Paid"?"var(--success)":"var(--border)"}`, borderLeft: `3px solid ${isOverdueInv?"#EF4444":inv.status==="Paid"?"#10B981":inv.status==="Draft"?"#9CA3AF":"var(--accent)"}`, borderRadius: 16, padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inv.id)} style={{ cursor: "pointer", accentColor: "var(--accent,#6366f1)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <button style={{ background: "none", border: "none", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0 }} onClick={() => setDetailView(inv)}>{inv.invoiceNumber}</button>
                        <Badge label={inv.status} color={STATUS_COLORS[inv.status]} />
                        {isOverdueInv && <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>⏰ OVERDUE</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.clientName || "—"} {inv.projectName ? `· ${inv.projectName}` : ""}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Total</div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{sym}{grandTotal.toFixed(2)}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Paid</div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{sym}{paid.toFixed(2)}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Pending</div><div style={{ fontSize: 13, fontWeight: 700, color: pending > 0 ? "var(--warning)" : "var(--success)" }}>{sym}{Number(pending).toFixed(2)}</div></div>
                </div>
                {grandTotal > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                      <span>Payment progress</span><span>{paidPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${paidPct}%`, background: paidPct >= 100 ? "var(--success)" : paidPct > 0 ? "var(--accent,#6366f1)" : "transparent", borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>Due:</span>
                    <span style={{ color: isOverdueInv?"#DC2626":"var(--text)", fontWeight: isOverdueInv?600:500 }}>{inv.dueDate ? fmtDate(inv.dueDate) : "—"}</span>
                  </div>
                  <span style={{ color: isOverdueInv ? "#DC2626" : "var(--text-muted)", fontSize: 11 }}>{aging}</span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <button style={btnStyle("ghost", "sm")} onClick={() => handlePrintInvoice(inv)}>🖨️ Print</button>
                  <button style={btnStyle("ghost", "sm")} onClick={() => setDetailView(inv)}>📄 View</button>
                  {(role === "Owner" || role === "Admin") && (<><button style={btnStyle("ghost", "sm")} onClick={() => setEditing(inv)}>Edit</button><button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={() => setConfirm(inv.id)}>Del</button></>)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div data-testid="invoice-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", width: 36 }}>
                  <input type="checkbox" checked={selectedIds.length === sortedFiltered.length && sortedFiltered.length > 0} onChange={toggleSelectAll} style={{ cursor: "pointer", accentColor: "var(--accent,#6366f1)" }} />
                </th>
                <SortTh label="Invoice #" colKey="invoiceNumber" />
                <SortTh label="Client" colKey="clientName" />
                <SortTh label="Project" colKey="projectName" />
                <SortTh label="Total" colKey="grandTotal" />
                <SortTh label="Paid" colKey="paid" />
                <SortTh label="Pending" colKey="pending" />
                <SortTh label="Progress" colKey="paid" />
                <SortTh label="Status" colKey="status" />
                <SortTh label="Due Date" colKey="dueDate" />
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((inv, i) => {
                const paid = getInvoicePaid[inv.id] || 0;
                const pending = getInvoicePending(inv);
                const isOverdueInv = inv.status === "Overdue";
                const grandTotal = Number(inv.grandTotal || 0);
                const paidPct = grandTotal > 0 ? Math.min(100, (paid / grandTotal) * 100) : 0;
                const aging = getInvoiceAging(inv);
                const isSelected = selectedIds.includes(inv.id);
                const sym = currSymbol(inv.currency);

                return (
                  <tr key={inv.id} style={{ borderTop: "1px solid var(--border)", background: isSelected ? "var(--accent-subtle, #eef2ff)" : i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inv.id)} style={{ cursor: "pointer", accentColor: "var(--accent,#6366f1)" }} />
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>
                      <button
                        style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: "inherit" }}
                        onClick={() => setDetailView(inv)}
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{inv.clientName || "--"}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{inv.projectName || "--"}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text)", fontWeight: 600 }}>{sym}{grandTotal.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", color: "var(--success)", fontWeight: 600 }}>{sym}{paid.toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", color: pending > 0 ? "var(--warning)" : "var(--success)", fontWeight: 600 }}>{sym}{Number(pending).toFixed(2)}</td>
                    <td style={{ padding: "12px 14px", minWidth: 100 }}>
                      <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 3 }}>
                        <div style={{ height: "100%", width: `${paidPct}%`, background: paidPct >= 100 ? "var(--success)" : "var(--accent,#6366f1)", borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{paidPct.toFixed(0)}%</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Badge label={inv.status} color={STATUS_COLORS[inv.status]} />
                        {isOverdueInv && <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", borderRadius: 4, padding: "2px 5px", fontWeight: 700, whiteSpace: "nowrap" }}>⏰ {aging}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ color: isOverdueInv ? "#DC2626" : "var(--text-muted)", fontWeight: isOverdueInv ? 600 : 400 }}>
                        {inv.dueDate ? fmtDate(inv.dueDate) : "--"}
                      </div>
                      {!isOverdueInv && inv.dueDate && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{aging}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button style={btnStyle("ghost", "xs")} onClick={() => handlePrintInvoice(inv)}>Print</button>
                        {(role === "Owner" || role === "Admin") && (
                          <>
                            <button style={btnStyle("ghost", "xs")} onClick={() => setEditing(inv)}>Edit</button>
                            <button style={btnStyle("ghost", "xs")} onClick={() => duplicateInvoice(inv)}>Duplicate</button>
                            <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => setConfirm(inv.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Insights Section */}
      {filtered.length > 0 && (
        <SectionCard title="Invoice Insights" style={{ marginTop: 30 }}>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {financialStats.overdueCount > 0 && (
              <p style={{ margin: "8px 0", color: "#DC2626" }}>
                ⚠️ <strong>Attention:</strong> {financialStats.overdueCount} invoice{financialStats.overdueCount > 1 ? "s are" : " is"} overdue with a total of ₹{financialStats.totalOverdue.toFixed(2)} pending.
              </p>
            )}
            
            {financialStats.totalPending > 0 && (
              <p style={{ margin: "8px 0", color: "var(--warning)" }}>
                📊 <strong>Pending Revenue:</strong> You have {financialStats.unpaidCount} unpaid invoice{financialStats.unpaidCount > 1 ? "s" : ""} with a total of ₹{financialStats.totalPending.toFixed(2)} awaiting payment.
              </p>
            )}
            
            {financialStats.paidCount > 0 && (
              <p style={{ margin: "8px 0", color: "var(--success)" }}>
                ✅ <strong>Collections:</strong> {financialStats.paidCount} invoice{financialStats.paidCount > 1 ? "s have" : " has"} been paid, totaling ₹{financialStats.totalPaid.toFixed(2)}.
              </p>
            )}
            
            {financialStats.draftCount > 0 && (
              <p style={{ margin: "8px 0", color: "var(--text-muted)" }}>
                📝 <strong>Drafts:</strong> {financialStats.draftCount} invoice{financialStats.draftCount > 1 ? "s are" : " is"} in draft status and need to be finalized.
              </p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}