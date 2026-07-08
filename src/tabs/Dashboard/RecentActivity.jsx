import { SectionCard } from "../../components/ui/UI.jsx";
import { fmtDate } from "../../lib/helpers.js";

const TYPE_META = {
  note:          { label: "Note",          color: "#8b5cf6", icon: "📝" },
  communication: { label: "Message",       color: "#6366f1", icon: "💬" },
  followup:      { label: "Follow-up",     color: "#f59e0b", icon: "🔔" },
  email:         { label: "Email",         color: "#6366f1", icon: "📧" },
  call:          { label: "Call",          color: "#10b981", icon: "📞" },
  meeting:       { label: "Meeting",       color: "#8b5cf6", icon: "🤝" },
  whatsapp:      { label: "WhatsApp",      color: "#10b981", icon: "💚" },
};

function getEntityName(item, contacts, leads, projects) {
  if (item.contactId) {
    const c = contacts.find(c => c.id === item.contactId);
    if (c) return c.name || c.email || "Contact";
  }
  if (item.leadId) {
    const l = leads.find(l => l.id === item.leadId);
    if (l) return l.name || l.title || "Lead";
  }
  if (item.projectId) {
    const p = projects.find(p => p.id === item.projectId);
    if (p) return p.name || "Project";
  }
  return null;
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(dateStr);
}

export default function RecentActivity({ notes, communications, followUps, contacts, leads, projects, onNavigate }) {
  const activities = [
    ...notes.map(n => ({ ...n, _type: "note", _date: n.createdAt || n.date || n.updatedAt })),
    ...communications.map(c => ({ ...c, _type: c.type || "communication", _date: c.date || c.createdAt })),
    ...followUps.map(f => ({ ...f, _type: "followup", _date: f.date || f.createdAt || f.dueDate })),
  ]
    .filter(a => a._date)
    .sort((a, b) => new Date(b._date) - new Date(a._date))
    .slice(0, 8);

  if (activities.length === 0) return null;

  return (
    <SectionCard style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
          Recent Activity
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onNavigate && (
            <>
              <button onClick={() => onNavigate("communications")} style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                Comms →
              </button>
              <button onClick={() => onNavigate("follow-ups")} style={{ fontSize: 11, color: "#f59e0b", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                Follow-ups →
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 24px" }}>
        {activities.map((item, i) => {
          const meta = TYPE_META[item._type] || TYPE_META["note"];
          const entityName = getEntityName(item, contacts, leads, projects);
          const title = item.title || item.subject || item.content?.slice(0, 60) || item.notes?.slice(0, 60) || "Activity";
          const ago = timeAgo(item._date);

          return (
            <div
              key={item.id || i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `${meta.color}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
                marginTop: 1,
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 1 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: meta.color,
                    background: `${meta.color}12`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    flexShrink: 0,
                  }}>
                    {meta.label}
                  </span>
                  {entityName && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entityName}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12,
                  color: "var(--text)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {title}
                </div>
              </div>
              {ago && (
                <div style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
                  {ago}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
