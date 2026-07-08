import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { COMM_METHODS } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: COMMUNICATION LOG — Phase 11 upgrade
// ══════════════════════════════════════════════════════════════════════════════

const METHOD_ICONS = { WhatsApp:"💬", Call:"📞", Email:"📧", Meeting:"🤝", Instagram:"📸", LinkedIn:"💼", Other:"📌" };
const METHOD_COLORS = { WhatsApp:"#25D366", Call:"#3B82F6", Email:"#F59E0B", Meeting:"#8B5CF6", Instagram:"#E1306C", LinkedIn:"#0A66C2", Other:"#6B7280" };

export default function CommunicationLogTab({ communications, setCommunications, addAudit, role,
  contacts = [], leads = [], projects = [], notes = [], setNotes, followUps = [], setFollowUps,
  tasks = [], setTasks, calendarEvents = [], setCalendarEvents, workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch]         = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [viewing, setViewing]       = useState(null);
  const [confirm, setConfirm]       = useState(null);

  const filtered = useMemo(() => (communications||[]).filter(c => {
    const q = search.toLowerCase();
    return (!q || c.contact?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q) || c.relatedTo?.toLowerCase().includes(q))
      && (filterMethod === "All" || c.method === filterMethod);
  }).sort((a,b) => new Date(b.date||0) - new Date(a.date||0)), [communications, search, filterMethod]);

  const CommForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({
      contact:"", method:"WhatsApp", summary:"", outcome:"", relatedTo:"", relatedType:"Lead",
      date: new Date().toISOString().slice(0,10), nextStep:"", createdAt: new Date().toISOString().slice(0,10), ...initial
    });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Contact">
            <select style={inputStyle} value={f.contact} onChange={set("contact")}>
              <option value="">— Select contact —</option>
              {contacts.map(c => <option key={c.id} value={c.name}>{c.name}{c.company?` (${c.company})`:""}</option>)}
              <FormField label=""><input style={inputStyle} value={f.contact} onChange={set("contact")} placeholder="Or type name" /></FormField>
            </select>
          </FormField>
          <FormField label="Method">
            <select style={inputStyle} value={f.method} onChange={set("method")}>{COMM_METHODS.map(m=><option key={m}>{m}</option>)}</select>
          </FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Related to"><input style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} /></FormField>
          <FormField label="Outcome"><input style={inputStyle} value={f.outcome} onChange={set("outcome")} placeholder="Positive, Neutral, Follow-up needed…" /></FormField>
          <FormField label="Next step"><input style={inputStyle} value={f.nextStep} onChange={set("nextStep")} /></FormField>
        </div>
        <FormField label="Summary / Message">
          <textarea style={{ ...inputStyle, minHeight:100, resize:"vertical" }} value={f.summary} onChange={set("summary")} />
        </FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button style={btnStyle("primary")} onClick={() => onSave(f)}>Save</button>
        </div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) {
      const u=(communications||[]).map(c=>c.id===editing.id?{...editing,...f}:c);
      setCommunications(u); saveWorkspaceData("communications",u,workspaceId);
      addAudit("Communications","Update",`Updated comm with ${f.contact}`); toast("Updated");
    } else {
      const nc={...f,id:genId()};
      const u=[nc,...(communications||[])];
      setCommunications(u); saveWorkspaceData("communications",u,workspaceId);
      addAudit("Communications","Create",`Logged ${f.method} with ${f.contact}`); toast("Communication logged");
    }
    setShowForm(false); setEditing(null);
  };

  const del = (id) => {
    const c=(communications||[]).find(x=>x.id===id);
    const u=(communications||[]).filter(x=>x.id!==id);
    setCommunications(u); saveWorkspaceData("communications",u,workspaceId);
    addAudit("Communications","Delete",`Deleted comm with ${c?.contact}`); toast("Deleted","info"); setConfirm(null);
  };

  // Linked action helpers
  const addFollowUp = (comm) => {
    if (!setFollowUps) return;
    const nf = { id:genId(), person:comm.contact, relatedTo:comm.relatedTo||comm.contact, relatedType:"Communication",
      type:comm.method==="Meeting"?"Meeting":comm.method==="Call"?"Call":"WhatsApp",
      dueDate:new Date(Date.now()+2*86400000).toISOString().slice(0,10), status:"Pending",
      notes:`Follow-up from ${comm.method} on ${fmtDate(comm.date)}`, createdAt:new Date().toISOString().slice(0,10) };
    const u=[nf,...(followUps||[])]; setFollowUps(u); saveWorkspaceData("followUps",u,workspaceId);
    addAudit("Follow-Ups","Create",`Follow-up from communication with ${comm.contact}`); toast("Follow-up added");
  };

  const addTask = (comm) => {
    if (!setTasks) return;
    const nt = { id:genId(), title:`Action from ${comm.method} with ${comm.contact}`,
      description:comm.nextStep||comm.summary||"", project:comm.relatedTo||"", contact:comm.contact,
      status:"Todo", priority:"Medium", dueDate:new Date(Date.now()+3*86400000).toISOString().slice(0,10),
      checklist:[], tags:["communication"], createdAt:new Date().toISOString().slice(0,10) };
    const u=[nt,...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks",u,workspaceId);
    addAudit("Tasks","Create",`Task from communication with ${comm.contact}`); toast("Task added");
  };

  const addNote = (comm) => {
    if (!setNotes) return;
    const nn = { id:genId(), title:`Note — ${comm.method} with ${comm.contact}`,
      body:comm.summary||"", relatedTo:comm.contact, relatedType:"Communication",
      type:"Call", tags:[], pinned:false, createdAt:new Date().toISOString().slice(0,10) };
    const u=[nn,...(notes||[])]; setNotes(u); saveWorkspaceData("notes",u,workspaceId);
    addAudit("Notes","Create",`Note from communication with ${comm.contact}`); toast("Note added");
  };

  const addCalendarEvent = (comm) => {
    if (!setCalendarEvents) return;
    const ne = { id:genId(), title:`${comm.method}: ${comm.contact}`,
      type:comm.method==="Meeting"?"Meeting":"Call", date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),
      time:"", relatedClient:comm.contact, relatedProject:comm.relatedTo||"",
      notes:comm.nextStep||"", createdAt:new Date().toISOString().slice(0,10) };
    const u=[ne,...(calendarEvents||[])]; setCalendarEvents(u); saveWorkspaceData("calendarEvents",u,workspaceId);
    addAudit("Calendar","Create",`Event from communication with ${comm.contact}`); toast("Calendar event added");
  };

  const handleExport = () => { exportToCSV("communications", filtered); toast("Communications exported"); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this communication record?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}

      {(showForm||editing) && (
        <Modal title={editing?"Edit communication":"Log communication"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}>
          <CommForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}

      {/* Detail Modal */}
      {viewing && (
        <Modal title="Communication Detail" onClose={() => setViewing(null)} width={560}>
          <div>
            {/* Header — platform badge */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:"14px 16px",
              background:"var(--surface-raised)", borderRadius:"var(--r-md)", borderLeft:`4px solid ${METHOD_COLORS[viewing.method]||"var(--border)"}` }}>
              <div style={{ fontSize:32 }}>{METHOD_ICONS[viewing.method]||"📌"}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{viewing.method}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)" }}>{viewing.contact} · {fmtDate(viewing.date)}</div>
                {viewing.relatedTo && <div style={{ fontSize:12, color:"var(--text-muted)" }}>Related: {viewing.relatedTo}</div>}
              </div>
              {viewing.outcome && (
                <div style={{ marginLeft:"auto", fontSize:12, padding:"4px 10px", borderRadius:"var(--r-pill)",
                  background:"var(--success-dim)", color:"var(--success)", fontWeight:600 }}>{viewing.outcome}</div>
              )}
            </div>

            {/* Full message */}
            {viewing.summary && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Summary / Message</div>
                <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.6, padding:"12px 14px",
                  background:"var(--surface-raised)", borderRadius:"var(--r-md)", whiteSpace:"pre-wrap" }}>{viewing.summary}</div>
              </div>
            )}

            {/* Next step */}
            {viewing.nextStep && (
              <div style={{ marginBottom:16, padding:"10px 14px", background:"var(--accent-dim)",
                borderRadius:"var(--r-md)", borderLeft:"3px solid var(--accent)" }}>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, textTransform:"uppercase" }}>Next Step</div>
                <div style={{ fontSize:13, color:"var(--accent)", fontWeight:500 }}>{viewing.nextStep}</div>
              </div>
            )}

            {/* Linked actions */}
            {role !== "Viewer" && (
              <div>
                <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Linked Actions</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {setFollowUps && <button style={btnStyle("soft","sm")} onClick={() => { addFollowUp(viewing); setViewing(null); }}>📞 Add Follow-Up</button>}
                  {setTasks     && <button style={btnStyle("soft","sm")} onClick={() => { addTask(viewing); setViewing(null); }}>✅ Add Task</button>}
                  {setNotes     && <button style={btnStyle("soft","sm")} onClick={() => { addNote(viewing); setViewing(null); }}>📝 Add Note</button>}
                  {setCalendarEvents && <button style={btnStyle("soft","sm")} onClick={() => { addCalendarEvent(viewing); setViewing(null); }}>📅 Add Calendar Event</button>}
                </div>
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:20 }}>
              {role !== "Viewer" && <button style={btnStyle("ghost")} onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</button>}
              <button style={btnStyle("ghost")} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Communication Log</h2>
          <p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(communications||[]).length} entries</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={btnStyle("ghost","sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Log communication</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by contact or summary…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}>
          <option value="All">All methods</option>
          {COMM_METHODS.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Timeline list */}
      {filtered.length === 0
        ? <EmptyState icon="💬" title="No communications logged" sub="Track every interaction with your contacts." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Log communication</button>} />
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {filtered.map((c, idx) => (
              <div key={c.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
                {/* Timeline dot */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:36, flexShrink:0 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--surface)",
                    border:`2px solid ${METHOD_COLORS[c.method]||"var(--border)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                    {METHOD_ICONS[c.method]||"📌"}
                  </div>
                  {idx < filtered.length-1 && <div style={{ width:2, flex:1, background:"var(--border)", marginTop:4 }} />}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:600, fontSize:14 }}>{c.contact}</span>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:"var(--r-pill)", fontWeight:600,
                        background:METHOD_COLORS[c.method]+"22", color:METHOD_COLORS[c.method]||"var(--text-muted)" }}>
                        {c.method}
                      </span>
                      <span style={{ fontSize:12, color:"var(--text-muted)" }}>{fmtDate(c.date)}</span>
                      {c.relatedTo && <span style={{ fontSize:12, color:"var(--text-muted)" }}>· {c.relatedTo}</span>}
                    </div>
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <button style={btnStyle("ghost","xs")} onClick={() => setViewing(c)}>View</button>
                      {role !== "Viewer" && <button style={btnStyle("ghost","xs")} onClick={() => setEditing(c)}>Edit</button>}
                      {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","xs"), color:"var(--danger)" }} onClick={() => setConfirm(c.id)}>Del</button>}
                    </div>
                  </div>
                  {c.summary && <p style={{ fontSize:13, color:"var(--text)", margin:"6px 0 0", lineHeight:1.5,
                    overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{c.summary}</p>}
                  <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
                    {c.outcome  && <span style={{ fontSize:12, color:"var(--success)" }}>✓ {c.outcome}</span>}
                    {c.nextStep && <span style={{ fontSize:12, color:"var(--accent)", fontWeight:500 }}>→ {c.nextStep}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
