import { Badge } from "../../components/ui/UI.jsx";

const avatarColors = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
const avatarColor = name => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

export default function ContactCard({ contact, onEdit, onDelete, onView, leads = [], followUps = [], projects = [], tasks = [], invoices = [], communications = [] }) {
  const leadCount = leads.filter(l => l.contactId === contact.id || l.contact === contact.name).length;
  const pendingFU = followUps.filter(f => (f.contactId === contact.id || f.contact === contact.name) && f.status === "Pending").length;
  const projectCount = projects.filter(p => p.contactId === contact.id || p.client === contact.name).length;
  const taskCount = tasks.filter(t => t.contactId === contact.id || t.contact === contact.name).length;
  const invoiceCount = invoices.filter(i => i.contactId === contact.id || i.clientName === contact.name).length;
  const commCount = communications.filter(c => c.contact === contact.name).length;
  const color = avatarColor(contact.name);
  
  return (
    <div style={{
      padding: 14,
      borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--surface-raised)",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      cursor: "pointer",
      transition: "all 0.15s",
    }} onClick={onView}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{contact.name}</span>
          <Badge style={{ fontSize: 10, padding: "2px 8px" }}>{contact.status}</Badge>
        </div>
        {(contact.role || contact.company) && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            {contact.role}{contact.role && contact.company ? " · " : ""}{contact.company}
          </div>
        )}
        {contact.bio && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontStyle: "italic", lineHeight: 1.4 }}>
            "{contact.bio.length > 60 ? contact.bio.slice(0, 60) + "..." : contact.bio}"
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {contact.phone && <span>📱 {contact.phone}</span>}
          {contact.email && <span style={{ marginLeft: 8 }}>✉️ {contact.email}</span>}
        </div>
        {(leadCount > 0 || pendingFU > 0 || projectCount > 0 || taskCount > 0 || invoiceCount > 0 || commCount > 0) && (
          <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
            {leadCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.2)" }}>🎯 {leadCount}</span>}
            {pendingFU > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(251,191,36,0.12)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.2)" }}>📅 {pendingFU}</span>}
            {projectCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.2)" }}>🗂️ {projectCount}</span>}
            {taskCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(139,92,246,0.12)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.2)" }}>✅ {taskCount}</span>}
            {invoiceCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(236,72,153,0.12)", color: "#F472B6", border: "1px solid rgba(236,72,153,0.2)" }}>💰 {invoiceCount}</span>}
            {commCount > 0 && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "rgba(14,165,233,0.12)", color: "#38BDF8", border: "1px solid rgba(14,165,233,0.2)" }}>💬 {commCount}</span>}
          </div>
        )}
        {contact.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            {contact.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)"
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onEdit}
          title="Edit"
          style={{ padding: "4px 8px", fontSize: 11, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}
        >✏️</button>
        <button
          onClick={onDelete}
          title="Delete"
          style={{ padding: "4px 8px", fontSize: 11, background: "transparent", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--danger)" }}
        >🗑️</button>
      </div>
    </div>
  );
}
