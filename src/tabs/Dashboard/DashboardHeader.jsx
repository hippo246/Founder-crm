import { fmtDate } from "../../lib/helpers.js";

export default function DashboardHeader({ onNewLead, onNewTask, onNewInvoice }) {
  const actions = [
    { label: "+ Lead", onClick: onNewLead, color: "#f59e0b" },
    { label: "+ Task", onClick: onNewTask, color: "#6366f1" },
    { label: "+ Invoice", onClick: onNewInvoice, color: "#10b981" },
  ];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 28,
      paddingBottom: 20,
      borderBottom: "1px solid var(--border)",
      gap: 16,
    }}>
      <div>
        <h2 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 800,
          color: "var(--text)",
          letterSpacing: "-0.6px",
          lineHeight: 1.1,
        }}>
          Dashboard
        </h2>
        <p style={{
          margin: "4px 0 0",
          fontSize: 12,
          color: "var(--text-muted)",
          fontWeight: 400,
          letterSpacing: "0.01em",
        }}>
          {fmtDate(new Date())} · Overview of your business operations
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {actions.map(({ label, onClick, color }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              background: `${color}14`,
              border: `1px solid ${color}30`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: onClick ? "pointer" : "default",
              letterSpacing: "0.02em",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}22`}
            onMouseLeave={e => e.currentTarget.style.background = `${color}14`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
