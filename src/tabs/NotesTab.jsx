import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { NOTE_TYPES } from "../config/crmConfig.js";

const RELATE_TYPES = ["Project","Contact","Lead","Task","Invoice","Proposal","Roadmap","Support","General"];

const TYPE_COLORS = {
  General:   { bg:"#f1f0fb", text:"#5b4fcf", dot:"#7c6fcd" },
  Meeting:   { bg:"#e8f4fd", text:"#1a6fa3", dot:"#3b9dd2" },
  Decision:  { bg:"#fdf3e7", text:"#a05c00", dot:"#e07b00" },
  Idea:      { bg:"#edf7ed", text:"#1e6e2e", dot:"#3ca34f" },
  Task:      { bg:"#fde8f0", text:"#a0245a", dot:"#d94080" },
  Follow_up: { bg:"#f0f0f0", text:"#444",    dot:"#888"    },
};
const typeStyle = type => TYPE_COLORS[type] || TYPE_COLORS.General;

function NoteForm({ initial={}, onSave, onClose, projects=[], contacts=[], leads=[], tasks=[], invoices=[], proposals=[], roadmapItems=[], supportTickets=[], tags=[] }) {
  const [f, setF] = useState({
    title:"", body:"", type:"General", relatedType:"General", relatedId:"", relatedTo:"",
    projectId:"", contactId:"", leadId:"", taskId:"", invoiceId:"", proposalId:"", roadmapItemId:"", supportTicketId:"",
    tags:[], pinned:false, createdAt:new Date().toISOString().slice(0,10), ...initial
  });
  const [titleError, setTitleError] = useState("");
  const [newTag, setNewTag] = useState("");
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const wordCount = f.body.trim() ? f.body.trim().split(/\s+/).length : 0;
  const charCount = f.body.length;
  const toggleTag = t => setF(p=>({...p,tags:p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags,t]}));

  const onRelatedTypeChange = e => {
    setF(p=>({...p,relatedType:e.target.value,relatedId:"",relatedTo:"",projectId:"",contactId:"",leadId:"",taskId:"",invoiceId:"",proposalId:"",roadmapItemId:"",supportTicketId:""}));
  };

  const relatedOptions = () => {
    switch(f.relatedType){
      case "Project":  return projects.map(x=>({id:x.id,label:x.name}));
      case "Contact":  return contacts.map(x=>({id:x.id,label:x.name}));
      case "Lead":     return leads.map(x=>({id:x.id,label:x.title}));
      case "Task":     return tasks.map(x=>({id:x.id,label:x.title}));
      case "Invoice":  return invoices.map(x=>({id:x.id,label:`${x.invoiceNumber} — ${x.client}`}));
      case "Proposal": return proposals.map(x=>({id:x.id,label:x.title}));
      case "Roadmap":  return roadmapItems.map(x=>({id:x.id,label:x.item}));
      case "Support":  return supportTickets.map(x=>({id:x.id,label:x.title}));
      default: return [];
    }
  };

  const onRelatedChange = e => {
    const id = e.target.value;
    const opts = relatedOptions();
    const chosen = opts.find(x=>x.id===id);
    const fieldMap = {Project:"projectId",Contact:"contactId",Lead:"leadId",Task:"taskId",Invoice:"invoiceId",Proposal:"proposalId",Roadmap:"roadmapItemId",Support:"supportTicketId"};
    const fieldKey = fieldMap[f.relatedType];
    setF(p=>({...p,relatedId:id,relatedTo:chosen?.label||"", [fieldKey||"_"]:id}));
  };

  const addCustomTag = () => {
    const t = newTag.trim();
    if (!t || f.tags.includes(t)) { setNewTag(""); return; }
    setF(p=>({...p,tags:[...p.tags,t]}));
    setNewTag("");
  };

  const handleSubmit = () => {
    if (!f.title.trim()) { setTitleError("Title is required"); titleRef.current?.focus(); return; }
    onSave({...f, updatedAt:new Date().toISOString()});
  };

  const opts = relatedOptions();
  const allTags = [...new Set([...f.tags, ...tags, "CRM","Clinic","Restaurant","Automotive","Decision","Technical","Idea"])];

  return (
    <div onKeyDown={e=>{ if((e.metaKey||e.ctrlKey)&&e.key==="Enter") handleSubmit(); }}>
      {/* Title + Type row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FormField label="Title">
          <input
            ref={titleRef}
            style={{...inputStyle, borderColor: titleError ? "var(--danger,#dc3545)" : undefined}}
            value={f.title}
            onChange={e=>{ setTitleError(""); set("title")(e); }}
            placeholder="Note title…"
          />
          {titleError && <div style={{fontSize:11,color:"var(--danger,#dc3545)",marginTop:3}}>{titleError}</div>}
        </FormField>
        <FormField label="Link to">
          <select style={inputStyle} value={f.relatedType} onChange={onRelatedTypeChange}>
            {RELATE_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </FormField>
        {opts.length > 0 && (
          <FormField label={f.relatedType} style={{gridColumn:"1/-1"}}>
            <select style={inputStyle} value={f.relatedId} onChange={onRelatedChange}>
              <option value="">— None —</option>
              {opts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </FormField>
        )}
      </div>

      {/* Visual type picker */}
      <FormField label="Type">
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:4}}>
          {NOTE_TYPES.map(t=>{
            const ts = typeStyle(t);
            const active = f.type === t;
            return (
              <button key={t} type="button" onClick={()=>setF(p=>({...p,type:t}))} style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"4px 10px",borderRadius:999,fontSize:12,fontWeight:active?600:400,
                cursor:"pointer",border:`1.5px solid ${active?ts.dot:"var(--border)"}`,
                background:active?ts.bg:"transparent",color:active?ts.text:"var(--text-muted)",
                transition:"all 0.12s ease",
              }}>
                <span style={{width:6,height:6,borderRadius:"50%",background:active?ts.dot:"var(--border)",flexShrink:0,display:"inline-block"}} />
                {t.replace("_"," ")}
              </button>
            );
          })}
        </div>
      </FormField>

      {/* Body */}
      <FormField label="Body">
        <textarea
          style={{...inputStyle,minHeight:140,resize:"vertical",lineHeight:1.6}}
          value={f.body}
          onChange={set("body")}
          placeholder="Write your note here…"
        />
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginTop:3}}>
          <span style={{opacity:0.6}}>Ctrl+Enter to save</span>
          <span>{wordCount} word{wordCount!==1?"s":""} · {charCount} chars</span>
        </div>
      </FormField>

      {/* Tags */}
      <FormField label="Tags">
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:4}}>
          {allTags.map(t=>(
            <span key={t} onClick={()=>toggleTag(t)} style={{
              padding:"3px 11px",borderRadius:999,fontSize:12,
              fontWeight:f.tags.includes(t)?600:400,cursor:"pointer",
              background:f.tags.includes(t)?"var(--accent,#6c63ff)":"transparent",
              color:f.tags.includes(t)?"#fff":"var(--text-muted)",
              border:`1.5px solid ${f.tags.includes(t)?"var(--accent,#6c63ff)":"var(--border)"}`,
              transition:"all 0.12s ease",letterSpacing:"0.01em",
              display:"flex",alignItems:"center",gap:4,
            }}>
              {t}
              {f.tags.includes(t) && !["CRM","Clinic","Restaurant","Automotive","Decision","Technical","Idea",...tags].includes(t) && (
                <span onClick={e=>{e.stopPropagation();toggleTag(t);}} style={{fontSize:10,lineHeight:1,opacity:0.7}}>×</span>
              )}
            </span>
          ))}
          {/* Custom tag input */}
          <span style={{display:"flex",alignItems:"center",gap:4}}>
            <input
              value={newTag}
              onChange={e=>setNewTag(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addCustomTag(); } if(e.key==="Escape") setNewTag(""); }}
              placeholder="+ custom tag"
              style={{...inputStyle,padding:"3px 8px",height:"auto",fontSize:12,width:newTag?`${Math.max(80,newTag.length*8+24)}px`:"90px",borderRadius:999,transition:"width 0.15s"}}
            />
            {newTag.trim() && (
              <button type="button" onClick={addCustomTag} style={{fontSize:11,padding:"3px 8px",borderRadius:999,border:"1.5px solid var(--accent,#6c63ff)",background:"var(--accent,#6c63ff)",color:"#fff",cursor:"pointer"}}>Add</button>
            )}
          </span>
        </div>
      </FormField>

      {/* Pin toggle */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:"var(--surface-raised,var(--surface))",border:"1px solid var(--border)",borderRadius:8}}>
        <div
          onClick={()=>setF(p=>({...p,pinned:!p.pinned}))}
          style={{
            width:36,height:20,borderRadius:999,cursor:"pointer",flexShrink:0,
            background:f.pinned?"#e0a800":"var(--border)",
            position:"relative",transition:"background 0.18s",
          }}
        >
          <div style={{
            position:"absolute",top:3,left:f.pinned?17:3,
            width:14,height:14,borderRadius:"50%",background:"#fff",
            transition:"left 0.18s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
          }}/>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:500,color:"var(--text)",userSelect:"none"}}>Pin to top</div>
          <div style={{fontSize:11,color:"var(--text-muted)"}}>Keeps this note above the rest</div>
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={handleSubmit}>Save note</button>
      </div>
    </div>
  );
}

