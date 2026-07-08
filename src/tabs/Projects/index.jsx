import { useState, useMemo, useEffect, useCallback } from "react";
import { Modal, Confirm, SearchInput, EmptyState, StatMini, btnStyle, toast } from "../../components/ui/UI.jsx";
import { genId, isOverdue } from "../../lib/helpers.js";
import { saveWorkspaceData } from "../../lib/storage.js";
import { exportToCSV } from "../../lib/exports.js";
import ProjectForm from "./ProjectForm.jsx";
import ProjectCard from "./ProjectCard.jsx";

// ── Linked-data section used inside the detail panel ──────────────────────────
function LinkedSection({ title, icon, items, emptyMsg, renderItem, onNavigate, navLabel }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: open ? 8 : 0 }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>{icon}</span>{title}
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1px 7px" }}>{items.length}</span>
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {onNavigate && items.length > 0 && (
            <button style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); onNavigate(); }}>{navLabel || "View all"}</button>
          )}
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        items.length === 0
          ? <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 0", fontStyle: "italic" }}>{emptyMsg}</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map(renderItem)}</div>
      )}
    </div>
  );
}

// ── Full project detail panel ─────────────────────────────────────────────────
function ProjectDetail({ project, tasks, notes, invoices, payments, proposals, documents, leads, communications, followUps, roadmapItems, supportTickets, projectLogs, onEdit, onDelete, onClose, setTab }) {
  const pid = project.id;
  const name = project.name;
  const budget = Number(project.budget) || 0;
  const paid = Number(project.paid) || 0;
  const pending = Math.max(0, budget - paid);
  const progress = Number(project.progress) || 0;
  const isOverdueProject = project.deadline && isOverdue(project.deadline) && project.status !== "Completed";

  const match = useCallback((item) => item.projectId === pid || item.project === name, [pid, name]);

  const linked = useMemo(() => ({
    tasks:     (tasks     || []).filter(match),
    notes:     (notes     || []).filter(match),
    invoices:  (invoices  || []).filter(match),
    proposals: (proposals || []).filter(match),
    documents: (documents || []).filter(match),
    leads:     (leads     || []).filter(match),
    comms:     (communications || []).filter(match),
    followUps: (followUps || []).filter(match),
    roadmap:   (roadmapItems  || []).filter(match),
    support:   (supportTickets|| []).filter(match),
    logs:      (projectLogs   || []).filter(l => l.projectId === pid),
    payments:  (payments      || []).filter(match),
  }), [pid, match, tasks, notes, invoices, proposals, documents, leads, communications, followUps, roadmapItems, supportTickets, projectLogs, payments]);

  const tags = Array.isArray(project.tags) ? project.tags : [];
  const STATUS_COLORS = {
    "Planning":    "#3b82f6",
    "In Progress": "#16a34a",
    "On Hold":     "#ca8a04",
    "Completed":   "#15803d",
    "Cancelled":   "#dc2626",
  };
  const statusColor = STATUS_COLORS[project.status] || "var(--accent)";

  const chip = (label, color = "var(--accent)") => (
    <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 12, border: `1px solid ${color}33`, background: `${color}15`, color, fontWeight: 500 }}>{label}</span>
  );

  const rowStyle = { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--border)" };
  const labelStyle = { color: "var(--text-muted)" };
  const valStyle = { color: "var(--text)", fontWeight: 500, textAlign: "right" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: "85vh", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "0 0 16px", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{project.name}</h3>
              {chip(project.status, statusColor)}
              {project.priority && chip(project.priority, project.priority === "High" ? "#ef4444" : project.priority === "Low" ? "#10b981" : "#f59e0b")}
            </div>
            {project.client && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>👤 {project.client}</div>}
            {project.industry && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>🏢 {project.industry}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button style={btnStyle("ghost", "sm")} onClick={onEdit}>Edit</button>
            <button style={{ ...btnStyle("ghost", "sm"), color: "#ef4444", borderColor: "#fecaca" }} onClick={onDelete}>Delete</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
            <span>Progress</span>
            <span style={{ fontWeight: 600, color: progress >= 75 ? "#10b981" : progress >= 50 ? "#f59e0b" : "var(--text)" }}>{progress}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, borderRadius: 4, background: progress >= 75 ? "#10b981" : progress >= 50 ? "#f59e0b" : "#6366f1", transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
            {tags.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>{t}</span>)}
          </div>
        )}
      </div>

      {/* Key details */}
      <div style={{ marginBottom: 16 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>Start date</span>
          <span style={valStyle}>{project.startDate || "—"}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Deadline</span>
          <span style={{ ...valStyle, color: isOverdueProject ? "#ef4444" : valStyle.color }}>{project.deadline || "—"}{isOverdueProject && " ⚠️"}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Budget</span>
          <span style={valStyle}>₹{budget.toLocaleString()}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Collected</span>
          <span style={{ ...valStyle, color: "#10b981" }}>₹{paid.toLocaleString()}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Pending</span>
          <span style={{ ...valStyle, color: pending > 0 ? "#f59e0b" : "#10b981" }}>₹{pending.toLocaleString()}</span>
        </div>
        {project.techStack && (
          <div style={rowStyle}>
            <span style={labelStyle}>Tech stack</span>
            <span style={valStyle}>{project.techStack}</span>
          </div>
        )}
      </div>

      {project.description && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, padding: "10px 12px", background: "var(--surface)", borderRadius: 8, marginBottom: 16 }}>
          {project.description}
        </div>
      )}

      {/* Linked data sections */}
      <LinkedSection title="Tasks" icon="✅" items={linked.tasks} emptyMsg="No tasks linked"
        onNavigate={() => { setTab("tasks"); onClose(); }} navLabel="Go to Tasks"
        renderItem={t => (
          <div key={t.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: t.status === "Done" ? "var(--text-muted)" : "var(--text)", textDecoration: t.status === "Done" ? "line-through" : "none" }}>{t.title || t.name}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.status}</span>
          </div>
        )}
      />

      <LinkedSection title="Roadmap" icon="🗺️" items={linked.roadmap} emptyMsg="No roadmap items"
        onNavigate={() => { setTab("roadmap"); onClose(); }} navLabel="Go to Roadmap"
        renderItem={r => (
          <div key={r.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{r.title || r.name}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.status || r.phase}</span>
          </div>
        )}
      />

      <LinkedSection title="Invoices" icon="📄" items={linked.invoices} emptyMsg="No invoices"
        onNavigate={() => { setTab("invoices"); onClose(); }} navLabel="Go to Invoices"
        renderItem={i => (
          <div key={i.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{i.number || i.id}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{i.status}</span>
              <span style={{ fontWeight: 600 }}>₹{(Number(i.amount) || 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      />

      <LinkedSection title="Payments" icon="💳" items={linked.payments} emptyMsg="No payments recorded"
        onNavigate={() => { setTab("payments"); onClose(); }} navLabel="Go to Payments"
        renderItem={p => (
          <div key={p.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{p.date || p.createdAt}</span>
            <span style={{ fontWeight: 600, color: "#10b981" }}>₹{(Number(p.amount) || 0).toLocaleString()}</span>
          </div>
        )}
      />

      <LinkedSection title="Proposals" icon="📋" items={linked.proposals} emptyMsg="No proposals"
        onNavigate={() => { setTab("proposals"); onClose(); }} navLabel="Go to Proposals"
        renderItem={p => (
          <div key={p.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{p.title || p.name}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.status}</span>
          </div>
        )}
      />

      <LinkedSection title="Leads" icon="🎯" items={linked.leads} emptyMsg="No linked leads"
        onNavigate={() => { setTab("leads"); onClose(); }} navLabel="Go to Leads"
        renderItem={l => (
          <div key={l.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{l.name || l.company}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{l.status}</span>
          </div>
        )}
      />

      <LinkedSection title="Documents" icon="📁" items={linked.documents} emptyMsg="No documents"
        onNavigate={() => { setTab("documents"); onClose(); }} navLabel="Go to Documents"
        renderItem={d => (
          <div key={d.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{d.name || d.title}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.type}</span>
          </div>
        )}
      />

      <LinkedSection title="Notes" icon="📝" items={linked.notes} emptyMsg="No notes"
        onNavigate={() => { setTab("notes"); onClose(); }} navLabel="Go to Notes"
        renderItem={n => (
          <div key={n.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ color: "var(--text)", marginBottom: 2 }}>{n.title || "Note"}</div>
            {n.content && <div style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.content}</div>}
          </div>
        )}
      />

      <LinkedSection title="Communications" icon="💬" items={linked.comms} emptyMsg="No communication logs"
        onNavigate={() => { setTab("communications"); onClose(); }} navLabel="Go to Comms"
        renderItem={c => (
          <div key={c.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{c.type} — {c.contact || c.client}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c.date}</span>
          </div>
        )}
      />

      <LinkedSection title="Follow-ups" icon="🔔" items={linked.followUps} emptyMsg="No follow-ups"
        onNavigate={() => { setTab("follow-ups"); onClose(); }} navLabel="Go to Follow-ups"
        renderItem={f => (
          <div key={f.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{f.title || f.note}</span>
            <span style={{ fontSize: 10, color: isOverdue(f.dueDate) ? "#ef4444" : "var(--text-muted)" }}>{f.dueDate}</span>
          </div>
        )}
      />

      <LinkedSection title="Support Tickets" icon="🎫" items={linked.support} emptyMsg="No support tickets"
        onNavigate={() => { setTab("support"); onClose(); }} navLabel="Go to Support"
        renderItem={s => (
          <div key={s.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text)" }}>{s.title || s.subject}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.status}</span>
          </div>
        )}
      />

      <LinkedSection title="Project Logs" icon="📋" items={linked.logs} emptyMsg="No logs"
        onNavigate={() => { setTab("project-logs"); onClose(); }} navLabel="Go to Logs"
        renderItem={l => (
          <div key={l.id} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-muted)", marginRight: 8 }}>{l.date}</span>
            <span style={{ color: "var(--text)" }}>{l.message || l.note}</span>
          </div>
        )}
      />
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function ProjectsTab({
  projects, setProjects, addAudit, role, setTab,
  tasks, setTasks, notes, setNotes,
  invoices, setInvoices, payments,
  proposals, setProposals,
  documents, setDocuments,
  leads, setLeads,
  contacts,
  communications, setCommunications,
  followUps, setFollowUps,
  supportTickets, setSupportTickets,
  projectLogs, setProjectLogs,
  roadmapItems, setRoadmapItems,
  calendarEvents, setCalendarEvents,
  currentWorkspaceId = "workspace-1",
  workspaceId = "workspace-1",
  onLinkedSave,
  promptHistory,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const filtered = useMemo(() => {
    let result = projects;
    if (statusFilter !== "All") result = result.filter(p => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.client?.toLowerCase().includes(q) ||
        p.industry?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q) ||
        p.priority?.toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [projects, search, statusFilter]);

  const handleSave = useCallback((data) => {
    if (editing) {
      const updated = projects.map(p => p.id === editing.id ? { ...data, id: editing.id } : p);
      setProjects(updated);
      saveWorkspaceData("projects", updated, currentWorkspaceId);
      toast("Project updated");
      addAudit("Projects", "Update", `Updated project: ${data.name}`);
    } else {
      const newProject = { ...data, id: genId(), createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [newProject, ...projects];
      setProjects(updated);
      saveWorkspaceData("projects", updated, currentWorkspaceId);
      toast("Project created");
      addAudit("Projects", "Create", `Created project: ${data.name}`);
    }
    setShowAdd(false);
    setEditing(null);
  }, [editing, projects, currentWorkspaceId, addAudit]);

  const handleDelete = useCallback((target) => {
    const toDelete = target || confirmDelete;
    if (!toDelete) return;
    const updated = projects.filter(p => p.id !== toDelete.id);
    setProjects(updated);
    saveWorkspaceData("projects", updated, currentWorkspaceId);
    toast("Project deleted");
    addAudit("Projects", "Delete", `Deleted project: ${toDelete.name}`);
    setConfirmDelete(null);
    setViewing(null);
  }, [confirmDelete, projects, currentWorkspaceId, addAudit]);

  const handleExport = useCallback(() => { exportToCSV(projects, "projects"); toast("Projects exported"); }, [projects]);
  const closeDetail = useCallback(() => setViewing(null), []);

  const stats = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalPaid   = projects.reduce((sum, p) => sum + (Number(p.paid)   || 0), 0);
    const totalPending = Math.max(0, totalBudget - totalPaid);
    const activeProjects  = projects.filter(p => p.status !== "Completed").length;
    const overdueProjects = projects.filter(p => p.deadline && isOverdue(p.deadline) && p.status !== "Completed").length;
    const collectionRate  = totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0;
    return { totalBudget, totalPaid, totalPending, activeProjects, overdueProjects, collectionRate };
  }, [projects]);

  // Build name→id lookup once, then index each data array in a single pass —
  // O(projects + items) instead of O(projects × items).
  const linkedCounts = useMemo(() => {
    const nameToId = {};
    projects.forEach(p => { nameToId[p.name] = p.id; });

    const tally = (arr) => {
      const counts = {};
      (arr || []).forEach(item => {
        const pid = item.projectId || nameToId[item.project];
        if (pid) counts[pid] = (counts[pid] || 0) + 1;
      });
      return counts;
    };

    const taskC     = tally(tasks);
    const invoiceC  = tally(invoices);
    const noteC     = tally(notes);
    const roadmapC  = tally(roadmapItems);
    const documentC = tally(documents);

    const result = {};
    projects.forEach(p => {
      result[p.id] = {
        tasks:     taskC[p.id]     || 0,
        invoices:  invoiceC[p.id]  || 0,
        notes:     noteC[p.id]     || 0,
        roadmap:   roadmapC[p.id]  || 0,
        documents: documentC[p.id] || 0,
      };
    });
    return result;
  }, [projects, tasks, invoices, notes, roadmapItems, documents]);

  const detailProps = {
    tasks, notes, invoices, payments, proposals, documents,
    leads, communications, followUps, roadmapItems, supportTickets, projectLogs,
    setTab, onClose: closeDetail,
  };

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", position: "relative" }}>
      {/* Left pane — list */}
      <div style={{
        flex: viewing && !isMobile ? "0 0 clamp(300px, 38%, 500px)" : "1",
        minWidth: 0,
        transition: "flex 0.2s",
        display: viewing && isMobile ? "none" : "block",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>Projects</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              {projects.length} projects · <span style={{ color: "#10b981", fontWeight: 600 }}>{stats.activeProjects} active</span>
              {stats.overdueProjects > 0 && <span style={{ color: "#ef4444", fontWeight: 600 }}> · {stats.overdueProjects} overdue</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button style={btnStyle("ghost", "sm")} onClick={handleExport}>↓ Export</button>
          </div>
        </div>

        {/* Stats — horizontal scrollable on mobile */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 14,
        }}>
          {[
            { label: "Budget", value: `₹${stats.totalBudget.toLocaleString()}`, icon: "💰", color: "var(--text)" },
            { label: "Collected", value: `₹${stats.totalPaid.toLocaleString()}`, icon: "✅", color: "#10b981" },
            { label: "Pending", value: `₹${stats.totalPending.toLocaleString()}`, icon: "⏳", color: stats.totalPending > 0 ? "#f59e0b" : "#10b981" },
            { label: "Collection", value: `${stats.collectionRate}%`, icon: "📈", color: stats.collectionRate >= 80 ? "#10b981" : stats.collectionRate >= 50 ? "#f59e0b" : "#ef4444" },
            { label: "Active", value: stats.activeProjects, icon: "🔵", color: "var(--accent)" },
            { label: "Overdue", value: stats.overdueProjects, icon: "🔴", color: stats.overdueProjects > 0 ? "#ef4444" : "var(--text-muted)" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color, letterSpacing: "-0.3px", lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Collection progress bar */}
        <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
            <span>Collection rate</span>
            <span style={{ fontWeight: 700, color: stats.collectionRate >= 80 ? "#10b981" : stats.collectionRate >= 50 ? "#f59e0b" : "#ef4444" }}>{stats.collectionRate}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width 0.4s ease",
              width: `${stats.collectionRate}%`,
              background: stats.collectionRate >= 80 ? "#10b981" : stats.collectionRate >= 50 ? "#f59e0b" : "#ef4444",
            }} />
          </div>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          {["All", "Planning", "In Progress", "On Hold", "Completed", "Cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
              border: `1px solid ${statusFilter === s ? "var(--accent)" : "var(--border)"}`,
              background: statusFilter === s ? "var(--accent)" : "transparent",
              color: statusFilter === s ? "#fff" : "var(--text-muted)",
              fontWeight: statusFilter === s ? 600 : 400,
              transition: "all 0.1s",
            }}>{s}</button>
          ))}
        </div>

        <SearchInput placeholder="Search by name, client, tag, status…" value={search} onChange={setSearch} />

        {/* Cards */}
        {filtered.length === 0 ? (
          <EmptyState message={search ? "No projects match your search" : "No projects yet — add one above"} />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: viewing ? "1fr" : `repeat(auto-fill, minmax(${isMobile ? "100%" : "280px"}, 1fr))`,
            gap: 10, marginTop: 14,
          }}>
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                linkedCounts={linkedCounts[project.id]}
                isSelected={viewing?.id === project.id}
                onEdit={() => { setEditing(project); setShowAdd(true); }}
                onDelete={() => setConfirmDelete(project)}
                onView={() => setViewing(p => p?.id === project.id ? null : project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right pane — detail panel */}
      {viewing && (
        <div style={{
          flex: isMobile ? "1" : "1 1 0",
          borderLeft: isMobile ? "none" : "1px solid var(--border)",
          paddingLeft: isMobile ? 0 : 20,
          marginLeft: isMobile ? 0 : 16,
          overflowY: "auto",
          animation: "slideInRight 0.18s ease",
        }}>
          {/* Mobile back button */}
          {isMobile && (
            <button style={{ ...btnStyle("ghost", "sm"), marginBottom: 12 }} onClick={closeDetail}>← Back to Projects</button>
          )}
          <ProjectDetail
            project={viewing}
            {...detailProps}
            onEdit={() => { setEditing(viewing); setShowAdd(true); }}
            onDelete={() => setConfirmDelete(viewing)}
          />
        </div>
      )}

      {/* Floating + button — always visible */}
      <button
        onClick={() => { setEditing(null); setShowAdd(true); }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--accent)",
          color: "#fff",
          fontSize: 24,
          fontWeight: 300,
          border: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          lineHeight: 1,
        }}
        title="Add Project"
      >+</button>

      {/* Modals */}
      {showAdd && (
        <Modal title={editing ? "Edit Project" : "New Project"} onClose={() => { setShowAdd(false); setEditing(null); }} width={520}>
          <ProjectForm initial={editing} onSave={handleSave} onClose={() => { setShowAdd(false); setEditing(null); }} />
        </Modal>
      )}

      {confirmDelete && (
        <Confirm
          title="Delete Project"
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
