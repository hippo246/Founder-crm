import { useState } from "react";
import { SectionCard } from "../../components/ui/UI.jsx";
import { isToday, isOverdue } from "../../lib/helpers.js";

const PRIORITY_STYLES = {
  High: { color: "#ef4444", bg: "#ef444412", label: "High" },
  Medium: { color: "#f59e0b", bg: "#f59e0b12", label: "Med" },
  Low: { color: "#6366f1", bg: "#6366f112", label: "Low" },
};

export default function MyDaySection({ tasks, setTasks, projects, onNavigate }) {
  const [justDone, setJustDone] = useState(new Set());

  const overdueTasks = tasks.filter(t =>
    (t.status === "Todo" || t.status === "In Progress") &&
    t.dueDate && isOverdue(t.dueDate)
  ).slice(0, 3);

  const todayTasks = tasks.filter(t =>
    (t.status === "Todo" || t.status === "In Progress") &&
    (isToday(t.dueDate) || !t.dueDate)
  ).slice(0, 6 - overdueTasks.length);

  function handleComplete(task) {
    setJustDone(prev => new Set(prev).add(task.id));
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "Done" } : t));
    }, 400);
  }

  return (
    <SectionCard style={{
      marginBottom: 12,
      border: "1px solid rgba(99,102,241,0.15)",
      padding: "14px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#6366f1",
          textTransform: "uppercase",
          letterSpacing: "1px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          My Day
          <span style={{ background: "#6366f1", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
            {todayTasks.length + overdueTasks.length}
          </span>
          {overdueTasks.length > 0 && (
            <span style={{ background: "#ef444418", color: "#ef4444", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
              {overdueTasks.length} overdue
            </span>
          )}
        </div>
        {onNavigate && (
          <button onClick={() => onNavigate("tasks")} style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
            All tasks →
          </button>
        )}
      </div>
      {overdueTasks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {overdueTasks.map((task, i) => {
            const project = projects.find(p => p.id === task.projectId);
            const done = justDone.has(task.id);
            const pri = PRIORITY_STYLES[task.priority];
            return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)", opacity: done ? 0.4 : 1, transition: "opacity 0.3s" }}>
                <button onClick={() => handleComplete(task)} title="Mark done" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #ef4444", background: done ? "#ef4444" : "transparent", cursor: "pointer", flexShrink: 0, padding: 0, transition: "background 0.2s" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, textDecoration: done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                  {project && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{project.name}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  {pri && <span style={{ fontSize: 9, fontWeight: 700, color: pri.color, background: pri.bg, borderRadius: 4, padding: "1px 5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{pri.label}</span>}
                  <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>Overdue</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {todayTasks.length === 0 && overdueTasks.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0", textAlign: "center" }}>
          🎉 All clear — nothing due today.
        </div>
      ) : (
        todayTasks.map((task, i) => {
          const project = projects.find(p => p.id === task.projectId);
          const overdue = task.dueDate && isOverdue(task.dueDate);
          const done = justDone.has(task.id);
          const pri = PRIORITY_STYLES[task.priority];
          return (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                borderBottom: i < todayTasks.length - 1 ? "1px solid var(--border)" : "none",
                opacity: done ? 0.4 : 1,
                transition: "opacity 0.3s",
              }}
            >
              <button
                onClick={() => handleComplete(task)}
                title="Mark done"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${overdue ? "#ef4444" : "#6366f1"}`,
                  background: done ? "#6366f1" : "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                  transition: "background 0.2s",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  color: "var(--text)",
                  fontWeight: 500,
                  textDecoration: done ? "line-through" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {task.title}
                </div>
                {project && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{project.name}</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                {pri && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: pri.color,
                    background: pri.bg,
                    borderRadius: 4,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    {pri.label}
                  </span>
                )}
                <div style={{ fontSize: 10, color: overdue ? "#ef4444" : "var(--text-muted)", fontWeight: overdue ? 600 : 400 }}>
                  {overdue ? "Overdue" : (task.dueDate || "No date")}
                </div>
              </div>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}