const cardBtnStyle = (extra={}) => ({ fontSize:11, padding:"3px 9px", borderRadius:6, border:"1px solid var(--border)", background:"none", cursor:"pointer", transition:"opacity 0.12s, background 0.12s", ...extra });

export default function NotesTab({ notes, setNotes, addAudit, role, tags, projects, contacts, leads, tasks, invoices, proposals, roadmapItems, supportTickets,
  followUps, setFollowUps, calendarEvents, setCalendarEvents,
  workspaceId = "workspace-1", onLinkedSave }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [filterRelated, setFilterRelated] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [sortBy, setSortBy] = useState("newest");

  const hasFilters = !!(search || filterType !== "All" || filterTag !== "All" || filterRelated !== "All");

  const allNoteTags = useMemo(()=>[...new Set((notes||[]).flatMap(n=>n.tags||[]))],[notes]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    const list = (notes||[]).filter(n=>
      (!q||n.title?.toLowerCase().includes(q)||n.body?.toLowerCase().includes(q)||
        (n.tags||[]).some(t=>t.toLowerCase().includes(q)))
      &&(filterType==="All"||n.type===filterType)
      &&(filterTag==="All"||(n.tags||[]).includes(filterTag))
      &&(filterRelated==="All"||n.relatedType===filterRelated)
    );
    return [...list].sort((a,b) => {
      if (sortBy !== "az") {
        const pinDiff = (b.pinned?1:0) - (a.pinned?1:0);
        if (pinDiff !== 0) return pinDiff;
      }
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "az") return (a.title||"").localeCompare(b.title||"");
      if (sortBy === "updated") return new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt);
      return 0;
    });
  },[notes,search,filterType,filterTag,filterRelated,sortBy]);

  // Keep viewing modal in sync when the underlying note is edited
  useEffect(() => {
    if (viewing) {
      const fresh = (notes||[]).find(n => n.id === viewing.id);
      if (fresh && fresh !== viewing) setViewing(fresh);
    }
  }, [notes]);

  const save = useCallback(f => {
    if (editing) {
      const u = (notes||[]).map(n => n.id === editing.id ? { ...editing, ...f } : n);
      setNotes(u);
      saveWorkspaceData("notes", u, workspaceId);
      addAudit("Notes", "Update", `Updated: ${f.title}`);
      toast("Note updated");
    } else {
      const nn = { ...f, id: genId(), createdAt: new Date().toISOString().slice(0,10) };
      const u = [nn, ...(notes||[])];
      setNotes(u);
      saveWorkspaceData("notes", u, workspaceId);
      addAudit("Notes", "Create", `Created: ${f.title}`);
      toast("Note added");
    }
    setShowForm(false);
    setEditing(null);
  }, [editing, notes, workspaceId]);

  const del = useCallback(id => {
    const n = (notes||[]).find(x => x.id === id);
    const u = (notes||[]).filter(x => x.id !== id);
    setNotes(u);
    saveWorkspaceData("notes", u, workspaceId);
    addAudit("Notes", "Delete", `Deleted: ${n?.title}`);
    toast("Note deleted", "info");
    setConfirm(null);
  }, [notes, workspaceId]);

  const togglePin = useCallback(id => {
    const u = (notes||[]).map(n => n.id === id ? { ...n, pinned: !n.pinned } : n);
    const note = u.find(n => n.id === id);
    setNotes(u);
    saveWorkspaceData("notes", u, workspaceId);
    toast(note?.pinned ? "Note pinned" : "Note unpinned");
  }, [notes, workspaceId]);
  
  const handleExport = useCallback(() => { exportToCSV("notes", filtered); toast("Notes exported to CSV"); }, [filtered]);

  const relatedTypes = useMemo(() => ["All",...new Set((notes||[]).map(n=>n.relatedType).filter(Boolean))], [notes]);

  const convertToTask = useCallback((note) => {
    if (!onLinkedSave) return;
    onLinkedSave("task", {
      title: note.title, description: note.body||"", project: note.relatedTo||"",
      status:"Todo", priority:"Medium", dueDate:"", checklist:[], tags: note.tags||[],
    });
    addAudit("Notes","Convert",`Note converted to task: ${note.title}`);
    toast("Task created — check Tasks tab","info");
  }, [onLinkedSave, addAudit]);

  const addFollowUp = useCallback((note) => {
    if (!setFollowUps) return;
    const nf = { id:genId(), person:note.relatedTo||"", relatedTo:note.title, relatedType:"Note",
      type:"Call", dueDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10),
      status:"Pending", notes:note.body||"", createdAt:new Date().toISOString().slice(0,10) };
    const u = [nf, ...(followUps||[])]; setFollowUps(u); saveWorkspaceData("followUps",u,workspaceId);
    addAudit("Notes","LinkedCreate",`Follow-up from note: ${note.title}`); toast("Follow-up added");
  }, [followUps, setFollowUps, workspaceId, addAudit]);

  const addCalendarEvent = useCallback((note) => {
    if (!setCalendarEvents) return;
    const ne = { id:genId(), title:note.title, type:"Reminder",
      date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),
      time:"", relatedClient:note.relatedTo||"", notes:note.body||"",
      createdAt:new Date().toISOString().slice(0,10) };
    const u = [ne, ...(calendarEvents||[])]; setCalendarEvents(u); saveWorkspaceData("calendarEvents",u,workspaceId);
    addAudit("Notes","LinkedCreate",`Calendar event from note: ${note.title}`); toast("Calendar event added");
  }, [calendarEvents, setCalendarEvents, workspaceId, addAudit]);
  
  const closeForm = useCallback(() => { setShowForm(false); setEditing(null); }, []);
  const clearFilters = useCallback(() => { setFilterType("All"); setFilterTag("All"); setFilterRelated("All"); setSearch(""); }, []);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== "Escape") return;
      if (viewing) { setViewing(null); return; }
      if (showForm || editing) { closeForm(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, showForm, editing, closeForm]);

  const filterSelectStyle = { ...inputStyle, width:"auto", fontSize:12, height:32, padding:"0 10px", borderRadius:6, color:"var(--text-muted)" };

  return (
    <div>
      {confirm&&<Confirm msg={`Delete "${(notes||[]).find(n=>n.id===confirm)?.title||"this note"}"?`} onYes={()=>del(confirm)} onNo={()=>setConfirm(null)} />}
      {(showForm||editing)&&<Modal title={editing?"Edit note":"Add note"} onClose={closeForm} width={620}><NoteForm initial={editing||{}} onSave={save} onClose={closeForm} projects={projects||[]} contacts={contacts||[]} leads={leads||[]} tasks={tasks||[]} invoices={invoices||[]} proposals={proposals||[]} roadmapItems={roadmapItems||[]} supportTickets={supportTickets||[]} tags={tags||[]} /></Modal>}
      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)} width={560}>
          <div>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:4,
                background:typeStyle(viewing.type).bg, color:typeStyle(viewing.type).text }}>{viewing.type}</span>
              {viewing.relatedTo && <span style={{ fontSize:12, color:"var(--accent)" }}>↗ {viewing.relatedType}: {viewing.relatedTo}</span>}
              {viewing.pinned && <span style={{ fontSize:11, color:"#b07d00", fontWeight:600 }}>📌 Pinned</span>}
              <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:"auto", textAlign:"right" }}>
                {viewing.updatedAt && viewing.updatedAt.slice(0,10) !== viewing.createdAt ? (
                  <><span>Created {fmtDate(viewing.createdAt)}</span><br/><span>Edited {fmtDate(viewing.updatedAt)}</span></>
                ) : fmtDate(viewing.createdAt)}
              </span>
            </div>
            {viewing.body && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.7, whiteSpace:"pre-wrap",
                  padding:"14px 16px", background:"var(--surface-raised)", borderRadius:"var(--r-md)",
                  maxHeight:360, overflowY:"auto" }}>{viewing.body}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"right", marginTop:4 }}>
                  {viewing.body.trim().split(/\s+/).filter(Boolean).length} words · {viewing.body.length} chars
                </div>
              </div>
            )}
            {(viewing.tags||[]).length > 0 && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:16 }}>
                {viewing.tags.map(t => (
                  <span key={t} onClick={()=>{ setFilterTag(t); setViewing(null); }} title={`Filter by "${t}"`} style={{ fontSize:11, padding:"2px 8px", borderRadius:999, cursor:"pointer",
                    background:"var(--surface-raised)", color:"var(--text-muted)", border:"1px solid var(--border)" }}>{t}</span>
                ))}
              </div>
            )}
            {role !== "Viewer" && (
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", marginBottom:8 }}>Linked Actions</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {onLinkedSave && <button style={btnStyle("soft","sm")} onClick={() => { convertToTask(viewing); setViewing(null); }}>✅ Convert to Task</button>}
                  {setFollowUps && <button style={btnStyle("soft","sm")} onClick={() => { addFollowUp(viewing); setViewing(null); }}>📞 Add Follow-Up</button>}
                  {setCalendarEvents && <button style={btnStyle("soft","sm")} onClick={() => { addCalendarEvent(viewing); setViewing(null); }}>📅 Add Calendar Event</button>}
                  {onLinkedSave && <button style={btnStyle("soft","sm")} onClick={() => { onLinkedSave("document",{name:`Doc — ${viewing.title}`,type:"Other",relatedClient:viewing.relatedTo||"",status:"Draft",notes:viewing.body||""}); setViewing(null); }}>📄 Add Document</button>}
                </div>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:16 }}>
              <div>
                {role !== "Viewer" && (
                  <button style={cardBtnStyle({color:viewing.pinned?"#b07d00":"var(--text-muted)",fontWeight:viewing.pinned?600:400})}
                    onClick={()=>{ togglePin(viewing.id); }}>
                    {viewing.pinned ? "📌 Unpin" : "Pin"}
                  </button>
                )}
              </div>
              <div style={{display:"flex",gap:8}}>
                {role !== "Viewer" && <button style={btnStyle("ghost")} onClick={() => { const v = viewing; setViewing(null); setEditing(v); }}>Edit</button>}
                <button style={btnStyle("ghost")} onClick={() => setViewing(null)}>Close</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"baseline",gap:12}}>
          <h2 style={{margin:0,fontSize:22,fontWeight:600,color:"var(--text)",letterSpacing:"-0.3px"}}>Notes</h2>
          <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:400}}>
            {hasFilters ? <>{filtered.length} of {(notes||[]).length}</> : <>{(notes||[]).length} total</>}
            {(notes||[]).filter(n=>n.pinned).length>0 && <> · <span style={{color:"#e0a800",fontWeight:500}}>{(notes||[]).filter(n=>n.pinned).length} pinned</span></>}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button style={{...btnStyle("ghost","sm"),fontSize:12,color:"var(--text-muted)",border:"1px solid var(--border)"}} onClick={handleExport}>↓ Export CSV</button>
          {role!=="Viewer"&&<button style={{...btnStyle("primary"),fontSize:13,fontWeight:500,padding:"7px 16px",borderRadius:8}} onClick={()=>setShowForm(true)}>+ New note</button>}
        </div>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search notes…" />
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginLeft:4}}>
          <select style={filterSelectStyle} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="All">All types</option>
            {NOTE_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <select style={filterSelectStyle} value={filterTag} onChange={e=>setFilterTag(e.target.value)}>
            <option value="All">All tags</option>
            {allNoteTags.map(t=><option key={t}>{t}</option>)}
          </select>
          <select style={filterSelectStyle} value={filterRelated} onChange={e=>setFilterRelated(e.target.value)}>
            {relatedTypes.map(t=><option key={t} value={t}>{t==="All"?"All linked types":t}</option>)}
          </select>
          <select style={{...filterSelectStyle, borderLeft:"2px solid var(--border)"}} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated">Recently edited</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>Filtering:</span>
          {filterType!=="All"&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:typeStyle(filterType).bg,color:typeStyle(filterType).text,border:`1px solid ${typeStyle(filterType).dot}`,display:"flex",alignItems:"center",gap:4}}>Type: {filterType}<span onClick={()=>setFilterType("All")} style={{cursor:"pointer",opacity:0.7,marginLeft:2}}>×</span></span>}
          {filterTag!=="All"&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"var(--surface-raised)",color:"var(--text-muted)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:4}}>Tag: {filterTag}<span onClick={()=>setFilterTag("All")} style={{cursor:"pointer",opacity:0.7,marginLeft:2}}>×</span></span>}
          {filterRelated!=="All"&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"var(--surface-raised)",color:"var(--text-muted)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:4}}>Linked: {filterRelated}<span onClick={()=>setFilterRelated("All")} style={{cursor:"pointer",opacity:0.7,marginLeft:2}}>×</span></span>}
          {search&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"var(--surface-raised)",color:"var(--text-muted)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:4}}>Search: "{search}"<span onClick={()=>setSearch("")} style={{cursor:"pointer",opacity:0.7,marginLeft:2}}>×</span></span>}
          <button onClick={clearFilters} style={{fontSize:11,color:"var(--text-muted)",background:"none",border:"none",cursor:"pointer",padding:"0 2px",textDecoration:"underline",marginLeft:2}}>Clear all</button>
        </div>
      )}

      {filtered.length===0?<EmptyState icon="📝" title={hasFilters?"No notes match your filters":"No notes yet"} sub={hasFilters?"Try adjusting or clearing your filters.":"Add your first note to capture a meeting, decision, or idea."} action={!hasFilters&&<button style={btnStyle("primary")} onClick={()=>setShowForm(true)}>+ New note</button>}/>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
          {filtered.map(n=>{
            const ts = typeStyle(n.type);
            return (
              <div key={n.id}
                onClick={()=>setViewing(n)}
                onMouseEnter={()=>setHoveredCard(n.id)}
                onMouseLeave={()=>setHoveredCard(null)}
                style={{
                background:"var(--surface)",
                border:`1px solid ${n.pinned?"rgba(224,168,0,0.35)":"var(--border)"}`,
                borderTop:`3px solid ${n.pinned?"#e0a800":ts.dot}`,
                borderRadius:10,
                padding:"14px 16px",
                display:"flex",flexDirection:"column",gap:0,
                position:"relative",
                cursor:"pointer",
                transition:"box-shadow 0.15s, transform 0.15s",
                boxShadow: hoveredCard===n.id ? "0 4px 16px rgba(0,0,0,0.09)" : "none",
                transform: hoveredCard===n.id ? "translateY(-1px)" : "none",
              }}>
                {n.pinned&&<div style={{position:"absolute",top:10,right:12,fontSize:11,fontWeight:600,color:"#b07d00",letterSpacing:"0.04em",textTransform:"uppercase"}}>Pinned</div>}
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:ts.dot,flexShrink:0}} />
                  <span
                    title={`Filter by ${n.type}`}
                    onClick={e=>{ e.stopPropagation(); setFilterType(n.type); }}
                    style={{fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",color:ts.text,background:ts.bg,padding:"2px 7px",borderRadius:4,cursor:"pointer"}}
                  >{n.type}</span>
                  {n.relatedTo&&<span
                    title={`Filter by ${n.relatedType}`}
                    onClick={e=>{ e.stopPropagation(); setFilterRelated(n.relatedType); }}
                    style={{fontSize:11,color:"var(--text-muted)",marginLeft:"auto",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}}
                  >↗ {n.relatedType}</span>}
                </div>
                <div style={{fontWeight:600,fontSize:14,color:"var(--text)",lineHeight:1.35,marginBottom:7,paddingRight:n.pinned?50:0}}>{n.title}</div>
                {n.relatedTo&&<div style={{fontSize:11,color:"var(--accent,#5b4fcf)",marginBottom:6,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.relatedTo}</div>}
                {n.body && <p title={n.body} style={{fontSize:12.5,color:"var(--text-muted)",margin:"0 0 10px",lineHeight:1.55,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",flexGrow:1}}>{n.body}</p>}
                {(n.tags||[]).length>0&&(
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}} onClick={e=>e.stopPropagation()}>
                    {n.tags.map(t=>(
                      <span key={t} onClick={()=>setFilterTag(t)} title={`Filter by "${t}"`} style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"var(--surface-raised,#f5f5f5)",color:"var(--text-muted)",border:"1px solid var(--border)",fontWeight:500,cursor:"pointer"}}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid var(--border)",paddingTop:10,marginTop:"auto"}}>
                  <span title={n.updatedAt ? `Created ${fmtDate(n.createdAt)}` : undefined} style={{fontSize:11,color:"var(--text-muted)"}}>
                    {n.updatedAt && n.updatedAt.slice(0,10) !== n.createdAt ? `Edited ${fmtDate(n.updatedAt)}` : fmtDate(n.createdAt)}
                  </span>
                  {role!=="Viewer"&&(
                    <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                      <button
                        style={cardBtnStyle({color:n.pinned?"#b07d00":"var(--text-muted)",fontWeight:n.pinned?600:400})}
                        onClick={()=>togglePin(n.id)}
                      >{n.pinned?"Unpin":"Pin"}</button>
                      <button
                        style={cardBtnStyle({color:"var(--text-muted)"})}
                        onClick={()=>setEditing(n)}
                      >Edit</button>
                      {(role==="Owner"||role==="Admin")&&(
                        <button
                          style={cardBtnStyle({border:"1px solid rgba(220,53,69,0.25)",color:"var(--danger,#dc3545)"})}
                          onClick={()=>setConfirm(n.id)}
                        >Delete</button>
                      )}
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
