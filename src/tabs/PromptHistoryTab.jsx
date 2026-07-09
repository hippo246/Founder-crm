import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { PROMPT_STATUSES, PROMPT_TOOLS } from "../config/crmConfig.js";
import { nextPromptNumber } from "../lib/relations.js";

function PromptForm({ initial={}, onSave, onClose, projects=[], tasks=[], roadmapItems=[], projectLogs=[], allPrompts=[] }) {
  const suggestedNum = nextPromptNumber(initial.project||"", allPrompts);
  const [f, setF] = useState({
    title:"", project:"", moduleFile:"App.jsx", promptNumber:suggestedNum,
    tool:"Kiro", promptBody:"", outputSummary:"", status:"Planned",
    date:new Date().toISOString().slice(0,10), tags:[],
    linkedTaskId:"", linkedRoadmapItemId:"", linkedProjectLogId:"",
    resultQuality:"", nextPromptNeeded:"", notes:"",
    createdAt:new Date().toISOString().slice(0,10),
    ...initial
  });
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
        <FormField label="Prompt #"><input style={inputStyle} type="number" value={f.promptNumber} onChange={set("promptNumber")} /></FormField>
        <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        <FormField label="Module / File"><input style={inputStyle} value={f.moduleFile} onChange={set("moduleFile")} /></FormField>
        <FormField label="Tool"><select style={inputStyle} value={f.tool} onChange={set("tool")}>{PROMPT_TOOLS.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{PROMPT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
        <FormField label="Result quality (1-5)"><input style={inputStyle} type="number" min="1" max="5" value={f.resultQuality} onChange={set("resultQuality")} /></FormField>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Linked task"><select style={inputStyle} value={f.linkedTaskId} onChange={set("linkedTaskId")}><option value="">— None —</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></FormField>
        <FormField label="Linked roadmap item"><select style={inputStyle} value={f.linkedRoadmapItemId} onChange={set("linkedRoadmapItemId")}><option value="">— None —</option>{roadmapItems.map(r=><option key={r.id} value={r.id}>{r.item}</option>)}</select></FormField>
      </div>
      <FormField label="Prompt body"><textarea style={{...inputStyle,minHeight:100,resize:"vertical",fontFamily:"monospace",fontSize:12}} value={f.promptBody} onChange={set("promptBody")} placeholder="The full prompt text…" /></FormField>
      <FormField label="Output summary"><textarea style={{...inputStyle,minHeight:64,resize:"vertical"}} value={f.outputSummary} onChange={set("outputSummary")} /></FormField>
      <FormField label="Next prompt needed"><input style={inputStyle} value={f.nextPromptNeeded} onChange={set("nextPromptNeeded")} placeholder="What prompt should follow this?" /></FormField>
      <FormField label="Notes"><input style={inputStyle} value={f.notes} onChange={set("notes")} /></FormField>
      <FormField label="Tags (comma-separated)"><input style={inputStyle} value={Array.isArray(f.tags)?f.tags.join(", "):f.tags||""} onChange={e=>setF(p=>({...p,tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)}))} placeholder="e.g. refactor, auth, ui" /></FormField>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={()=>onSave(f)}>Save prompt</button>
      </div>
    </div>
  );
}

