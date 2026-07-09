import { useState, useCallback } from "react";

const ERR_STYLE = { fontSize: 11, color: "#ef4444", marginTop: 2 };
import { FormField, inputStyle, btnStyle, toast } from "../../components/ui/UI.jsx";
import { PROJECT_STATUSES, PROJECT_PRIORITIES } from "../../config/crmConfig.js";

export default function ProjectForm({ initial = {}, onSave, onClose, roadmapItems = [] }) {
  const [f, setF] = useState({ 
    name: "", 
    client: "", 
    industry: "", 
    status: "Planning", 
    budget: 0, 
    paid: 0, 
    pending: 0, 
    deadline: "", 
    startDate: "",
    progress: 0, 
    techStack: "", 
    priority: "Medium", 
    description: "", 
    tags: [], 
    contactId: "",
    linkedRoadmapItemIds: [],
    createdAt: new Date().toISOString().slice(0, 10), 
    ...initial,
    tags: Array.isArray(initial?.tags) ? initial.tags : [],
    linkedRoadmapItemIds: Array.isArray(initial?.linkedRoadmapItemIds) ? initial.linkedRoadmapItemIds : [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  // Auto-sync: when status → Completed, bump progress to 100
  const setStatus = e => {
    const val = e.target.value;
    setF(p => ({ ...p, status: val, progress: val === "Completed" ? 100 : p.progress }));
  };

  // Auto-sync: when progress hits 100, suggest Completed
  const setProgress = e => {
    const val = e.target.value;
    setF(p => ({ ...p, progress: val, status: Number(val) === 100 && p.status !== "Completed" ? "Completed" : p.status }));
  };

  const budget = Number(f.budget) || 0;
  const paid = Number(f.paid) || 0;
  const pending = Math.max(0, budget - paid);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (f.tags.includes(tag)) { toast("Tag already added", "error"); return; }
    setF(p => ({ ...p, tags: [...p.tags, tag] }));
    setTagInput("");
  }, [tagInput, f.tags]);

  const removeTag = useCallback(tag => setF(p => ({ ...p, tags: p.tags.filter(t => t !== tag) })), []);

  const handleSave = useCallback(() => {
    const e = {};
    if (!f.name.trim()) e.name = "Project name is required";
    if (paid > budget && budget > 0) e.paid = "Paid cannot exceed budget";
    if (f.startDate && f.deadline && f.deadline < f.startDate) e.deadline = "Deadline must be after start date";
    const prog = Number(f.progress);
    if (prog < 0 || prog > 100) e.progress = "Must be 0–100";
    setErrors(e);
    if (Object.keys(e).length > 0) { toast("Please fix the errors below", "error"); return; }
    onSave({ ...f, progress: Math.min(100, Math.max(0, prog)), pending });
  }, [f, budget, paid, pending, onSave]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Project name" required>
          <input style={{ ...inputStyle, borderColor: errors.name ? "#ef4444" : undefined }} value={f.name} onChange={set("name")} placeholder="e.g. Brand Redesign" />
          {errors.name && <div style={ERR_STYLE}>{errors.name}</div>}
        </FormField>
        <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
        <FormField label="Industry"><input style={inputStyle} value={f.industry} onChange={set("industry")} /></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={setStatus}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{PROJECT_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Start date"><input style={inputStyle} type="date" value={f.startDate} onChange={set("startDate")} /></FormField>
        <FormField label="Deadline">
          <input style={{ ...inputStyle, borderColor: errors.deadline ? "#ef4444" : undefined }} type="date" value={f.deadline} onChange={set("deadline")} />
          {errors.deadline && <div style={ERR_STYLE}>{errors.deadline}</div>}
        </FormField>
        <FormField label="Budget (₹)"><input style={inputStyle} type="number" min="0" value={f.budget} onChange={set("budget")} /></FormField>
        <FormField label="Paid (₹)">
          <input style={{ ...inputStyle, borderColor: errors.paid ? "#ef4444" : undefined }} type="number" min="0" value={f.paid} onChange={set("paid")} />
          {errors.paid && <div style={ERR_STYLE}>{errors.paid}</div>}
        </FormField>
        <FormField label="Progress %">
          <input style={{ ...inputStyle, borderColor: errors.progress ? "#ef4444" : undefined }} type="number" min="0" max="100" value={f.progress} onChange={setProgress} />
          {errors.progress && <div style={ERR_STYLE}>{errors.progress}</div>}
        </FormField>
        <FormField label="Tech stack"><input style={inputStyle} value={f.techStack} onChange={set("techStack")} placeholder="React, Node.js, etc." /></FormField>
      </div>

      {budget > 0 && (
        <div style={{ display: "flex", gap: 16, padding: "8px 12px", borderRadius: 8, background: "var(--accent-dim)", marginBottom: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span>Budget: ₹{budget.toLocaleString()}</span>
          <span>Paid: ₹{paid.toLocaleString()}</span>
          <span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontWeight: 500 }}>
            Pending: ₹{pending.toLocaleString()}
          </span>
        </div>
      )}

      <FormField label="Tags">
        <div style={{ display: "flex", gap: 6 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="Add a tag and press Enter"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <button style={btnStyle("ghost")} onClick={addTag}>Add</button>
        </div>
        {f.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {f.tags.map(tag => (
              <span key={tag} style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, padding: "3px 10px", borderRadius: 12,
                background: "var(--accent-dim)", color: "var(--accent)",
                border: "1px solid var(--accent-border)"
              }}>
                {tag}
                <span
                  style={{ cursor: "pointer", fontWeight: 700, opacity: 0.6, lineHeight: 1 }}
                  onClick={() => removeTag(tag)}
                >×</span>
              </span>
            ))}
          </div>
        )}
      </FormField>

      {roadmapItems.length > 0 && (
        <FormField label="Linked roadmap items" hint="Hold Ctrl/Cmd to select multiple">
          <select
            multiple
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={f.linkedRoadmapItemIds}
            onChange={e => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              setF(p => ({ ...p, linkedRoadmapItemIds: selected }));
            }}
          >
            {roadmapItems.map(r => (
              <option key={r.id} value={r.id}>
                {r.item}{r.sector ? ` — ${r.sector}` : ""}{r.phase ? ` › ${r.phase}` : ""} [{r.status}]
              </option>
            ))}
          </select>
          {f.linkedRoadmapItemIds.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {f.linkedRoadmapItemIds.length} item{f.linkedRoadmapItemIds.length !== 1 ? "s" : ""} selected
              <button
                type="button"
                style={{ marginLeft: 8, fontSize: 10, padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                onClick={() => setF(p => ({ ...p, linkedRoadmapItemIds: [] }))}
              >Clear</button>
            </div>
          )}
        </FormField>
      )}
      <FormField label="Description"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.description} onChange={set("description")} placeholder="Project scope, objectives, deliverables..." /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
        <button
          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #bbf7d0", background: f.status === "Completed" ? "#10b98122" : "transparent", color: "#10b981", cursor: "pointer", fontWeight: 500 }}
          onClick={() => setF(p => ({ ...p, status: "Completed", progress: 100 }))}
          type="button"
        >✓ Mark complete</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
          <button style={btnStyle("primary")} onClick={handleSave}>Save project</button>
        </div>
      </div>
    </div>
  );
}
