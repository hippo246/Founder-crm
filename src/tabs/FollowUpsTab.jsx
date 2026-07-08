import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { FU_TYPES, FU_STATUSES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: FOLLOW-UPS
// ══════════════════════════════════════════════════════════════════════════════


const FollowUpForm = ({ initial = {}, onSave, onClose, contacts, leads, projects }) => {
  const [f, setF] = useState({ person: "", relatedTo: "", relatedType: "Lead", type: "WhatsApp", dueDate: new Date().toISOString().slice(0,10), status: "Pending", notes: "", outcome: "", createdAt: new Date().toISOString().slice(0,10), ...initial });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Person"><input style={inputStyle} value={f.person} onChange={set("person")} placeholder="Contact name" /></FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Related to"><input style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} placeholder="Lead or project name" /></FormField>
        <FormField label="Related type"><select style={inputStyle} value={f.relatedType} onChange={set("relatedType")}><option>Lead</option><option>Project</option><option>Contact</option></select></FormField>
        <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
      </div>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <FormField label="Outcome"><input style={inputStyle} value={f.outcome} onChange={set("outcome")} placeholder="What happened?" /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save</button></div>
    </div>
  );
};

export default function FollowUpsTab({ followUps, setFollowUps, addAudit, role, contacts, leads, projects, tasks, setTasks, calendarEvents, setCalendarEvents , workspaceId = "workspace-1" , onLinkedSave}) {

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewFilter, setViewFilter] = useState("All");

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return (followUps || []).filter(f => {
      const q = search.toLowerCase();
      return (!q || f.person?.toLowerCase().includes(q) || f.relatedTo?.toLowerCase().includes(q))
        && (filterStatus === "All" || f.status === filterStatus)
        && (filterType === "All" || f.type === filterType)
        && (viewFilter === "Today" ? f.dueDate === today : viewFilter === "Missed" ? f.status === "Missed" : true);
    });
  }, [followUps, search, filterStatus, filterType, viewFilter]);

  const save = (f) => {
    if (editing) { const u = (followUps||[]).map(x => x.id === editing.id ? { ...editing, ...f } : x); setFollowUps(u); saveWorkspaceData("followUps", u, workspaceId); addAudit("Follow-Ups", "Update", `Updated follow-up: ${f.person}`); toast("Follow-up updated"); }
    else { const nf = { ...f, id: genId() }; const u = [nf, ...(followUps||[])]; setFollowUps(u); saveWorkspaceData("followUps", u, workspaceId); addAudit("Follow-Ups", "Create", `Created follow-up: ${f.person}`); toast("Follow-up added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const item = (followUps||[]).find(x => x.id === id); const u = (followUps||[]).filter(x => x.id !== id); setFollowUps(u); saveWorkspaceData("followUps", u, workspaceId); addAudit("Follow-Ups", "Delete", `Deleted follow-up: ${item?.person}`); toast("Deleted", "info"); setConfirm(null); };
  const markStatus = (id, status) => { const u = (followUps||[]).map(x => x.id === id ? { ...x, status } : x); setFollowUps(u); saveWorkspaceData("followUps", u, workspaceId); addAudit("Follow-Ups", "Status", `Marked follow-up ${status}`); toast(`Marked ${status}`); };

  const createTask = fu => {
    if (role === "Viewer") return;
    const nt = { id: genId(), title: `Follow up: ${fu.person}`, description: fu.notes||"", project: fu.relatedTo||"", status: "Todo", priority: "Medium", dueDate: fu.dueDate||"", checklist: [], tags: ["follow-up"], createdAt: new Date().toISOString().slice(0,10) };
    const u = [nt, ...(tasks||[])]; setTasks(u); saveWorkspaceData("tasks", u, workspaceId);
    addAudit("Tasks", "Create", `Task from follow-up: ${fu.person}`); toast("Task created");
  };

  const createCalEvent = fu => {
    if (role === "Viewer") return;
    const ne = { id: genId(), title: `${fu.type}: ${fu.person}`, type: fu.type === "Meeting" ? "Meeting" : fu.type === "Call" ? "Call" : "Follow-Up", date: fu.dueDate || new Date().toISOString().slice(0,10), time: "", relatedClient: fu.person, relatedProject: fu.relatedTo||"", notes: fu.notes||"", createdAt: new Date().toISOString().slice(0,10) };
    const u = [ne, ...(calendarEvents||[])]; setCalendarEvents(u); saveWorkspaceData("calendarEvents", u, workspaceId);
    addAudit("Calendar", "Create", `Event from follow-up: ${fu.person}`); toast("Calendar event created");
  };
  
  const handleExport = () => { exportToCSV("followUps", filtered); toast("Follow-Ups exported to CSV"); };

  const todayCount = (followUps||[]).filter(f => f.dueDate === new Date().toISOString().slice(0,10) && f.status === "Pending").length;
  const missedCount = (followUps||[]).filter(f => f.status === "Missed").length;

  return (
    <div>
      {confirm && <Confirm msg="Delete this follow-up?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit follow-up":"Add follow-up"} onClose={() => { setShowForm(false); setEditing(null); }} width={580}><FollowUpForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} contacts={contacts} leads={leads} projects={projects} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Follow-Ups</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(followUps||[]).length} total</p></div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add follow-up</button>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <StatMini label="Due Today" value={todayCount} color={todayCount>0?"#D97706":"#374151"} onClick={() => setViewFilter("Today")} />
        <StatMini label="Missed" value={missedCount} color={missedCount>0?"#DC2626":"#374151"} onClick={() => setViewFilter("Missed")} />
        <StatMini label="Pending" value={(followUps||[]).filter(f=>f.status==="Pending").length} color="var(--accent)" />
        <StatMini label="Done" value={(followUps||[]).filter(f=>f.status==="Done").length} color="var(--success)" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["All","Today","Missed"].map(v => <button key={v} style={btnStyle(viewFilter===v?"primary":"ghost","sm")} onClick={() => setViewFilter(v)}>{v}</button>)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by person or related…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All">All types</option>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📞" title="No follow-ups" sub="Stay on top of your outreach." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add follow-up</button>} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(fu => {
            const overdue = fu.dueDate && isOverdue(fu.dueDate) && fu.status === "Pending";
            return (
              <div key={fu.id} style={{ background: "var(--surface)", border: `1px solid ${overdue?"#FCA5A5":"var(--border)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{fu.person || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{fu.type} · {fu.relatedTo || "—"} · Due: <span style={{ color: overdue?"#DC2626":"var(--text-muted)", fontWeight: overdue?600:400 }}>{fmtDate(fu.dueDate)}{overdue&&" ⏰"}</span></div>
                  {fu.notes && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fu.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge label={fu.status} />
                  {role !== "Viewer" && <>
                    {fu.status !== "Done" && <button style={{ ...btnStyle("ghost","sm"), color:"var(--success)" }} onClick={() => markStatus(fu.id, "Done")}>✓ Done</button>}
                    {fu.status === "Pending" && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => markStatus(fu.id, "Missed")}>Missed</button>}
                    <button style={btnStyle("ghost","sm")} onClick={() => createTask(fu)}>+ Task</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => createCalEvent(fu)}>+ Event</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => setEditing(fu)}>Edit</button>
                    {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(fu.id)}>Del</button>}
                    {onLinkedSave && role !== "Viewer" && <>
                      <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("task",{title:`Follow up: ${fu.person}`,project:fu.relatedTo||"",status:"Todo",priority:"Medium",dueDate:fu.dueDate||""})}>✅ Task</button>
                      <button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${fu.person}`,relatedTo:fu.relatedTo||fu.person,relatedType:"Follow-Up",body:fu.notes||"",tags:[]})}>📝 Note</button>
                    </>}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
