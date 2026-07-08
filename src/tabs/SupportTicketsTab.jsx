import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════════


export default function SupportTicketsTab({ supportTickets, setSupportTickets, addAudit, role, contacts, projects, tasks, setTasks, projectLogs, setProjectLogs , workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (supportTickets||[]).filter(t => {
    const q = search.toLowerCase();
    return (!q || t.title?.toLowerCase().includes(q) || t.client?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      && (filterStatus==="All" || t.status===filterStatus)
      && (filterPriority==="All" || t.priority===filterPriority);
  }), [supportTickets, search, filterStatus, filterPriority]);

  const TicketForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ title:"", client:"", project:"", priority:"Medium", status:"Open", issueType:"Bug", description:"", resolutionNotes:"", dueDate:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Issue type"><select style={inputStyle} value={f.issueType} onChange={set("issueType")}>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate||""} onChange={set("dueDate")} /></FormField>
        </div>
        <FormField label="Description"><textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={f.description} onChange={set("description")} /></FormField>
        <FormField label="Resolution notes"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.resolutionNotes} onChange={set("resolutionNotes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save ticket</button></div>
      </div>
    );
  };

  const save = (f) => {
    const now = new Date().toISOString();
    if (editing) { const u=(supportTickets||[]).map(t=>t.id===editing.id?{...editing,...f,updatedAt:now}:t); setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Update",`Updated: ${f.title}`); toast("Ticket updated"); }
    else { const nt={...f,id:genId(),createdAt:now,updatedAt:now}; const u=[nt,...(supportTickets||[])]; setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Create",`Created: ${f.title}`); toast("Ticket created"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const t=(supportTickets||[]).find(x=>x.id===id); const u=(supportTickets||[]).filter(x=>x.id!==id); setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Delete",`Deleted: ${t?.title}`); toast("Deleted","info"); setConfirm(null); };
  const changeStatus = (id, status) => {
    const now = new Date().toISOString();
    const u=(supportTickets||[]).map(t=>t.id===id?{...t,status,updatedAt:now}:t);
    setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Status",`Ticket → ${status}`); toast(`Ticket ${status}`);
  };

  const createTask = t => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nt={id:genId(),title:`[Ticket] ${t.title}`,description:t.description||"",project:t.project,status:"Todo",priority:t.priority,dueDate:t.dueDate||"",checklist:[],tags:["support"],supportTicketId:t.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId); addAudit("Tasks","Create",`Task from ticket: ${t.title}`); toast("Task created");
  };

  const createLog = t => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nl={id:genId(),project:t.project,title:`[Ticket] ${t.title}`,type:"Client Feedback",description:t.description||"",result:"",date:new Date().toISOString().slice(0,10),status:"Info",relatedSupportTicketId:t.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nl,...(projectLogs||[])]; setProjectLogs(u); saveWorkspaceData("projectLogs", u, workspaceId); addAudit("Project Logs","Create",`Log from ticket: ${t.title}`); toast("Project log created");
  };

  const openCount    = (supportTickets||[]).filter(t=>t.status==="Open").length;
  const urgentCount  = (supportTickets||[]).filter(t=>t.priority==="Urgent"&&t.status==="Open").length;
  const inProgCount  = (supportTickets||[]).filter(t=>t.status==="In Progress").length;
  
  const handleExport = () => { exportToCSV("support-tickets", filtered); toast("Support tickets exported to CSV"); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this ticket?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit ticket":"New ticket"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><TicketForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:"var(--text)" }}>Support Tickets</h2>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--text-muted)" }}>{openCount} open · {urgentCount>0?<span style={{color:"var(--danger)"}}>{urgentCount} urgent · </span>:""}{(supportTickets||[]).length} total</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>}
        </div>
      </div>
      {urgentCount>0&&<div style={{background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--r-md)",padding:"8px 14px",marginBottom:12,fontSize:12,color:"var(--danger)",fontWeight:600}}>⚠️ {urgentCount} urgent open ticket{urgentCount!==1?"s":""} — action needed</div>}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="🎫" title="No tickets" sub="Support tickets will appear here." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ background:"var(--surface)", border:`1px solid ${t.priority==="Urgent"&&t.status==="Open"?"rgba(239,68,68,0.3)":"var(--border)"}`, borderRadius:"var(--r-lg)", padding:"13px 15px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", marginBottom:3 }}>{t.title}</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>{t.client}{t.project && ` · ${t.project}`} · {t.issueType} · {fmtDate(t.createdAt)}{t.dueDate&&` · Due: ${fmtDate(t.dueDate)}`}</div>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}><Badge label={t.priority} size="sm" /><Badge label={t.status} size="sm" /></div>
              </div>
              {t.description && <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 6px", lineHeight:1.5 }}>{t.description}</p>}
              {t.resolutionNotes && <div style={{ fontSize:11, color:"var(--success)", background:"var(--success-dim)", padding:"5px 9px", borderRadius:"var(--r-sm)", marginBottom:6 }}>✅ {t.resolutionNotes}</div>}
              {role !== "Viewer" && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {t.status==="Open"&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={() => changeStatus(t.id,"In Progress")}>Start</button>}
                  {t.status!=="Fixed"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)"}} onClick={() => changeStatus(t.id,"Fixed")}>Mark Fixed</button>}
                  {t.status!=="Waiting Client"&&<button style={btnStyle("ghost","sm")} onClick={() => changeStatus(t.id,"Waiting Client")}>Waiting Client</button>}
                  {t.status!=="Closed"&&<button style={{...btnStyle("ghost","sm"),color:"var(--text-muted)"}} onClick={() => changeStatus(t.id,"Closed")}>Close</button>}
                  <button style={btnStyle("ghost","sm")} onClick={() => createTask(t)}>+ Task</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => createLog(t)}>+ Log</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>
                  {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={() => setConfirm(t.id)}>Del</button>}
                  {onLinkedSave && role !== "Viewer" && <>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${t.title}`,relatedTo:t.title,relatedType:"Support",body:"",tags:[]})}>📝 Note</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:t.clientName||t.client||"",relatedTo:t.title,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("calendarEvent",{title:`Follow-up: ${t.title}`,type:"Meeting",date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),time:"",notes:t.title})}>📅 Event</button>
                  </>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
