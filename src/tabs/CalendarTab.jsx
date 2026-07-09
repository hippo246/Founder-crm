import { useState, useMemo, useCallback, useRef } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { CAL_TYPES, CAL_TYPE_ICONS } from "../config/crmConfig.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const SOURCE_CONFIG = {
  event:   { label:"Events",    dot:"var(--accent,#6c63ff)" },
  task:    { label:"Tasks",     dot:"#22c55e" },
  roadmap: { label:"Roadmap",   dot:"#f59e0b" },
};

const TYPE_COLORS = {
  Meeting:"#3b82f6", Deadline:"#ef4444", Payment:"#f59e0b",
  Reminder:"#8b5cf6", Call:"#06b6d4", Other:"#6b7280",
};

const QUICK_DATE_OFFSETS = [
  { label:"Today",     days:0 },
  { label:"Tomorrow",  days:1 },
  { label:"+3 days",   days:3 },
  { label:"Next week", days:7 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateStr(year, month, day) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
function offsetDate(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function getTaskStatusColor(s) {
  return ({Done:"#22c55e","In Progress":"#3b82f6",Blocked:"#ef4444",Cancelled:"#6b7280",Todo:"#a78bfa"})[s]||"var(--text-muted)";
}
function getRoadmapStatusColor(s) {
  return ({Done:"#22c55e","In Progress":"#3b82f6",Planned:"#f59e0b",Blocked:"#ef4444",Cancelled:"#6b7280"})[s]||"var(--text-muted)";
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date(new Date().toDateString())) / 86400000);
  return diff;
}
function relativeDayLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "";
  if (d === 0)  return "today";
  if (d === 1)  return "tomorrow";
  if (d === -1) return "yesterday";
  if (d > 0)   return `in ${d}d`;
  return `${Math.abs(d)}d ago`;
}

