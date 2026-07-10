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
  const [filterProject, setFilterProject] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const allProjectNames = useMemo(() => ["All", ...new Set((proposals||[]).map(p=>p.projectName).filter(Boolean))], [proposals]);

  const filtered = useMemo(() => (proposals||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q) || p.service?.toLowerCase().includes(q))
      && (filterStatus==="All" || p.status===filterStatus)
      && (filterProject==="All" || p.projectName===filterProject);
  }), [proposals, search, filterStatus, filterProject]);

  const activeFilterCount = [search, filterStatus!=="All", filterProject!=="All"].filter(Boolean).length;
  const resetFilters = () => { setSearch(""); setFilterStatus("All"); setFilterProject("All"); };

  const statusCounts = useMemo(() => PROPOSAL_STATUSES.reduce((a,s)=>({...a,[s]:(proposals||[]).filter(p=>p.status===s).length}),{}), [proposals]);

  const stats = useMemo(() => {
    const all = proposals||[];
    const pipeline = all.filter(p=>!["Rejected"].includes(p.status)).reduce((s,p)=>s+Number(p.price||0),0);
    const accepted = all.filter(p=>p.status==="Accepted").reduce((s,p)=>s+Number(p.price||0),0);
    const sent = all.filter(p=>["Sent","Accepted","Rejected"].includes(p.status)).length;
    const winRate = sent ? Math.round((all.filter(p=>p.status==="Accepted").length/sent)*100) : 0;
    return { pipeline, accepted, winRate };
  }, [proposals]);

  const validityInfo = (p) => {
    if (!p.validityDate) return null;
    const days = Math.ceil((new Date(p.validityDate) - Date.now()) / 86400000);
    if (days < 0) return { label:`Expired ${Math.abs(days)}d ago`, color:"var(--danger)", bg:"var(--danger-dim)" };
    if (days === 0) return { label:"Expires today", color:"var(--warning)", bg:"var(--warning-dim)" };
    if (days <= 7) return { label:`Expires in ${days}d`, color:"var(--warning)", bg:"var(--warning-dim)" };
    return { label:`Valid ${days}d`, color:"var(--text-muted)", bg:"var(--surface-raised)" };
  };

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
        <Modal title="Proposal Preview" onClose={() => setViewing(null)} width={700}>
          <div style={{ maxHeight:"78vh", overflowY:"auto", paddingRight:8, lineHeight:1.7 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:"var(--text)", marginBottom:2 }}>{viewing.title}</div>
                <div style={{ fontSize:13, color:"var(--text-muted)" }}>
                  {viewing.proposalNumber && <span style={{ fontWeight:600, marginRight:10 }}>{viewing.proposalNumber}</span>}
                  {viewing.client} · {fmtDate(viewing.date)}
                  {viewing.validityDate && <span style={{ marginLeft:8 }}>· Valid until {fmtDate(viewing.validityDate)}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Badge label={viewing.status} />
                <button style={{ ...btnStyle("ghost","sm"), backgroundColor:"#F0F9FF", color:"#0369A1", border:"1px solid #BAE6FD" }} onClick={() => printProposal(viewing)}>🖨️ Print</button>
              </div>
            </div>

            {[
              { label:"Service", value:viewing.service },
              { label:"Project", value:viewing.projectName },
              { label:"Scope of Work", value:viewing.scope },
              { label:"Deliverables", value:viewing.deliverables },
              { label:"Timeline", value:viewing.timeline },
              { label:"Milestones", value:viewing.milestones },
              { label:"Price Breakdown", value:viewing.priceBreakdown },
              { label:"Assumptions", value:viewing.assumptions },
              { label:"Exclusions", value:viewing.exclusions },
              { label:"Terms & Conditions", value:viewing.terms },
            ].filter(row => row.value).map(({ label, value }) => (
              <div key={label} style={{ marginBottom:14 }}>
                <div style={{ fontWeight:600, fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:13, color:"var(--text)", padding:"8px 12px", background:"var(--surface-raised)", borderRadius:6, whiteSpace:"pre-wrap" }}>{value}</div>
              </div>
            ))}

            <div style={{ background:"var(--success-dim)", border:"1px solid var(--success)", borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <span style={{ fontWeight:700, fontSize:15, color:"var(--success)" }}>Total Investment</span>
              <span style={{ fontWeight:800, fontSize:22, color:"var(--success)" }}>₹{Number(viewing.price||0).toLocaleString("en-IN")}</span>
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

      {(proposals||[]).length > 0 && (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            {[
              { label:"Pipeline", value:`₹${stats.pipeline>=100000?(stats.pipeline/100000).toFixed(1)+"L":stats.pipeline.toLocaleString("en-IN")}`, color:"var(--accent)" },
              { label:"Accepted", value:`₹${stats.accepted>=100000?(stats.accepted/100000).toFixed(1)+"L":stats.accepted.toLocaleString("en-IN")}`, color:"var(--success)" },
              { label:"Win rate", value:`${stats.winRate}%`, color:stats.winRate>=50?"var(--success)":"var(--warning)" },
            ].map(({label,value,color})=>(
              <div key={label} style={{ padding:"8px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r-md)", minWidth:110 }}>
                <div style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:18, fontWeight:800, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8, marginBottom:16 }}>
            {PROPOSAL_STATUSES.map(s=>(
              <div key={s} onClick={()=>setFilterStatus(filterStatus===s?"All":s)}
                style={{ background:"var(--surface)", border:`1px solid ${filterStatus===s?"var(--accent)":"var(--border)"}`, borderRadius:"var(--r-md)", padding:"8px 10px", cursor:"pointer", userSelect:"none" }}>
                <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{s}</div>
                <div style={{ fontSize:18, fontWeight:800, color:s==="Accepted"?"var(--success)":s==="Rejected"?"var(--danger)":"var(--text)" }}>{statusCounts[s]||0}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search proposals…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROPOSAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        {allProjectNames.length > 1 && <select style={{ ...inputStyle, width:"auto" }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjectNames.map(p=><option key={p}>{p==="All"?"All projects":p}</option>)}</select>}
        {activeFilterCount > 0 && (
          <button style={btnStyle("ghost","sm")} onClick={resetFilters}>
            Reset <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:16, height:16, borderRadius:"50%", background:"var(--accent)", color:"#fff", fontSize:10, fontWeight:700, marginLeft:4 }}>{activeFilterCount}</span>
          </button>
        )}
      </div>
      {filtered.length===0 ? <EmptyState icon="📋" title="No proposals" sub="Start building your first proposal." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New proposal</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => {
            const vi = validityInfo(p);
            return (
            <div key={p.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontWeight:600, fontSize:14, color:"var(--text)", cursor:"pointer" }} onClick={() => setViewing(p)}>{p.title}</span>
                  {p.proposalNumber && <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:500 }}>{p.proposalNumber}</span>}
                  {vi && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:"var(--r-pill)", background:vi.bg, color:vi.color }}>{vi.label}</span>}
                </div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>{p.client}{p.service&&` · ${p.service}`}{p.projectName&&` · 📁 ${p.projectName}`} · {fmtDate(p.date)}</div>
                <div style={{ fontSize:13, color:"var(--success)", fontWeight:700 }}>₹{Number(p.price||0).toLocaleString("en-IN")}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center", justifyContent:"flex-end" }}>
                  <Badge label={p.status} />
                  <button data-testid="proposal-preview" style={btnStyle("soft","sm")} onClick={() => setViewing(p)}>Preview</button>
                  <button data-testid="proposal-print" style={{ ...btnStyle("ghost","sm"), backgroundColor:"#F0F9FF", color:"#0369A1", border:"1px solid #BAE6FD" }} onClick={() => printProposal(p)}>🖨️ Print</button>
                </div>
                {role !== "Viewer" && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {p.status!=="Accepted"&&<button data-testid="proposal-accept" style={{ ...btnStyle("ghost","sm"), color:"var(--success)" }} onClick={() => markStatus(p.id,"Accepted")}>✓ Accept</button>}
                    {p.status!=="Rejected"&&<button data-testid="proposal-reject" style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => markStatus(p.id,"Rejected")}>✗ Reject</button>}
                    {p.status==="Accepted"&&<>
                      <button data-testid="proposal-to-project" style={{ ...btnStyle("ghost","sm"), color:"var(--accent)" }} onClick={() => convertToProject(p)}>→ Project</button>
                      <button data-testid="proposal-to-invoice" style={btnStyle("ghost","sm")} onClick={() => createInvoiceFromProposal(p)}>→ Invoice</button>
                    </>}
                    <button data-testid="proposal-duplicate" style={btnStyle("ghost","sm")} onClick={() => duplicate(p)}>Duplicate</button>
                    <button data-testid="proposal-edit" style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button>
                    {(role==="Owner"||role==="Admin")&&<button data-testid="proposal-delete" style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(p.id)}>Delete</button>}
                  </div>
                )}
                {onLinkedSave && role !== "Viewer" && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${p.title}`,relatedTo:p.title,relatedType:"Proposal",contactId:p.contactId,body:"",tags:[]})}>📝 Note</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:p.clientName||p.client,relatedTo:p.title,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("followUp",{person:p.clientName||p.client,relatedTo:p.title,relatedType:"Proposal",type:"Call",dueDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),status:"Pending",notes:""})}>📞 Follow-up</button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
