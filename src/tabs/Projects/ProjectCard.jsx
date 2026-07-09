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

export default function ProjectCard({ project, onEdit, onDelete, onView, onDuplicate, linkedCounts = {}, isSelected = false, viewMode = "grid" }) {
  const [hovered, setHovered] = useState(false);
  const paid = Number(project.paid) || 0;
  const budget = Number(project.budget) || 0;
  const progress = Number(project.progress) || 0;
  const pending = Math.max(0, budget - paid);
  const isOverdueProject = project.deadline && isOverdue(project.deadline) && project.status !== "Completed";
  const isCompleted = project.status === "Completed";
  const statusStyle = STATUS_COLORS[project.status] || {};
  const tags = Array.isArray(project.tags) ? project.tags : [];

  if (viewMode === "list") {
    return (
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: `1px solid ${isSelected ? "var(--accent)" : hovered ? "var(--accent-border)" : "var(--border)"}`,
          background: "var(--surface-raised)",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
        onClick={onView}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Priority dot */}
        {project.priority && PRIORITY_DOT[project.priority] && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_DOT[project.priority], flexShrink: 0 }} />
        )}
        {/* Name + client */}
        <div style={{ flex: "0 0 200px", minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.name}</div>
          {project.client && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{project.client}</div>}
        </div>
        {/* Status badge */}
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 12, fontWeight: 500, flexShrink: 0,
          background: statusStyle.bg || "var(--accent-dim)",
          color: statusStyle.color || "var(--accent)",
          border: `1px solid ${statusStyle.border || "var(--accent-border)"}`,
        }}>{project.status}</span>
        {/* Progress bar */}
        <div style={{ flex: 1, minWidth: 60 }}>
          <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, borderRadius: 99, background: progress >= 75 ? "#10b981" : progress >= 50 ? "#f59e0b" : "#6366f1" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{progress}%</div>
        </div>
        {/* Budget info */}
        <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, textAlign: "right", minWidth: 100 }}>
          <div>₹{budget.toLocaleString()}</div>
          {pending > 0 && <div style={{ color: "#f59e0b" }}>₹{pending.toLocaleString()} due</div>}
        </div>
        {/* Deadline */}
        <div style={{ fontSize: 11, color: isOverdueProject ? "#ef4444" : "var(--text-muted)", flexShrink: 0, minWidth: 80, textAlign: "right" }}>
          {isOverdueProject && <span style={{ fontWeight: 700 }}>⚠ </span>}{project.deadline || "—"}
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }} onClick={onEdit}>Edit</button>
          <button style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "transparent", color: "#ef4444", cursor: "pointer" }} onClick={onDelete}>Del</button>
        </div>
      </div>
    );
  }

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
        opacity: isCompleted ? 0.8 : 1,
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Completed ribbon */}
      {isCompleted && (
        <div style={{
          position: "absolute", top: 8, right: -18, background: "#10b981", color: "#fff",
          fontSize: 9, fontWeight: 700, padding: "2px 24px", transform: "rotate(45deg)",
          letterSpacing: "0.5px", pointerEvents: "none",
        }}>DONE</div>
      )}
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
          {project.deadline && (() => {
            const days = Math.ceil((new Date(project.deadline) - new Date()) / 86400000);
            if (!isOverdueProject && days >= 0 && days <= 14)
              return <span style={{ display: "block", fontSize: 10, color: days <= 3 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>{days === 0 ? "Due today" : `${days}d left`}</span>;
            return null;
          })()}
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
        {onDuplicate && (
          <button
            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
            onClick={e => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate project"
          >⧉</button>
        )}
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
