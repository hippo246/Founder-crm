import { useState, useMemo, useCallback } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV, openPrintView } from "../lib/exports.js";
import { PAYMENT_METHODS } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: MANUAL PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

// Helper: derive next payment number safely (handles gaps from deletions)
function nextPayNum(payments, prefix) {
  const nums = (payments||[])
    .map(p => parseInt((p.paymentNumber||"").replace(/\D/g,""), 10))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(4,"0")}`;
}

// PayForm is defined outside PaymentsTab so it is never recreated on each render,
// which would cause input focus to be lost on every keystroke.
function PayForm({ initial, onSave, onClose, payments, invoices, contacts, projects, settings, currency }) {
  const [f, setF] = useState(() => ({
    paymentNumber: nextPayNum(payments, "PAY"),
    receiptNumber: nextPayNum(payments, "RCP"),
    invoiceId: "",
    invoiceNumber: "",
    projectId: "",
    projectName: "",
    contactId: "",
    clientName: "",
    client: "",
    project: "",
    amount: "",
    method: "UPI",
    date: new Date().toISOString().slice(0,10),
    reference: "",
    receivedBy: settings?.ownerName || "",
    notes: "",
    createdAt: new Date().toISOString().slice(0,10),
    ...initial,
  }));
  const [errors, setErrors] = useState({});
  const set = k => e => setF(p => ({...p, [k]: e.target.value}));

  // Find linked invoice to show progress bar
  const linkedInvoice = useMemo(() => (invoices||[]).find(i => i.id === f.invoiceId), [invoices, f.invoiceId]);
  const alreadyPaid = useMemo(() => {
    if (!linkedInvoice) return 0;
    return (payments||[])
      .filter(p => p.invoiceId === linkedInvoice.id && p.id !== initial?.id)
      .reduce((a,p) => a + (Number(p.amount)||0), 0);
  }, [payments, linkedInvoice, initial]);

  const handleInvoiceChange = (invoiceId) => {
    const invoice = (invoices||[]).find(i => i.id === invoiceId);
    if (invoice) {
      setF(p => ({
        ...p,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        projectId: invoice.projectId,
        projectName: invoice.projectName,
        contactId: invoice.contactId,
        clientName: invoice.clientName,
        client: invoice.clientName,
        project: invoice.projectName,
      }));
    } else {
      setF(p => ({...p, invoiceId: "", invoiceNumber: ""}));
    }
  };

  const handleContactChange = (contactId) => {
    const contact = (contacts||[]).find(c => c.id === contactId);
    if (contact) setF(p => ({...p, contactId, clientName: contact.name, client: contact.name}));
  };

  const handleProjectChange = (projectId) => {
    const project = (projects||[]).find(pr => pr.id === projectId);
    if (project) setF(p => ({...p, projectId, projectName: project.name, project: project.name}));
  };

  const validate = () => {
    const e = {};
    if (!f.clientName) e.clientName = "Client is required";
    if (!f.amount || Number(f.amount) <= 0) e.amount = "Amount must be greater than 0";
    if (!f.date) e.date = "Date is required";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(f);
  };

  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";
  const invoiceTotal = Number(linkedInvoice?.grandTotal) || 0;
  const remaining = invoiceTotal - alreadyPaid;

  return (
    <div>
      {linkedInvoice && invoiceTotal > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
            <span>Invoice {linkedInvoice.invoiceNumber} — payment progress</span>
            <span>{sym}{alreadyPaid.toLocaleString("en-IN")} of {sym}{invoiceTotal.toLocaleString("en-IN")} paid</span>
          </div>
          <ProgressBar value={Math.min(100, (alreadyPaid / invoiceTotal) * 100)} />
          {remaining > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {sym}{remaining.toLocaleString("en-IN")} remaining — 
              <button style={{ ...btnStyle("ghost","sm"), padding: "0 4px", fontSize: 11 }} onClick={() => setF(p => ({...p, amount: String(remaining)}))}>
                apply remaining
              </button>
            </div>
          )}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Payment #"><input style={inputStyle} value={f.paymentNumber} onChange={set("paymentNumber")} /></FormField>
        <FormField label="Invoice">
          <select style={inputStyle} value={f.invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
            <option value="">— None —</option>
            {(invoices||[]).map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</option>)}
          </select>
        </FormField>
        <FormField label="Client" error={errors.clientName}>
          <select style={{ ...inputStyle, ...(errors.clientName ? { borderColor: "var(--danger)" } : {}) }} value={f.contactId} onChange={e => handleContactChange(e.target.value)}>
            <option value="">— Select —</option>
            {(contacts||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Project">
          <select style={inputStyle} value={f.projectId} onChange={e => handleProjectChange(e.target.value)}>
            <option value="">— None —</option>
            {(projects||[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label={`Amount (${sym})`} error={errors.amount}>
          <input style={{ ...inputStyle, ...(errors.amount ? { borderColor: "var(--danger)" } : {}) }} type="number" min="0.01" step="0.01" value={f.amount} onChange={set("amount")} placeholder="0.00" />
        </FormField>
        <FormField label="Method">
          <select style={inputStyle} value={f.method} onChange={set("method")}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select>
        </FormField>
        <FormField label="Date" error={errors.date}>
          <input style={{ ...inputStyle, ...(errors.date ? { borderColor: "var(--danger)" } : {}) }} type="date" value={f.date} onChange={set("date")} />
        </FormField>
        <FormField label="Reference / TXN ID"><input style={inputStyle} value={f.reference} onChange={set("reference")} /></FormField>
        <FormField label="Received By"><input style={inputStyle} value={f.receivedBy} onChange={set("receivedBy")} /></FormField>
      </div>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={handleSave}>Save payment</button>
      </div>
    </div>
  );
}

export default function PaymentsTab({ payments, setPayments, addAudit, role, projects, invoices, setInvoices, contacts, settings, workspaceId = "workspace-1", onLinkedSave }) {

  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [sort, setSort] = useState({ col: "date", dir: "desc" });

  const currency = settings?.currency || "INR";
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  const cycleSort = (col) => setSort(s => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  const sortIcon = (col) => sort.col !== col ? " ↕" : sort.dir === "asc" ? " ↑" : " ↓";

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = (payments||[]).filter(p =>
      (!q || p.clientName?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q) || p.invoiceNumber?.toLowerCase().includes(q) || p.paymentNumber?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q))
      && (filterMethod === "All" || p.method === filterMethod)
    );
    list.sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col];
      if (sort.col === "amount") { av = Number(av)||0; bv = Number(bv)||0; }
      else { av = av?.toString().toLowerCase()||""; bv = bv?.toString().toLowerCase()||""; }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [payments, search, filterMethod, sort]);

  const totalReceived = (payments||[]).reduce((a,p)=>a+(Number(p.amount)||0),0);

  const methodTotals = useMemo(() => PAYMENT_METHODS.reduce((a,m) => {
    a[m] = (payments||[]).filter(p=>p.method===m).reduce((s,p)=>s+(Number(p.amount)||0),0);
    return a;
  }, {}), [payments]);

  const updateInvoiceStatus = (invoiceId, updatedPayments) => {
    if (!setInvoices || !invoiceId) return;
    const inv = (invoices||[]).find(i => i.id === invoiceId);
    if (!inv) return;
    // Use updatedPayments (post-save) to avoid stale closure reading old payments
    const list = updatedPayments || payments || [];
    const paidAmount = list.filter(p => p.invoiceId === invoiceId).reduce((a,p) => a + (Number(p.amount)||0), 0);
    const totalAmount = Number(inv.grandTotal) || 0;
    let newStatus = inv.status;
    if (paidAmount >= totalAmount && totalAmount > 0) {
      newStatus = "Paid";
    } else if (paidAmount > 0) {
      newStatus = "Partially Paid";
    } else if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
      newStatus = "Overdue";
    } else if (inv.status !== "Draft" && inv.status !== "Sent") {
      newStatus = "Sent";
    }
    if (newStatus !== inv.status) {
      const updatedInvoices = (invoices||[]).map(i => i.id === inv.id ? {...i, status: newStatus} : i);
      setInvoices(updatedInvoices);
      saveWorkspaceData("invoices", updatedInvoices, workspaceId);
      addAudit("Invoices", "Status", `Invoice ${inv.invoiceNumber} status updated to ${newStatus}`);
    }
  };

  const save = (f) => {
    if (editing) {
      const u = (payments||[]).map(p => p.id===editing.id ? {...editing,...f} : p);
      setPayments(u);
      saveWorkspaceData("payments", u, workspaceId);
      addAudit("Payments","Update",`Updated payment from ${f.clientName}`);
      toast("Payment updated");
      if (f.invoiceId) updateInvoiceStatus(f.invoiceId, u);
    } else {
      const np = {...f, id: genId()};
      const u = [np, ...(payments||[])];
      setPayments(u);
      saveWorkspaceData("payments", u, workspaceId);
      addAudit("Payments","Create",`Recorded payment from ${f.clientName}: ${sym}${f.amount}`);
      toast("Payment recorded");
      if (f.invoiceId) updateInvoiceStatus(f.invoiceId, u);
    }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role==="Staff") { toast("Staff cannot delete payments","error"); setConfirm(null); return; }
    const p=(payments||[]).find(x=>x.id===id); const u=(payments||[]).filter(x=>x.id!==id); setPayments(u); saveWorkspaceData("payments", u, workspaceId); addAudit("Payments","Delete",`Deleted payment from ${p?.clientName}`); toast("Deleted","info"); setConfirm(null);
  };
  
  const handleExport = () => {
    const rows = filtered.map(p => ({
      "Payment #": p.paymentNumber || "",
      "Receipt #": p.receiptNumber || "",
      "Client": p.clientName || p.client || "",
      "Invoice #": p.invoiceNumber || "",
      "Project": p.projectName || p.project || "",
      [`Amount (${currency})`]: Number(p.amount||0).toFixed(2),
      "Method": p.method || "",
      "Date": p.date || "",
      "Reference / TXN ID": p.reference || "",
      "Received By": p.receivedBy || "",
      "Notes": p.notes || "",
    }));
    exportToCSV("payments", rows);
    toast("Payments exported to CSV");
  };

  const printReceipt = (payment) => {
    if (!payment) return;
    
    openPrintView("receipt", payment, {
      businessName: settings?.businessName || "Founder OS CRM",
      ownerName: settings?.ownerName || "",
      ownerEmail: settings?.ownerEmail || "",
      ownerPhone: settings?.ownerPhone || "",
      currency: settings?.currency || "INR"
    });
    addAudit("Payments", "Print", `Printed receipt for payment from ${payment.clientName}`);
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this payment?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && (
        <Modal title={editing?"Edit payment":"Record payment"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}>
          <PayForm
            initial={editing||{}}
            onSave={save}
            onClose={() => { setShowForm(false); setEditing(null); }}
            payments={payments}
            invoices={invoices}
            contacts={contacts}
            projects={projects}
            settings={settings}
            currency={currency}
          />
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Payment Management</h2>
          <p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>
            {(payments||[]).length} payment records | Total Received: {sym}{totalReceived.toLocaleString("en-IN")}
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>📊 Export CSV</button>
          {(role==="Owner"||role==="Admin") && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record Payment</button>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:20 }}>
        <StatMini label="Total Received" value={totalReceived >= 1000 ? `${sym}${(totalReceived/1000).toFixed(1)}k` : `${sym}${totalReceived.toFixed(0)}`} color="var(--success)" />
        {PAYMENT_METHODS.filter(m=>methodTotals[m]>0).map(m => <StatMini key={m} label={m} value={methodTotals[m] >= 1000 ? `${sym}${(methodTotals[m]/1000).toFixed(1)}k` : `${sym}${methodTotals[m].toFixed(0)}`} color="var(--text-muted)" />)}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}><option value="All">All methods</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="💰" title="No payments" sub="Record your first payment." action={(role==="Owner"||role==="Admin")&&<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record payment</button>} /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"var(--surface)" }}>
                {[
                  { label: "Client", col: "clientName" },
                  { label: "Payment #", col: "paymentNumber" },
                  { label: "Invoice", col: "invoiceNumber" },
                  { label: "Project", col: "projectName" },
                  { label: "Amount", col: "amount" },
                  { label: "Method", col: "method" },
                  { label: "Date", col: "date" },
                  { label: "Reference", col: "reference" },
                  { label: "Actions", col: null },
                ].map(({ label, col }) => (
                  <th
                    key={label}
                    onClick={col ? () => cycleSort(col) : undefined}
                    style={{
                      padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)",
                      fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap",
                      cursor: col ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    {label}{col && sortIcon(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{filtered.map((p,i) => (
              <tr key={p.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text)" }}>{p.clientName||p.client||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontFamily:"monospace", fontSize:12 }}>{p.paymentNumber||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontFamily:"monospace", fontSize:12 }}>{p.invoiceNumber||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.projectName||p.project||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--success)", fontWeight:600 }}>{sym}{Number(p.amount||0).toLocaleString("en-IN")}</td>
                <td style={{ padding:"12px 14px" }}><Badge label={p.method} /></td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", whiteSpace:"nowrap" }}>{fmtDate(p.date)}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:11, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.reference||""}>{p.reference||"—"}</td>
                <td style={{ padding:"8px 14px" }}>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <button
                      style={{ ...btnStyle("ghost","sm"), backgroundColor:"#F0F9FF", color:"#0369A1", border:"1px solid #BAE6FD", whiteSpace:"nowrap" }}
                      onClick={() => printReceipt(p)}
                      title="Print Receipt"
                    >
                      🧾 Receipt
                    </button>
                    {(role==="Owner"||role==="Admin") && (
                      <>
                        <button style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button>
                        <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(p.id)}>Del</button>
                      </>
                    )}
                    {onLinkedSave && role !== "Viewer" && (
                      <div style={{ display:"flex", gap:4, borderLeft:"1px solid var(--border)", paddingLeft:4, marginLeft:2 }}>
                        <button
                          style={btnStyle("ghost","sm")}
                          title="Add note linked to this payment"
                          onClick={() => onLinkedSave("note",{ title:`Receipt Note — ${p.paymentNumber||p.receiptNumber||"Payment"}`, relatedTo:p.invoiceNumber||p.clientName, relatedType:"Payment", body:"", tags:[] })}
                        >📝</button>
                        <button
                          style={btnStyle("ghost","sm")}
                          title="Log communication for this payment"
                          onClick={() => onLinkedSave("communication",{ contact:p.clientName||p.client, relatedTo:p.invoiceNumber, method:"Email", date:new Date().toISOString().slice(0,10), summary:"" })}
                        >💬</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );

}
