import { useState, useMemo } from "react";
import { Modal, Confirm, SearchInput, EmptyState, SectionCard, StatMini, btnStyle, toast } from "../../components/ui/UI.jsx";
import { genId, isOverdue } from "../../lib/helpers.js";
import { saveWorkspaceData } from "../../lib/storage.js";
import { exportToCSV } from "../../lib/exports.js";
import { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } from "../../lib/dragDrop.js";
import TaskForm from "./TaskForm.jsx";
import TaskCard from "./TaskCard.jsx";

const KANBAN_COLS = ["Inbox", "Todo", "Doing", "Waiting", "Blocked", "Review", "Done"];
const PRIORITY_ORDER = { Critical: 0, Urgent: 1, High: 2, Medium: 3, Low: 4 };

export default function TasksTab({ tasks, setTasks, projects, contacts, roadmapItems, supportTickets, promptHistory, addAudit, role, workspaceId = "workspace-1" , onLinkedSave}) {
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("Kanban");
  const [filterProject, setFilterProject] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const TASK_VIEWS = ["My Day", "Kanban", "By Project", "By Roadmap", "Blocked", "Completed", "All Tasks"];

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(t => 
      t.title?.toLowerCase().includes(q) ||
      t.project?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const groups = {};
    KANBAN_COLS.forEach(col => groups[col] = []);
    filtered.forEach(task => {
      const col = task.status || "Inbox";
      if (groups[col]) groups[col].push(task);
    });
    // Sort by priority within each column
    Object.keys(groups).forEach(col => {
      groups[col].sort((a, b) => (PRIORITY_ORDER[a.priority] || 999) - (PRIORITY_ORDER[b.priority] || 999));
    });
    return groups;
  }, [filtered]);

  const handleSave = (data) => {
    if (editing) {
      const updated = tasks.map(t => t.id === editing.id ? { ...data, id: editing.id } : t);
      setTasks(updated);
      saveWorkspaceData("tasks", updated, workspaceId);
      toast("Task updated");
      addAudit("Tasks", "Update", `Updated task: ${data.title}`);
    } else {
      const newTask = { ...data, id: genId(), createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [newTask, ...tasks];
      setTasks(updated);
      saveWorkspaceData("tasks", updated, workspaceId);
      toast("Task created");
      addAudit("Tasks", "Create", `Created task: ${data.title}`);
    }
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const updated = tasks.filter(t => t.id !== confirmDelete.id);
    setTasks(updated);
    saveWorkspaceData("tasks", updated, workspaceId);
    toast("Task deleted");
    addAudit("Tasks", "Delete", `Deleted task: ${confirmDelete.title}`);
    setConfirmDelete(null);
  };

  const handleStatusChange = (taskId, newStatus) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updated);
    saveWorkspaceData("tasks", updated, workspaceId);
    addAudit("Tasks", "Status Change", `Task status changed to ${newStatus}`);
  };

  const handleDrop = (e, col) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      handleStatusChange(taskId, col);
    }
  };

  const handleExport = () => {
    exportToCSV(tasks, "tasks");
    toast("Tasks exported");
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "Done").length;
    const overdue = tasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.status !== "Done").length;
    const inProgress = tasks.filter(t => ["Todo", "Doing", "Waiting"].includes(t.status)).length;
    return { total, done, overdue, inProgress };
  }, [tasks]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Tasks</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{tasks.length} tasks</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          <button style={btnStyle("primary", "sm")} onClick={() => { setEditing(null); setShowAdd(true); }}>+ Add Task</button>
        </div>
      </div>

      {/* Stat mini */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatMini label="Total" value={stats.total} />
        <StatMini label="In Progress" value={stats.inProgress} />
        <StatMini label="Completed" value={stats.done} color="#10b981" />
        <StatMini label="Overdue" value={stats.overdue} color="#ef4444" />
      </div>

      {/* View switcher */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)", marginBottom:16, overflowX:"auto" }}>
        {TASK_VIEWS.map(v => (
          <button key={v} onClick={() => setActiveView(v)} style={{
            padding:"8px 14px", fontSize:12, fontWeight: activeView===v ? 600 : 400,
            background:"transparent", border:"none", borderBottom: activeView===v ? "2px solid var(--accent)" : "2px solid transparent",
            cursor:"pointer", color: activeView===v ? "var(--accent)" : "var(--text-muted)", whiteSpace:"nowrap"
          }}>{v}</button>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <SearchInput placeholder="Search tasks..." value={search} onChange={setSearch} />
        {activeView === "By Project" && (
          <select style={{ padding:"6px 10px", fontSize:13, borderRadius:"var(--r-sm)", border:"1px solid var(--border)", background:"var(--input-bg)", color:"var(--text)" }}
            value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="All">All projects</option>
            {(projects||[]).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* MY DAY */}
      {activeView === "My Day" && (() => {
        const today = new Date().toISOString().slice(0,10);
        const myDay = filtered.filter(t => t.dueDate === today || t.status === "Doing" || isOverdue(t.dueDate));
        return myDay.length === 0
          ? <EmptyState icon="☀️" title="Nothing due today" sub="Tasks due today and in-progress tasks appear here." />
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {myDay.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
            </div>;
      })()}

      {/* KANBAN */}
      {activeView === "Kanban" && (
        filtered.length === 0
          ? <EmptyState message={search ? "No tasks found" : "No tasks yet"} />
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 4 }}>
              {KANBAN_COLS.map(col => (
                <SectionCard key={col} style={{ background: dragOverCol===col ? "var(--accent-dim)" : "var(--surface-raised)", minHeight:350 }}
                  onDragOver={e => handleDragOver(e, col, setDragOverCol)}
                  onDragEnter={e => handleDragEnter(e, col, setDragOverCol)}
                  onDragLeave={e => handleDragLeave(e, setDragOverCol)}
                  onDrop={e => handleDrop(e, col)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <span style={{ fontWeight:700, fontSize:12, color:"var(--text)" }}>{col}</span>
                    <span style={{ fontSize:11, color:"var(--text-muted)" }}>{grouped[col]?.length||0}</span>
                  </div>
                  {(grouped[col]||[]).map(task => (
                    <TaskCard key={task.id} task={task} onEdit={() => { setEditing(task); setShowAdd(true); }} onDelete={() => setConfirmDelete(task)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />
                  ))}
                </SectionCard>
              ))}
            </div>
      )}

      {/* BY PROJECT */}
      {activeView === "By Project" && (() => {
        const tasksByProject = {};
        filtered.forEach(t => {
          const key = t.project || "No Project";
          if (!tasksByProject[key]) tasksByProject[key] = [];
          tasksByProject[key].push(t);
        });
        const projectList = filterProject === "All" ? Object.keys(tasksByProject) : [filterProject];
        return projectList.length === 0
          ? <EmptyState icon="🗂️" title="No tasks" sub="Tasks grouped by project appear here." />
          : <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {projectList.map(proj => tasksByProject[proj] && (
                <div key={proj}>
                  <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                    🗂️ {proj}
                    <span style={{ fontSize:11, color:"var(--text-muted)", fontWeight:400 }}>{tasksByProject[proj]?.length} tasks</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {(tasksByProject[proj]||[]).map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
                  </div>
                </div>
              ))}
            </div>;
      })()}

      {/* BY ROADMAP */}
      {activeView === "By Roadmap" && (() => {
        const linked = filtered.filter(t => t.roadmapItemId);
        const unlinked = filtered.filter(t => !t.roadmapItemId);
        const byRoadmap = {};
        linked.forEach(t => {
          const item = (roadmapItems||[]).find(r => r.id === t.roadmapItemId);
          const key = item?.item || t.roadmapItemId;
          if (!byRoadmap[key]) byRoadmap[key] = [];
          byRoadmap[key].push(t);
        });
        return <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {Object.entries(byRoadmap).map(([roadmap, ts]) => (
            <div key={roadmap}>
              <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:8 }}>🗺️ {roadmap}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {ts.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
              </div>
            </div>
          ))}
          {unlinked.length > 0 && <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-muted)", marginBottom:8 }}>Not linked to roadmap</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {unlinked.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
            </div>
          </div>}
          {filtered.length === 0 && <EmptyState icon="🗺️" title="No tasks" sub="Tasks linked to roadmap items appear here." />}
        </div>;
      })()}

      {/* BLOCKED */}
      {activeView === "Blocked" && (() => {
        const blocked = filtered.filter(t => t.status === "Blocked" || t.status === "Waiting");
        return blocked.length === 0
          ? <EmptyState icon="🚫" title="No blocked tasks" sub="Blocked and waiting tasks appear here." />
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {blocked.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
            </div>;
      })()}

      {/* COMPLETED */}
      {activeView === "Completed" && (() => {
        const done = filtered.filter(t => t.status === "Done" || t.status === "Cancelled");
        return done.length === 0
          ? <EmptyState icon="✅" title="No completed tasks" sub="Completed tasks appear here." />
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {done.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
            </div>;
      })()}

      {/* ALL TASKS */}
      {activeView === "All Tasks" && (
        filtered.length === 0
          ? <EmptyState icon="✅" title="No tasks" sub="All tasks appear here." />
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.map(t => <TaskCard key={t.id} task={t} onEdit={() => { setEditing(t); setShowAdd(true); }} onDelete={() => setConfirmDelete(t)} onStatusChange={handleStatusChange} role={role} roadmapItems={roadmapItems} supportTickets={supportTickets} onLinkedSave={onLinkedSave} />)}
            </div>
      )}

      {showAdd && (
        <Modal title={editing ? "Edit Task" : "New Task"} onClose={() => { setShowAdd(false); setEditing(null); }} width={550}>
          <TaskForm 
            initial={editing} 
            onSave={handleSave} 
            onClose={() => { setShowAdd(false); setEditing(null); }} 
            projects={projects}
            contacts={contacts}
            roadmapItems={roadmapItems}
            supportTickets={supportTickets}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Confirm
          title="Delete Task"
          message={`Are you sure you want to delete "${confirmDelete.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
