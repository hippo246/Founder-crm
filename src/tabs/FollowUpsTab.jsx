import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, StatMini, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { FU_TYPES, FU_STATUSES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: FOLLOW-UPS
// ══════════════════════════════════════════════════════════════════════════════


const FollowUpForm = ({ initial = {}, onSave, onClose, contacts, leads, projects }) => {
  const [f, setF] = useState({ person: "", relatedTo: "", relatedType: "Lead", type: "WhatsApp", dueDate: new Date().toISOString().slice(0,10), status: "Pending", notes: "", outcome: "", createdAt: new Date().toISOString().slice(0,10), ...initial });
  const [errors, setErrors] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Build suggestions from actual data
  const personSuggestions = [
    ...(contacts||[]).map(c => c.name).filter(Boolean),
    ...(leads||[]).map(l => l.name || l.company).filter(Boolean),
  ].filter((v,i,a) => a.indexOf(v) === i);

  const relatedSuggestions = {
    Lead:    (leads||[]).map(l => l.name || l.company).filter(Boolean),
    Project: (projects||[]).map(p => p.name).filter(Boolean),
    Contact: (contacts||[]).map(c => c.name).filter(Boolean),
  };

  const handleSave = () => {
    const e = {};
    if (!f.person.trim()) e.person = "Person is required";
    if (!f.dueDate) e.dueDate = "Due date is required";
    setErrors(e);
    if (Object.keys(e).length > 0) { toast("Please fix the errors below", "error"); return; }
    onSave(f);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Person" required>
          <input list="fu-person-list" style={{ ...inputStyle, borderColor: errors.person ? "#ef4444" : undefined }} value={f.person} onChange={set("person")} placeholder="Contact name" autoFocus />
          <datalist id="fu-person-list">{personSuggestions.map(s => <option key={s} value={s} />)}</datalist>
          {errors.person && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{errors.person}</div>}
        </FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Related type"><select style={inputStyle} value={f.relatedType} onChange={set("relatedType")}><option>Lead</option><option>Project</option><option>Contact</option></select></FormField>
        <FormField label="Related to">
          <input list="fu-related-list" style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} placeholder={`${f.relatedType} name`} />
          <datalist id="fu-related-list">{(relatedSuggestions[f.relatedType]||[]).map(s => <option key={s} value={s} />)}</datalist>
        </FormField>
        <FormField label="Due date" required>
          <input style={{ ...inputStyle, borderColor: errors.dueDate ? "#ef4444" : undefined }} type="date" value={f.dueDate} onChange={set("dueDate")} />
          {errors.dueDate && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{errors.dueDate}</div>}
        </FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
      </div>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} placeholder="Context, preparation notes…" /></FormField>
      <FormField label="Outcome" hint="Fill in after the follow-up is done"><input style={inputStyle} value={f.outcome} onChange={set("outcome")} placeholder="What happened? Any next steps?" /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={handleSave}>Save</button></div>
    </div>
  );
};

