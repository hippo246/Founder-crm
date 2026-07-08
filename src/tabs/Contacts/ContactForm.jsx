import { useState } from "react";
import { FormField, inputStyle } from "../../components/ui/UI.jsx";
import { CONTACT_STATUSES, CONTACT_SOURCES } from "../../config/crmConfig.js";

const avatarColors = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
const avatarColor = name => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

const FORM_DEFAULTS = {
  name: "", company: "", role: "", phone: "", whatsapp: "", email: "",
  location: "", address: "", website: "", source: "LinkedIn",
  tags: [], status: "New", notes: "", bio: "", createdAt: new Date().toISOString().slice(0, 10),
};

const formSectionLabel = text => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: 6, marginBottom: 2, marginTop: 18 }}>{text}</div>
);

export default function ContactForm({ initial = {}, onSave, onClose, allTags }) {
  const [f, setF] = useState({ ...FORM_DEFAULTS, ...initial, createdAt: initial?.createdAt || FORM_DEFAULTS.createdAt });
  const [customTag, setCustomTag] = useState("");
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const validate = () => { const e = {}; if (!f.name.trim()) e.name = "Name is required"; if (!f.phone.trim()) e.phone = "Phone is required"; return e; };
  const submit = () => { const e = validate(); if (Object.keys(e).length) { setErr(e); return; } onSave(f); };
  const toggleTag = t => setF(p => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }));
  const tagsToShow = [...new Set([...(allTags || []), "Hot Lead", "Waiting Payment", "Urgent", "High Value", "Needs Follow-Up"])];

  const previewColor = avatarColor(f.name);

  return (
    <div>
      {/* Live avatar preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--surface-raised)", borderRadius: 10, marginBottom: 4, border: "1px solid var(--border)" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: previewColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: `0 0 0 3px ${previewColor}33` }}>
          {f.name ? f.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{f.name || <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>Contact name</span>}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{f.role || "Role"}{f.company ? ` · ${f.company}` : ""}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontWeight: 600 }}>{f.status}</span>
        </div>
      </div>

      {formSectionLabel("Identity")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Name" required><input style={inputStyle} value={f.name} onChange={set("name")} placeholder="Full name" />{err.name && <span style={{ color: "var(--danger)", fontSize: 11 }}>{err.name}</span>}</FormField>
        <FormField label="Company"><input style={inputStyle} value={f.company} onChange={set("company")} placeholder="Company name" /></FormField>
        <FormField label="Role / Designation"><input style={inputStyle} value={f.role} onChange={set("role")} placeholder="e.g. Founder, Manager" /></FormField>
      </div>

      {formSectionLabel("Contact")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Phone" required><input style={inputStyle} value={f.phone} onChange={set("phone")} placeholder="+91 98765 43210" />{err.phone && <span style={{ color: "var(--danger)", fontSize: 11 }}>{err.phone}</span>}</FormField>
        <FormField label="WhatsApp"><input style={inputStyle} value={f.whatsapp} onChange={set("whatsapp")} placeholder="If different from phone" /></FormField>
        <FormField label="Email"><input style={inputStyle} type="email" value={f.email} onChange={set("email")} placeholder="email@example.com" /></FormField>
        <FormField label="Website"><input style={inputStyle} value={f.website} onChange={set("website")} placeholder="https://" /></FormField>
      </div>

      {formSectionLabel("Location")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Location / City"><input style={inputStyle} value={f.location} onChange={set("location")} placeholder="City, Country" /></FormField>
      </div>
      <FormField label="Full Address">
        <textarea style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} value={f.address} onChange={set("address")} placeholder="Street, City, State, ZIP" />
      </FormField>

      {formSectionLabel("Classification")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Source"><select style={inputStyle} value={f.source} onChange={set("source")}>{CONTACT_SOURCES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{CONTACT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
      </div>
      <FormField label="Tags">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {tagsToShow.map(t => <span key={t} onClick={() => toggleTag(t)} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, cursor: "pointer", background: f.tags.includes(t) ? "var(--accent)" : "var(--surface-raised)", color: f.tags.includes(t) ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", transition: "all 0.15s" }}>{t}</span>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && customTag.trim()) { toggleTag(customTag.trim()); setCustomTag(""); e.preventDefault(); } }}
            placeholder="Add custom tag…"
          />
          <button
            type="button"
            onClick={() => { if (customTag.trim()) { toggleTag(customTag.trim()); setCustomTag(""); } }}
            style={{ padding: "0 12px", fontSize: 12, background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)" }}
          >Add</button>
        </div>
      </FormField>

      {formSectionLabel("Notes")}
      <FormField label="Bio"><textarea style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} value={f.bio} onChange={set("bio")} placeholder="Professional background, expertise, or personal context…" /></FormField>
      <FormField label="Internal Notes"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.notes} onChange={set("notes")} placeholder="Any additional context about this contact…" /></FormField>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
        <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, cursor: "pointer" }} onClick={onClose}>Cancel</button>
        <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }} onClick={submit}>Save Contact</button>
      </div>
    </div>
  );
}