// ─── CalForm ─────────────────────────────────────────────────────────────────
function CalForm({ initial={}, onSave, onClose, projects=[], tasks=[], followUps=[], invoices=[], proposals=[], prefillDate=null }) {
  const defaultDate = prefillDate || new Date().toISOString().slice(0,10);
  const [f, setF] = useState({
    title:"", type:"Meeting", date:defaultDate, time:"",
    relatedClient:"", relatedProject:"", notes:"", priority:"Normal",
    linkedTaskId:"", linkedFollowUpId:"", linkedInvoiceId:"", linkedProposalId:"",
    createdAt:new Date().toISOString().slice(0,10), ...initial
  });
  const [errors, setErrors] = useState({});
  const titleRef = useRef();

  const set = k => e => { setF(p=>({...p,[k]:e.target.value})); if(errors[k]) setErrors(p=>({...p,[k]:null})); };

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = "Title is required";
    if (!f.date)          e.date  = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(f); };

  // keyboard: Enter submits, Esc closes
  const handleKeyDown = e => { if (e.key === "Enter" && (e.metaKey||e.ctrlKey)) handleSave(); if (e.key === "Escape") onClose(); };

  const typeColor = TYPE_COLORS[f.type] || "var(--accent)";

  return (
    <div onKeyDown={handleKeyDown}>

      {/* Type pill selector */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {CAL_TYPES.map(t => (
          <button key={t} onClick={()=>setF(p=>({...p,type:t}))} style={{
            padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
            border:`1.5px solid ${f.type===t ? (TYPE_COLORS[t]||"var(--accent)") : "var(--border)"}`,
            background: f.type===t ? `${TYPE_COLORS[t]||"var(--accent)"}18` : "transparent",
            color: f.type===t ? (TYPE_COLORS[t]||"var(--accent)") : "var(--text-muted)",
            transition:"all 0.12s",
          }}>{CAL_TYPE_ICONS[t]||"📅"} {t}</button>
        ))}
      </div>

      {/* Title — full width, prominent */}
      <div style={{marginBottom:12}}>
        <input
          ref={titleRef}
          autoFocus
          style={{
            ...inputStyle,
            fontSize:15, fontWeight:600,
            border: errors.title ? "1.5px solid var(--danger)" : `1.5px solid ${f.title ? typeColor+"66" : "var(--border)"}`,
            padding:"9px 12px",
          }}
          placeholder="Event title…"
          value={f.title}
          onChange={set("title")}
        />
        {errors.title && <div style={{fontSize:11,color:"var(--danger)",marginTop:3}}>{errors.title}</div>}
      </div>

      {/* Date + quick chips + Time */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <label style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",minWidth:32}}>Date</label>
          {QUICK_DATE_OFFSETS.map(o=>(
            <button key={o.label} onClick={()=>setF(p=>({...p,date:offsetDate(o.days)}))} style={{
              padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:600, cursor:"pointer",
              border:"1px solid var(--border)",
              background: f.date===offsetDate(o.days) ? "var(--accent)" : "transparent",
              color: f.date===offsetDate(o.days) ? "#fff" : "var(--text-muted)",
              transition:"all 0.1s",
            }}>{o.label}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
          <div>
            <input
              style={{...inputStyle, border: errors.date ? "1.5px solid var(--danger)" : "1.5px solid var(--border)"}}
              type="date" value={f.date} onChange={set("date")}
            />
            {errors.date && <div style={{fontSize:11,color:"var(--danger)",marginTop:3}}>{errors.date}</div>}
          </div>
          <input style={{...inputStyle,width:110}} type="time" value={f.time} onChange={set("time")} placeholder="Time (opt)" />
        </div>
      </div>

      {/* Client + Project */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginBottom:12}}>
        <FormField label="Client">
          <input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} placeholder="Client name…" />
        </FormField>
        <FormField label="Project">
          <select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}>
            <option value="">— None —</option>
            {projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </FormField>
      </div>

      {/* Priority */}
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:5}}>Priority</label>
        <div style={{display:"flex",gap:6}}>
          {["Low","Normal","High","Urgent"].map(p=>{
            const colors={Low:"#6b7280",Normal:"#3b82f6",High:"#f59e0b",Urgent:"#ef4444"};
            const active = f.priority===p;
            return (
              <button key={p} onClick={()=>setF(prev=>({...prev,priority:p}))} style={{
                padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1.5px solid ${active ? colors[p] : "var(--border)"}`,
                background: active ? colors[p]+"20" : "transparent",
                color: active ? colors[p] : "var(--text-muted)",
                transition:"all 0.1s",
              }}>{p}</button>
            );
          })}
        </div>
      </div>

      {/* Links — collapsible section */}
      <details style={{marginBottom:12}}>
        <summary style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",cursor:"pointer",userSelect:"none",marginBottom:6,listStyle:"none",display:"flex",alignItems:"center",gap:4}}>
          <span>🔗</span> Link to existing records <span style={{fontSize:9,opacity:.6}}>(optional)</span>
        </summary>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginTop:8}}>
          <FormField label="Task">
            <select style={inputStyle} value={f.linkedTaskId} onChange={set("linkedTaskId")}>
              <option value="">— None —</option>
              {tasks.filter(t=>!["Done","Cancelled"].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </FormField>
          <FormField label="Follow-up">
            <select style={inputStyle} value={f.linkedFollowUpId} onChange={set("linkedFollowUpId")}>
              <option value="">— None —</option>
              {followUps.filter(f=>f.status==="Pending").map(fu=><option key={fu.id} value={fu.id}>{fu.person} — {fu.type}</option>)}
            </select>
          </FormField>
          <FormField label="Invoice">
            <select style={inputStyle} value={f.linkedInvoiceId} onChange={set("linkedInvoiceId")}>
              <option value="">— None —</option>
              {invoices.filter(i=>!["Paid","Cancelled"].includes(i.status)).map(inv=><option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.client}</option>)}
            </select>
          </FormField>
          <FormField label="Proposal">
            <select style={inputStyle} value={f.linkedProposalId} onChange={set("linkedProposalId")}>
              <option value="">— None —</option>
              {proposals.filter(p=>["Sent","Viewed"].includes(p.status)).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </FormField>
        </div>
      </details>

      {/* Notes */}
      <FormField label="Notes">
        <textarea style={{...inputStyle,minHeight:60,resize:"vertical"}} value={f.notes} onChange={set("notes")} placeholder="Any additional details…" />
      </FormField>

      {/* Footer */}
      <div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <span style={{fontSize:11,color:"var(--text-muted)"}}>⌘↵ to save · Esc to cancel</span>
        <div style={{display:"flex",gap:8}}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button style={btnStyle("primary")} onClick={handleSave}>Save event</button>
        </div>
      </div>
    </div>
  );
}


// ─── EventRow ─────────────────────────────────────────────────────────────────
function EventRow({ e, role, onLinkedSave, onEdit, onDelete, getLinkedContext, compact=false }) {
  const [expanded, setExpanded] = useState(false);
  const overdue  = isOverdue(e.date) && ["Deadline","Payment"].includes(e.type);
  const linked   = getLinkedContext(e);
  const rel      = relativeDayLabel(e.date);
  const typeClr  = TYPE_COLORS[e.type] || "var(--accent)";
  const priColors = {Low:"#6b7280",Normal:"#3b82f6",High:"#f59e0b",Urgent:"#ef4444"};
  const priClr = e.priority && e.priority!=="Normal" ? priColors[e.priority] : null;

  return (
    <div style={{
      borderBottom:"1px solid var(--border)",
      background: expanded ? "var(--surface-raised)" : "transparent",
      borderRadius: expanded ? "var(--r-sm)" : 0,
      marginBottom: expanded ? 4 : 0,
      transition:"background 0.1s",
    }}>
      <div
        style={{display:"flex",gap:10,alignItems:"flex-start",padding:compact?"7px 8px":"11px 8px",cursor:"pointer"}}
        onClick={()=>setExpanded(v=>!v)}
      >
        {/* Type colour bar */}
        <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:typeClr,flexShrink:0,minHeight:28,marginTop:2}} />

        {/* Icon */}
        <div style={{
          width:compact?28:34, height:compact?28:34, borderRadius:"var(--r-md)",
          background: overdue ? "var(--danger-dim)" : `${typeClr}15`,
          border:`1px solid ${overdue?"rgba(239,68,68,0.3)":typeClr+"30"}`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:compact?12:15,flexShrink:0,
        }}>{CAL_TYPE_ICONS[e.type]||"📅"}</div>

        {/* Main content */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:600,fontSize:compact?12:13,color:overdue?"var(--danger)":"var(--text)"}}>{e.title}{overdue&&" ⏰"}</span>
            {priClr && <span style={{fontSize:9,fontWeight:700,color:priClr,textTransform:"uppercase",letterSpacing:"0.4px"}}>{e.priority}</span>}
          </div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
            <span style={{color:overdue?"var(--danger)":rel==="today"?"var(--accent)":"var(--text-muted)",fontWeight:rel==="today"?600:400}}>{rel}</span>
            <span>·</span>
            <span>{fmtDate(e.date)}{e.time&&` ${e.time}`}</span>
            {e.relatedClient&&<><span>·</span><span>{e.relatedClient}</span></>}
            {e.relatedProject&&<><span>·</span><span>📁 {e.relatedProject}</span></>}
          </div>
          {linked.length>0&&<div style={{fontSize:10,color:"var(--accent)",marginTop:3,display:"flex",flexWrap:"wrap",gap:6}}>{linked.map((l,i)=><span key={i}>{l}</span>)}</div>}
        </div>

        {/* Right badges */}
        <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
          <Badge label={e.type} size="sm" />
          <span style={{fontSize:12,color:"var(--text-muted)",userSelect:"none"}}>{expanded?"▲":"▼"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{padding:"0 8px 10px 8px",paddingLeft:23}}>
          {e.notes && <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:8,padding:"6px 10px",background:"var(--surface)",borderRadius:"var(--r-sm)",borderLeft:`3px solid ${typeClr}40`}}>{e.notes}</div>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {role!=="Viewer"&&<button style={btnStyle("ghost","sm")} onClick={e2=>{e2.stopPropagation();onEdit(e);}}>✏️ Edit</button>}
            {(role==="Owner"||role==="Admin")&&<button style={{...btnStyle("ghost","sm"),color:"var(--danger)"}} onClick={e2=>{e2.stopPropagation();onDelete(e.id);}}>🗑️ Delete</button>}
            {onLinkedSave&&<>
              <button style={btnStyle("ghost","sm")} onClick={e2=>{e2.stopPropagation();onLinkedSave("followUp",{person:e.relatedClient||"",relatedTo:e.title,relatedType:"Calendar",type:e.type||"Call",dueDate:e.date||new Date().toISOString().slice(0,10),status:"Pending",notes:e.notes||""});}}>📞 Follow-Up</button>
              <button style={btnStyle("ghost","sm")} onClick={e2=>{e2.stopPropagation();onLinkedSave("task",{title:e.title,project:e.relatedProject||"",status:"Todo",priority:"Medium",dueDate:e.date||""});}}>✅ Task</button>
              <button style={btnStyle("ghost","sm")} onClick={e2=>{e2.stopPropagation();onLinkedSave("note",{title:`Note — ${e.title}`,relatedTo:e.title,relatedType:"Calendar",body:e.notes||"",tags:[]});}}>📝 Note</button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── DayDetailPanel ───────────────────────────────────────────────────────────
function DayDetailPanel({ dateStr, items, role, onLinkedSave, onEdit, onDelete, getLinkedContext, onClose, onAddForDate }) {
  if (!dateStr) return null;
  const d = daysUntil(dateStr);
  const labelColor = d === 0 ? "var(--accent)" : d < 0 ? "var(--danger)" : "var(--text)";

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",marginBottom:16,overflow:"hidden"}}>
      <div style={{
        display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 14px",borderBottom:"1px solid var(--border)",
        background:"var(--surface-raised)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:700,fontSize:13,color:labelColor}}>
            {d===0?"📅 Today":d===1?"📅 Tomorrow":"📅"} {fmtDate(dateStr)}
          </span>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{items.length} item{items.length!==1?"s":""}</span>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {role!=="Viewer"&&<button style={btnStyle("primary","sm")} onClick={()=>onAddForDate(dateStr)}>+ Add here</button>}
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:"0 2px",lineHeight:1}}>✕</button>
        </div>
      </div>

      <div style={{padding:"4px 0"}}>
        {items.length === 0
          ? <div style={{padding:"16px 14px",fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>
              Nothing scheduled.{role!=="Viewer"&&<> <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",textDecoration:"underline",fontSize:12,padding:0}} onClick={()=>onAddForDate(dateStr)}>Add an event</button></>}
            </div>
          : items.map((item,i) => {
              if (item._source === "task") return (
                <div key={item.id+i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 14px",borderBottom:"1px solid var(--border)"}}>
                  <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:"#22c55e",flexShrink:0}} />
                  <span style={{fontSize:14,flexShrink:0}}>✅</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:12,color:"var(--text)"}}>{item.title}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{color:getTaskStatusColor(item.status)}}>{item.status}</span>
                      {item.priority&&<span>· {item.priority}</span>}
                      {item.project&&<span>· 📁 {item.project}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 6px",borderRadius:10,background:"rgba(34,197,94,0.1)",color:"#16a34a",fontWeight:600,flexShrink:0}}>Task</span>
                </div>
              );
              if (item._source === "roadmap") return (
                <div key={item.id+i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 14px",borderBottom:"1px solid var(--border)"}}>
                  <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:"#f59e0b",flexShrink:0}} />
                  <span style={{fontSize:14,flexShrink:0}}>🗺️</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:12,color:"var(--text)"}}>{item.title}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{color:getRoadmapStatusColor(item.status)}}>{item.status}</span>
                      {item.priority&&<span>· {item.priority}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 6px",borderRadius:10,background:"rgba(245,158,11,0.1)",color:"#d97706",fontWeight:600,flexShrink:0}}>Milestone</span>
                </div>
              );
              return <EventRow key={item.id} e={item} role={role} onLinkedSave={onLinkedSave} onEdit={onEdit} onDelete={onDelete} getLinkedContext={getLinkedContext} compact />;
            })
        }
      </div>
    </div>
  );
}


// ─── WeekStrip ───────────────────────────────────────────────────────────────
function WeekStrip({ allItems, today, selectedDate, onSelectDate }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const days = useMemo(() => {
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d.toISOString().slice(0,10);
    });
  }, [weekStart]);

  const dateMap = useMemo(() => {
    const m = {};
    for (const item of allItems) {
      const date = item.date;
      if (!date || !days.includes(date)) continue;
      if (!m[date]) m[date] = [];
      m[date].push(item);
    }
    return m;
  }, [allItems, days]);

  const weekLabel = `${new Date(days[0]).toLocaleDateString("en-IN",{month:"short",day:"numeric"})} – ${new Date(days[6]).toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"})}`;

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",marginBottom:16,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid var(--border)",background:"var(--surface-raised)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setWeekOffset(p=>p-1)} style={{background:"none",border:"1px solid var(--border)",cursor:"pointer",width:26,height:26,borderRadius:5,fontSize:13,color:"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={()=>setWeekOffset(p=>p+1)} style={{background:"none",border:"1px solid var(--border)",cursor:"pointer",width:26,height:26,borderRadius:5,fontSize:13,color:"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{weekLabel}</span>
        </div>
        {weekOffset!==0&&<button onClick={()=>setWeekOffset(0)} style={{...btnStyle("ghost","sm"),fontSize:10}}>This week</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
        {days.map(dateStr => {
          const isToday  = dateStr === today;
          const isSel    = dateStr === selectedDate;
          const dayItems = dateMap[dateStr] || [];
          const d        = new Date(dateStr);
          return (
            <div key={dateStr} onClick={()=>onSelectDate(isSel?null:dateStr)} style={{
              padding:"8px 6px", borderRight:"1px solid var(--border)", cursor:"pointer", minHeight:60,
              background: isSel ? "var(--accent)" : isToday ? "var(--accent-dim,rgba(108,99,255,0.08))" : "transparent",
              transition:"background 0.1s",
            }}>
              <div style={{textAlign:"center",marginBottom:4}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:isSel?"rgba(255,255,255,0.7)":isToday?"var(--accent)":"var(--text-muted)"}}>
                  {DAYS_SHORT[d.getDay()]}
                </div>
                <div style={{
                  width:22,height:22,borderRadius:"50%",margin:"2px auto 0",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:isToday||isSel?700:400,
                  color:isSel?"#fff":isToday?"var(--accent)":"var(--text)",
                  background:isToday&&!isSel?"var(--accent-dim)":"transparent",
                  border:isToday&&!isSel?"1.5px solid var(--accent)":"1.5px solid transparent",
                }}>{d.getDate()}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {dayItems.slice(0,3).map((item,i)=>(
                  <div key={item.id+i} style={{
                    fontSize:8,lineHeight:"11px",borderRadius:2,padding:"1px 3px",fontWeight:600,
                    background: isSel?"rgba(255,255,255,0.2)":item._source==="task"?"rgba(34,197,94,0.15)":item._source==="roadmap"?"rgba(245,158,11,0.15)":"rgba(108,99,255,0.15)",
                    color: isSel?"#fff":item._source==="task"?"#16a34a":item._source==="roadmap"?"#d97706":"var(--accent)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                  }}>{item.title}</div>
                ))}
                {dayItems.length>3&&<div style={{fontSize:8,color:isSel?"rgba(255,255,255,0.6)":"var(--text-muted)",textAlign:"center"}}>+{dayItems.length-3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── BigCalendar ──────────────────────────────────────────────────────────────
function BigCalendar({ allItems, today, onSelectDate, selectedDate }) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = calMonth;
  const prevMonth = () => setCalMonth(p => p.month === 0 ? { year:p.year-1, month:11 } : { year:p.year, month:p.month-1 });
  const nextMonth = () => setCalMonth(p => p.month === 11 ? { year:p.year+1, month:0 } : { year:p.year, month:p.month+1 });
  const goToday   = () => { const d = new Date(today); setCalMonth({ year:d.getFullYear(), month:d.getMonth() }); onSelectDate(today); };

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const dateMap = useMemo(() => {
    const m = {};
    for (const item of allItems) {
      const date = item.date;
      if (!date) continue;
      const d = new Date(date);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      if (!m[date]) m[date] = { events:[], tasks:[], roadmap:[] };
      if      (item._source==="task")    m[date].tasks.push(item);
      else if (item._source==="roadmap") m[date].roadmap.push(item);
      else                               m[date].events.push(item);
    }
    return m;
  }, [allItems, year, month]);

  // Month stats
  const monthStats = useMemo(() => {
    let ev=0,tk=0,rm=0;
    for (const b of Object.values(dateMap)) { ev+=b.events.length; tk+=b.tasks.length; rm+=b.roadmap.length; }
    return {ev,tk,rm};
  }, [dateMap]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",marginBottom:16,overflow:"hidden"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--surface-raised)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prevMonth} style={{background:"none",border:"1px solid var(--border)",cursor:"pointer",width:28,height:28,borderRadius:6,fontSize:14,color:"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={nextMonth} style={{background:"none",border:"1px solid var(--border)",cursor:"pointer",width:28,height:28,borderRadius:6,fontSize:14,color:"var(--text-muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          <span style={{fontWeight:700,fontSize:15,color:"var(--text)",minWidth:150}}>{MONTH_NAMES[month]} {year}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Month stats */}
          <div style={{display:"flex",gap:10}}>
            {[
              {count:monthStats.ev, color:"var(--accent,#6c63ff)", label:"events"},
              {count:monthStats.tk, color:"#22c55e",               label:"tasks"},
              {count:monthStats.rm, color:"#f59e0b",               label:"milestones"},
            ].filter(s=>s.count>0).map(s=>(
              <div key={s.label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--text-muted)"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:s.color,display:"inline-block"}} />
                <span style={{fontWeight:600,color:s.color}}>{s.count}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <button onClick={goToday} style={{...btnStyle("ghost","sm"),fontSize:11}}>Today</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid var(--border)"}}>
        {DAYS_SHORT.map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",padding:"5px 0",letterSpacing:"0.5px"}}>
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{minHeight:78,borderRight:"1px solid var(--border)",borderBottom:"1px solid var(--border)",background:"var(--surface-raised)",opacity:.25}} />;

          const dateStr = toDateStr(year, month, d);
          const isToday = dateStr === today;
          const isSel   = dateStr === selectedDate;
          const bucket  = dateMap[dateStr];
          const evCount = bucket?.events.length  || 0;
          const tkCount = bucket?.tasks.length   || 0;
          const rmCount = bucket?.roadmap.length || 0;
          const total   = evCount + tkCount + rmCount;

          return (
            <div key={dateStr} onClick={()=>onSelectDate(isSel?null:dateStr)} style={{
              minHeight:78, padding:"5px 5px 4px",
              borderRight:"1px solid var(--border)",
              borderBottom:"1px solid var(--border)",
              cursor:"pointer",
              background: isSel ? "var(--accent,#6c63ff)" : isToday ? "rgba(108,99,255,0.07)" : "transparent",
              transition:"background 0.1s",
              userSelect:"none",
            }}>
              {/* Day number */}
              <div style={{
                width:22,height:22,borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:isToday||isSel?700:400,
                color:isSel?"#fff":isToday?"var(--accent,#6c63ff)":"var(--text)",
                background:isToday&&!isSel?"rgba(108,99,255,0.15)":"transparent",
                border:isToday&&!isSel?"1.5px solid var(--accent,#6c63ff)":"1.5px solid transparent",
                marginBottom:3,
              }}>{d}</div>

              {/* Chips */}
              {total > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {evCount>0&&(
                    <div style={{fontSize:9,fontWeight:600,lineHeight:"13px",borderRadius:3,padding:"0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      background:isSel?"rgba(255,255,255,0.2)":"rgba(108,99,255,0.13)",
                      color:isSel?"#fff":"var(--accent,#6c63ff)",
                    }}>{evCount===1?bucket.events[0].title:`${evCount} events`}</div>
                  )}
                  {tkCount>0&&(
                    <div style={{fontSize:9,fontWeight:600,lineHeight:"13px",borderRadius:3,padding:"0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      background:isSel?"rgba(255,255,255,0.2)":"rgba(34,197,94,0.13)",
                      color:isSel?"#fff":"#16a34a",
                    }}>✅ {tkCount===1?bucket.tasks[0].title:`${tkCount} tasks`}</div>
                  )}
                  {rmCount>0&&(
                    <div style={{fontSize:9,fontWeight:600,lineHeight:"13px",borderRadius:3,padding:"0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      background:isSel?"rgba(255,255,255,0.2)":"rgba(245,158,11,0.13)",
                      color:isSel?"#fff":"#d97706",
                    }}>🗺️ {rmCount===1?bucket.roadmap[0].title:`${rmCount} milestones`}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── CalendarTab (main) ────────────────────────────────────────────────────────
export default function CalendarTab({
  calendarEvents, setCalendarEvents, addAudit, role,
  contacts, projects, tasks, followUps, invoices, proposals,
  roadmapItems,
  workspaceId = "workspace-1", onLinkedSave
}) {
  const [search,          setSearch]          = useState("");
  const [filterType,      setFilterType]      = useState("All");
  const [filterProject,   setFilterProject]   = useState("All");
  const [showSources,     setShowSources]     = useState({ event:true, task:true, roadmap:true });
  const [showForm,        setShowForm]        = useState(false);
  const [editing,         setEditing]         = useState(null);
  const [prefillDate,     setPrefillDate]     = useState(null);
  const [confirm,         setConfirm]         = useState(null);
  const [calView,         setCalView]         = useState("month"); // "month" | "week"
  const [selectedCalDate, setSelectedCalDate] = useState(null);
  const [showPast,        setShowPast]        = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0,10), []);

  // ── Unified items ─────────────────────────────────────────────────────────
  const allItems = useMemo(() => {
    const evs = (calendarEvents||[]).map(e => ({ ...e, _source:"event" }));
    const tks = (tasks||[])
      .filter(t => t.dueDate && !["Done","Cancelled"].includes(t.status))
      .map(t => ({ ...t, _source:"task", date:t.dueDate }));
    const rms = (roadmapItems||[])
      .filter(r => r.targetDate || r.dueDate)
      .map(r => ({ ...r, _source:"roadmap", date: r.targetDate||r.dueDate }));
    return [...evs, ...tks, ...rms];
  }, [calendarEvents, tasks, roadmapItems]);

  const calItems = useMemo(() => allItems.filter(i => showSources[i._source]), [allItems, showSources]);

  // ── Event list ────────────────────────────────────────────────────────────
  const sorted = useMemo(()=>[...(calendarEvents||[])].sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)),[calendarEvents]);
  const allProjects = useMemo(()=>["All",...new Set(sorted.map(e=>e.relatedProject).filter(Boolean))],[sorted]);

  const filtered = useMemo(()=>sorted.filter(e=>{
    const q = search.toLowerCase();
    return (!q||e.title?.toLowerCase().includes(q)||e.relatedClient?.toLowerCase().includes(q)||e.relatedProject?.toLowerCase().includes(q))
      &&(filterType==="All"||e.type===filterType)
      &&(filterProject==="All"||e.relatedProject===filterProject)
      &&(!selectedCalDate||e.date===selectedCalDate);
  }),[sorted,search,filterType,filterProject,selectedCalDate]);

  const { todayEvents, upcomingEvents, pastEvents, overdueEvents } = useMemo(() => {
    const todayEvents=[],upcomingEvents=[],pastEvents=[],overdueEvents=[];
    for (const e of filtered) {
      if (e.date===today)       todayEvents.push(e);
      else if (e.date>today)    upcomingEvents.push(e);
      else                      pastEvents.push(e);
      if (isOverdue(e.date)&&["Deadline","Payment"].includes(e.type)) overdueEvents.push(e);
    }
    return {todayEvents,upcomingEvents,pastEvents:[...pastEvents].reverse(),overdueEvents};
  },[filtered,today]);

  const selectedDateItems = useMemo(()=>{
    if(!selectedCalDate) return [];
    return calItems.filter(i=>i.date===selectedCalDate);
  },[calItems,selectedCalDate]);

  // ── Maps ──────────────────────────────────────────────────────────────────
  const taskMap     = useMemo(()=>Object.fromEntries((tasks||[]).map(x=>[x.id,x])),[tasks]);
  const followUpMap = useMemo(()=>Object.fromEntries((followUps||[]).map(x=>[x.id,x])),[followUps]);
  const invoiceMap  = useMemo(()=>Object.fromEntries((invoices||[]).map(x=>[x.id,x])),[invoices]);
  const proposalMap = useMemo(()=>Object.fromEntries((proposals||[]).map(x=>[x.id,x])),[proposals]);

  const getLinkedContext = useCallback(e => {
    const p=[];
    if(e.linkedTaskId     &&taskMap[e.linkedTaskId])         p.push(`✅ ${taskMap[e.linkedTaskId].title}`);
    if(e.linkedFollowUpId &&followUpMap[e.linkedFollowUpId]) p.push(`📞 ${followUpMap[e.linkedFollowUpId].person}`);
    if(e.linkedInvoiceId  &&invoiceMap[e.linkedInvoiceId])   p.push(`🧾 ${invoiceMap[e.linkedInvoiceId].invoiceNumber}`);
    if(e.linkedProposalId &&proposalMap[e.linkedProposalId]) p.push(`📋 ${proposalMap[e.linkedProposalId].title}`);
    return p;
  },[taskMap,followUpMap,invoiceMap,proposalMap]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const closeForm = () => { setShowForm(false); setEditing(null); setPrefillDate(null); };

  const openAddForDate = (dateStr) => { setPrefillDate(dateStr); setShowForm(true); };

  const save = f => {
    if(editing){
      const u=(calendarEvents||[]).map(e=>e.id===editing.id?{...editing,...f,updatedAt:new Date().toISOString()}:e);
      setCalendarEvents(u); saveWorkspaceData("calendarEvents",u,workspaceId);
      addAudit("Calendar","Update",`Updated: ${f.title}`); toast("Event updated");
    } else {
      const ne={...f,id:genId()};
      const u=[ne,...(calendarEvents||[])];
      setCalendarEvents(u); saveWorkspaceData("calendarEvents",u,workspaceId);
      addAudit("Calendar","Create",`Added: ${f.title}`); toast("Event added");
    }
    closeForm();
  };

  const del = id => {
    const e=(calendarEvents||[]).find(x=>x.id===id);
    const u=(calendarEvents||[]).filter(x=>x.id!==id);
    setCalendarEvents(u); saveWorkspaceData("calendarEvents",u,workspaceId);
    addAudit("Calendar","Delete",`Deleted: ${e?.title}`); toast("Deleted","info"); setConfirm(null);
  };

  const handleExport = () => { exportToCSV("calendarEvents",filtered); toast("Exported to CSV"); };
  const toggleSource = s => setShowSources(p=>({...p,[s]:!p[s]}));

  return (
    <div>
      {confirm&&<Confirm msg="Delete this event?" onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&(
        <Modal title={editing?"Edit event":"Add event"} onClose={closeForm} width={600}>
          <CalForm
            initial={editing||{}}
            prefillDate={!editing ? prefillDate : null}
            onSave={save} onClose={closeForm}
            projects={projects||[]} tasks={tasks||[]}
            followUps={followUps||[]} invoices={invoices||[]} proposals={proposals||[]}
          />
        </Modal>
      )}

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"var(--text)"}}>Calendar</h2>
          <p style={{margin:"3px 0 0",fontSize:12,color:"var(--text-muted)"}}>
            {todayEvents.length} today · {upcomingEvents.length} upcoming · {(calendarEvents||[]).length} events
            {(tasks||[]).filter(t=>t.dueDate&&!["Done","Cancelled"].includes(t.status)).length>0&&
              ` · ${(tasks||[]).filter(t=>t.dueDate&&!["Done","Cancelled"].includes(t.status)).length} active tasks`}
            {(roadmapItems||[]).filter(r=>r.targetDate||r.dueDate).length>0&&
              ` · ${(roadmapItems||[]).filter(r=>r.targetDate||r.dueDate).length} milestones`}
          </p>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {/* Source toggles */}
          {Object.entries(SOURCE_CONFIG).map(([k,v])=>(
            <button key={k} onClick={()=>toggleSource(k)} style={{
              padding:"3px 9px",borderRadius:12,fontSize:11,fontWeight:600,cursor:"pointer",
              border:`1.5px solid ${showSources[k]?v.dot:"var(--border)"}`,
              background:showSources[k]?v.dot+"18":"transparent",
              color:showSources[k]?v.dot:"var(--text-muted)",
              opacity:showSources[k]?1:0.5,
              transition:"all 0.12s",
              display:"flex",alignItems:"center",gap:4,
            }}>
              <span style={{width:6,height:6,borderRadius:"50%",background:v.dot,display:"inline-block"}} />
              {v.label}
            </button>
          ))}
          {/* View toggle */}
          <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:6,overflow:"hidden"}}>
            {[{v:"month",l:"Month"},{v:"week",l:"Week"}].map(({v,l})=>(
              <button key={v} onClick={()=>setCalView(v)} style={{
                padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer",border:"none",
                background:calView===v?"var(--accent)":"transparent",
                color:calView===v?"#fff":"var(--text-muted)",
                transition:"all 0.1s",
              }}>{l}</button>
            ))}
          </div>
          <button style={{...btnStyle("ghost","sm"),fontSize:11}} onClick={handleExport}>↓ CSV</button>
          {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add event</button>}
        </div>
      </div>

      {/* ── Calendar view ── */}
      {calView==="month"
        ? <BigCalendar allItems={calItems} today={today} selectedDate={selectedCalDate} onSelectDate={setSelectedCalDate} />
        : <WeekStrip   allItems={calItems} today={today} selectedDate={selectedCalDate} onSelectDate={setSelectedCalDate} />
      }

      {/* ── Day detail panel ── */}
      {selectedCalDate&&(
        <DayDetailPanel
          dateStr={selectedCalDate}
          items={selectedDateItems}
          role={role}
          onLinkedSave={onLinkedSave}
          onEdit={setEditing}
          onDelete={setConfirm}
          getLinkedContext={getLinkedContext}
          onClose={()=>setSelectedCalDate(null)}
          onAddForDate={openAddForDate}
        />
      )}

      {/* ── Overdue banner ── */}
      {overdueEvents.length>0&&(
        <div style={{background:"var(--danger-dim)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"var(--r-md)",padding:"8px 14px",marginBottom:12,fontSize:12,color:"var(--danger)",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span>⏰ {overdueEvents.length} overdue:</span>
          {overdueEvents.map(e=>(
            <span key={e.id} style={{padding:"1px 7px",background:"rgba(239,68,68,0.12)",borderRadius:10,fontWeight:600}}>{e.title}</span>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search events…" />
        <select style={{...inputStyle,width:"auto"}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All types</option>
          {CAL_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select style={{...inputStyle,width:"auto"}} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
          {allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}
        </select>
        {selectedCalDate&&(
          <button style={{...btnStyle("ghost","sm"),fontSize:11,color:"var(--accent)"}} onClick={()=>setSelectedCalDate(null)}>
            📅 {fmtDate(selectedCalDate)} ✕
          </button>
        )}
      </div>

      {/* ── Event list ── */}
      {filtered.length===0
        ? <EmptyState icon="📅" title="No events" sub="Add meetings, deadlines, payments, and reminders." action={role!=="Viewer"&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ Add event</button>} />
        : (
          <div>
            {todayEvents.length>0&&(
              <SectionCard style={{marginBottom:12,background:"rgba(59,130,246,0.06)",borderColor:"rgba(59,130,246,0.2)"}}>
                <div style={{fontWeight:700,fontSize:11,color:"var(--accent)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.6px"}}>
                  📅 Today — {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})}
                </div>
                {todayEvents.map(e=><EventRow key={e.id} e={e} role={role} onLinkedSave={onLinkedSave} onEdit={setEditing} onDelete={setConfirm} getLinkedContext={getLinkedContext} />)}
              </SectionCard>
            )}
            {upcomingEvents.length>0&&(
              <SectionCard style={{marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:11,color:"var(--text)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.6px"}}>
                  Upcoming ({upcomingEvents.length})
                </div>
                {upcomingEvents.slice(0,20).map(e=><EventRow key={e.id} e={e} role={role} onLinkedSave={onLinkedSave} onEdit={setEditing} onDelete={setConfirm} getLinkedContext={getLinkedContext} />)}
                {upcomingEvents.length>20&&<div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center",paddingTop:8}}>{upcomingEvents.length-20} more…</div>}
              </SectionCard>
            )}
            {pastEvents.length>0&&(
              <SectionCard style={{opacity:.75}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:11,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.6px"}}>Past ({pastEvents.length})</div>
                  <button style={{...btnStyle("ghost","sm"),fontSize:10}} onClick={()=>setShowPast(v=>!v)}>{showPast?"Hide":"Show"}</button>
                </div>
                {showPast&&pastEvents.slice(0,12).map(e=><EventRow key={e.id} e={e} role={role} onLinkedSave={onLinkedSave} onEdit={setEditing} onDelete={setConfirm} getLinkedContext={getLinkedContext} />)}
              </SectionCard>
            )}
          </div>
        )
      }
    </div>
  );
}
