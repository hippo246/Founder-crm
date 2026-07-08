import { useState } from "react";
import { ProgressBar } from "../../components/ui/UI.jsx";
import { isOverdue } from "../../lib/helpers.js";

const STATUS_COLORS = {
  "Planning":    { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  "In Progress": { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "On Hold":     { bg: "#fefce8", color: "#ca8a04", border: "#fde68a" },
  "Completed":   { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  "Cancelled":   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

const PRIORITY_DOT = {
  "High":   "#ef4444",
  "Medium": "#f59e0b",
  "Low":    "#10b981",
};

const LINKED_BADGES = [
  { key: "tasks",     icon: "✅", label: "task" },
  { key: "invoices",  icon: "📄", label: "invoice" },
  { key: "notes",     icon: "📝", label: "note" },
  { key: "roadmap",   icon: "🗺️", label: "roadmap" },
  { key: "documents", icon: "📁", label: "doc" },
];

export default function ProjectCard({ project, onEdit, onDelete, onView, linkedCounts = {}, isSelected = false }) {
  const [hovered, setHovered] = useState(false);
  const paid = Number(project.paid) || 0;
  const budget = Number(project.budget) || 0;
  const progress = Number(project.progress) || 0;
  const pending = Math.max(0, budget - paid);
  const isOverdueProject = project.deadline && isOverdue(project.deadline) && project.status !== "Completed";
  const statusStyle = STATUS_COLORS[project.status] || {};
  const tags = Array.isArray(project.tags) ? project.tags : [];

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${isSelected ? "var(--accent)" : hovered ? "var(--accent-border)" : "var(--border)"}`,
      boxShadow: isSelected ? "0 0 0 2px var(--accent)22" : hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        background: "var(--surface-raised)",
        cursor: "pointer",
        transition: "all 0.15s",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            {project.priority && PRIORITY_DOT[project.priority] && (
              <span title={`${project.priority} priority`} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: PRIORITY_DOT[project.priority],
                flexShrink: 0,
              }} />
            )}
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{project.name}</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 12, fontWeight: 500,
              background: statusStyle.bg || "var(--accent-dim)",
              color: statusStyle.color || "var(--accent)",
              border: `1px solid ${statusStyle.border || "var(--accent-border)"}`,
            }}>{project.status}</span>
          </div>
          {project.client && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{project.client}</div>
          )}
        </div>
        <div style={{ fontSize: 11, color: isOverdueProject ? "#ef4444" : "var(--text-muted)", textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          {isOverdueProject && <span style={{ display: "block", fontWeight: 600, fontSize: 10, marginBottom: 1 }}>OVERDUE</span>}
          {project.deadline}
        </div>
      </div>

      <ProgressBar value={progress} max={100} color={progress >= 75 ? "#10b981" : progress >= 50 ? "#f59e0b" : "#6366f1"} />
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{progress}%</div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
        <span>Budget: ₹{budget.toLocaleString()}</span>
        <span style={{ color: paid >= budget && budget > 0 ? "#10b981" : "var(--text-muted)" }}>
          Paid: ₹{paid.toLocaleString()}
        </span>
        {pending > 0 && <span style={{ color: "#f59e0b" }}>Pending: ₹{pending.toLocaleString()}</span>}
      </div>

      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
          {tags.map(tag => (
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

      {/* Linked data badges */}
      {Object.values(linkedCounts).some(v => v > 0) && (
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
          {LINKED_BADGES.filter(b => linkedCounts[b.key] > 0).map(b => (
            <span key={b.key} title={`${linkedCounts[b.key]} ${b.label}${linkedCounts[b.key] !== 1 ? "s" : ""}`} style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 10,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3,
            }}>
              {b.icon} {linkedCounts[b.key]}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
        <button
          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
          onClick={e => { e.stopPropagation(); onEdit(); }}
        >Edit</button>
        <button
          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", color: "#ef4444", cursor: "pointer" }}
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >Delete</button>
      </div>
    </div>
  );
}
