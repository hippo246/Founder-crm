import { Badge, ProgressBar } from "../../components/ui/UI.jsx";
import { isOverdue, isToday } from "../../lib/helpers.js";
import { handleDragStart, handleDragEnd } from "../../lib/dragDrop.js";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, role, roadmapItems = [], supportTickets = [], onLinkedSave }) {
  const overdue = task.dueDate && isOverdue(task.dueDate) && !["Done", "Cancelled"].includes(task.status);
  const dueTdy = task.dueDate && isToday(task.dueDate);
  const cl = task.checklist || [];
  const done = cl.filter(c => c.done).length;
  const total = cl.length;
  const rmItem = task.roadmapItemId && roadmapItems.find(r => r.id === task.roadmapItemId);
  const stItem = task.supportTicketId && supportTickets.find(t => t.id === task.supportTicketId);

  return (
    <div
      draggable={role !== "Viewer"}
      onDragStart={(e) => handleDragStart(e, task)}
      onDragEnd={handleDragEnd}
      style={{
        background: "var(--surface)",
        border: `1px solid ${task.status === "Blocked" ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
        borderRadius: "var(--r-md)",
        padding: "11px 13px",
        marginBottom: 7,
        opacity: ["Done", "Cancelled"].includes(task.status) ? 0.65 : 1,
        cursor: role !== "Viewer" ? "grab" : "default"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", flex: 1, lineHeight: 1.3 }}>{task.title}</span>
        <Badge style={{ fontSize: 10, padding: "2px 6px", marginLeft: 6 }}>{task.priority}</Badge>
      </div>
      {task.project && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{task.project}</div>}
      {rmItem && <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}>🗺️ {rmItem.item}</div>}
      {stItem && <div style={{ fontSize: 10, color: "#f59e0b", marginBottom: 4 }}>🎫 {stItem.title}</div>}
      {task.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</div>}
      {total > 0 && <ProgressBar value={done} max={total} color={done === total ? "#10b981" : "#6366f1"} style={{ marginBottom: 6 }} />}
      {task.dueDate && (
        <div style={{ fontSize: 10, color: overdue ? "#ef4444" : dueTdy ? "#f59e0b" : "var(--text-muted)", marginBottom: 6 }}>
          {overdue && "⚠️ "}{dueTdy && "📅 "}{task.dueDate}
        </div>
      )}
      {task.blockers && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 6 }}>🚫 {task.blockers}</div>}
      {role !== "Viewer" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <select style={{ fontSize: 11, padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} value={task.status} onChange={e => onStatusChange(task.id, e.target.value)}>
            {["Todo", "Doing", "Waiting", "Blocked", "Review", "Done", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13 }} onClick={() => onEdit(task)}>✏️</button>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 13 }} onClick={() => onDelete(task)}>🗑️</button>
          {onLinkedSave && <>
            <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:12 }} onClick={() => onLinkedSave("note",{title:`Note — ${task.title}`,relatedTo:task.project||task.title,relatedType:"Task",body:"",tags:[],taskId:task.id})} title="Add Note">📝</button>
            <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:12 }} onClick={() => onLinkedSave("followUp",{person:task.contact||"",relatedTo:task.title,relatedType:"Task",type:"Call",dueDate:task.dueDate||new Date().toISOString().slice(0,10),status:"Pending",notes:task.description||""})} title="Add Follow-Up">📞</button>
          </>}
        </div>
      )}
    </div>
  );
}
