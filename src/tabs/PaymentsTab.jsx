import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV, openPrintView } from "../lib/exports.js";
import { PAYMENT_METHODS } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: MANUAL PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════


export default function PaymentsTab({ payments, setPayments, addAudit, role, projects, invoices, setInvoices, contacts, settings , workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [receiptView, setReceiptView] = useState(null);

  const filtered = useMemo(() => (payments||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.clientName?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q) || p.invoiceNumber?.toLowerCase().includes(q) || p.paymentNumber?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q))
      && (filterMethod === "All" || p.method === filterMethod);
  }), [payments, search, filterMethod]);

  const totalReceived = (payments||[]).reduce((a,p)=>a+(Number(p.amount)||0),0);

  const methodTotals = PAYMENT_METHODS.reduce((a,m) => { a[m] = (payments||[]).filter(p=>p.method===m).reduce((s,p)=>s+(Number(p.amount)||0),0); return a; }, {});

  const PayForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ 
      paymentNumber: `PAY-${String((payments||[]).length+1).padStart(4,"0")}`,
      receiptNumber: `RCP-${String((payments||[]).length+1).padStart(4,"0")}`,
      invoiceId: "",
      invoiceNumber: "",
      projectId: "",
      projectName: "",
      contactId: "",
      clientName: "",
      client: "",
      project: "",
      amount: 0, 
      method: "UPI", 
      date: new Date().toISOString().slice(0,10), 
      reference: "", 
      receivedBy: settings?.ownerName || "",
      notes: "", 
      createdAt: new Date().toISOString().slice(0,10), 
      ...initial 
    });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));

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
          project: invoice.projectName
        }));
      }
    };

    const handleContactChange = (contactId) => {
      const contact = (contacts||[]).find(c => c.id === contactId);
      if (contact) {
        setF(p => ({
          ...p,
          contactId,
          clientName: contact.name,
          client: contact.name
        }));
      }
    };

    const handleProjectChange = (projectId) => {
      const project = (projects||[]).find(p => p.id === projectId);
      if (project) {
        setF(p => ({
          ...p,
          projectId,
          projectName: project.name,
          project: project.name
        }));
      }
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Payment/Receipt #"><input style={inputStyle} value={f.paymentNumber} onChange={set("paymentNumber")} /></FormField>
          <FormField label="Invoice"><select style={inputStyle} value={f.invoiceId} onChange={e => handleInvoiceChange(e.target.value)}><option value="">— None —</option>{(invoices||[]).map(inv=><option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName}</option>)}</select></FormField>
          <FormField label="Client"><select style={inputStyle} value={f.contactId} onChange={e => handleContactChange(e.target.value)}><option value="">— Select —</option>{(contacts||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.projectId} onChange={e => handleProjectChange(e.target.value)}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
          <FormField label="Amount"><input style={inputStyle} type="number" min="0.01" step="0.01" value={f.amount} onChange={set("amount")} /></FormField>
          <FormField label="Method"><select style={inputStyle} value={f.method} onChange={set("method")}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Reference / TXN ID"><input style={inputStyle} value={f.reference} onChange={set("reference")} /></FormField>
          <FormField label="Received By"><input style={inputStyle} value={f.receivedBy} onChange={set("receivedBy")} /></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save payment</button></div>
      </div>
    );
  };

  const updateInvoiceStatus = (invoiceId) => {
    if (!setInvoices || !invoiceId) return;
    const inv = (invoices||[]).find(i => i.id === invoiceId);
    if (!inv) return;
    const paidAmount = (payments||[]).filter(p => p.invoiceId === invoiceId).reduce((a,p) => a + (Number(p.amount)||0), 0);
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
      const u=(payments||[]).map(p=>p.id===editing.id?{...editing,...f}:p); 
      setPayments(u); 
      saveWorkspaceData("payments", u, workspaceId); 
      addAudit("Payments","Update",`Updated payment from ${f.clientName}`); 
      toast("Payment updated"); 
      if (f.invoiceId) updateInvoiceStatus(f.invoiceId);
    }
    else { 
      const np={...f,id:genId()}; 
      const u=[np,...(payments||[])]; 
      setPayments(u); 
      saveWorkspaceData("payments", u, workspaceId); 
      addAudit("Payments","Create",`Recorded payment from ${f.clientName}: ₹${f.amount}`); 
      toast("Payment recorded"); 
      if (f.invoiceId) updateInvoiceStatus(f.invoiceId);
    }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role==="Staff") { toast("Staff cannot delete payments","error"); setConfirm(null); return; }
    const p=(payments||[]).find(x=>x.id===id); const u=(payments||[]).filter(x=>x.id!==id); setPayments(u); saveWorkspaceData("payments", u, workspaceId); addAudit("Payments","Delete",`Deleted payment from ${p?.clientName}`); toast("Deleted","info"); setConfirm(null);
  };
  
  const handleExport = () => { exportToCSV("payments", filtered); toast("Payments exported to CSV"); };

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
      {(showForm||editing) && <Modal title={editing?"Edit payment":"Record payment"} onClose={() => { setShowForm(false); setEditing(null); }} width={580}><PayForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Payment Management</h2>
          <p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>
            {(payments||[]).length} payment records | Total Received: ₹{totalReceived.toLocaleString("en-IN")}
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>📊 Export CSV</button>
          {(role==="Owner"||role==="Admin") && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record Payment</button>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:20 }}>
        <StatMini label="Total Received" value={`₹${(totalReceived/1000).toFixed(0)}k`} color="var(--success)" />
        {PAYMENT_METHODS.filter(m=>methodTotals[m]>0).map(m => <StatMini key={m} label={m} value={`₹${(methodTotals[m]/1000).toFixed(1)}k`} color="var(--text-muted)" />)}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}><option value="All">All methods</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="💰" title="No payments" sub="Record your first payment." action={(role==="Owner"||role==="Admin")&&<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record payment</button>} /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--surface)" }}>{["Client","Payment #","Invoice","Project","Amount","Method","Date","Reference","Actions"].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((p,i) => (
              <tr key={p.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text)" }}>{p.clientName||p.client||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.paymentNumber||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.invoiceNumber||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.projectName||p.project||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--success)", fontWeight:600 }}>₹{Number(p.amount||0).toLocaleString("en-IN")}</td>
                <td style={{ padding:"12px 14px" }}><Badge label={p.method} /></td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{fmtDate(p.date)}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:11 }}>{p.reference||"—"}</td>
                <td style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button 
                      style={{ ...btnStyle("ghost","sm"), backgroundColor:"#F0F9FF", color:"#0369A1", border:"1px solid #BAE6FD" }}
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
                      <>
                        <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Receipt Note — ${p.paymentNumber||p.receiptNumber||"Payment"}`,relatedTo:p.invoiceNumber||p.clientName,relatedType:"Payment",body:"",tags:[]})}>📝 Note</button>
                        <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:p.clientName||p.client,relatedTo:p.invoiceNumber,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button>
                      </>
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
