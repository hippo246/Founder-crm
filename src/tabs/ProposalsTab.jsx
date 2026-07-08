import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV, openPrintView } from "../lib/exports.js";
import { PROPOSAL_STATUSES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: PROPOSAL BUILDER
// ══════════════════════════════════════════════════════════════════════════════


export default function ProposalsTab({ proposals, setProposals, addAudit, role, projects, setProjects, contacts, invoices, setInvoices, settings , workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (proposals||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q) || p.service?.toLowerCase().includes(q))
      && (filterStatus==="All" || p.status===filterStatus);
  }), [proposals, search, filterStatus]);

  const ProposalForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ 
      proposalNumber: `PROP-${String((proposals||[]).length+1).padStart(4,"0")}`,
      title:"", 
      contactId: "",
      clientName: "",
      client: "",
      service:"", 
      scope:"", 
      deliverables:"", 
      timeline:"", 
      milestones: "",
      priceBreakdown: "",
      price:0, 
      terms:"50% advance, 50% delivery", 
      assumptions: "",
      exclusions: "",
      status:"Draft", 
      date: new Date().toISOString().slice(0,10), 
      validityDate: "",
      projectId: "",
      projectName: "",
      createdAt: new Date().toISOString().slice(0,10), 
      ...initial 
    });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));

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
          projectName: project.name
        }));
      }
    };

    return (
      <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Proposal #"><input style={inputStyle} value={f.proposalNumber} onChange={set("proposalNumber")} /></FormField>
          <FormField label="Client"><select style={inputStyle} value={f.contactId} onChange={e => handleContactChange(e.target.value)}><option value="">— Select —</option>{(contacts||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Service"><input style={inputStyle} value={f.service} onChange={set("service")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.projectId} onChange={e => handleProjectChange(e.target.value)}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{PROPOSAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Valid Until"><input style={inputStyle} type="date" value={f.validityDate} onChange={set("validityDate")} /></FormField>
        </div>
        <FormField label="Scope of Work"><textarea style={{ ...inputStyle, minHeight:72, resize:"vertical" }} value={f.scope} onChange={set("scope")} /></FormField>
        <FormField label="Deliverables (one per line)"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.deliverables} onChange={set("deliverables")} placeholder="• Website design&#10;• Development&#10;• Testing" /></FormField>
        <FormField label="Timeline"><input style={inputStyle} value={f.timeline} onChange={set("timeline")} /></FormField>
        <FormField label="Milestones"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.milestones} onChange={set("milestones")} placeholder="Phase 1: Design - Week 1-2&#10;Phase 2: Development - Week 3-6" /></FormField>
        <FormField label="Price Breakdown"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.priceBreakdown} onChange={set("priceBreakdown")} placeholder="Design: ₹10,000&#10;Development: ₹25,000&#10;Testing: ₹5,000" /></FormField>
        <FormField label="Total Price (₹)"><input style={inputStyle} type="number" value={f.price} onChange={set("price")} /></FormField>
        <FormField label="Terms & Conditions"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.terms} onChange={set("terms")} /></FormField>
        <FormField label="Assumptions"><textarea style={{ ...inputStyle, minHeight:40, resize:"vertical" }} value={f.assumptions} onChange={set("assumptions")} /></FormField>
        <FormField label="Exclusions"><textarea style={{ ...inputStyle, minHeight:40, resize:"vertical" }} value={f.exclusions} onChange={set("exclusions")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button data-testid="proposal-save" style={btnStyle("primary")} onClick={() => onSave(f)}>Save proposal</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(proposals||[]).map(p=>p.id===editing.id?{...editing,...f}:p); setProposals(u); saveWorkspaceData("proposals", u, workspaceId); addAudit("Proposals","Update",`Updated proposal: ${f.title}`); toast("Proposal updated"); }
    else { const np={...f,id:genId()}; const u=[np,...(proposals||[])]; setProposals(u); saveWorkspaceData("proposals", u, workspaceId); addAudit("Proposals","Create",`Created proposal: ${f.title}`); toast("Proposal added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role==="Staff") { toast("Staff cannot delete proposals","error"); setConfirm(null); return; }
    const p=(proposals||[]).find(x=>x.id===id); const u=(proposals||[]).filter(x=>x.id!==id); setProposals(u); saveWorkspaceData("proposals", u, workspaceId); addAudit("Proposals","Delete",`Deleted proposal: ${p?.title}`); toast("Deleted","info"); setConfirm(null);
  };
  const markStatus = (id, status) => { const u=(proposals||[]).map(p=>p.id===id?{...p,status}:p); setProposals(u); saveWorkspaceData("proposals", u, workspaceId); addAudit("Proposals","Status",`Proposal marked ${status}`); toast(`Proposal ${status}`); };
  const duplicate = (p) => { const np={...p,id:genId(),title:`${p.title} (Copy)`,status:"Draft",createdAt:new Date().toISOString().slice(0,10)}; const u=[np,...(proposals||[])]; setProposals(u); saveWorkspaceData("proposals", u, workspaceId); addAudit("Proposals","Duplicate",`Duplicated: ${p.title}`); toast("Proposal duplicated"); };
  const convertToProject = (p) => {
    const np={id:genId(),name:`Project — ${p.title}`,client:p.clientName||p.client,industry:"",status:"Planning",budget:p.price||0,paid:0,pending:p.price||0,deadline:"",progress:0,techStack:"",priority:"Medium",description:p.scope||"",tags:[],createdAt:new Date().toISOString().slice(0,10)};
    const pu=[np,...(projects||[])]; setProjects(pu); saveWorkspaceData("projects", pu, workspaceId); addAudit("Projects","Create",`Project created from proposal: ${p.title}`); toast("Project created from proposal");
  };

  const createInvoiceFromProposal = (p) => {
    if (role !== "Owner" && role !== "Admin") { toast("No permission", "error"); return; }
    const taxRate = settings?.invoiceTax || 18;
    const subtotal = p.price || 0;
    const taxTotal = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxTotal;
    
    const newInv = {
      id: genId(),
      invoiceNumber: `INV-${String((invoices||[]).length+1).padStart(4,"0")}`,
      invoiceTitle: p.title,
      contactId: p.contactId,
      clientName: p.clientName || p.client,
      clientCompany: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      projectId: p.projectId,
      projectName: p.projectName || `Project — ${p.title}`,
      issueDate: new Date().toISOString().slice(0,10),
      dueDate: "",
      status: "Sent",
      currency: settings?.currency || "INR",
      lineItems: [
        {
          itemName: p.service || "Professional Services",
          description: p.scope || "Services as per proposal",
          quantity: 1,
          unitPrice: subtotal,
          discount: 0,
          taxRate: taxRate,
          total: grandTotal
        }
      ],
      subtotal: subtotal,
      discountTotal: 0,
      taxTotal: taxTotal,
      extraCharges: 0,
      grandTotal: grandTotal,
      paymentTerms: settings?.paymentTerms || "Net 30",
      paymentInstructions: settings?.paymentInstructions || "Please pay via UPI or bank transfer",
      notes: `Invoice for proposal: ${p.title} (${p.proposalNumber || p.id})`,
      internalNotes: "",
      footerText: settings?.invoiceFooter || "Thank you for your business!",
      createdAt: new Date().toISOString().slice(0,10),
    };
    const updatedInvoices = [newInv, ...(invoices||[])];
    setInvoices(updatedInvoices);
    saveWorkspaceData("invoices", updatedInvoices, workspaceId);
    addAudit("Invoices", "Create", `Invoice created from proposal: ${p.title}`);
    toast("Invoice created from proposal");
  };
  
  const handleExport = () => { exportToCSV("proposals", filtered); toast("Proposals exported to CSV"); };

  const printProposal = (proposal) => {
    if (!proposal) return;
    
    openPrintView("proposal", proposal, {
      businessName: settings?.businessName || "Founder OS CRM",
      ownerName: settings?.ownerName || "",
      ownerEmail: settings?.ownerEmail || "",
      ownerPhone: settings?.ownerPhone || "",
      currency: settings?.currency || "INR"
    });
    addAudit("Proposals", "Print", `Printed proposal: ${proposal.title}`);
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this proposal?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal data-testid="proposal-modal" title={editing?"Edit proposal":"New proposal"} onClose={() => { setShowForm(false); setEditing(null); }} width={660}><ProposalForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      {viewing && (
        <Modal title="Proposal Preview" onClose={() => setViewing(null)} width={660}>
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--text)", marginBottom:4 }}>{viewing.title}</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>For: {viewing.client} · {fmtDate(viewing.date)} · <Badge label={viewing.status} /></div>
            <div style={{ background:"var(--surface)", borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:6, color:"var(--text)" }}>Service: {viewing.service}</div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Scope</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.scope}</p>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Deliverables</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.deliverables}</p>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Timeline</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.timeline}</p>
              <div style={{ fontWeight:700, fontSize:16, color:"var(--success)", marginBottom:8 }}>Investment: ₹{Number(viewing.price||0).toLocaleString("en-IN")}</div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Terms</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:0 }}>{viewing.terms}</p>
            </div>
          </div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Proposals</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(proposals||[]).length} proposals · {(proposals||[]).filter(p=>p.status==="Accepted").length} accepted</p></div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button data-testid="proposal-export-csv" style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button data-testid="proposal-create" style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New proposal</button>}
        </div>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search proposals…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROPOSAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="📋" title="No proposals" sub="Start building your first proposal." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New proposal</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text)", marginBottom:4 }}>{p.title}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>{p.client} · {p.service} · {fmtDate(p.date)}</div>
                <div style={{ fontSize:13, color:"var(--success)", fontWeight:600 }}>₹{Number(p.price||0).toLocaleString("en-IN")}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      <Badge label={p.status} />
                      <button data-testid="proposal-preview" style={btnStyle("soft","sm")} onClick={() => setViewing(p)}>Preview</button>
                      <button
                        data-testid="proposal-print"
                        style={{ ...btnStyle("ghost","sm"), backgroundColor:"#F0F9FF", color:"#0369A1", border:"1px solid #BAE6FD" }}
                        onClick={() => printProposal(p)}
                        title="Print Proposal"
                      >
                        🖨️ Print
                      </button>
                      {role !== "Viewer" && <>
                        {p.status!=="Accepted"&&<button data-testid="proposal-accept" style={{ ...btnStyle("ghost","sm"), color:"var(--success)" }} onClick={() => markStatus(p.id,"Accepted")}>Accept</button>}
                        {p.status!=="Rejected"&&<button data-testid="proposal-reject" style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => markStatus(p.id,"Rejected")}>Reject</button>}
                        {p.status==="Accepted"&&<>
                          <button data-testid="proposal-to-project" style={{ ...btnStyle("ghost","sm"), color:"var(--accent)" }} onClick={() => convertToProject(p)}>→ Project</button>
                          <button data-testid="proposal-to-invoice" style={{ ...btnStyle("ghost","sm"), color:"var(--text)" }} onClick={() => createInvoiceFromProposal(p)}>→ Invoice</button>
                        </>}
                        <button data-testid="proposal-duplicate" style={btnStyle("ghost","sm")} onClick={() => duplicate(p)}>Duplicate</button>
                        <button data-testid="proposal-edit" style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button>
                        {(role==="Owner"||role==="Admin")&&<button data-testid="proposal-delete" style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(p.id)}>Del</button>}
                        {onLinkedSave && role !== "Viewer" && <>
                          <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${p.title}`,relatedTo:p.title,relatedType:"Proposal",contactId:p.contactId,body:"",tags:[]})}>📝 Note</button>
                          <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:p.clientName||p.client,relatedTo:p.title,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button>
                          <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("followUp",{person:p.clientName||p.client,relatedTo:p.title,relatedType:"Proposal",type:"Call",dueDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),status:"Pending",notes:""})}>📞 Follow-Up</button>
                        </>}
                      </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
