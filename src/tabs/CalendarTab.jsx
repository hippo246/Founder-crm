import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { CAL_TYPES, CAL_TYPE_ICONS } from "../config/crmConfig.js";

function CalForm({ initial={}, onSave, onClose, projects=[], tasks=[], followUps=[], invoices=[], proposals=[] }) {
  const [f, setF] = useState({
    title:"", type:"Meeting", date:new Date().toISOString().slice(0,10), time:"",
    relatedClient:"", relatedProject:"", notes:"",
    linkedTaskId:"", linkedFollowUpId:"", linkedInvoiceId:"", linkedProposalId:"",
    createdAt:new Date().toISOString().slice(0,10), ...initial
  });
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{CAL_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
        <FormField label="Time"><input style={inputStyle} type="time" value={f.time} onChange={set("time")} /></FormField>
        <FormField label="Client"><input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} /></FormField>
        <FormField label="Project"><select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Linked task (optional)"><select style={inputStyle} value={f.linkedTaskId} onChange={set("linkedTaskId")}><option value="">— None —</option>{tasks.filter(t=>!["Done","Cancelled"].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></FormField>
        <FormField label="Linked follow-up"><select style={inputStyle} value={f.linkedFollowUpId} onChange={set("linkedFollowUpId")}><option value="">— None —</option>{followUps.filter(f=>f.status==="Pending").map(fu=><option key={fu.id} value={fu.id}>{fu.person} — {fu.type}</option>)}</select></FormField>
        <FormField label="Linked invoice"><select style={inputStyle} value={f.linkedInvoiceId} onChange={set("linkedInvoiceId")}><option value="">— None —</option>{invoices.filter(i=>!["Paid","Cancelled"].includes(i.status)).map(inv=><option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.client}</option>)}</select></FormField>
        <FormField label="Linked proposal"><select style={inputStyle} value={f.linkedProposalId} onChange={set("linkedProposalId")}><option value="">— None —</option>{proposals.filter(p=>["Sent","Viewed"].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></FormField>
      </div>
      <FormField label="Notes"><textarea style={{...inputStyle,minHeight:56,resize:"vertical"}} value={f.notes} onChange={set("notes")} /></FormField>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={()=>{if(!f.title.trim()){toast("Title required","error");return;}onSave(f);}}>Save event</button>
      </div>
    </div>
  );
}

