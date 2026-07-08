import { useState } from "react";
import { Badge } from "../../components/ui/UI.jsx";

export default function PulseBanner({ atRiskItems, overdueTasks, overdueInvoices, onNavigate }) {
  const [dismissed, setDismissed] = useState(false);

  const pulseItems = [
    ...(atRiskItems.length > 0 ? [{ label: `${atRiskItems.length} at-risk project${atRiskItems.length > 1 ? "s" : ""}`, color: "#ef4444", tab: "projects" }] : []),
    ...(overdueTasks.length > 0 ? [{ label: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, color: "#f59e0b", tab: "tasks" }] : []),
    ...(overdueInvoices.length > 0 ? [{ label: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`, color: "#ef4444", tab: "invoices" }] : []),
  ];

  if (pulseItems.length === 0 || dismissed) return null;

  return (
    <div style={{
      marginBottom: 20,
      background: "rgba(239,68,68,0.04)",
      border: "1px solid rgba(239,68,68,0.18)",
      borderRadius: 10,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 800,
          color: "#ef4444",
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexShrink: 0,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ef4444",
          }} />
          Needs attention
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pulseItems.map((item, idx) => (
            <Badge
              key={idx}
              onClick={() => onNavigate?.(item.tab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                color: item.color,
                background: `${item.color}12`,
                border: `1px solid ${item.color}30`,
                cursor: onNavigate ? "pointer" : "default",
                userSelect: "none",
              }}
            >
              {item.label} {onNavigate && "→"}
            </Badge>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 16,
          lineHeight: 1,
          padding: "2px 4px",
          flexShrink: 0,
          opacity: 0.6,
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
