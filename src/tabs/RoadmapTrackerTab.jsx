import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { ROADMAP_STATUSES, ROADMAP_PRIORITIES, ROADMAP_PROJECTS } from "../config/crmConfig.js";

const VIEWS = ["Overview","Nested","By Project","By Sector","By Phase","Timeline","Blocked","Done","Next Actions"];

function RoadmapForm({ initial={}, onSave, onClose, roadmapItems=[], tasks=[], prompts=[], logs=[], tickets=[] }) {
  const [f, setF] = useState({
    item:"", project:"Personal CRM", sector:"", phase:"Phase 1", subPhase:"",
    priority:"Medium", status:"Backlog", progress:0, targetDate:"", owner:"",
    estimatedHours:"", actualHours:"", notes:"", blockers:"",
    linkedTaskIds:[], linkedPromptIds:[], linkedProjectLogIds:[], linkedSupportTicketIds:[],
    parentItemId:"", dependencies:"", createdAt:new Date().toISOString().slice(0,10),
    ...initial
  });
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const setNum = k => e => setF(p=>({...p,[k]:Number(e.target.value)||0}));
  const parentOptions = roadmapItems.filter(i=>i.id!==f.id);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Item / Feature" required><input style={inputStyle} value={f.item} onChange={set("item")} autoFocus placeholder="What needs to be built?" /></FormField>
        <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}>{ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}</select></FormField>
        <FormField label="Sector"><input style={inputStyle} value={f.sector} onChange={set("sector")} placeholder="e.g. Security, Billing, UI" /></FormField>
        <FormField label="Phase"><input style={inputStyle} value={f.phase} onChange={set("phase")} placeholder="Phase 1 / 1A / MVP / Launch…" /></FormField>
        <FormField label="Sub-phase"><input style={inputStyle} value={f.subPhase} onChange={set("subPhase")} placeholder="1A, 2B, Polish, etc." /></FormField>
        <FormField label="Parent item (optional)">
          <select style={inputStyle} value={f.parentItemId} onChange={set("parentItemId")}>
            <option value="">— None —</option>
            {parentOptions.map(i=><option key={i.id} value={i.id}>{i.item} ({i.project})</option>)}
          </select>
        </FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Progress %"><input style={inputStyle} type="number" min="0" max="100" value={f.progress} onChange={setNum("progress")} /></FormField>
        <FormField label="Target date"><input style={inputStyle} type="date" value={f.targetDate} onChange={set("targetDate")} /></FormField>
        <FormField label="Owner"><input style={inputStyle} value={f.owner} onChange={set("owner")} placeholder="Who owns this?" /></FormField>
        <FormField label="Est. hours"><input style={inputStyle} type="number" value={f.estimatedHours} onChange={set("estimatedHours")} placeholder="Optional" /></FormField>
        <FormField label="Actual hours"><input style={inputStyle} type="number" value={f.actualHours} onChange={set("actualHours")} placeholder="Optional" /></FormField>
        <FormField label="Dependencies"><input style={inputStyle} value={f.dependencies} onChange={set("dependencies")} placeholder="IDs or names of blocking items" /></FormField>
      </div>
      <FormField label="Notes"><textarea style={{...inputStyle,minHeight:60,resize:"vertical"}} value={f.notes} onChange={set("notes")} placeholder="Additional details, requirements, acceptance criteria..." /></FormField>
      <FormField label="Blockers"><textarea style={{...inputStyle,minHeight:48,resize:"vertical"}} value={f.blockers} onChange={set("blockers")} placeholder="What is blocking this item?" /></FormField>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={()=>{if(!f.item.trim()){toast("Item name required","error");return;}onSave(f);}}>Save item</button>
      </div>
    </div>
  );
}

