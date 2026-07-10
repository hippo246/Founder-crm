import { Badge, ProgressBar } from "../../components/ui/UI.jsx";
import { isOverdue, isToday } from "../../lib/helpers.js";
import { Draggable } from "@hello-pangea/dnd";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, role, roadmapItems, supportTickets, onLinkedSave, index }) {
  roadmapItems = roadmapItems ?? [];
  supportTickets = supportTickets ?? [];
  const overdue = task.dueDate && isOverdue(task.dueDate) && !["Done", "Cancelled"].includes(task.status);
  const dueTdy = task.dueDate && isToday(task.dueDate);
  const cl = task.checklist || [];
  const done = cl.filter(c => c.done).length;
  const total = cl.length;
  const rmItem = task.roadmapItemId && roadmapItems.find(r => r.id === task.roadmapItemId);
  const stItem = task.supportTicketId && supportTickets.find(t => t.id === task.supportTicketId);
  const initials = task.assignee ? task.assignee.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : null;
  const formattedDue = task.dueDate ? new Date(task.dueDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

  return (
    <Draggable draggableId={task.id} index={index ?? 0} isDragDisabled={role === "Viewer" || index === undefined}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: "var(--surface)",
            border: `1px solid ${task.status === "Blocked" ? "rgba(239,68,68,0.4)" : snapshot.isDragging ? "var(--primary)" : "var(--border)"}`,
            borderRadius: "var(--r-md)",
            padding: "11px 13px",
            marginBottom: 7,
            opacity: ["Done", "Cancelled"].includes(task.status) && !snapshot.isDragging ? 0.65 : 1,
            cursor: role !== "Viewer" ? "grab" : "default",
            boxShadow: snapshot.isDragging ? "0 10px 25px rgba(0,0,0,0.15)" : "none",
            transform: snapshot.isDragging ? "scale(1.02)" : "none",
            ...provided.draggableProps.style
          }}
        >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", flex: 1, lineHeight: 1.3 }}>{task.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 6, flexShrink: 0 }}>
          {initials && <span title={task.assignee} style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials}</span>}
          <Badge style={{ fontSize: 10, padding: "2px 6px" }}>{task.priority}</Badge>
        </div>
      </div>
      {task.project && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{task.project}</div>}
      {rmItem && <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 4 }}>🗺️ {rmItem.item}</div>}
      {stItem && <div style={{ fontSize: 10, color: "#f59e0b", marginBottom: 4 }}>🎫 {stItem.title}</div>}
      {task.description && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</div>}
      {total > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <ProgressBar value={done} max={total} color={done === total ? "#10b981" : "#6366f1"} style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: done === total ? "#10b981" : "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{done}/{total}</span>
        </div>
      )}
      {formattedDue && (
        <div style={{ fontSize: 10, color: overdue ? "#ef4444" : dueTdy ? "#f59e0b" : "var(--text-muted)", marginBottom: 6 }}>
          {overdue ? "⚠️ Overdue · " : dueTdy ? "📅 Today · " : ""}{formattedDue}
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
      )}
    </Draggable>
  );
}
