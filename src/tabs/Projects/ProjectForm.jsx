import { useState, useCallback, useRef, useEffect } from "react";
import { FormField, inputStyle, btnStyle, toast } from "../../components/ui/UI.jsx";
import { PROJECT_STATUSES, PROJECT_PRIORITIES } from "../../config/crmConfig.js";

const ERR_STYLE = { fontSize: 11, color: "#ef4444", marginTop: 2 };

const PRESET_TAGS = [
  "Frontend", "Backend", "Fullstack", "Mobile", "API", "UI/UX",
  "Database", "DevOps", "MVP", "Maintenance", "Urgent", "Internal",
  "Client-Facing", "Research", "Beta", "v2",
];

const OPTIONAL_FIELDS = [
  { key: "client",       label: "Client" },
  { key: "budget",       label: "Budget & Payments" },
  { key: "techStack",    label: "Tech Stack" },
  { key: "assignees",    label: "Assignees / Team" },
  { key: "deliverables", label: "Key Deliverables" },
  { key: "milestones",   label: "Milestones" },
  { key: "description",  label: "Full Description" },
];

// Detect which optional fields already have data (for edit mode)
function getInitialOptional(initial) {
  const on = {};
  OPTIONAL_FIELDS.forEach(({ key }) => {
    if (key === "budget") {
      if (initial?.budget || initial?.paid) on[key] = true;
    } else if (initial?.[key]) {
      on[key] = true;
    }
  });
  return on;
}

