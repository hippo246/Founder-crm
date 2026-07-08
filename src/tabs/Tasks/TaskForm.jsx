import { useState } from "react";
import { FormField, inputStyle, btnStyle, toast } from "../../components/ui/UI.jsx";
import { genId } from "../../lib/helpers.js";
import { TASK_STATUSES, TASK_PRIORITIES } from "../../config/crmConfig.js";

export default function TaskForm({ initial = {}, onSave, onClose, projects = [], roadmapItems = [], supportTickets = [], contacts = [] }) {
  const [f, setF] = useState({
    title: "", description: "", project: "", contact: "", status: "Todo", priority: "Medium",
    dueDate: "", startDate: "", estimatedHours: "", actualHours: "",
    checklist: [], tags: [], notes: "", blockers: "",
    projectId: "", contactId: "", roadmapItemId: "", supportTicketId: "", promptId: "",
    createdAt: new Date().toISOString().slice(0, 10),
    ...initial
  });
  const [newItem, setNewItem] = useState("");
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const addCI = () => { if (!newItem.trim()) return; setF(p => ({ ...p, checklist: [...(p.checklist || []), { id: genId(), text: newItem.trim(), done: false }] })); setNewItem(""); };
  const toggleCI = id => setF(p => ({ ...p, checklist: p.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }));
  const removeCI = id => setF(p => ({ ...p, checklist: p.checklist.filter(c => c.id !== id) }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Title" required><input style={inputStyle} value={f.title} onChange={set("title")} autoFocus /></FormField>
        <FormField label="Project">
          <select style={inputStyle} value={f.project} onChange={e => { setF(p => { const proj = projects.find(x => x.name === e.target.value); return { ...p, project: e.target.value, projectId: proj?.id || "" }; }); }}>
            <option value="">— No project —</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Contact">
          <select style={inputStyle} value={f.contact} onChange={e => { setF(p => { const cont = contacts.find(x => x.name === e.target.value); return { ...p, contact: e.target.value, contactId: cont?.id || "" }; }); }}>
            <option value="">— No contact —</option>
            {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TASK_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
        <FormField label="Start date"><input style={inputStyle} type="date" value={f.startDate} onChange={set("startDate")} /></FormField>
        <FormField label="Est. hours"><input style={inputStyle} type="number" value={f.estimatedHours} onChange={set("estimatedHours")} placeholder="Optional" /></FormField>
        <FormField label="Actual hours"><input style={inputStyle} type="number" value={f.actualHours} onChange={set("actualHours")} placeholder="Optional" /></FormField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Roadmap item">
          <select style={inputStyle} value={f.roadmapItemId} onChange={set("roadmapItemId")}>
            <option value="">— None —</option>
            {roadmapItems.map(r => <option key={r.id} value={r.id}>{r.item} ({r.project})</option>)}
          </select>
        </FormField>
        <FormField label="Support ticket">
          <select style={inputStyle} value={f.supportTicketId} onChange={set("supportTicketId")}>
            <option value="">— None —</option>
            {supportTickets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </FormField>
      </div>
      <FormField label="Description"><textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={f.description} onChange={set("description")} placeholder="Task details, requirements, acceptance criteria..." /></FormField>
      <FormField label="Blockers / Notes"><input style={inputStyle} value={f.blockers} onChange={set("blockers")} placeholder="What's blocking this task?" /></FormField>
      <FormField label="Checklist">
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add checklist item…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCI())} />
          <button style={btnStyle("ghost", "sm")} onClick={addCI}>Add</button>
        </div>
        {(f.checklist || []).map(ci => (
          <div key={ci.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <input type="checkbox" checked={ci.done} onChange={() => toggleCI(ci.id)} />
            <span style={{ flex: 1, fontSize: 13, color: ci.done ? "var(--text-muted)" : "var(--text)", textDecoration: ci.done ? "line-through" : "none" }}>{ci.text}</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 15 }} onClick={() => removeCI(ci.id)}>×</button>
          </div>
        ))}
      </FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={() => { if (!f.title.trim()) { toast("Title required", "error"); return; } onSave(f); }}>Save task</button>
      </div>
    </div>
  );
}
