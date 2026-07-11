import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════════


const DUE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "+3d", days: 3 },
  { label: "+7d", days: 7 },
];

function TicketForm({ initial={}, onSave, onClose, projects=[], clientOptions=[] }) {
  const blank = { title:"", client:"", project:"", priority:"Medium", status:"Open", issueType:"Bug", description:"", resolutionNotes:"", dueDate:"", createdAt: new Date().toISOString().slice(0,10) };
  const [f, setF] = useState({ ...blank, ...initial });
  const [saving, setSaving] = useState(false);
  const isNew = !initial.id;
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const setDuePreset = days => setF(p => ({ ...p, dueDate: new Date(Date.now() + days*86400000).toISOString().slice(0,10) }));

  const validate = () => {
    if (!f.title.trim()) { toast("Title is required", "error"); return false; }
    if (!f.client.trim()) { toast("Client is required", "error"); return false; }
    if (f.status==="Fixed" && !f.resolutionNotes.trim()) { toast("Add resolution notes before marking this Fixed", "error"); return false; }
    return true;
  };

  const handleSave = (andNew=false) => {
    if (saving || !validate()) return;
    setSaving(true);
    onSave({ ...f, title: f.title.trim(), client: f.client.trim() }, { keepOpen: andNew });
    if (andNew) {
      // Keep client/project/priority so entering several tickets for the same
      // client/incident in a row doesn't mean re-typing them each time.
      setF({ ...blank, client: f.client.trim(), project: f.project, priority: f.priority, createdAt: new Date().toISOString().slice(0,10) });
      setSaving(false);
    }
  };

  const onKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSave(false); }
  };

  return (
    <div onKeyDown={onKeyDown}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} autoFocus /></FormField>
        <FormField label="Client">
          <input style={inputStyle} value={f.client} onChange={set("client")} list="ticket-client-options" placeholder="Start typing to reuse an existing client…" />
          <datalist id="ticket-client-options">{clientOptions.map(c => <option key={c} value={c} />)}</datalist>
        </FormField>
        <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        <FormField label="Issue type"><select style={inputStyle} value={f.issueType} onChange={set("issueType")}>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Due date">
          <input style={inputStyle} type="date" value={f.dueDate||""} onChange={set("dueDate")} />
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            {DUE_PRESETS.map(p => <button key={p.label} type="button" onClick={() => setDuePreset(p.days)} style={{ fontSize:11, padding:"2px 9px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer" }}>{p.label}</button>)}
            {f.dueDate && <button type="button" onClick={() => setF(p=>({...p,dueDate:""}))} style={{ fontSize:11, padding:"2px 9px", borderRadius:6, border:"1px solid var(--border)", background:"transparent", color:"var(--text-muted)", cursor:"pointer" }}>Clear</button>}
          </div>
        </FormField>
      </div>
      <FormField label="Description"><textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={f.description} onChange={set("description")} /></FormField>
      <FormField label="Resolution notes"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.resolutionNotes} onChange={set("resolutionNotes")} placeholder={f.status==="Fixed" ? "Required when status is Fixed" : ""} /></FormField>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center" }}>
        <span style={{ fontSize:11, color:"var(--text-muted)", marginRight:"auto" }}>Tip: {navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save</span>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        {isNew && <button style={btnStyle("ghost")} disabled={saving} onClick={() => handleSave(true)}>Save &amp; add another</button>}
        <button style={btnStyle("primary")} disabled={saving} onClick={() => handleSave(false)}>Save ticket</button>
      </div>
    </div>
  );
}