export default function ProjectForm({ initial = {}, onSave, onClose, roadmapItems = [], contacts = [] }) {
  const [f, setF] = useState({
    name: "",
    client: "",
    industry: "",
    status: "Planning",
    budget: 0,
    paid: 0,
    deadline: "",
    startDate: "",
    progress: 0,
    techStack: "",
    priority: "Medium",
    category: "Software",
    deliverables: "",
    milestones: "",
    assignees: "",
    description: "",
    tags: [],
    contactId: "",
    linkedRoadmapItemIds: [],
    createdAt: new Date().toISOString().slice(0, 10),
    ...initial,
    tags: Array.isArray(initial?.tags) ? initial.tags : [],
    linkedRoadmapItemIds: Array.isArray(initial?.linkedRoadmapItemIds) ? initial.linkedRoadmapItemIds : [],
  });

  // Which optional fields are enabled
  const [optionalOn, setOptionalOn] = useState(() => getInitialOptional(initial));

  const [tagInput, setTagInput] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const tagInputRef = useRef(null);
  const tagDropdownRef = useRef(null);

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  const setStatus = e => {
    const val = e.target.value;
    setF(p => ({ ...p, status: val, progress: val === "Completed" ? 100 : p.progress }));
  };

  const setProgress = e => {
    const val = Number(e.target.value);
    setF(p => ({ ...p, progress: val, status: val === 100 && p.status !== "Completed" ? "Completed" : p.status }));
  };

  const budget = Number(f.budget) || 0;
  const paid = Number(f.paid) || 0;
  const pending = Math.max(0, budget - paid);

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const addTag = useCallback((tag) => {
    const t = (tag ?? tagInput).trim();
    if (!t) return;
    if (f.tags.includes(t)) { toast("Tag already added", "error"); return; }
    setF(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput("");
    setTagDropdownOpen(false);
  }, [tagInput, f.tags]);

  const removeTag = useCallback(tag => setF(p => ({ ...p, tags: p.tags.filter(t => t !== tag) })), []);

  const filteredPresets = PRESET_TAGS.filter(t =>
    !f.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Optional field toggle ────────────────────────────────────────────────
  const toggleOptional = key => {
    setOptionalOn(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (prev[key]) {
        if (key === "client") setF(p => ({ ...p, client: "", contactId: "" }));
        else if (key === "budget") setF(p => ({ ...p, budget: 0, paid: 0 }));
        else setF(p => ({ ...p, [key]: "" }));
      }
      return next;
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────
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

  // ── Shared style for optional toggle buttons ─────────────────────────────
  const optToggleStyle = (active) => ({
    fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer", fontWeight: 500,
    border: `1px solid ${active ? "var(--accent-border)" : "var(--border)"}`,
    background: active ? "var(--accent-dim)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-muted)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ padding: "0 10px" }}>

      {/* ── Core Details ── */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Core Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
          <FormField label="Project Name" required>
            <input style={{ ...inputStyle, fontSize: 16, fontWeight: 500, padding: "10px 12px", borderColor: errors.name ? "#ef4444" : undefined }} value={f.name} onChange={set("name")} placeholder="e.g. Acme Website Redesign" />
            {errors.name && <div style={ERR_STYLE}>{errors.name}</div>}
          </FormField>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginTop: 16 }}>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={setStatus}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{PROJECT_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}><option>Software</option><option>Design</option><option>Marketing</option><option>Consulting</option><option>Other</option></select></FormField>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Timeline</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Start Date"><input style={inputStyle} type="date" value={f.startDate} onChange={set("startDate")} /></FormField>
          <FormField label="Deadline">
            <input style={{ ...inputStyle, borderColor: errors.deadline ? "#ef4444" : undefined }} type="date" value={f.deadline} onChange={set("deadline")} />
            {errors.deadline && <div style={ERR_STYLE}>{errors.deadline}</div>}
          </FormField>
          <FormField label="Progress %" style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="range" min="0" max="100" step="5" value={f.progress} onChange={setProgress} style={{ flex: 1, accentColor: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: "right", color: errors.progress ? "#ef4444" : "var(--text)" }}>{f.progress}%</span>
            </div>
            {errors.progress && <div style={ERR_STYLE}>{errors.progress}</div>}
          </FormField>
        </div>
      </div>

      {/* ── Tags — upgraded ── */}
      <FormField label="Tags">
        <div style={{ position: "relative" }} ref={tagDropdownRef}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={tagInputRef}
              style={{ ...inputStyle, flex: 1 }}
              value={tagInput}
              onChange={e => { setTagInput(e.target.value); setTagDropdownOpen(true); }}
              onFocus={() => setTagDropdownOpen(true)}
              placeholder="Type or pick a tag…"
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); addTag(); }
                if (e.key === "Escape") setTagDropdownOpen(false);
              }}
            />
            <button style={btnStyle("ghost")} onClick={() => addTag()}>Add</button>
          </div>

          {/* Dropdown */}
          {tagDropdownOpen && filteredPresets.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 180, overflowY: "auto",
            }}>
              {filteredPresets.map(tag => (
                <div
                  key={tag}
                  onMouseDown={e => { e.preventDefault(); addTag(tag); }}
                  style={{
                    padding: "7px 12px", fontSize: 13, cursor: "pointer", color: "var(--text)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {tag}
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+ add</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {f.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {f.tags.map(tag => (
              <span key={tag} style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, padding: "3px 10px", borderRadius: 12,
                background: "var(--accent-dim)", color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}>
                {tag}
                <span style={{ cursor: "pointer", fontWeight: 700, opacity: 0.6, lineHeight: 1 }} onClick={() => removeTag(tag)}>×</span>
              </span>
            ))}
          </div>
        )}
      </FormField>

      {/* ── Optional fields toggle row ── */}
      <div style={{ marginTop: 20, marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Optional fields</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {OPTIONAL_FIELDS.map(({ key, label }) => (
            <button key={key} type="button" style={optToggleStyle(!!optionalOn[key])} onClick={() => toggleOptional(key)}>
              {optionalOn[key] ? "✓ " : "+ "}{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Optional: Client (from contacts) ── */}
      {optionalOn.client && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormField label="Client (from Contacts)">
              <select
                style={inputStyle}
                value={f.contactId || ""}
                onChange={e => {
                  const cid = e.target.value;
                  const contact = contacts.find(c => c.id === cid);
                  setF(p => ({
                    ...p,
                    contactId: cid,
                    client: contact ? (contact.name || contact.company || "") : "",
                    industry: contact?.industry || p.industry,
                  }));
                }}
              >
                <option value="">— Select a contact —</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.company}{c.company && c.name ? ` (${c.company})` : ""}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Industry"><input style={inputStyle} value={f.industry} onChange={set("industry")} placeholder="Auto-filled or override" /></FormField>
          </div>
          {f.contactId && (() => {
            const c = contacts.find(x => x.id === f.contactId);
            if (!c) return null;
            return (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {c.email && <span>✉️ {c.email}</span>}
                {c.phone && <span>📞 {c.phone}</span>}
                {c.city && <span>📍 {c.city}</span>}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Optional: Budget & Payments ── */}
      {optionalOn.budget && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormField label="Budget (₹)"><input style={inputStyle} type="number" min="0" value={f.budget} onChange={set("budget")} /></FormField>
            <FormField label="Paid (₹)">
              <input style={{ ...inputStyle, borderColor: errors.paid ? "#ef4444" : undefined }} type="number" min="0" value={f.paid} onChange={set("paid")} />
              {errors.paid && <div style={ERR_STYLE}>{errors.paid}</div>}
            </FormField>
          </div>
          {budget > 0 && (
            <div style={{ display: "flex", gap: 16, padding: "8px 12px", borderRadius: 8, background: "var(--accent-dim)", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
              <span>Budget: ₹{budget.toLocaleString()}</span>
              <span>Paid: ₹{paid.toLocaleString()}</span>
              <span style={{ color: pending > 0 ? "#f59e0b" : "#10b981", fontWeight: 500 }}>Pending: ₹{pending.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Optional field inputs ── */}
      {(optionalOn.assignees || optionalOn.techStack) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginTop: 12 }}>
          {optionalOn.assignees && (
            <FormField label="Assignees / Team"><input style={inputStyle} value={f.assignees} onChange={set("assignees")} placeholder="e.g. John, Alice" /></FormField>
          )}
          {optionalOn.techStack && (
            <FormField label="Tech Stack"><input style={inputStyle} value={f.techStack} onChange={set("techStack")} placeholder="React, Node.js, etc." /></FormField>
          )}
        </div>
      )}

      {(optionalOn.deliverables || optionalOn.milestones || optionalOn.description) && (
        <div style={{ marginTop: 12, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Scope & Deliverables</h3>
          {optionalOn.deliverables && (
            <FormField label="Key Deliverables"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.deliverables} onChange={set("deliverables")} placeholder="What are the final outputs? (e.g. Figma files, Source Code)" /></FormField>
          )}
          {optionalOn.milestones && (
            <FormField label="Milestones"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.milestones} onChange={set("milestones")} placeholder="List key dates/milestones (e.g. Beta on Oct 1st)" /></FormField>
          )}
          {optionalOn.description && (
            <FormField label="Full Description"><textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={f.description} onChange={set("description")} placeholder="Comprehensive project scope, objectives, requirements..." /></FormField>
          )}
        </div>
      )}

      {/* ── Linked Roadmap Items ── */}
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

      {/* ── Footer ── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", alignItems: "center" }}>
        <button
          style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid #bbf7d0", background: f.status === "Completed" ? "#10b98122" : "transparent", color: "#10b981", cursor: "pointer", fontWeight: 600 }}
          onClick={() => setF(p => ({ ...p, status: "Completed", progress: 100 }))}
          type="button"
        >✓ Mark as Complete</button>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...btnStyle("ghost"), padding: "10px 20px" }} onClick={onClose}>Cancel</button>
          <button style={{ ...btnStyle("primary"), padding: "10px 24px", fontSize: 14 }} onClick={handleSave}>
            {initial?.id ? "Update Project" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
