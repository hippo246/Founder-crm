import { SectionCard } from "../../components/ui/UI.jsx";
import { fmtDate, isToday } from "../../lib/helpers.js";
import { CAL_TYPE_ICONS } from "../../config/crmConfig.js";

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  if (diff === 0) return { label: "Today", color: "#6366f1", bold: true };
  if (diff === 1) return { label: "Tomorrow", color: "#f59e0b", bold: false };
  return { label: `In ${diff}d`, color: "var(--text-muted)", bold: false };
}

export default function UpcomingEvents({ calendarEvents, onNavigate }) {
  const upcomingEvents = calendarEvents
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  const todayCount = upcomingEvents.filter(e => isToday(e.date)).length;

  return (
    <SectionCard style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
            Upcoming Events
          </div>
          {todayCount > 0 && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#6366f1",
              background: "rgba(99,102,241,0.12)",
              borderRadius: 8,
              padding: "2px 7px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              {todayCount} today
            </span>
          )}
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate("calendar")}
            style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            View all →
          </button>
        )}
      </div>
      {upcomingEvents.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
          No upcoming events — your calendar is clear.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 0 }}>
          {upcomingEvents.map((event, i) => {
            const when = daysUntil(event.date);
            const today = isToday(event.date);
            return (
              <div key={event.id} style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: i < upcomingEvents.length - 1 ? "1px solid var(--border)" : "none",
                background: today ? "rgba(99,102,241,0.03)" : "transparent",
                borderRadius: today ? 6 : 0,
                paddingLeft: today ? 6 : 0,
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: today ? "rgba(99,102,241,0.12)" : "var(--accent-dim, rgba(99,102,241,0.07))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                }}>
                  {CAL_TYPE_ICONS[event.type] || "📅"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12,
                    color: "var(--text)",
                    fontWeight: today ? 600 : 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
                    <span>{fmtDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
                    {event.type && (
                      <span style={{ color: "#6366f1", fontWeight: 600, textTransform: "capitalize" }}>{event.type}</span>
                    )}
                  </div>
                </div>
                <div style={{
                  fontSize: 10,
                  fontWeight: when.bold ? 700 : 500,
                  color: when.color,
                  flexShrink: 0,
                }}>
                  {when.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
