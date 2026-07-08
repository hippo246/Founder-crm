import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { LOG_TYPES, LOG_STATUSES, LOG_STATUS_COLORS, LOG_STATUS_BG } from "../config/crmConfig.js";

function LogForm({ initial={}, onSave, onClose, projects=[], tasks=[], prompts=[], roadmapItems=[], supportTickets=[] }) {
  const [f, setF] = useState({
    project:"", title:"", type:"Build", description:"", result:"",
    date:new Date().toISOString().slice(0,10), status:"Success",
    relatedPromptId:"", relatedTaskId:"", relatedRoadmapItemId:"", relatedSupportTicketId:"",
    impact:"", nextAction:"",
    createdAt:new Date().toISOString().slice(0,10),
    ...initial
  });
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
        <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{LOG_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{LOG_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
        <FormField label="Impact"><input style={inputStyle} value={f.impact} onChange={set("impact")} placeholder="Low / Medium / High" /></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Linked prompt"><select style={inputStyle} value={f.relatedPromptId} onChange={set("relatedPromptId")}><option value="">— None —</option>{prompts.map(p=><option key={p.id} value={p.id}>#{p.promptNumber} {p.title}</option>)}</select></FormField>
        <FormField label="Linked task"><select style={inputStyle} value={f.relatedTaskId} onChange={set("relatedTaskId")}><option value="">— None —</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></FormField>
        <FormField label="Linked roadmap"><select style={inputStyle} value={f.relatedRoadmapItemId} onChange={set("relatedRoadmapItemId")}><option value="">— None —</option>{roadmapItems.map(r=><option key={r.id} value={r.id}>{r.item}</option>)}</select></FormField>
        <FormField label="Linked ticket"><select style={inputStyle} value={f.relatedSupportTicketId} onChange={set("relatedSupportTicketId")}><option value="">— None —</option>{supportTickets.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></FormField>
      </div>
      <FormField label="Description"><textarea style={{...inputStyle,minHeight:72,resize:"vertical"}} value={f.description} onChange={set("description")} /></FormField>
      <FormField label="Result"><textarea style={{...inputStyle,minHeight:52,resize:"vertical"}} value={f.result} onChange={set("result")} /></FormField>
      <FormField label="Next action"><input style={inputStyle} value={f.nextAction} onChange={set("nextAction")} placeholder="What should happen next?" /></FormField>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={()=>{if(!f.title.trim()){toast("Title required","error");return;}onSave(f);}}>Save log</button>
      </div>
    </div>
  );
}

export default function ProjectLogsTab({ projectLogs, setProjectLogs, addAudit, role, projects, tasks, setTasks, promptHistory, roadmapItems, supportTickets , workspaceId = "workspace-1" , onLinkedSave}) {
  const logs = projectLogs||[];
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const sorted = useMemo(()=>[...logs].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)),[logs]);
  const filtered = useMemo(()=>sorted.filter(l=>{
    const q=search.toLowerCase();
    return (!q||l.title?.toLowerCase().includes(q)||l.description?.toLowerCase().includes(q))
      &&(filterProject==="All"||l.project===filterProject)
      &&(filterType==="All"||l.type===filterType)
      &&(filterStatus==="All"||l.status===filterStatus);
  }),[sorted,search,filterProject,filterType,filterStatus]);

  const allProjects = useMemo(()=>["All",...new Set(logs.map(l=>l.project).filter(Boolean))],[logs]);

  const save = f => {
    if(editing){ const u=logs.map(l=>l.id===editing.id?{...editing,...f}:l); setProjectLogs(u); saveWorkspaceData("projectLogs", u, workspaceId); addAudit("Project Logs","Update",`Updated: ${f.title}`); toast("Updated"); }
    else { const nl={...f,id:genId()}; const u=[nl,...logs]; setProjectLogs(u); saveWorkspaceData("projectLogs", u, workspaceId); addAudit("Project Logs","Create",`Logged: ${f.title}`); toast("Log added"); }
    setShowForm(false); setEditing(null);
  };
  const del = id => { const l=logs.find(x=>x.id===id); const u=logs.filter(x=>x.id!==id); setProjectLogs(u); saveWorkspaceData("projectLogs", u, workspaceId); addAudit("Project Logs","Delete",`Deleted: ${l?.title}`); toast("Deleted","info"); setConfirm(null); };

  const createTask = l => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nt={id:genId(),title:`[Log] ${l.title}`,description:l.description||"",project:l.project,status:"Todo",priority:"Medium",dueDate:"",checklist:[],tags:["project-log"],createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId); addAudit("Tasks","Create",`Task from log: ${l.title}`); toast("Task created");
  };

  const getLinkedLabel = (type, id, list) => list?.find(x=>x.id===id);
  
  const handleExport = () => { exportToCSV("project-logs", filtered); toast("Project logs exported to CSV"); };

  return (
    <div>
      {confirm&&<Confirm msg="Delete this log?" onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit log":"Add log entry"} onClose={()=>{setShowForm(false);setEditing(null);}} width={680}><LogForm initial={editing||{}} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}} projects={projects||[]} tasks={tasks||[]} prompts={promptHistory||[]} roadmapItems={roadmapItems||[]} supportTickets={supportTickets||[]} /></Modal>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)"}}>Project Logs</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>{logs.length} entries · change history across all projects</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add log</button>}
        </div>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="All">All types</option>{LOG_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{LOG_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>

      {filtered.length===0?<EmptyState icon="📋" title="No log entries" sub="Track every build, fix, and decision." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add log</button>}/>:(
        <div>
          {filtered.map((l,idx)=>{
            const linkedPrompt  = l.relatedPromptId   && (promptHistory||[]).find(p=>p.id===l.relatedPromptId);
            const linkedTask    = l.relatedTaskId      && (tasks||[]).find(t=>t.id===l.relatedTaskId);
            const linkedRoadmap = l.relatedRoadmapItemId && (roadmapItems||[]).find(r=>r.id===l.relatedRoadmapItemId);
            const linkedTicket  = l.relatedSupportTicketId && (supportTickets||[]).find(t=>t.id===l.relatedSupportTicketId);
            const dotColor = LOG_STATUS_COLORS[l.status]||"#94A3B8";
            const dotBg    = LOG_STATUS_BG[l.status]||"rgba(100,116,139,0.1)";
            return (
              <div key={l.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:28,flexShrink:0}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:dotBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:dotColor}}>
                    {l.status==="Success"?"✓":l.status==="Failed"?"✗":l.status==="Warning"?"!":"i"}
                  </div>
                  {idx<filtered.length-1&&<div style={{width:2,flex:1,background:"var(--border)",marginTop:4}} />}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                    <div>
                      <span style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>{l.title}</span>
                      <span style={{fontSize:11,color:"var(--text-muted)",marginLeft:8}}>{l.project||"—"} · {l.type} · {fmtDate(l.date)}</span>
                      {l.impact&&<span style={{fontSize:11,color:"var(--text-muted)",marginLeft:8}}>Impact: {l.impact}</span>}
                    </div>
                    <Badge label={l.status} size="sm" />
                  </div>
                  {l.description&&<p style={{fontSize:12,color:"var(--text-muted)",margin:"4px 0",lineHeight:1.5}}>{l.description}</p>}
                  {l.result&&<div style={{fontSize:12,color:"var(--success)",marginBottom:3}}>Result: {l.result}</div>}
                  {l.nextAction&&<div style={{fontSize:12,color:"var(--accent)",marginBottom:3}}>→ {l.nextAction}</div>}
                  {(linkedPrompt||linkedTask||linkedRoadmap||linkedTicket)&&(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>
                      {linkedPrompt&&<span>🤖 #{linkedPrompt.promptNumber} {linkedPrompt.title}</span>}
                      {linkedTask&&<span>✅ {linkedTask.title}</span>}
                      {linkedRoadmap&&<span>🗺️ {linkedRoadmap.item}</span>}
                      {linkedTicket&&<span>🎫 {linkedTicket.title}</span>}
                    </div>
                  )}
                  {role!=="Viewer"&&(
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                      <button style={btnStyle("ghost","sm")} onClick={()=>createTask(l)}>+ Task</button>
                      <button style={btnStyle("ghost","sm")} onClick={()=>setEditing(l)}>Edit</button>
                      {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>setConfirm(l.id)}>Del</button>}
                      {onLinkedSave && role !== "Viewer" && <>
                        <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("task",{title:`[Log] ${l.title}`,project:l.project||"",status:"Todo",priority:"Medium",projectLogId:l.id})}>✅ Task</button>
                        <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${l.title}`,relatedTo:l.project||l.title,relatedType:"ProjectLog",body:l.description||"",tags:[]})}>📝 Note</button>
                      </>}
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
