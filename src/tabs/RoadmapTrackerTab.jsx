import { useState, useMemo, useCallback, memo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { ROADMAP_STATUSES, ROADMAP_PRIORITIES, ROADMAP_PROJECTS } from "../config/crmConfig.js";

const VIEWS = ["Overview","Nested","By Project","By Sector","By Phase","Timeline","Blocked","Done","Next Actions"];

const SECTION_STYLE = { marginBottom:20, paddingBottom:16, borderBottom:"1px solid var(--border)" };
const SECTION_LABEL_STYLE = { fontSize:11, fontWeight:700, color:"var(--text-muted)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 };
const G2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" };
const G3 = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0 16px" };

// Suggestion chips for datalist-style inline suggestions
function SuggestInput({ value, onChange, suggestions=[], style, placeholder, autoFocus }) {
  const id = "si-" + placeholder?.replace(/\s/g,"");
  return (
    <>
      <input list={id} style={style} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} />
      <datalist id={id}>{suggestions.map(s=><option key={s} value={s} />)}</datalist>
    </>
  );
}

function RoadmapForm({ initial={}, onSave, onClose, roadmapItems=[], tasks=[], prompts=[], logs=[], tickets=[], projects=[] }) {
  const [f, setF] = useState({
    item:"", project:"Personal CRM", sector:"", phase:"", step:"", subStep:"",
    priority:"Medium", status:"Backlog", progress:0,
    startDate:"", targetDate:"", completedDate:"",
    owner:"", team:"", stakeholders:"",
    estimatedHours:"", actualHours:"", storyPoints:"",
    effort:"", complexity:"Medium", risk:"Low",
    tags:"", externalUrl:"", ticketRef:"",
    notes:"", acceptanceCriteria:"", blockers:"", assumptions:"",
    linkedTaskIds:[], linkedPromptIds:[], linkedProjectLogIds:[], linkedSupportTicketIds:[],
    linkedProjectId:"",
    parentItemId:"", dependencies:"", createdAt:new Date().toISOString().slice(0,10),
    ...initial
  });
  const [showOptional, setShowOptional] = useState(!!(initial.team||initial.stakeholders||initial.storyPoints||initial.effort||initial.complexity||initial.risk||initial.tags||initial.externalUrl||initial.ticketRef||initial.assumptions||initial.acceptanceCriteria||initial.startDate||initial.completedDate));
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const setNum = k => e => setF(p=>({...p,[k]:Number(e.target.value)||0}));

  // Build suggestions from existing items
  const existingSectors = [...new Set(roadmapItems.map(i=>i.sector).filter(Boolean))];
  const existingPhases  = [...new Set(roadmapItems.map(i=>i.phase).filter(Boolean))];
  const existingSteps   = [...new Set(roadmapItems.map(i=>i.step).filter(Boolean))];
  const existingOwners  = [...new Set(roadmapItems.map(i=>i.owner).filter(Boolean))];
  const existingTeams   = [...new Set(roadmapItems.map(i=>i.team).filter(Boolean))];

  // Auto-suggest step labels: A, B, C… or 1, 2, 3…
  const stepSuggestions = [
    ...existingSteps,
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ..."123456789".split("")
  ].filter((v,i,a)=>a.indexOf(v)===i);

  const subStepSuggestions = [
    ...[...new Set(roadmapItems.map(i=>i.subStep).filter(Boolean))],
    ..."abcdefghijklmnopqrstuvwxyz".split(""),
    ..."123456789".split(""),
    "i","ii","iii","iv","v"
  ].filter((v,i,a)=>a.indexOf(v)===i);

  // Preview the hierarchy path
  const pathParts = [f.sector, f.phase, f.step, f.subStep].filter(Boolean);
  const pathPreview = pathParts.length > 0 ? pathParts.join(" › ") : null;

  const parentOptions = roadmapItems.filter(i=>i.id!==f.id);

  return (
    <div>
      {/* ── Section 1: Identity ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>📋 Item Identity</div>
        <div style={G2}>
          <FormField label="Item / Feature" required style={{gridColumn:"1/-1"}}>
            <input style={inputStyle} value={f.item} onChange={set("item")} autoFocus placeholder="What needs to be built or done?" />
          </FormField>
          <FormField label="Project">
            <select style={inputStyle} value={f.project} onChange={set("project")}>
              {ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Parent item">
            <select style={inputStyle} value={f.parentItemId} onChange={set("parentItemId")}>
              <option value="">— None (top-level) —</option>
              {parentOptions.map(i=><option key={i.id} value={i.id}>{i.item} ({i.project})</option>)}
            </select>
          </FormField>
          {projects.length > 0 && (
            <FormField label="Link to CRM project" hint="Tie this item to an actual CRM project">
              <select style={inputStyle} value={f.linkedProjectId} onChange={set("linkedProjectId")}>
                <option value="">— None —</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
              </select>
            </FormField>
          )}
        </div>
      </div>

      {/* ── Section 2: Hierarchy (Sector → Phase → Step → Sub-step) ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>🗂 Hierarchy</div>
        {pathPreview && (
          <div style={{fontSize:11,color:"var(--accent)",background:"var(--accent-dim)",borderRadius:"var(--r-sm)",padding:"4px 10px",marginBottom:10,fontFamily:"monospace"}}>
            📍 {pathPreview}
          </div>
        )}
        <div style={G2}>
          <FormField label="Sector" hint="e.g. Security, Billing, UI, Backend">
            <SuggestInput style={inputStyle} value={f.sector} onChange={set("sector")} suggestions={existingSectors} placeholder="Which area / domain?" />
          </FormField>
          <FormField label="Phase" hint="e.g. Phase 1, MVP, Launch, Hardening">
            <SuggestInput style={inputStyle} value={f.phase} onChange={set("phase")} suggestions={existingPhases} placeholder="e.g. Phase 1, MVP…" />
          </FormField>
          <FormField label="Step" hint="Letter or number within the phase — A, B, 1, 2…">
            <SuggestInput style={inputStyle} value={f.step} onChange={set("step")} suggestions={stepSuggestions} placeholder="A / B / 1 / 2…" />
          </FormField>
          <FormField label="Sub-step" hint="Further breakdown — a, b, i, ii…">
            <SuggestInput style={inputStyle} value={f.subStep} onChange={set("subStep")} suggestions={subStepSuggestions} placeholder="a / b / i / ii…" />
          </FormField>
        </div>
      </div>

      {/* ── Section 3: Status & Priority ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>🚦 Status & Priority</div>
        <div style={G3}>
          <FormField label="Status">
            <select style={inputStyle} value={f.status} onChange={set("status")}>
              {ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select style={inputStyle} value={f.priority} onChange={set("priority")}>
              {ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Progress %">
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input style={{...inputStyle,flex:1}} type="number" min="0" max="100" value={f.progress} onChange={setNum("progress")} />
              <span style={{fontSize:11,color:"var(--text-muted)",minWidth:28}}>{f.progress}%</span>
            </div>
          </FormField>
        </div>
      </div>

      {/* ── Section 4: Dates ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>📅 Dates</div>
        <div style={G3}>
          <FormField label="Start date"><input style={inputStyle} type="date" value={f.startDate} onChange={set("startDate")} /></FormField>
          <FormField label="Target date"><input style={inputStyle} type="date" value={f.targetDate} onChange={set("targetDate")} /></FormField>
          <FormField label="Completed date"><input style={inputStyle} type="date" value={f.completedDate} onChange={set("completedDate")} /></FormField>
        </div>
      </div>

      {/* ── Section 5: Ownership ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>👤 Ownership</div>
        <div style={G2}>
          <FormField label="Owner" hint="Primary person responsible">
            <SuggestInput style={inputStyle} value={f.owner} onChange={set("owner")} suggestions={existingOwners} placeholder="Who owns this?" />
          </FormField>
          <FormField label="Team" hint="Team or squad">
            <SuggestInput style={inputStyle} value={f.team} onChange={set("team")} suggestions={existingTeams} placeholder="e.g. Platform, Growth…" />
          </FormField>
        </div>
        <FormField label="Stakeholders" hint="Comma-separated names or groups">
          <input style={inputStyle} value={f.stakeholders} onChange={set("stakeholders")} placeholder="e.g. Product, Legal, CEO…" />
        </FormField>
      </div>

      {/* ── Section 6: Notes ── */}
      <div style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>📝 Details</div>
        <FormField label="Notes / Description">
          <textarea style={{...inputStyle,minHeight:64,resize:"vertical"}} value={f.notes} onChange={set("notes")} placeholder="Additional details, context, requirements…" />
        </FormField>
        <FormField label="Acceptance criteria" hint="How do we know this is done?">
          <textarea style={{...inputStyle,minHeight:52,resize:"vertical"}} value={f.acceptanceCriteria} onChange={set("acceptanceCriteria")} placeholder="e.g. User can log in with SSO · Tests pass · Reviewed by QA" />
        </FormField>
        <FormField label="Blockers">
          <textarea style={{...inputStyle,minHeight:40,resize:"vertical"}} value={f.blockers} onChange={set("blockers")} placeholder="What is blocking or at risk?" />
        </FormField>
        <FormField label="Dependencies" hint="IDs or names of items this depends on">
          <input style={inputStyle} value={f.dependencies} onChange={set("dependencies")} placeholder="e.g. Auth module, Design spec, API v2…" />
        </FormField>
      </div>

      {/* ── Section 7: Optional extras (collapsed by default) ── */}
      <div style={{marginBottom:16}}>
        <button type="button" style={{...btnStyle("ghost","sm"),marginBottom:10,display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowOptional(v=>!v)}>
          {showOptional?"▼":"▶"} Optional fields — effort, sizing, tags, links
        </button>
        {showOptional && (
          <div>
            <div style={{...SECTION_LABEL_STYLE,marginBottom:10}}>⚖️ Sizing & Effort</div>
            <div style={G3}>
              <FormField label="Est. hours"><input style={inputStyle} type="number" value={f.estimatedHours} onChange={set("estimatedHours")} placeholder="e.g. 8" /></FormField>
              <FormField label="Actual hours"><input style={inputStyle} type="number" value={f.actualHours} onChange={set("actualHours")} placeholder="Fill in after" /></FormField>
              <FormField label="Story points"><input style={inputStyle} type="number" value={f.storyPoints} onChange={set("storyPoints")} placeholder="e.g. 3, 5, 8" /></FormField>
              <FormField label="Effort" hint="T-shirt size">
                <select style={inputStyle} value={f.effort} onChange={set("effort")}>
                  <option value="">— Select —</option>
                  {["XS","S","M","L","XL","XXL"].map(e=><option key={e}>{e}</option>)}
                </select>
              </FormField>
              <FormField label="Complexity">
                <select style={inputStyle} value={f.complexity} onChange={set("complexity")}>
                  {["Low","Medium","High","Very High"].map(c=><option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Risk level">
                <select style={inputStyle} value={f.risk} onChange={set("risk")}>
                  {["Low","Medium","High","Critical"].map(r=><option key={r}>{r}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{...SECTION_LABEL_STYLE,marginBottom:10,marginTop:8}}>🔗 Links & Tags</div>
            <div style={G2}>
              <FormField label="Tags" hint="Comma-separated"><input style={inputStyle} value={f.tags} onChange={set("tags")} placeholder="e.g. auth, frontend, v2…" /></FormField>
              <FormField label="Ticket / Ref" hint="Jira, Linear, GitHub issue"><input style={inputStyle} value={f.ticketRef} onChange={set("ticketRef")} placeholder="e.g. ENG-123, #456" /></FormField>
            </div>
            <FormField label="External URL"><input style={inputStyle} type="url" value={f.externalUrl} onChange={set("externalUrl")} placeholder="https://…" /></FormField>
            <FormField label="Assumptions" hint="What are we assuming to be true?">
              <textarea style={{...inputStyle,minHeight:44,resize:"vertical"}} value={f.assumptions} onChange={set("assumptions")} placeholder="e.g. API will be stable, design approved by launch…" />
            </FormField>
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:4}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={()=>{
          if(!f.item.trim()){toast("Item name required","error");return;}
          if(!f.sector.trim()){toast("Sector is required","error");return;}
          onSave(f);
        }}>Save item</button>
      </div>
    </div>
  );
}

const RoadmapItemCard = memo(({ item, indent=0, handlers }) => {
  const { changeStatus, clearBlocker, createTask, setEditing, setConfirm, updateProgress,
          setExpandedItem, setRoadmapItems, onLinkedSave, role, items, tasks, promptHistory,
          expandedAll, expandedItem } = handlers;

  const children = items.filter(i=>i.parentItemId===item.id);
  const overdue = item.targetDate && isOverdue(item.targetDate) && item.status!=="Done";
  const isExpanded = expandedAll || expandedItem===item.id;
  const lt = (tasks||[]).filter(t=>t.roadmapItemId===item.id).length;
  const lp = (promptHistory||[]).filter(p=>p.linkedRoadmapItemId===item.id).length;

  return (
    <div style={{marginBottom:6,marginLeft:indent*20}}>
      <div style={{
        background: "var(--surface)", 
        border: `1px solid ${item.status==="Blocked" ? "var(--danger)" : "var(--border)"}`, 
        borderLeft: `4px solid ${item.status==="Done" ? "var(--success)" : item.status==="Blocked" ? "var(--danger)" : "var(--accent)"}`,
        borderRadius: "var(--r-md)", 
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "transform 0.15s, box-shadow 0.15s"
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}>
        
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              {children.length>0&&<button onClick={()=>setExpandedItem(isExpanded?null:item.id)} style={{background:"var(--surface-raised)",border:"1px solid var(--border)",borderRadius:"4px",cursor:"pointer",color:"var(--text-muted)",fontSize:10,padding:"2px 6px",flexShrink:0, transition:"0.2s"}}>{isExpanded?"▼ Collapse":"▶ Expand"}</button>}
              <span style={{fontWeight:700,fontSize:15,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap", letterSpacing:"-0.2px"}}>{item.item}</span>
            </div>
            
            <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",flexWrap:"wrap",gap:8, marginBottom: 8}}>
              {(item.sector||item.phase||item.step||item.subStep)&&(
                <span style={{color:"var(--accent)",fontWeight:600, background:"var(--accent-dim)", padding:"2px 8px", borderRadius:"12px"}}>
                  {[item.sector,item.phase,item.step,item.subStep].filter(Boolean).join(" › ")}
                </span>
              )}
              {item.targetDate&&<span style={{color:overdue?"var(--danger)":undefined, background:overdue?"var(--danger-dim)":"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>📅 {fmtDate(item.targetDate)}{overdue&&" ⏰"}</span>}
              {item.owner&&<span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>👤 {item.owner}</span>}
              {item.storyPoints&&<span style={{background:"var(--surface-raised)", padding:"2px 8px", borderRadius:"12px"}}>🎯 {item.storyPoints}pt</span>}
              {item.risk&&item.risk!=="Low"&&<span style={{color:item.risk==="Critical"?"var(--danger)":item.risk==="High"?"var(--warning)":undefined}}>⚠️ {item.risk} risk</span>}
              {lt>0&&<span>✅ {lt} task{lt!==1?"s":""}</span>}
            </div>
            
            {item.blockers&&<div style={{marginTop:8,marginBottom:8,fontSize:12,color:"var(--danger)",background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.2)",padding:"6px 10px",borderRadius:"var(--r-sm)"}}><strong>Blocker:</strong> {item.blockers}</div>}
            
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center", background:"var(--surface-raised)", padding:"6px", borderRadius:"8px", border:"1px solid var(--border)"}}>
            <Badge label={item.status} size="sm" />
            <Badge label={item.priority} size="sm" />
          </div>
        </div>
        
        <div style={{marginTop:12,marginBottom:role==="Viewer"?0:12, background:"var(--surface-raised)", padding:"10px 14px", borderRadius:"8px", border:"1px solid var(--border)"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600}}><span>Progress</span><span style={{color:item.progress===100?"var(--success)":"var(--accent)"}}>{item.progress||0}%</span></div>
          {role!=="Viewer"
            ? <input type="range" min="0" max="100" step="5" value={item.progress||0}
                onChange={e=>{ const u=items.map(i=>i.id===item.id?{...i,progress:Number(e.target.value)}:i); setRoadmapItems(u); }}
                onPointerUp={e=>updateProgress(item.id, Number(e.target.value))}
                style={{width:"100%",accentColor:item.status==="Blocked"?"var(--danger)":item.status==="Done"?"var(--success)":"var(--accent)",cursor:"pointer"}} />
            : <ProgressBar value={item.progress||0} color={item.status==="Blocked"?"var(--danger)":item.status==="Done"?"var(--success)":"var(--accent)"} />
          }
        </div>
        
        {item.notes&&<div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12,lineHeight:1.6, padding:"8px 12px", background:"var(--background)", borderRadius:"6px", borderLeft:"2px solid var(--border)"}}>{item.notes}</div>}
        
        {role!=="Viewer"&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap", paddingTop: 10, borderTop:"1px dashed var(--border)"}}>
            {item.status!=="Done"&&<button style={{...btnStyle("ghost","sm"),color:"var(--success)", background:"var(--success-dim)"}} onClick={()=>changeStatus(item.id,"Done")}>✓ Mark Done</button>}
            {item.status!=="In Progress"&&item.status!=="Done"&&<button style={{...btnStyle("ghost","sm"),color:"var(--accent)", background:"var(--accent-dim)"}} onClick={()=>changeStatus(item.id,"In Progress")}>▶ Start</button>}
            {item.status!=="Blocked"&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)", background:"var(--danger-dim)"}} onClick={()=>changeStatus(item.id,"Blocked")}>Block</button>}
            {item.status==="Blocked"&&<button style={{...btnStyle("ghost","sm"),color:"var(--warning)"}} onClick={()=>clearBlocker(item.id)}>Clear Blocker</button>}
            <button style={btnStyle("ghost","sm")} onClick={()=>createTask(item)}>+ Task</button>
            <button style={btnStyle("ghost","sm")} onClick={()=>setEditing(item)}>Edit</button>
            {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={()=>setConfirm(item.id)}>Delete</button>}
          </div>
        )}
      </div>
      {isExpanded&&children.map(child=><RoadmapItemCard key={child.id} item={child} indent={indent+1} handlers={handlers} />)}
    </div>
  );
});

export default function RoadmapTrackerTab({ roadmapItems, setRoadmapItems, addAudit, role, tasks, setTasks, promptHistory, projectLogs, supportTickets , workspaceId = "workspace-1" , onLinkedSave, projects=[] }) {
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
  const [expandedAll, setExpandedAll] = useState(false);

  const allSectors = useMemo(()=>["All",...new Set(items.map(i=>i.sector).filter(Boolean))],[items]);

  const filtered = useMemo(()=>items.filter(item=>{
    const q=search.toLowerCase();
    return (!q||item.item?.toLowerCase().includes(q)||item.notes?.toLowerCase().includes(q)||item.sector?.toLowerCase().includes(q)||item.phase?.toLowerCase().includes(q)||item.step?.toLowerCase().includes(q)||item.team?.toLowerCase().includes(q)||item.tags?.toLowerCase().includes(q)||item.ticketRef?.toLowerCase().includes(q)||item.owner?.toLowerCase().includes(q))
      &&(filterProject==="All"||item.project===filterProject)
      &&(filterStatus==="All"||item.status===filterStatus)
      &&(filterPriority==="All"||item.priority===filterPriority)
      &&(filterSector==="All"||item.sector===filterSector);
  }),[items,search,filterProject,filterStatus,filterPriority,filterSector]);

  const save = async (f) => {
    const now = new Date().toISOString();
    if(editing){ const u=items.map(i=>i.id===editing.id?{...editing,...f,updatedAt:now}:i); setRoadmapItems(u); await saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Update",`Updated: ${f.item}`); toast("Updated"); }
    else { const ni={...f,id:genId(),createdAt:now,updatedAt:now}; const u=[ni,...items]; setRoadmapItems(u); await saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Create",`Added: ${f.item}`); toast("Item added"); }
    setShowForm(false); setEditing(null);
  };

  const del = async (id) => { const i=items.find(x=>x.id===id); const u=items.filter(x=>x.id!==id); setRoadmapItems(u); await saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Delete",`Deleted: ${i?.item}`); toast("Deleted","info"); setConfirm(null); };

  const changeStatus = async (id, status) => {
    const progress = status==="Done"?100:undefined;
    const u=items.map(i=>i.id===id?{...i,status,...(progress!==undefined?{progress}:{}),updatedAt:new Date().toISOString()}:i);
    setRoadmapItems(u); await saveWorkspaceData("roadmapItems", u, workspaceId); addAudit("Roadmap","Status",`${items.find(i=>i.id===id)?.item} → ${status}`); toast(`Marked ${status}`);
  };

  const clearBlocker = async (id) => {
    const u=items.map(i=>i.id===id?{...i,blockers:"",status:"In Progress",updatedAt:new Date().toISOString()}:i);
    setRoadmapItems(u); await saveWorkspaceData("roadmapItems", u, workspaceId); toast("Blocker cleared");
  };

  const createTask = async (item) => {
    if(role==="Viewer"){toast("Viewers cannot create tasks","error");return;}
    // Prefer the onLinkedSave integration if available (works across the whole app)
    if(onLinkedSave){
      onLinkedSave("task",{
        title:`[Roadmap] ${item.item}`,
        project:item.project||"",
        status:"Todo",
        priority:item.priority==="Critical"?"Urgent":item.priority||"Medium",
        dueDate:item.targetDate||"",
        roadmapItemId:item.id,
        description:item.notes||"",
        tags:["roadmap"],
        checklist:[]
      });
      toast("Task created from roadmap item");
      addAudit("Tasks","Create",`Task from roadmap: ${item.item}`);
      return;
    }
    // Fallback: write directly to tasks state if setTasks is provided
    if(!setTasks){toast("Task creation not available","error");return;}
    const nt={id:genId(),title:`[Roadmap] ${item.item}`,description:item.notes||"",project:item.project,contact:"",status:"Todo",priority:item.priority==="Critical"?"Urgent":item.priority,dueDate:item.targetDate||"",checklist:[],tags:["roadmap"],roadmapItemId:item.id,createdAt:new Date().toISOString().slice(0,10)};
    const u=[nt,...(tasks||[])]; setTasks(u); await saveWorkspaceData("tasks", u, workspaceId);
    addAudit("Tasks","Create",`Task from roadmap: ${item.item}`); toast("Task created from roadmap item");
  };

  const createLog = item => {
    if (onLinkedSave) {
      onLinkedSave("projectLog", { title: `[Roadmap] ${item.item}`, project: item.project||"", notes: item.notes||"", roadmapItemId: item.id });
      toast("Project log created");
    } else {
      toast("Open Project Logs and link this item manually","info");
    }
  };

  // Stat calculations
  const doneCount = items.filter(i=>i.status==="Done").length;
  const total = items.length;
  const blocked = items.filter(i=>i.status==="Blocked");
  const inProgress = items.filter(i=>i.status==="In Progress");
  const upcoming = items.filter(i=>["Planned","Backlog"].includes(i.status));
  const today = new Date().toISOString().slice(0,10);
  const overdueCount = items.filter(i=>i.targetDate && i.targetDate < today && i.status !== "Done").length;

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

  const updateProgress = useCallback(async (id, progress) => {
    const u = items.map(i => i.id===id ? {...i, progress, updatedAt: new Date().toISOString()} : i);
    setRoadmapItems(u);
    await saveWorkspaceData("roadmapItems", u, workspaceId);
  }, [items, setRoadmapItems, workspaceId]);

  const activeFilterCount = [filterProject!=="All", filterStatus!=="All", filterPriority!=="All", filterSector!=="All", search.trim()!==""].filter(Boolean).length;

  const handleExport = () => { exportToCSV("roadmap-items", filtered); toast("Roadmap items exported to CSV"); };

  // Handlers object passed down to extracted RoadmapItemCard component
  const cardHandlers = { changeStatus, clearBlocker, createTask, setEditing, setConfirm, updateProgress, setExpandedItem, setRoadmapItems, onLinkedSave, role, items, tasks, promptHistory, expandedAll, expandedItem };

  // Group helpers - nested structure: Project → Sector → Phase → Step
  const groupByNested = () => {
    const result = {};
    filtered.forEach(item => {
      const project = item.project || "(No Project)";
      const sector  = item.sector  || "(No Sector)";
      const phase   = item.phase   || "(No Phase)";
      const step    = item.step    || "";  // empty = no step grouping
      if (!result[project]) result[project] = { sectors: {} };
      if (!result[project].sectors[sector]) result[project].sectors[sector] = { phases: {} };
      if (!result[project].sectors[sector].phases[phase]) result[project].sectors[sector].phases[phase] = { steps: {}, direct: [] };
      if (step) {
        if (!result[project].sectors[sector].phases[phase].steps[step]) result[project].sectors[sector].phases[phase].steps[step] = [];
        result[project].sectors[sector].phases[phase].steps[step].push(item);
      } else {
        result[project].sectors[sector].phases[phase].direct.push(item);
      }
    });
    return result;
  };

  const pct = (done, total) => total > 0 ? Math.round((done / total) * 100) : 0;
  const statBar = (items, width=80, color="var(--accent)") => {
    const done = items.filter(i=>i.status==="Done").length;
    const blocked = items.filter(i=>i.status==="Blocked").length;
    const p = pct(done, items.length);
    return { done, blocked, p, el: <><div style={{width}}><ProgressBar value={p} color={color} /></div><span style={{fontSize:10,fontWeight:700,color:p===100?"var(--success)":color}}>{p}%</span></> };
  };

  const renderNestedView = () => {
    const nested = groupByNested();
    if(Object.keys(nested).length === 0) return <EmptyState icon="🗺️" title="No roadmap items" sub="Add your first item." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add item</button>} />;
    return <>{Object.entries(nested).map(([project, projectData]) => {
      const allProjectItems = Object.values(projectData.sectors).flatMap(sd => Object.values(sd.phases).flatMap(ph => [...ph.direct, ...Object.values(ph.steps).flat()]));
      const pb = statBar(allProjectItems, 100, "var(--accent)");
      return (
        <div key={project} style={{marginBottom:24}}>
          {/* Project header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"var(--surface-raised)",borderRadius:"var(--r-lg)",border:"1px solid var(--border)",marginBottom:12,gap:12}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>📁 {project}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:11,color:"var(--text-muted)"}}>{pb.done}/{allProjectItems.length} done</span>
              {pb.el}
            </div>
          </div>

          {Object.entries(projectData.sectors).map(([sector, sectorData]) => {
            const allSectorItems = Object.values(sectorData.phases).flatMap(ph => [...ph.direct, ...Object.values(ph.steps).flat()]);
            const sb = statBar(allSectorItems, 70, "var(--purple)");
            return (
              <div key={sector} style={{marginLeft:16,marginBottom:16}}>
                {/* Sector header */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--surface)",borderRadius:"var(--r-md)",border:"1px solid var(--border)",marginBottom:8,gap:12}}>
                  <div style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>🏷️ {sector}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <span style={{fontSize:11,color:"var(--text-muted)"}}>{sb.done}/{allSectorItems.length}</span>
                    {sb.blocked>0&&<span style={{fontSize:11,color:"var(--danger)"}}>🚫 {sb.blocked}</span>}
                    {sb.el}
                  </div>
                </div>

                {Object.entries(sectorData.phases).map(([phase, phaseData]) => {
                  const allPhaseItems = [...phaseData.direct, ...Object.values(phaseData.steps).flat()];
                  const phb = statBar(allPhaseItems, 55, "var(--success)");
                  const hasSteps = Object.keys(phaseData.steps).length > 0;
                  return (
                    <div key={phase} style={{marginLeft:16,marginBottom:12}}>
                      {/* Phase header */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"var(--surface-raised)",borderRadius:"var(--r-sm)",marginBottom:8,gap:8}}>
                        <div style={{fontWeight:600,fontSize:12,color:"var(--text-muted)"}}>📐 {phase}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          <span style={{fontSize:10,color:"var(--text-muted)"}}>{phb.done}/{allPhaseItems.length}</span>
                          {phb.el}
                        </div>
                      </div>

                      {/* Items without a step (direct) */}
                      {phaseData.direct.map(item => <RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}

                      {/* Step groups */}
                      {hasSteps && Object.entries(phaseData.steps).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([step, stepItems]) => {
                        const stb = statBar(stepItems, 45, "var(--accent)");
                        return (
                          <div key={step} style={{marginLeft:14,marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:"var(--surface)",borderRadius:"var(--r-sm)",border:"1px dashed var(--border)",marginBottom:6,gap:8}}>
                              <div style={{fontWeight:700,fontSize:11,color:"var(--accent)",minWidth:20}}>◆ {step}</div>
                              <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                                <span style={{fontSize:10,color:"var(--text-muted)"}}>{stb.done}/{stepItems.length}</span>
                                {stb.el}
                              </div>
                            </div>
                            {stepItems.map(item => <RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    })}</>;
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
        {groupItems.map(item=><RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}
      </div>
    );
  });

  // Next Actions: items in Planned/Backlog ordered by priority
  const priorityOrder = {Critical:0,Urgent:1,High:2,Medium:3,Low:4};
  const nextActions = [...filtered].filter(i=>["Planned","Backlog"].includes(i.status)).sort((a,b)=>(priorityOrder[a.priority]||3)-(priorityOrder[b.priority]||3)).slice(0,15);

  const renderView = () => {
    if(view==="Nested") {
      return renderNestedView();
    }
    if(view==="Blocked") {
      const bl = filtered.filter(i=>i.status==="Blocked");
      return bl.length===0?<EmptyState icon="✅" title="Nothing blocked" sub="No blocked roadmap items." />:(
        <div>{bl.map(item=><RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}</div>
      );
    }
    if(view==="Done") {
      const dn = filtered.filter(i=>i.status==="Done");
      return dn.length===0?<EmptyState icon="🗺️" title="Nothing done yet" sub="Mark items as done to see them here." />:(
        <div>{dn.map(item=><RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}</div>
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
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{item.project} · {[item.sector,item.phase,item.step,item.subStep].filter(Boolean).join(" › ")}{item.targetDate&&` · 📅 ${fmtDate(item.targetDate)}`}</div>
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
      // Implement a visual Kanban/Timeline view
      const statuses = ["Backlog", "Planned", "In Progress", "Blocked", "Done"];
      
      return (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{
            display: "grid", 
            gridTemplateColumns: `repeat(${statuses.length}, minmax(280px, 1fr))`, 
            gap: 16, 
            overflowX: "auto", 
            paddingBottom: 24,
            alignItems: "flex-start"
          }}>
            {statuses.map(status => {
              const statusItems = filtered.filter(i => i.status === status).sort((a,b)=>(priorityOrder[a.priority]||3)-(priorityOrder[b.priority]||3));
              return (
                <Droppable droppableId={status} key={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        background: snapshot.isDraggingOver ? "var(--accent-dim)" : "var(--surface-raised)",
                        borderRadius: "var(--r-lg)",
                        padding: 12,
                        border: "1px solid var(--border)",
                        minHeight: 300,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        transition: "background 0.2s"
                      }}
                    >
                      <div style={{
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--surface)",
                        borderRadius: "var(--r-md)",
                        borderBottom: `2px solid ${status==="Done"?"var(--success)":status==="Blocked"?"var(--danger)":status==="In Progress"?"var(--accent)":"var(--border)"}`
                      }}>
                        <div style={{fontWeight: 700, fontSize: 13, color: "var(--text)"}}>{status}</div>
                        <Badge label={statusItems.length.toString()} size="sm" />
                      </div>
                      
                      {statusItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={role==="Viewer"}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: "var(--surface)",
                                border: snapshot.isDragging ? "1px solid var(--primary)" : "1px solid var(--border)",
                                borderRadius: "var(--r-md)",
                                padding: 12,
                                boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : "0 2px 4px rgba(0,0,0,0.02)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                cursor: role==="Viewer" ? "default" : "grab",
                                opacity: snapshot.isDragging ? 0.9 : 1,
                                transform: snapshot.isDragging ? "scale(1.02)" : "none",
                                transition: "box-shadow 0.2s",
                                ...provided.draggableProps.style
                              }}
                            >
                              <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                                <span style={{fontWeight: 600, fontSize: 13, color: "var(--text)"}}>{item.item}</span>
                                <Badge label={item.priority} size="sm" />
                              </div>
                              <div style={{fontSize: 11, color: "var(--text-muted)"}}>
                                {item.project} {[item.sector, item.phase].filter(Boolean).map(x=> `· ${x}`).join(" ")}
                              </div>
                              {item.targetDate && (
                                <div style={{fontSize: 11, color: item.targetDate<today && status!=="Done" ? "var(--danger)" : "var(--text-muted)"}}>
                                  📅 {fmtDate(item.targetDate)} {item.targetDate<today && status!=="Done" && "⚠️"}
                                </div>
                              )}
                              <ProgressBar value={item.progress||0} color={status==="Blocked"?"var(--danger)":status==="Done"?"var(--success)":"var(--accent)"} />
                              {role!=="Viewer"&&(
                                <div style={{display:"flex", gap:4, marginTop: 4, flexWrap: "wrap"}}>
                                  <button style={btnStyle("ghost","sm")} onClick={()=>setEditing(item)}>Edit</button>
                                  {status!=="In Progress" && status!=="Done" && <button style={{...btnStyle("ghost","sm"), color:"var(--accent)"}} onClick={()=>changeStatus(item.id, "In Progress")}>Start</button>}
                                  {status==="In Progress" && <button style={{...btnStyle("ghost","sm"), color:"var(--success)"}} onClick={()=>changeStatus(item.id, "Done")}>Done</button>}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {statusItems.length === 0 && !snapshot.isDraggingOver && (
                        <div style={{padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontStyle: "italic"}}>
                          No items
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      );
    }
    return filtered.length===0?<EmptyState icon="🗺️" title="No roadmap items" sub="Add your first item." action={<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add item</button>} />:(
      <div>{filtered.map(item=><RoadmapItemCard key={item.id} item={item} handlers={cardHandlers} />)}</div>
    );
  };

  return (
    <div>
      {confirm&&<Confirm msg="Delete this roadmap item?" onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit roadmap item":"Add roadmap item"} onClose={()=>{setShowForm(false);setEditing(null);}} width={780}><RoadmapForm initial={editing||{}} onSave={save} onClose={()=>{setShowForm(false);setEditing(null);}} roadmapItems={items} tasks={tasks||[]} prompts={promptHistory||[]} logs={projectLogs||[]} tickets={supportTickets||[]} projects={projects} /></Modal>}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)",letterSpacing:"-0.4px"}}>Roadmap Tracker</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>{doneCount}/{total} done · {blocked.length} blocked · {inProgress.length} in progress{overdueCount>0&&<span style={{color:"var(--danger)"}}> · ⏰ {overdueCount} overdue</span>}</p>
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
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {VIEWS.map(v=><button key={v} style={btnStyle(view===v?"primary":"ghost","sm")} onClick={()=>setView(v)}>{v}</button>)}
        {view==="Nested"&&<>
          <div style={{width:1,height:20,background:"var(--border)",margin:"0 2px"}} />
          <button style={btnStyle("ghost","sm")} onClick={()=>setExpandedAll(true)}>Expand all</button>
          <button style={btnStyle("ghost","sm")} onClick={()=>{setExpandedAll(false);setExpandedItem(null);}}>Collapse all</button>
        </>}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search roadmap…" />
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="All">All projects</option>{ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{...inputStyle,width:"auto"}} value={filterSector} onChange={e=>setFilterSector(e.target.value)}>{allSectors.map(s=><option key={s} value={s}>{s==="All"?"All sectors":s}</option>)}</select>
        {activeFilterCount>0&&(
          <button style={{...btnStyle("ghost","sm"),color:"var(--accent)",display:"flex",alignItems:"center",gap:4}} onClick={()=>{setSearch("");setFilterProject("All");setFilterStatus("All");setFilterPriority("All");setFilterSector("All");}}>
            <span style={{background:"var(--accent)",color:"#fff",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{activeFilterCount}</span>
            Clear filters
          </button>
        )}
        <span style={{marginLeft:"auto",fontSize:11,color:"var(--text-muted)"}}>{filtered.length} of {total} items</span>
      </div>

      {renderView()}
    </div>
  );
}