export default function CalendarTab({ calendarEvents, setCalendarEvents, addAudit, role, contacts, projects, tasks, followUps, invoices, proposals , workspaceId = "workspace-1" , onLinkedSave}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const today = new Date().toISOString().slice(0,10);

  const sorted  = useMemo(()=>[...(calendarEvents||[])].sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)),[calendarEvents]);
  const allProjects = useMemo(()=>["All",...new Set(sorted.map(e=>e.relatedProject).filter(Boolean))],[sorted]);

  const filtered = useMemo(()=>sorted.filter(e=>{
    const q=search.toLowerCase();
    return (!q||e.title?.toLowerCase().includes(q)||e.relatedClient?.toLowerCase().includes(q)||e.relatedProject?.toLowerCase().includes(q))
      &&(filterType==="All"||e.type===filterType)
      &&(filterProject==="All"||e.relatedProject===filterProject);
  }),[sorted,search,filterType,filterProject]);

  const todayEvents    = filtered.filter(e=>e.date===today);
  const upcomingEvents = filtered.filter(e=>e.date>today);
  const pastEvents     = filtered.filter(e=>e.date<today);
  const overdueEvents  = filtered.filter(e=>isOverdue(e.date)&&["Deadline","Payment"].includes(e.type));

  const save = f => {
    if(editing){ const u=(calendarEvents||[]).map(e=>e.id===editing.id?{...editing,...f}:e); setCalendarEvents(u); saveWorkspaceData("calendarEvents", u, workspaceId); addAudit("Calendar","Update",`Updated: ${f.title}`); toast("Event updated"); }
    else { const ne={...f,id:genId()}; const u=[ne,...(calendarEvents||[])]; setCalendarEvents(u); saveWorkspaceData("calendarEvents", u, workspaceId); addAudit("Calendar","Create",`Added: ${f.title}`); toast("Event added"); }
    setShowForm(false); setEditing(null);
  };
  const del = id => { const e=(calendarEvents||[]).find(x=>x.id===id); const u=(calendarEvents||[]).filter(x=>x.id!==id); setCalendarEvents(u); saveWorkspaceData("calendarEvents", u, workspaceId); addAudit("Calendar","Delete",`Deleted: ${e?.title}`); toast("Deleted","info"); setConfirm(null); };
  
  const handleExport = () => { exportToCSV("calendarEvents", filtered); toast("Calendar events exported to CSV"); };

  const getLinkedContext = e => {
    const parts = [];
    if(e.linkedTaskId)    { const t=(tasks||[]).find(x=>x.id===e.linkedTaskId);    if(t) parts.push(`✅ ${t.title}`); }
    if(e.linkedFollowUpId){ const f=(followUps||[]).find(x=>x.id===e.linkedFollowUpId); if(f) parts.push(`📞 ${f.person}`); }
    if(e.linkedInvoiceId) { const i=(invoices||[]).find(x=>x.id===e.linkedInvoiceId); if(i) parts.push(`🧾 ${i.invoiceNumber}`); }
    if(e.linkedProposalId){ const p=(proposals||[]).find(x=>x.id===e.linkedProposalId); if(p) parts.push(`📋 ${p.title}`); }
    return parts;
  };

  const EventRow = ({ e }) => {
    const overdue = isOverdue(e.date) && ["Deadline","Payment"].includes(e.type);
    const linked  = getLinkedContext(e);
    return (
      <div style={{display:"flex",gap:12,alignItems:"flex-start",padding:"11px 0",borderBottom:"1px solid var(--border)"}}>
        <div style={{width:36,height:36,borderRadius:"var(--r-md)",background:overdue?"var(--danger-dim)":"var(--surface-raised)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{CAL_TYPE_ICONS[e.type]||"📅"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:13,color:overdue?"var(--danger)":"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}{overdue&&" ⏰"}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,display:"flex",flexWrap:"wrap",gap:6}}>
            <span>{fmtDate(e.date)}{e.time&&` · ${e.time}`}</span>
            {e.relatedClient&&<span>· {e.relatedClient}</span>}
            {e.relatedProject&&<span>· 📁 {e.relatedProject}</span>}
          </div>
          {linked.length>0&&<div style={{fontSize:10,color:"var(--accent)",marginTop:3,display:"flex",flexWrap:"wrap",gap:8}}>{linked.map((l,i)=><span key={i}>{l}</span>)}</div>}
          {e.notes&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{e.notes}</div>}
        </div>
        <div style={{display:"flex",gap:5,flexShrink:0}}>
          <Badge label={e.type} size="sm" />
          {role!=="Viewer"&&<><button style={btnStyle("ghost","sm")} onClick={()=>setEditing(e)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>setConfirm(e.id)}>Del</button>}
          {onLinkedSave && <>
            <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("followUp",{person:e.relatedClient||"",relatedTo:e.title,relatedType:"Calendar",type:e.type||"Call",dueDate:e.date||new Date().toISOString().slice(0,10),status:"Pending",notes:e.notes||""})}>📞 Follow-Up</button>
            <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("task",{title:e.title,project:e.relatedProject||"",status:"Todo",priority:"Medium",dueDate:e.date||""})}>✅ Task</button>
            <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${e.title}`,relatedTo:e.title,relatedType:"Calendar",body:e.notes||"",tags:[]})}>📝 Note</button>
          </>}
          </>}
        </div>
      </div>
    );
  };

  return (
    <div>
      {confirm&&<Confirm msg="Delete this event?" onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit event":"Add event"} onClose={()=>{setShowForm(false);setEditing(null);}} width={580}><CalForm initial={editing||{}} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}} projects={projects||[]} tasks={tasks||[]} followUps={followUps||[]} invoices={invoices||[]} proposals={proposals||[]} /></Modal>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)"}}>Calendar</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>{todayEvents.length} today · {upcomingEvents.length} upcoming · {(calendarEvents||[]).length} total</p>
        </div>
        {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add event</button>}
      </div>

      {overdueEvents.length>0&&<div style={{background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--r-md)",padding:"8px 14px",marginBottom:12,fontSize:12,color:"var(--danger)"}}>⏰ {overdueEvents.length} overdue deadline{overdueEvents.length!==1?"s":""}: {overdueEvents.map(e=>e.title).join(", ")}</div>}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search events…" />
        <select style={{...inputStyle,width:"auto"}} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="All">All types</option>{CAL_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}</select>
      </div>

      {filtered.length===0?<EmptyState icon="📅" title="No events" sub="Add meetings, deadlines, payments, and reminders." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add event</button>}/>:(
        <div>
          {todayEvents.length>0&&(
            <SectionCard style={{marginBottom:14,background:"rgba(59,130,246,0.06)",borderColor:"rgba(59,130,246,0.2)"}}>
              <div style={{fontWeight:700,fontSize:12,color:"var(--accent)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.6px"}}>📅 Today — {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}</div>
              {todayEvents.map(e=><EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
          {upcomingEvents.length>0&&(
            <SectionCard style={{marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:12,color:"var(--text)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.6px"}}>Upcoming ({upcomingEvents.length})</div>
              {upcomingEvents.slice(0,15).map(e=><EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
          {pastEvents.length>0&&(
            <SectionCard style={{opacity:.7}}>
              <div style={{fontWeight:700,fontSize:12,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.6px"}}>Past ({pastEvents.length})</div>
              {[...pastEvents].reverse().slice(0,8).map(e=><EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
