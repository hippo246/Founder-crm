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
    assignee: "", progress: 0, category: "Development",
    createdAt: new Date().toISOString().slice(0, 10),
    ...initial
  });
  const [newItem, setNewItem] = useState("");
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const addCI = () => { if (!newItem.trim()) return; setF(p => ({ ...p, checklist: [...(p.checklist || []), { id: genId(), text: newItem.trim(), done: false }] })); setNewItem(""); };
  const toggleCI = id => setF(p => ({ ...p, checklist: p.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }));
  const removeCI = id => setF(p => ({ ...p, checklist: p.checklist.filter(c => c.id !== id) }));

  const categories = ["Development", "Design", "Marketing", "Sales", "Support", "Operations", "Research", "Other"];

  return (
    <div style={{ padding: "0 10px" }}>
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Core Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0 16px" }}>
          <FormField label="Task Title" required><input style={{ ...inputStyle, fontSize: 16, fontWeight: 500, padding: "10px 12px" }} value={f.title} onChange={set("title")} autoFocus placeholder="What needs to be done?" /></FormField>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginTop: 16 }}>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TASK_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}>{categories.map(s => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Assignee"><input style={inputStyle} value={f.assignee} onChange={set("assignee")} placeholder="e.g. John Doe" /></FormField>
        </div>
      </div>

      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Timeline & Effort</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Start Date"><input style={inputStyle} type="date" value={f.startDate} onChange={set("startDate")} /></FormField>
          <FormField label="Due Date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
          <FormField label="Estimated Hours"><input style={inputStyle} type="number" min="0" step="0.5" value={f.estimatedHours} onChange={set("estimatedHours")} placeholder="0.0" /></FormField>
          <FormField label="Progress (%)">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="range" min="0" max="100" step="5" value={f.progress} onChange={set("progress")} style={{ flex: 1, accentColor: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: "right", color: "var(--text)" }}>{f.progress}%</span>
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Relations & Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Link to Project">
            <select style={inputStyle} value={f.project} onChange={e => { setF(p => { const proj = projects.find(x => x.name === e.target.value); return { ...p, project: e.target.value, projectId: proj?.id || "" }; }); }}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Link to Contact">
            <select style={inputStyle} value={f.contact} onChange={e => { setF(p => { const cont = contacts.find(x => x.name === e.target.value); return { ...p, contact: e.target.value, contactId: cont?.id || "" }; }); }}>
              <option value="">— No contact —</option>
              {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="Roadmap Item">
            <select style={inputStyle} value={f.roadmapItemId} onChange={set("roadmapItemId")}>
              <option value="">— None —</option>
              {roadmapItems.map(r => <option key={r.id} value={r.id}>{r.item} ({r.project})</option>)}
            </select>
          </FormField>
          <FormField label="Support Ticket">
            <select style={inputStyle} value={f.supportTicketId} onChange={set("supportTicketId")}>
              <option value="">— None —</option>
              {supportTickets.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Details</h3>
        <FormField label="Full Description"><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={f.description} onChange={set("description")} placeholder="Comprehensive task details, acceptance criteria, or specifications..." /></FormField>
        <FormField label="Blockers / Impediments"><input style={{ ...inputStyle, borderColor: f.blockers ? "var(--warning)" : "var(--border)" }} value={f.blockers} onChange={set("blockers")} placeholder="Is anything preventing this task from moving forward?" /></FormField>
        
        <FormField label="Task Checklist (Subtasks)">
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add a subtask…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCI())} />
            <button style={btnStyle("ghost", "sm")} onClick={addCI}>+ Add</button>
          </div>
          {(f.checklist || []).length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>No subtasks added yet.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(f.checklist || []).map(ci => (
              <div key={ci.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-raised)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                <input type="checkbox" checked={ci.done} onChange={() => toggleCI(ci.id)} style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: ci.done ? 400 : 500, color: ci.done ? "var(--text-muted)" : "var(--text)", textDecoration: ci.done ? "line-through" : "none" }}>{ci.text}</span>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 16, padding: "0 4px" }} onClick={() => removeCI(ci.id)}>×</button>
              </div>
            ))}
          </div>
        </FormField>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <button style={{ ...btnStyle("ghost"), padding: "10px 20px" }} onClick={onClose}>Cancel</button>
        <button style={{ ...btnStyle("primary"), padding: "10px 24px", fontSize: 14 }} onClick={() => { if (!f.title.trim()) { toast("Title is required", "error"); return; } onSave(f); }}>
          {initial.id ? "Update Task" : "Create Task"}
        </button>
      </div>
    </div>
  );
}