export default function FollowUpsTab({ followUps, setFollowUps, addAudit, role, contacts, leads, projects, tasks, setTasks, calendarEvents, setCalendarEvents , workspaceId = "workspace-1" , onLinkedSave}) {

  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewFilter, setViewFilter] = useState("All");

  const { filtered, todayCount, missedCount } = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const all = followUps || [];
    const filtered = all.filter(f => {
      const q = search.toLowerCase();
      return (!q || f.person?.toLowerCase().includes(q) || f.relatedTo?.toLowerCase().includes(q) || f.notes?.toLowerCase().includes(q) || f.type?.toLowerCase().includes(q) || f.outcome?.toLowerCase().includes(q))
        && (filterStatus === "All" || f.status === filterStatus)
        && (filterType === "All" || f.type === filterType)
        && (viewFilter === "Today" ? f.dueDate === today : viewFilter === "Missed" ? f.status === "Missed" : viewFilter === "Overdue" ? (f.dueDate && f.dueDate < today && f.status === "Pending") : true);
    });
    return {
      filtered,
      todayCount: all.filter(f => f.dueDate === today).length,
      missedCount: all.filter(f => f.status === "Missed").length,
    };
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
    if (onLinkedSave) {
      onLinkedSave("task", { title: `Follow up: ${fu.person}`, description: fu.notes||"", project: fu.relatedTo||"", status: "Todo", priority: "Medium", dueDate: fu.dueDate||"", tags: ["follow-up"], checklist: [] });
      addAudit("Tasks", "Create", `Task from follow-up: ${fu.person}`);
      toast("Task created");
      return;
    }
    if (!setTasks) { toast("Task creation not available", "error"); return; }
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
  
  const handleExport = () => { exportToCSV(filtered, "followUps"); toast("Follow-Ups exported to CSV"); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this follow-up?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit follow-up":"Add follow-up"} onClose={() => { setShowForm(false); setEditing(null); }} width={580}><FollowUpForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} contacts={contacts} leads={leads} projects={projects} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Follow-Ups</h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {filtered.length !== (followUps||[]).length
              ? <>{filtered.length} of {(followUps||[]).length} shown</>
              : <>{(followUps||[]).length} total</>}
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "cards" ? "var(--primary,#6366f1)" : "transparent", color: view === "cards" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("cards")}
            >⊞ Cards</button>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "table" ? "var(--primary,#6366f1)" : "transparent", color: view === "table" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("table")}
            >≡ Table</button>
          </div>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>↓ Export</button>
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
        {[
          { v: "All", label: "All", count: (followUps||[]).length },
          { v: "Today", label: "Today", count: todayCount },
          { v: "Overdue", label: "Overdue", count: (followUps||[]).filter(f => f.dueDate && isOverdue(f.dueDate) && f.status === "Pending").length },
          { v: "Missed", label: "Missed", count: missedCount },
        ].map(({ v, label, count }) => (
          <button key={v} style={btnStyle(viewFilter===v?"primary":"ghost","sm")} onClick={() => setViewFilter(v)}>
            {label}{count > 0 && v !== "All" && <span style={{ marginLeft: 5, fontSize: 10, padding: "1px 5px", borderRadius: 8, background: viewFilter===v?"rgba(255,255,255,0.25)":"var(--accent-dim)", color: viewFilter===v?"#fff":"var(--accent)", fontWeight: 700 }}>{count}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by person or related…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); if (e.target.value !== "All") setViewFilter("All"); }}><option value="All">All statuses</option>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => { setFilterType(e.target.value); if (e.target.value !== "All") setViewFilter("All"); }}><option value="All">All types</option>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📞" title={(followUps||[]).length > 0 ? "No results" : "No follow-ups"} sub={(followUps||[]).length > 0 ? "Try adjusting your filters or search." : "Stay on top of your outreach."} action={(followUps||[]).length === 0 && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add follow-up</button>} /> : view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map(fu => {
            const overdue = fu.dueDate && isOverdue(fu.dueDate) && fu.status === "Pending";
            return (
              <div key={fu.id} style={{ background: "var(--surface)", border: `1px solid ${overdue?"#FCA5A5":fu.status==="Done"?"var(--border)":"var(--border)"}`, borderLeft: `3px solid ${overdue?"#EF4444":fu.status==="Done"?"#10B981":fu.status==="Missed"?"#F59E0B":"var(--accent)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fu.person || "—"}</span>
                      <Badge label={fu.status} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: fu.notes||fu.outcome ? 6 : 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {fu.type} · {fu.relatedTo || "—"}
                    </div>
                  </div>
                </div>
                
                <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--text-muted)" }}>Due:</span>
                  <span style={{ color: overdue?"#DC2626":"var(--text)", fontWeight: overdue?600:500, background: overdue?"#FEE2E2":"var(--border)", padding: "2px 6px", borderRadius: 4 }}>{fmtDate(fu.dueDate)}{overdue&&" ⏰"}</span>
                </div>

                {fu.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: fu.outcome ? 3 : 0, background: "var(--background)", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}>{fu.notes}</div>}
                {fu.outcome && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", background: "#f0fdf4", padding: 8, borderRadius: 6, border: "1px solid #bbf7d0" }}>💬 {fu.outcome}</div>}
                
                {role !== "Viewer" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-start" }}>
                      {fu.status !== "Done" && <button style={{ ...btnStyle("ghost","sm"), color:"var(--success)" }} onClick={() => markStatus(fu.id, "Done")}>✓ Done</button>}
                      {fu.status === "Pending" && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => markStatus(fu.id, "Missed")}>Missed</button>}
                      {(fu.status === "Missed" || fu.status === "Rescheduled") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--accent)" }} onClick={() => markStatus(fu.id, "Pending")}>↩ Reopen</button>}
                      <button style={{ ...btnStyle("ghost","sm"), marginLeft: "auto" }} onClick={() => setEditing(fu)}>Edit</button>
                      {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(fu.id)}>Del</button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "2px solid var(--border)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Person</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Type & Related</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Due Date</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(fu => {
                const overdue = fu.dueDate && isOverdue(fu.dueDate) && fu.status === "Pending";
                return (
                  <tr key={fu.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--text)" }}>{fu.person}</td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{fu.type} · {fu.relatedTo}</td>
                    <td style={{ padding: "11px 14px", color: overdue?"#DC2626":"var(--text-muted)", fontWeight: overdue?600:400 }}>{fmtDate(fu.dueDate)}{overdue&&" ⏰"}</td>
                    <td style={{ padding: "11px 14px" }}><Badge label={fu.status} /></td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {role !== "Viewer" && <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} onClick={() => setEditing(fu)}>Edit</button>}
                        {(role === "Owner" || role === "Admin") && <button style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 6, background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 600 }} onClick={() => setConfirm(fu.id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

}