export default function PromptHistoryTab({ promptHistory, setPromptHistory, addAudit, role, projects, tasks, setTasks, roadmapItems, projectLogs, setProjectLogs , workspaceId = "workspace-1" , onLinkedSave}) {
  const prompts = promptHistory||[];
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTool, setFilterTool] = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [viewMode, setViewMode] = useState("kanban");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const allProjects = useMemo(()=>["All",...new Set(prompts.map(p=>p.project).filter(Boolean))],[prompts]);

  const filtered = useMemo(()=>[...prompts].sort((a,b)=>Number(a.promptNumber)-Number(b.promptNumber)).filter(p=>{
    const q=search.toLowerCase();
    return (!q||p.title?.toLowerCase().includes(q)||p.promptBody?.toLowerCase().includes(q)||p.outputSummary?.toLowerCase().includes(q))
      &&(filterStatus==="All"||p.status===filterStatus)
      &&(filterTool==="All"||p.tool===filterTool)
      &&(filterProject==="All"||p.project===filterProject);
  }),[prompts,search,filterStatus,filterTool,filterProject]);

  const save = useCallback(f => {
    if(editing){ const u=prompts.map(p=>p.id===editing.id?{...editing,...f}:p); setPromptHistory(u); saveWorkspaceData("promptHistory", u, workspaceId); addAudit("Prompts","Update",`Updated: ${f.title}`); toast("Updated"); }
    else { const np={...f,id:genId()}; const u=[np,...prompts]; setPromptHistory(u); saveWorkspaceData("promptHistory", u, workspaceId); addAudit("Prompts","Create",`Created prompt #${f.promptNumber}: ${f.title}`); toast("Prompt added"); }
    setShowForm(false); setEditing(null);
  }, [editing, prompts, workspaceId, addAudit]);

  const del = useCallback(id => {
    const p=prompts.find(x=>x.id===id); const u=prompts.filter(x=>x.id!==id);
    setPromptHistory(u); saveWorkspaceData("promptHistory", u, workspaceId); addAudit("Prompts","Delete",`Deleted: ${p?.title}`); toast("Deleted","info"); setConfirm(null);
  }, [prompts, workspaceId, addAudit]);

  const markStatus = useCallback((id, status) => {
    const u=prompts.map(p=>p.id===id?{...p,status,...(status==="Applied"?{appliedAt:new Date().toISOString()}:{})}:p);
    setPromptHistory(u); saveWorkspaceData("promptHistory", u, workspaceId); addAudit("Prompts","Status",`Prompt ${status}`); toast(`Marked ${status}`);
  }, [prompts, workspaceId, addAudit]);

  const duplicate = useCallback(p => {
    const np={...p,id:genId(),title:`${p.title} (Copy)`,status:"Planned",promptNumber:nextPromptNumber(p.project,prompts),createdAt:new Date().toISOString().slice(0,10)};
    const u=[np,...prompts]; setPromptHistory(u); saveWorkspaceData("promptHistory", u, workspaceId); addAudit("Prompts","Duplicate",`Duplicated: ${p.title}`); toast("Duplicated");
  }, [prompts, workspaceId, addAudit]);

  const createTask = useCallback(p => {
    if(role==="Viewer"){toast("No permission","error");return;}
    const nt={id:genId(),title:`[Prompt] ${p.title}`,description:p.outputSummary||"",project:p.project,status:"Todo",priority:"Medium",dueDate:"",checklist:[],tags:["prompt"],promptId:p.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId); addAudit("Tasks","Create",`Task from prompt: ${p.title}`); toast("Task created");
  }, [role, tasks, workspaceId, addAudit]);

  const copyPrompt = useCallback(body => { navigator.clipboard?.writeText(body).catch(()=>{}); toast("Prompt copied"); }, []);

  // Sequence by project
  const byProject = useMemo(()=>{
    if(viewMode!=="sequence") return null;
    return filtered.reduce((a,p)=>{ const k=p.project||"(No Project)"; (a[k]||(a[k]=[])).push(p); return a; },{});
  },[filtered,viewMode]);

  // Pre-group by status for kanban — avoids calling .filter() per column per render
  const byStatus = useMemo(()=>{
    if(viewMode!=="kanban") return null;
    return filtered.reduce((a,p)=>{ (a[p.status]||(a[p.status]=[])).push(p); return a; },{});
  },[filtered,viewMode]);

  const statusCounts = useMemo(() => PROMPT_STATUSES.reduce((a,s)=>({...a,[s]:prompts.filter(p=>p.status===s).length}),{}), [prompts]);

  const handleExport = useCallback(() => { exportToCSV("prompt-history", filtered); toast("Prompt history exported to CSV"); }, [filtered]);

  const onDragEnd = useCallback((result) => {
    if(!result.destination) return;
    const { draggableId, destination, source } = result;
    if(destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Status change
    markStatus(draggableId, destination.droppableId);
  }, [markStatus]);

  const renderPromptCard = useCallback((p, index) => {
    const rmItem = p.linkedRoadmapItemId && (roadmapItems||[]).find(r=>r.id===p.linkedRoadmapItemId);
    const linkedTask = p.linkedTaskId && (tasks||[]).find(t=>t.id===p.linkedTaskId);
    const content = (
      <div key={p.id} style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${p.status==="Applied" ? "var(--success)" : p.status==="Needs Fix" ? "var(--danger)" : "var(--accent)"}`,
        borderRadius: "var(--r-md)",
        padding: "16px",
        marginBottom: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "transform 0.15s, box-shadow 0.15s"
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
        
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap",marginBottom:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"var(--text)", letterSpacing:"-0.2px", marginBottom: 6}}>
              <span style={{color:"var(--text-muted)",marginRight:6, fontWeight:500}}>#{p.promptNumber}</span>{p.title}
            </div>
            <div style={{fontSize:12,color:"var(--text-muted)",display:"flex", gap:8, flexWrap:"wrap"}}>
              <span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>🤖 {p.tool}</span>
              <span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>📁 {p.project||"—"}</span>
              <span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>📄 {p.moduleFile}</span>
              <span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>📅 {fmtDate(p.date)}</span>
              {p.resultQuality>0&&<span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>⭐ {p.resultQuality}/5</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6, background:"var(--surface-raised)", padding:"6px", borderRadius:"8px", border:"1px solid var(--border)"}}>
            <Badge label={p.status} size="sm" />
          </div>
        </div>
        
        {(rmItem||linkedTask)&&<div style={{display:"flex",gap:10,fontSize:12,color:"var(--text-muted)",marginBottom:10, padding:"6px 12px", background:"var(--surface-raised)", borderRadius:"6px"}}>
          {rmItem&&<span>🗺️ {rmItem.item}</span>}
          {linkedTask&&<span>✅ {linkedTask.title}</span>}
        </div>}
        
        {p.promptBody&&<div style={{
          background: "#1e1e1e",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "12px",
          fontSize: 12,
          color: "#d4d4d4",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          marginBottom: 12,
          maxHeight: 120,
          overflowY: "auto",
          lineHeight: 1.5,
          position: "relative"
        }}>
          <div style={{position:"absolute", top:8, right:8, opacity:0.6, fontSize:10, userSelect:"none"}}>PROMPT</div>
          <pre style={{margin:0, whiteSpace:"pre-wrap", fontFamily:"inherit"}}>{p.promptBody}</pre>
        </div>}
        
        {p.outputSummary&&<div style={{fontSize:13,color:"var(--text)",marginBottom:8, padding:"8px 12px", background:"var(--background)", borderRadius:"6px", borderLeft:"2px solid var(--accent)"}}>
          <strong>Output:</strong> {p.outputSummary}
        </div>}
        
        {p.nextPromptNeeded&&<div style={{fontSize:12,color:"var(--accent)",marginBottom:10, fontWeight: 600}}>
          → Next: {p.nextPromptNeeded}
        </div>}
        
        {p.tags?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {p.tags.map(tag=><span key={tag} style={{fontSize:11,padding:"2px 10px",borderRadius:"12px",background:"var(--accent-dim)",color:"var(--accent)",border:"1px solid var(--accent-border)", fontWeight:500}}>#{tag}</span>)}
        </div>}
        
        {role!=="Viewer"&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10, paddingTop: 10, borderTop: "1px dashed var(--border)"}}>
            {p.promptBody&&<button style={btnStyle("soft","sm")} onClick={()=>copyPrompt(p.promptBody)}>📋 Copy Prompt</button>}
            {p.status!=="Applied"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)", background:"var(--success-dim)"}} onClick={()=>markStatus(p.id,"Applied")}>✓ Applied</button>}
            {p.status!=="Needs Fix"&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)", background:"var(--danger-dim)"}} onClick={()=>markStatus(p.id,"Needs Fix")}>Needs Fix</button>}
            <button style={btnStyle("ghost","sm")} onClick={()=>createTask(p)}>+ Task</button>
            <button style={btnStyle("ghost","sm")} onClick={()=>duplicate(p)}>Duplicate</button>
            <button style={btnStyle("ghost","sm")} onClick={()=>setEditing(p)}>Edit</button>
            {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>setConfirm({id:p.id,title:p.title})}>Delete</button>}
          </div>
        )}
      </div>
    );
    
    if (typeof index === 'number') {
      return (
        <Draggable draggableId={p.id} index={index} key={p.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                opacity: snapshot.isDragging ? 0.8 : 1,
                transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform
              }}
            >
              {content}
            </div>
          )}
        </Draggable>
      );
    }
    
    return content;
  }, [role, roadmapItems, tasks, copyPrompt, markStatus, createTask, duplicate, onLinkedSave]);

  return (
    <div>
      {confirm&&<Confirm msg={`Delete "${confirm.title}"? This cannot be undone.`} onYes={()=>del(confirm.id)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit prompt":"Add prompt"} onClose={()=>{setShowForm(false);setEditing(null);}} width={680}><PromptForm initial={editing||{}} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}} projects={projects||[]} tasks={tasks||[]} roadmapItems={roadmapItems||[]} projectLogs={projectLogs||[]} allPrompts={prompts} /></Modal>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)"}}>Prompt History</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>{prompts.length} prompts · {statusCounts["Applied"]||0} applied · {statusCounts["Needs Fix"]||0} need fix</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add prompt</button>}
        </div>
      </div>

      {/* Status summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:16}}>
        {PROMPT_STATUSES.map(s=>(
          <div key={s} onClick={()=>setFilterStatus(filterStatus===s?"All":s)} style={{background:"var(--surface)",border:`1px solid ${filterStatus===s?"var(--accent)":"var(--border)"}`,borderRadius:"var(--r-md)",padding:"8px 10px",cursor:"pointer"}}>
            <div style={{fontSize:9,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>{s}</div>
            <div style={{fontSize:18,fontWeight:800,color:s==="Applied"?"var(--success)":s==="Needs Fix"||s==="Failed"?"var(--danger)":"var(--text)"}}>{statusCounts[s]||0}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <button style={btnStyle(viewMode==="kanban"?"primary":"ghost","sm")} onClick={()=>setViewMode("kanban")}>Kanban</button>
        <button style={btnStyle(viewMode==="list"?"primary":"ghost","sm")} onClick={()=>setViewMode("list")}>List</button>
        <button style={btnStyle(viewMode==="sequence"?"primary":"ghost","sm")} onClick={()=>setViewMode("sequence")}>By Project</button>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search prompts…" />
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROMPT_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterTool} onChange={e=>setFilterTool(e.target.value)}><option value="All">All tools</option>{PROMPT_TOOLS.map(t=><option key={t}>{t}</option>)}</select>
      </div>

      {filtered.length===0?<EmptyState icon="🤖" title="No prompts" sub="Track every prompt you send to AI tools." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add prompt</button>}/>:(
        viewMode==="kanban"?(
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
              {PROMPT_STATUSES.map(status=>{
                const col = byStatus?.[status]||[];
                return (
                  <div key={status} style={{background:"var(--surface-raised)",borderRadius:"var(--r-lg)",padding:12,border:"1px solid var(--border)", display: "flex", flexDirection: "column"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"8px 10px",background:"var(--surface)",borderRadius:"var(--r-md)", flexShrink: 0}}>
                      <span style={{fontWeight:700,fontSize:12,color:"var(--text)"}}>{status}</span>
                      <span style={{fontSize:11,color:"var(--text-muted)",background:"var(--surface-raised)",padding:"2px 8px",borderRadius:"var(--r-pill)"}}>{col.length}</span>
                    </div>
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            display:"flex",flexDirection:"column",gap:8,
                            minHeight: 150,
                            flex: 1,
                            background: snapshot.isDraggingOver ? "rgba(255,255,255,0.02)" : "transparent",
                            borderRadius: "var(--r-md)",
                            transition: "background 0.2s ease"
                          }}
                        >
                          {col.map((p, index)=>renderPromptCard(p, index))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        ) : viewMode==="sequence"&&byProject ? (
          Object.entries(byProject).map(([proj,items])=>(
            <div key={proj} style={{marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:8,padding:"6px 10px",background:"var(--surface-raised)",borderRadius:"var(--r-md)",border:"1px solid var(--border)"}}>📁 {proj} — {items.length} prompts</div>
              {items.map(p=>renderPromptCard(p))}
            </div>
          ))
        ):(
          <div>{filtered.map(p=>renderPromptCard(p))}</div>
        )
      )}
    </div>
  );

}