export default function SupportTicketsTab({ supportTickets, setSupportTickets, addAudit, role, contacts, projects, tasks, setTasks, projectLogs, setProjectLogs , workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [filterIssueType, setFilterIssueType] = useState("All");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const viewing = useMemo(() => viewingId ? (supportTickets||[]).find(t => t.id === viewingId) || null : null, [viewingId, supportTickets]);
  const [selected, setSelected] = useState(new Set());

  const priorityRank = p => TICKET_PRIORITIES.indexOf(p);
  const stillActive = t => t.status!=="Fixed" && t.status!=="Closed";

  // Ticket projects can drift from the live `projects` list (renamed/deleted projects,
  // or tickets logged before a project existed), so derive filter options from the data itself.
  const projectOptions = useMemo(() => {
    const set = new Set((supportTickets||[]).map(t => t.project).filter(Boolean));
    return Array.from(set).sort();
  }, [supportTickets]);

  // Client autocomplete pulls from both saved contacts and prior tickets, so typing
  // a name that's already in the system reuses it instead of forking into a near-duplicate.
  const clientOptions = useMemo(() => {
    const set = new Set([
      ...(contacts||[]).map(c => c.name).filter(Boolean),
      ...(supportTickets||[]).map(t => t.client).filter(Boolean),
    ]);
    return Array.from(set).sort();
  }, [contacts, supportTickets]);

  const filtered = useMemo(() => {
    const list = (supportTickets||[]).filter(t => {
      const q = search.toLowerCase();
      return (!q || t.title?.toLowerCase().includes(q) || t.client?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
        && (filterStatus==="All" || t.status===filterStatus)
        && (filterPriority==="All" || t.priority===filterPriority)
        && (filterProject==="All" || t.project===filterProject)
        && (filterIssueType==="All" || t.issueType===filterIssueType)
        && (!overdueOnly || (t.dueDate && isOverdue(t.dueDate) && stillActive(t)));
    });
    if (sortBy === "oldest")        list.sort((a,b) => (a.createdAt||"") > (b.createdAt||"") ? 1 : -1);
    else if (sortBy === "priority") list.sort((a,b) => priorityRank(b.priority) - priorityRank(a.priority));
    else if (sortBy === "due")      list.sort((a,b) => (a.dueDate||"9999") > (b.dueDate||"9999") ? 1 : -1);
    else /* newest */               list.sort((a,b) => (b.createdAt||"") > (a.createdAt||"") ? 1 : -1);
    return list;
  }, [supportTickets, search, filterStatus, filterPriority, filterProject, filterIssueType, overdueOnly, sortBy]);

  const viewingIdx = viewing ? filtered.findIndex(t => t.id === viewing.id) : -1;

  // Selection is tied to whatever's currently filtered in — clear it when the
  // visible set changes shape so bulk actions never silently touch hidden rows.
  useEffect(() => { clearSelection(); }, [search, filterStatus, filterPriority, filterProject, filterIssueType, overdueOnly]);
  const clearSelection = () => setSelected(new Set());
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () => setSelected(new Set(filtered.map(t => t.id)));


  const save = useCallback((f, { keepOpen=false } = {}) => {
    const now = new Date().toISOString();
    const isDupe = (supportTickets||[]).some(t => t.id !== editing?.id && t.title.toLowerCase() === f.title.toLowerCase() && t.client.toLowerCase() === f.client.toLowerCase());
    if (editing) {
      const u=(supportTickets||[]).map(t=>t.id===editing.id?{...editing,...f,updatedAt:now}:t); setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Update",`Updated: ${f.title}`);
      toast(isDupe ? `Ticket updated (another "${f.title}" exists for ${f.client})` : "Ticket updated");
    }
    else { const nt={...f,id:genId(),createdAt:now,updatedAt:now}; const u=[nt,...(supportTickets||[])]; setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Create",`Created: ${f.title}`);
      toast(isDupe ? `Ticket created (another "${f.title}" already exists for ${f.client})` : "Ticket created"); }
    if (!keepOpen) { setShowForm(false); setEditing(null); }
  }, [editing, supportTickets, workspaceId, addAudit]);
  const del = useCallback((id) => { const t=(supportTickets||[]).find(x=>x.id===id); const u=(supportTickets||[]).filter(x=>x.id!==id); setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Delete",`Deleted: ${t?.title}`); toast("Deleted","info"); setConfirm(null); }, [supportTickets, workspaceId, addAudit]);
  const changeStatus = useCallback((id, status) => {
    const now = new Date().toISOString();
    const u=(supportTickets||[]).map(t=>t.id===id?{...t,status,updatedAt:now}:t);
    setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Status",`Ticket → ${status}`); toast(`Ticket ${status}`);
  }, [supportTickets, workspaceId, addAudit]);

  const bulkChangeStatus = useCallback((status) => {
    const now = new Date().toISOString();
    const n = selected.size;
    const u=(supportTickets||[]).map(t=>selected.has(t.id)?{...t,status,updatedAt:now}:t);
    setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Bulk Status",`${n} ticket${n>1?"s":""} → ${status}`);
    toast(`${n} ticket${n>1?"s":""} moved to ${status}`); clearSelection();
  }, [supportTickets, selected, workspaceId, addAudit]);

  const bulkDelete = useCallback(() => {
    const n = selected.size;
    const u = (supportTickets||[]).filter(t => !selected.has(t.id));
    setSupportTickets(u); saveWorkspaceData("supportTickets", u, workspaceId); addAudit("Support","Bulk Delete",`Deleted ${n} ticket${n>1?"s":""}`);
    toast(`${n} ticket${n>1?"s":""} deleted`, "info"); clearSelection(); setBulkConfirm(false);
  }, [supportTickets, selected, workspaceId, addAudit]);

  const createTask = useCallback(t => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nt={id:genId(),title:`[Ticket] ${t.title}`,description:t.description||"",project:t.project,status:"Todo",priority:t.priority,dueDate:t.dueDate||"",checklist:[],tags:["support"],supportTicketId:t.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId); addAudit("Tasks","Create",`Task from ticket: ${t.title}`); toast("Task created");
  }, [role, tasks, workspaceId, addAudit]);

  const createLog = useCallback(t => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nl={id:genId(),project:t.project,title:`[Ticket] ${t.title}`,type:"Client Feedback",description:t.description||"",result:"",date:new Date().toISOString().slice(0,10),status:"Info",relatedSupportTicketId:t.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nl,...(projectLogs||[])]; setProjectLogs(u); saveWorkspaceData("projectLogs", u, workspaceId); addAudit("Project Logs","Create",`Log from ticket: ${t.title}`); toast("Project log created");
  }, [role, projectLogs, workspaceId, addAudit]);

  const { openCount, urgentCount, inProgCount, overdueCount, avgResolutionDays } = useMemo(() => {
    const resolved = (supportTickets||[]).filter(t => (t.status==="Fixed"||t.status==="Closed") && t.createdAt && t.updatedAt);
    const avgMs = resolved.length ? resolved.reduce((sum,t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0) / resolved.length : null;
    return {
      openCount:    (supportTickets||[]).filter(t=>t.status==="Open").length,
      urgentCount:  (supportTickets||[]).filter(t=>t.priority==="Urgent"&&stillActive(t)).length,
      inProgCount:  (supportTickets||[]).filter(t=>t.status==="In Progress").length,
      overdueCount: (supportTickets||[]).filter(t=>t.dueDate&&isOverdue(t.dueDate)&&stillActive(t)).length,
      avgResolutionDays: avgMs !== null ? (avgMs / 86400000).toFixed(1) : null,
    };
  }, [supportTickets]);

  const handleExport = useCallback(() => {
    const rows = selected.size > 0 ? filtered.filter(t => selected.has(t.id)) : filtered;
    exportToCSV("support-tickets", rows);
    toast(selected.size > 0 ? `${rows.length} selected ticket${rows.length>1?"s":""} exported to CSV` : "Support tickets exported to CSV");
  }, [filtered, selected]);

  return (
    <div>
      {confirm && <Confirm msg={`Delete "${confirm.title}"? This cannot be undone.`} onYes={() => del(confirm.id)} onNo={() => setConfirm(null)} />}
      {bulkConfirm && <Confirm msg={`Delete ${selected.size} selected ticket${selected.size>1?"s":""}? This cannot be undone.`} onYes={bulkDelete} onNo={() => setBulkConfirm(false)} />}
      {(showForm||editing) && <Modal title={editing?"Edit ticket":"New ticket"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><TicketForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} projects={projects||[]} clientOptions={clientOptions} /></Modal>}
      {viewing && (
        <Modal title="Ticket details" onClose={() => setViewingId(null)} width={560}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <button style={btnStyle("ghost","sm")} disabled={viewingIdx <= 0} onClick={() => setViewingId(filtered[viewingIdx-1]?.id)} title="Previous ticket">← Prev</button>
            <span style={{ fontSize:11, color:"var(--text-muted)" }}>{viewingIdx >= 0 ? `${viewingIdx+1} of ${filtered.length}` : ""}</span>
            <button style={btnStyle("ghost","sm")} disabled={viewingIdx < 0 || viewingIdx >= filtered.length-1} onClick={() => setViewingId(filtered[viewingIdx+1]?.id)} title="Next ticket">Next →</button>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>{viewing.title}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{viewing.client}{viewing.project && ` · ${viewing.project}`}</div>
            </div>
            <div style={{ display:"flex", gap:5, flexShrink:0 }}><Badge label={viewing.priority} size="sm" /><Badge label={viewing.status} size="sm" /></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", fontSize:12, marginBottom:16, padding:"10px 12px", background:"var(--surface-2,#f5f5f5)", borderRadius:"var(--r-md)" }}>
            <div><span style={{ color:"var(--text-muted)" }}>Issue type: </span><strong>{viewing.issueType}</strong></div>
            <div><span style={{ color:"var(--text-muted)" }}>Created: </span><strong>{fmtDate(viewing.createdAt)}</strong></div>
            <div>
              <span style={{ color:"var(--text-muted)" }}>Due: </span>
              <strong style={viewing.dueDate&&isOverdue(viewing.dueDate)&&stillActive(viewing)?{color:"var(--danger)"}:{}}>{viewing.dueDate ? fmtDate(viewing.dueDate) : "—"}{viewing.dueDate&&isOverdue(viewing.dueDate)&&stillActive(viewing)&&" ⚠️ overdue"}</strong>
            </div>
            <div><span style={{ color:"var(--text-muted)" }}>Last updated: </span><strong>{viewing.updatedAt ? fmtDate(viewing.updatedAt) : "—"}</strong></div>
          </div>
          {viewing.description && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:0.4 }}>Description</div>
              <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{viewing.description}</div>
            </div>
          )}
          {viewing.resolutionNotes && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:4, textTransform:"uppercase", letterSpacing:0.4 }}>Resolution notes</div>
              <div style={{ fontSize:13, color:"var(--success)", background:"var(--success-dim)", padding:"8px 11px", borderRadius:"var(--r-sm)", lineHeight:1.5, whiteSpace:"pre-wrap" }}>✅ {viewing.resolutionNotes}</div>
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
            {role !== "Viewer" ? (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {viewing.status==="Open"&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={() => changeStatus(viewing.id,"In Progress")}>Start</button>}
                {viewing.status!=="Fixed"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)"}} onClick={() => changeStatus(viewing.id,"Fixed")}>Mark Fixed</button>}
                {(viewing.status==="Fixed"||viewing.status==="Closed")&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={() => changeStatus(viewing.id,"Open")}>Reopen</button>}
              </div>
            ) : <span />}
            <div style={{ display:"flex", gap:10 }}>
              <button style={btnStyle("ghost")} onClick={() => setViewingId(null)}>Close</button>
              {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => { setEditing(viewing); setViewingId(null); }}>Edit ticket</button>}
            </div>
          </div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:"var(--text)" }}>Support Tickets</h2>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--text-muted)" }}>
            {openCount} open · {inProgCount} in progress
            {urgentCount>0&&<> · <span style={{color:"var(--danger)",cursor:"pointer",textDecoration:"underline"}} onClick={() => setFilterPriority("Urgent")}>{urgentCount} urgent</span></>}
            {overdueCount>0&&<> · <span style={{color:"var(--danger)",cursor:"pointer",textDecoration:"underline"}} onClick={() => setOverdueOnly(true)}>{overdueCount} overdue</span></>}
            {" · "}{(supportTickets||[]).length} total
            {avgResolutionDays!==null&&<> · avg resolution {avgResolutionDays}d</>}
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>}
        </div>
      </div>
      {urgentCount>0&&<div style={{background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--r-md)",padding:"8px 14px",marginBottom:12,fontSize:12,color:"var(--danger)",fontWeight:600,cursor:"pointer"}} onClick={() => setFilterPriority("Urgent")}>⚠️ {urgentCount} urgent ticket{urgentCount!==1?"s":""} still open — action needed</div>}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterIssueType} onChange={e=>setFilterIssueType(e.target.value)}><option value="All">All issue types</option>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        {projectOptions.length > 0 && (
          <select style={{ ...inputStyle, width:"auto" }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="All">All projects</option>{projectOptions.map(p=><option key={p}>{p}</option>)}</select>
        )}
        <button
          onClick={() => setOverdueOnly(o => !o)}
          style={{ fontSize:12, padding:"6px 12px", borderRadius:"var(--r-md)", border: overdueOnly ? "1px solid var(--danger)" : "1px solid var(--border)", background: overdueOnly ? "var(--danger-dim)" : "transparent", color: overdueOnly ? "var(--danger)" : "var(--text-muted)", fontWeight: overdueOnly ? 600 : 400, cursor:"pointer" }}
        >
          ⚠️ Overdue only
        </button>
        <select style={{ ...inputStyle, width:"auto", fontSize:12 }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">Priority (highest first)</option>
          <option value="due">Due date (soonest first)</option>
        </select>
        <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:"auto" }}>{filtered.length} of {(supportTickets||[]).length}</span>
      </div>
      {role !== "Viewer" && filtered.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--text-muted)", cursor:"pointer" }}>
            <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={e => e.target.checked ? selectAllFiltered() : clearSelection()} />
            Select all ({filtered.length})
          </label>
          {selected.size > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", padding:"4px 10px", borderRadius:8, background:"var(--surface-2,#f5f5f5)" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{selected.size} selected</span>
              <button style={btnStyle("ghost","sm")} onClick={() => bulkChangeStatus("In Progress")}>Start</button>
              <button style={btnStyle("ghost","sm")} onClick={() => bulkChangeStatus("Fixed")}>Mark Fixed</button>
              <button style={btnStyle("ghost","sm")} onClick={() => bulkChangeStatus("Closed")}>Close</button>
              {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setBulkConfirm(true)}>Delete</button>}
              <button style={btnStyle("ghost","sm")} onClick={clearSelection}>Clear</button>
            </div>
          )}
        </div>
      )}
      {filtered.length===0 ? (
        (supportTickets||[]).length > 0 ? (
          <EmptyState icon="🔍" title="No matching tickets" sub="Try a different search term or filter." action={<button style={btnStyle("ghost")} onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPriority("All"); setFilterProject("All"); setFilterIssueType("All"); setOverdueOnly(false); }}>Clear filters</button>} />
        ) : (
          <EmptyState icon="🎫" title="No tickets" sub="Support tickets will appear here." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>} />
        )
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(t => {
            const ageDays = t.createdAt ? Math.floor((Date.now() - new Date(t.createdAt)) / 86400000) : null;
            return (
            <div key={t.id} style={{ background:"var(--surface)", border:`1px solid ${t.priority==="Urgent"&&t.status==="Open"?"rgba(239,68,68,0.3)":t.dueDate&&isOverdue(t.dueDate)&&t.status!=="Fixed"&&t.status!=="Closed"?"rgba(234,179,8,0.3)":"var(--border)"}`, borderRadius:"var(--r-lg)", padding:"13px 15px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                  {role !== "Viewer" && <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} style={{ marginTop:4, cursor:"pointer", flexShrink:0 }} />}
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", marginBottom:3 }}>{t.title}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>{t.client}{t.project && ` · ${t.project}`} · {t.issueType} · {fmtDate(t.createdAt)}{t.dueDate&&<> · Due: <span style={t.dueDate&&isOverdue(t.dueDate)&&t.status!=="Fixed"&&t.status!=="Closed"?{color:"var(--danger)",fontWeight:600}:{}}>{fmtDate(t.dueDate)}{t.dueDate&&isOverdue(t.dueDate)&&t.status!=="Fixed"&&t.status!=="Closed"&&" ⚠️"}</span></>}{stillActive(t)&&ageDays!==null&&ageDays>=3&&<> · <span style={{color: ageDays>=7 ? "var(--danger)" : "var(--warning)"}}>open {ageDays}d</span></>}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}><Badge label={t.priority} size="sm" /><Badge label={t.status} size="sm" /></div>
              </div>
              {t.description && <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 6px", lineHeight:1.5 }}>{t.description}</p>}
              {t.resolutionNotes && <div style={{ fontSize:11, color:"var(--success)", background:"var(--success-dim)", padding:"5px 9px", borderRadius:"var(--r-sm)", marginBottom:6 }}>✅ {t.resolutionNotes}</div>}
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <button style={btnStyle("soft","sm")} onClick={() => setViewingId(t.id)}>👁 View</button>
                {role !== "Viewer" && <>
                  {t.status==="Open"&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={() => changeStatus(t.id,"In Progress")}>Start</button>}
                  {t.status!=="Fixed"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)"}} onClick={() => changeStatus(t.id,"Fixed")}>Mark Fixed</button>}
                  {t.status!=="Waiting Client"&&<button style={btnStyle("ghost","sm")} onClick={() => changeStatus(t.id,"Waiting Client")}>Waiting Client</button>}
                  {t.status!=="Closed"&&<button style={{...btnStyle("ghost","sm"),color:"var(--text-muted)"}} onClick={() => changeStatus(t.id,"Closed")}>Close</button>}
                  {(t.status==="Fixed"||t.status==="Closed")&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={() => changeStatus(t.id,"Open")}>Reopen</button>}
                  <button style={btnStyle("ghost","sm")} onClick={() => createTask(t)}>+ Task</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => createLog(t)}>+ Log</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>
                  {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={() => setConfirm({id:t.id,title:t.title})}>Delete</button>}
                  {onLinkedSave && <>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${t.title}`,relatedTo:t.title,relatedType:"Support",body:"",tags:[]})}>📝 Note</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:t.clientName||t.client||"",relatedTo:t.title,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("calendarEvent",{title:`Follow-up: ${t.title}`,type:"Meeting",date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),time:"",notes:t.title})}>📅 Event</button>
                  </>}
                </>}
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );

}