export default function RoadmapTrackerTab({ roadmapItems, setRoadmapItems, addAudit, role, tasks, setTasks, promptHistory, projectLogs, supportTickets , workspaceId = "workspace-1" , onLinkedSave}) {
  const items = roadmapItems || [];
  const [view, setView] = useState("Nested");
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterSector, setFilterSector] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  const allSectors = useMemo(()=>["All",...new Set(items.map(i=>i.sector).filter(Boolean))],[items]);

  const filtered = useMemo(()=>items.filter(item=>{
    const q=search.toLowerCase();
    return (!q||item.item?.toLowerCase().includes(q)||item.notes?.toLowerCase().includes(q)||item.sector?.toLowerCase().includes(q))
      &&(filterProject==="All"||item.project===filterProject)
      &&(filterStatus==="All"||item.status===filterStatus)
      &&(filterPriority==="All"||item.priority===filterPriority)
      &&(filterSector==="All"||item.sector===filterSector);
  }),[items,search,filterProject,filterStatus,filterPriority,filterSector]);

  const save = f => {
    const now = new Date().toISOString();
    if(editing){ const u=items.map(i=>i.id===editing.id?{...editing,...f,updatedAt:now}:i); setRoadmapItems(u); saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Update",`Updated: ${f.item}`); toast("Updated"); }
    else { const ni={...f,id:genId(),createdAt:now,updatedAt:now}; const u=[ni,...items]; setRoadmapItems(u); saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Create",`Added: ${f.item}`); toast("Item added"); }
    setShowForm(false); setEditing(null);
  };

  const del = id => { const i=items.find(x=>x.id===id); const u=items.filter(x=>x.id!==id); setRoadmapItems(u); saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Delete",`Deleted: ${i?.item}`); toast("Deleted","info"); setConfirm(null); };

  const changeStatus = (id, status) => {
    const progress = status==="Done"?100:undefined;
    const u=items.map(i=>i.id===id?{...i,status,...(progress!==undefined?{progress}:{}),updatedAt:new Date().toISOString()}:i);
    setRoadmapItems(u); saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Status",`${items.find(i=>i.id===id)?.item} → ${status}`); toast(`Marked ${status}`);
  };

  const clearBlocker = id => {
    const u=items.map(i=>i.id===id?{...i,blockers:"",status:"In Progress",updatedAt:new Date().toISOString()}:i);
    setRoadmapItems(u); saveWorkspaceData("roadmapItems", u, workspaceId); toast("Blocker cleared");
  };

  const createTask = item => {
    if(role==="Viewer"){toast("Viewers cannot create tasks","error");return;}
    const nt={id:genId(),title:`[Roadmap] ${item.item}`,description:item.notes||"",project:item.project,contact:"",status:"Todo",priority:item.priority==="Critical"?"Urgent":item.priority,dueDate:item.targetDate||"",checklist:[],tags:["roadmap"],roadmapItemId:item.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId);
    addAudit("Tasks","Create",`Task from roadmap: ${item.item}`); toast("Task created from roadmap item");
  };

  const createLog = item => {
    toast("Open Project Logs and link this item manually","info");
  };

  // Stat calculations
  const doneCount = items.filter(i=>i.status==="Done").length;
  const total = items.length;
  const blocked = items.filter(i=>i.status==="Blocked");
  const inProgress = items.filter(i=>i.status==="In Progress");
  const upcoming = items.filter(i=>["Planned","Backlog"].includes(i.status));

  // Per-project progress
  const projectStats = useMemo(()=>{
    const ps={};
    ROADMAP_PROJECTS.forEach(proj=>{
      const pi=items.filter(i=>i.project===proj);
      if(pi.length===0) return;
      ps[proj]={ total:pi.length, done:pi.filter(i=>i.status==="Done").length, blocked:pi.filter(i=>i.status==="Blocked").length, inProgress:pi.filter(i=>i.status==="In Progress").length };
    });
    return ps;
  },[items]);

  // Per-sector progress
  const sectorStats = useMemo(()=>{
    const ss={};
    items.forEach(item=>{
      const s=item.sector||"(No Sector)";
      if(!ss[s]) ss[s]={total:0,done:0,blocked:0};
      ss[s].total++; if(item.status==="Done") ss[s].done++; if(item.status==="Blocked") ss[s].blocked++;
    });
    return ss;
  },[items]);

  const linkedTasks = id => (tasks||[]).filter(t=>t.roadmapItemId===id||t.tags?.includes("roadmap")).length;
  const linkedPrompts = id => (promptHistory||[]).filter(p=>p.linkedRoadmapItemId===id).length;
  
  const handleExport = () => { exportToCSV("roadmap-items", filtered); toast("Roadmap items exported to CSV"); };

  // Group helpers - nested structure: Project → Sector → Phase
  const groupByNested = () => {
    const result = {};
    filtered.forEach(item => {
      const project = item.project || "(No Project)";
      const sector = item.sector || "(No Sector)";
      const phase = item.phase || "(No Phase)";
      
      if (!result[project]) result[project] = { sectors: {} };
      if (!result[project].sectors[sector]) result[project].sectors[sector] = { phases: {} };
      if (!result[project].sectors[sector].phases[phase]) result[project].sectors[sector].phases[phase] = [];
      
      result[project].sectors[sector].phases[phase].push(item);
    });
    return result;
  };

  const renderNestedView = () => {
    const nested = groupByNested();
    return Object.entries(nested).map(([project, projectData]) => {
      const projectItems = Object.values(projectData.sectors).flatMap(s => Object.values(s.phases).flat());
      const projectDone = projectItems.filter(i => i.status === "Done").length;
      const projectPct = projectItems.length > 0 ? Math.round((projectDone / projectItems.length) * 100) : 0;
      
      return (
        <div key={project} style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "var(--surface-raised)",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border)",
            marginBottom: 12,
            gap: 12
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>📁 {project}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{projectDone}/{projectItems.length} done</span>
              <div style={{ width: 100 }}><ProgressBar value={projectPct} color="var(--accent)" /></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: projectPct === 100 ? "var(--success)" : "var(--accent)" }}>{projectPct}%</span>
            </div>
          </div>
          
          {Object.entries(projectData.sectors).map(([sector, sectorData]) => {
            const sectorItems = Object.values(sectorData.phases).flat();
            const sectorDone = sectorItems.filter(i => i.status === "Done").length;
            const sectorPct = sectorItems.length > 0 ? Math.round((sectorDone / sectorItems.length) * 100) : 0;
            const sectorBlocked = sectorItems.filter(i => i.status === "Blocked").length;
            
            return (
              <div key={sector} style={{ marginLeft: 16, marginBottom: 16 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--surface)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border)",
                  marginBottom: 8,
                  gap: 12
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>🏷️ {sector}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sectorDone}/{sectorItems.length}</span>
                    {sectorBlocked > 0 && <span style={{ fontSize: 11, color: "var(--danger)" }}>🚫 {sectorBlocked}</span>}
                    <div style={{ width: 60 }}><ProgressBar value={sectorPct} color="var(--purple)" /></div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sectorPct === 100 ? "var(--success)" : "var(--accent)" }}>{sectorPct}%</span>
                  </div>
                </div>
                
                {Object.entries(sectorData.phases).map(([phase, phaseItems]) => {
                  const phaseDone = phaseItems.filter(i => i.status === "Done").length;
                  const phasePct = phaseItems.length > 0 ? Math.round((phaseDone / phaseItems.length) * 100) : 0;
                  
                  return (
                    <div key={phase} style={{ marginLeft: 16, marginBottom: 12 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 10px",
                        background: "var(--surface-raised)",
                        borderRadius: "var(--r-sm)",
                        marginBottom: 8,
                        gap: 8
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-muted)" }}>📐 {phase}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{phaseDone}/{phaseItems.length}</span>
                          <div style={{ width: 50 }}><ProgressBar value={phasePct} color="var(--success)" /></div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: phasePct === 100 ? "var(--success)" : "var(--accent)" }}>{phasePct}%</span>
                        </div>
                      </div>
                      {phaseItems.map(item => <RoadmapItemCard key={item.id} item={item} />)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const renderGroups = (groups, groupLabel) => Object.entries(groups).map(([name, groupItems])=>{
    const done = groupItems.filter(i=>i.status==="Done").length;
    const pct = groupItems.length>0?Math.round((done/groupItems.length)*100):0;
    return (
      <div key={name} style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--surface-raised)",borderRadius:"var(--r-md)",border:"1px solid var(--border)",marginBottom:10,gap:12}}>
          <div style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{groupLabel} {name}</div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <span style={{fontSize:11,color:"var(--text-muted)"}}>{done}/{groupItems.length} done</span>
            <div style={{width:80}}><ProgressBar value={pct} color="var(--accent)" /></div>
            <span style={{fontSize:11,fontWeight:700,color:pct===100?"var(--success)":"var(--accent)"}}>{pct}%</span>
          </div>
        </div>
        {groupItems.map(item=><RoadmapItemCard key={item.id} item={item} />)}
      </div>
    );
  });

  const RoadmapItemCard = ({ item, indent=0 }) => {
    const children = items.filter(i=>i.parentItemId===item.id);
    const overdue = item.targetDate && isOverdue(item.targetDate) && item.status!=="Done";
    const isExpanded = expandedItem===item.id;
    const lt = linkedTasks(item.id);
    const lp = linkedPrompts(item.id);
    return (
      <div style={{marginBottom:6,marginLeft:indent*20}}>
        <div style={{background:"var(--surface)",border:`1px solid ${item.status==="Blocked"?"rgba(239,68,68,0.4)":"var(--border)"}`,borderRadius:"var(--r-md)",padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                {children.length>0&&<button onClick={()=>setExpandedItem(isExpanded?null:item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:11,padding:0,flexShrink:0}}>{isExpanded?"▼":"▶"}</button>}
                <span style={{fontWeight:600,fontSize:13,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.item}</span>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)",display:"flex",flexWrap:"wrap",gap:6}}>
                {item.phase&&<span>{item.phase}{item.subPhase&&` › ${item.subPhase}`}</span>}
                {item.sector&&<span>· {item.sector}</span>}
                {item.targetDate&&<span style={{color:overdue?"var(--danger)":undefined}}>· 📅 {fmtDate(item.targetDate)}{overdue&&" ⏰"}</span>}
                {item.owner&&<span>· 👤 {item.owner}</span>}
                {item.estimatedHours&&<span>· ⏱ {item.estimatedHours}h est{item.actualHours?` / ${item.actualHours}h actual`:""}</span>}
                {lt>0&&<span>· ✅ {lt} task{lt!==1?"s":""}</span>}
                {lp>0&&<span>· 🤖 {lp} prompt{lp!==1?"s":""}</span>}
              </div>
              {item.blockers&&<div style={{marginTop:6,fontSize:11,color:"var(--danger)",background:"var(--danger-dim)",padding:"4px 8px",borderRadius:"var(--r-sm)"}}>🚫 {item.blockers}</div>}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
              <Badge label={item.status} size="sm" />
              <Badge label={item.priority} size="sm" />
            </div>
          </div>
          <div style={{marginTop:8,marginBottom:role==="Viewer"?0:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginBottom:2}}><span>Progress</span><span style={{fontWeight:700}}>{item.progress||0}%</span></div>
            <ProgressBar value={item.progress||0} color={item.status==="Blocked"?"var(--danger)":item.status==="Done"?"var(--success)":"var(--accent)"} />
          </div>
          {item.notes&&<div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6,lineHeight:1.5}}>{item.notes}</div>}
          {role!=="Viewer"&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {item.status!=="Done"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)"}} onClick={()=>changeStatus(item.id,"Done")}>✓ Done</button>}
              {item.status!=="Blocked"&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>changeStatus(item.id,"Blocked")}>Block</button>}
              {item.status==="Blocked"&&item.blockers&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={()=>clearBlocker(item.id)}>Clear Blocker</button>}
              <button style={btnStyle("ghost","sm")} onClick={()=>createTask(item)}>+ Task</button>
              <button style={btnStyle("ghost","sm")} onClick={()=>setEditing(item)}>Edit</button>
              {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>setConfirm(item.id)}>Del</button>}
              {onLinkedSave && role !== "Viewer" && <>
                <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("task",{title:`[Roadmap] ${item.item}`,project:item.project||"",status:"Todo",priority:item.priority||"Medium",dueDate:item.targetDate||"",roadmapItemId:item.id})}>✅ Task</button>
                <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${item.item}`,relatedTo:item.item,relatedType:"Roadmap",body:item.notes||"",tags:[]})}>📝 Note</button>
                <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("calendarEvent",{title:item.item,type:"Deadline",date:item.targetDate||new Date().toISOString().slice(0,10),time:"",notes:item.notes||""})}>📅 Event</button>
              </>}
            </div>
          )}
        </div>
        {isExpanded&&children.map(child=><RoadmapItemCard key={child.id} item={child} indent={1} />)}
      </div>
    );
  };

  // Next Actions: items in Planned/Backlog ordered by priority
  const priorityOrder = {Critical:0,Urgent:1,High:2,Medium:3,Low:4};
  const nextActions = [...filtered].filter(i=>["Planned","Backlog"].includes(i.status)).sort((a,b)=>(priorityOrder[a.priority]||3)-(priorityOrder[b.priority]||3)).slice(0,15);

  const renderView = () => {
    if(view==="Nested") {
      return renderNestedView();
    }
    if(view==="Blocked") {
      const bl = items.filter(i=>i.status==="Blocked");
      return bl.length===0?<EmptyState icon="✅" title="Nothing blocked" sub="No blocked roadmap items." />:(
        <div>{bl.map(item=><RoadmapItemCard key={item.id} item={item} />)}</div>
      );
    }
    if(view==="Done") {
      const dn = filtered.filter(i=>i.status==="Done");
      return dn.length===0?<EmptyState icon="🗺️" title="Nothing done yet" sub="Mark items as done to see them here." />:(
        <div>{dn.map(item=><RoadmapItemCard key={item.id} item={item} />)}</div>
      );
    }
    if(view==="Next Actions") {
      return nextActions.length===0?<EmptyState icon="⚡" title="No next actions" sub="Add planned or backlog items." />:(
        <div>
          <div style={{marginBottom:12,fontSize:12,color:"var(--text-muted)"}}>Top {nextActions.length} items to work on next, sorted by priority:</div>
          {nextActions.map((item,idx)=>(
            <div key={item.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--accent)",flexShrink:0}}>{idx+1}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:2}}>{item.item}</div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{item.project} · {item.phase}{item.subPhase&&` › ${item.subPhase}`}{item.targetDate&&` · 📅 ${fmtDate(item.targetDate)}`}</div>
              </div>
              <div style={{display:"flex",gap:4}}><Badge label={item.priority} size="sm" /><Badge label={item.status} size="sm" /></div>
              {role!=="Viewer"&&<button style={btnStyle("ghost","sm")} onClick={()=>createTask(item)}>+ Task</button>}
            </div>
          ))}
        </div>
      );
    }
    if(view==="Overview") {
      return (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:20}}>
            {Object.entries(projectStats).map(([proj,st])=>(
              <SectionCard key={proj}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:8}}>📁 {proj}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>
                  <span>{st.done}/{st.total} done</span>
                  {st.blocked>0&&<span style={{color:"var(--danger)"}}>🚫 {st.blocked} blocked</span>}
                </div>
                <ProgressBar value={st.total>0?Math.round((st.done/st.total)*100):0} color="var(--accent)" />
              </SectionCard>
            ))}
          </div>
          <div style={{marginBottom:14,fontWeight:700,fontSize:13,color:"var(--text)"}}>By Sector</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:20}}>
            {Object.entries(sectorStats).map(([sec,st])=>(
              <div key={sec} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",padding:"10px 12px"}}>
                <div style={{fontWeight:600,fontSize:12,color:"var(--text)",marginBottom:6}}>{sec}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginBottom:3}}><span>{st.done}/{st.total}</span>{st.blocked>0&&<span style={{color:"var(--danger)"}}>🚫 {st.blocked}</span>}</div>
                <ProgressBar value={st.total>0?Math.round((st.done/st.total)*100):0} color="var(--purple)" />
              </div>
            ))}
          </div>
        </div>
      );
    }
    const groupBy = key => filtered.reduce((a,item)=>{ const k=item[key]||`(No ${key})`; (a[k]||(a[k]=[])).push(item); return a; },{});
    if(view==="By Project") return renderGroups(groupBy("project"),"📁");
    if(view==="By Sector")  return renderGroups(groupBy("sector"),"🏷️");
    if(view==="By Phase")   return renderGroups(groupBy("phase"),"📐");
    if(view==="Timeline") {
      const withDates = filtered.filter(i=>i.targetDate).sort((a,b)=>new Date(a.targetDate)-new Date(b.targetDate));
      const noDates = filtered.filter(i=>!i.targetDate);
      const today = new Date().toISOString().slice(0,10);
      return (
        <div>
          <div style={{marginBottom:16,fontSize:12,color:"var(--text-muted)"}}>Sorted by target date · {withDates.length} with dates · {noDates.length} without</div>
          {withDates.map(item => (
            <div key={item.id} style={{display:"flex",gap:14,marginBottom:12,padding:"12px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderLeft:`4px solid ${item.targetDate<today?"var(--danger)":item.targetDate===today?"var(--warning)":"var(--accent)"}`,borderRadius:"var(--r-md)"}}>
              <div style={{minWidth:90,fontSize:12,fontWeight:600,color:item.targetDate<today?"var(--danger)":"var(--text-muted)"}}>{item.targetDate}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{item.item}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>{item.project} · {item.phase} · <span style={{color:item.status==="Done"?"var(--success)":item.status==="Blocked"?"var(--danger)":"var(--text-muted)"}}>{item.status}</span></div>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)"}}>{item.progress||0}%</div>
            </div>
          ))}
          {noDates.length>0&&<div style={{marginTop:16,fontSize:12,color:"var(--text-muted)",borderTop:"1px solid var(--border)",paddingTop:12}}>Items without target dates ({noDates.length})</div>}
          {noDates.map(item=>(
            <div key={item.id} style={{display:"flex",gap:14,marginBottom:8,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"4px solid var(--border)",borderRadius:"var(--r-md)",opacity:0.7}}>
              <div style={{minWidth:90,fontSize:12,color:"var(--text-muted)"}}>No date</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.item}</div><div style={{fontSize:12,color:"var(--text-muted)"}}>{item.project} · {item.status}</div></div>
            </div>
          ))}
        </div>
      );
    }
    return filtered.length===0?<EmptyState icon="🗺️" title="No roadmap items" sub="Add your first item." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add item</button>} />:(
      <div>{filtered.map(item=><RoadmapItemCard key={item.id} item={item} />)}</div>
    );
  };

  return (
    <div>
      {confirm&&<Confirm msg="Delete this roadmap item?" onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit roadmap item":"Add roadmap item"} onClose={()=>{setShowForm(false);setEditing(null);}} width={700}><RoadmapForm initial={editing||{}} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}} roadmapItems={items} tasks={tasks||[]} prompts={promptHistory||[]} logs={projectLogs||[]} tickets={supportTickets||[]} /></Modal>}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)",letterSpacing:"-0.4px"}}>Roadmap Tracker</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>{doneCount}/{total} done · {blocked.length} blocked · {inProgress.length} in progress</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add item</button>}
        </div>
      </div>

      {/* Overall progress */}
      <div style={{marginBottom:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>
          <span>Overall completion</span>
          <span style={{fontWeight:700,color:"var(--text)"}}>{total>0?`${Math.round((doneCount/total)*100)}%`:"0%"} · {doneCount} done of {total}</span>
        </div>
        <ProgressBar value={total>0?(doneCount/total)*100:0} color="var(--purple)" />
      </div>

      {/* Blocked alert */}
      {blocked.length>0&&(
        <div style={{background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--r-md)",padding:"10px 14px",marginBottom:14}}>
          <div style={{fontWeight:700,fontSize:12,color:"var(--danger)",marginBottom:6}}>🚫 {blocked.length} BLOCKED ITEM{blocked.length!==1?"S":""}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {blocked.map(i=>(
              <div key={i.id} style={{fontSize:11,color:"var(--danger)",background:"rgba(239,68,68,0.1)",padding:"2px 8px",borderRadius:"var(--r-pill)"}}>
                {i.item} <span style={{opacity:.7}}>({i.project})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {VIEWS.map(v=><button key={v} style={btnStyle(view===v?"primary":"ghost","sm")} onClick={()=>setView(v)}>{v}</button>)}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search roadmap…" />
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="All">All projects</option>{ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterSector} onChange={e=>setFilterSector(e.target.value)}>{allSectors.map(s=><option key={s} value={s}>{s==="All"?"All sectors":s}</option>)}</select>
      </div>

      {renderView()}
    </div>
  );
}
