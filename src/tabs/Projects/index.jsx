import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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

  const linkedRoadmapItemIds = Array.isArray(project.linkedRoadmapItemIds) ? project.linkedRoadmapItemIds : [];
  const matchRoadmap = useCallback((r) =>
    r.projectId === pid || r.project === name || r.linkedProjectId === pid || linkedRoadmapItemIds.includes(r.id),
  [pid, name, linkedRoadmapItemIds]);

  const linked = useMemo(() => ({
    tasks:     (tasks     || []).filter(match),
    notes:     (notes     || []).filter(match),
    invoices:  (invoices  || []).filter(match),
    proposals: (proposals || []).filter(match),
    documents: (documents || []).filter(match),
    leads:     (leads     || []).filter(match),
    comms:     (communications || []).filter(match),
    followUps: (followUps || []).filter(match),
    roadmap:   (roadmapItems  || []).filter(matchRoadmap),
    support:   (supportTickets|| []).filter(match),
    logs:      (projectLogs   || []).filter(l => l.projectId === pid),
    payments:  (payments      || []).filter(match),
  }), [pid, match, matchRoadmap, tasks, notes, invoices, proposals, documents, leads, communications, followUps, roadmapItems, supportTickets, projectLogs, payments]);

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
  const [sortBy, setSortBy] = useState("createdAt");
  const [viewMode, setViewMode] = useState("grid");
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);
  const importMenuRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!importMenuOpen) return;
    const handler = (e) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setImportMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [importMenuOpen]);

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
    const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
    result = [...result].sort((a, b) => {
      if (sortBy === "name")     return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "deadline") return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      if (sortBy === "budget")   return (Number(b.budget) || 0) - (Number(a.budget) || 0);
      if (sortBy === "progress") return (Number(b.progress) || 0) - (Number(a.progress) || 0);
      if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      return (b.createdAt || "").localeCompare(a.createdAt || ""); // default: newest first
    });
    return result;
  }, [projects, search, statusFilter, sortBy]);

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

  const handleDuplicate = useCallback((project) => {
    const copy = { ...project, id: genId(), name: `${project.name} (Copy)`, createdAt: new Date().toISOString().slice(0, 10) };
    const updated = [copy, ...projects];
    setProjects(updated);
    saveWorkspaceData("projects", updated, currentWorkspaceId);
    toast(`Duplicated "${project.name}"`);
    addAudit("Projects", "Duplicate", `Duplicated project: ${project.name}`);
  }, [projects, currentWorkspaceId, addAudit]);
  const handleDownloadTemplate = useCallback(() => {
    setImportMenuOpen(false);
    import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs").then(XLSX => {
      const wb = XLSX.utils.book_new();

      // ── Projects sheet ──────────────────────────────────────────────────────
      const headers = [
        "Project Name *", "Client", "Industry", "Status", "Priority",
        "Start Date", "Deadline", "Budget (INR)", "Paid (INR)", "Progress %",
        "Tech Stack", "Description", "Tags (comma-sep)",
      ];
      const wsData = [headers];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [20,18,15,14,12,13,13,14,12,13,20,30,22].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, "Projects");

      // ── Instructions sheet ──────────────────────────────────────────────────
      const instrData = [
        ["How to Import Projects", ""],
        ["", ""],
        ["REQUIRED FIELD", ""],
        ["Project Name *", "Every row must have a name — rows without one are skipped."],
        ["", ""],
        ["FIELD REFERENCE", ""],
        ["status",               "Planning | In Progress | On Hold | Completed | Cancelled  (default: Planning)"],
        ["priority",             "High | Medium | Low  (default: Medium)"],
        ["startDate / deadline", "Format: YYYY-MM-DD  e.g. 2025-06-30"],
        ["budget / paid",        "Numbers only — no currency symbols."],
        ["progress",             "Integer 0-100. Setting 100 auto-sets status to Completed."],
        ["techStack",            "Free text e.g. React, Node.js, PostgreSQL"],
        ["tags",                 "Comma-separated e.g. design,branding,web"],
        ["description",          "Free text, any length."],
        ["", ""],
        ["TIPS", ""],
        ["Keep headers",         "Do not rename or reorder column headers in row 1."],
        ["Extra columns",        "Any extra columns you add are ignored safely."],
      ];
      const wi = XLSX.utils.aoa_to_sheet(instrData);
      wi["!cols"] = [{ wch: 24 }, { wch: 65 }];
      XLSX.utils.book_append_sheet(wb, wi, "Instructions");

      XLSX.writeFile(wb, "projects_import_template.xlsx");
    }).catch(() => toast("Could not generate template. Check your connection.", "error"));
  }, []);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportMenuOpen(false);
    setImporting(true);

    import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs").then(XLSX => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
          const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes("project")) || wb.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });

          const FIELD_MAP = {
            "project name *": "name", "project name": "name", "name": "name",
            "client": "client",
            "industry": "industry",
            "status": "status",
            "priority": "priority",
            "start date": "startDate", "startdate": "startDate",
            "deadline": "deadline",
            "budget (inr)": "budget", "budget": "budget",
            "paid (inr)": "paid", "paid": "paid",
            "progress %": "progress", "progress": "progress",
            "tech stack": "techStack", "techstack": "techStack",
            "description": "description",
            "tags (comma-sep)": "tags", "tags": "tags",
          };

          const VALID_STATUSES   = ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"];
          const VALID_PRIORITIES = ["High", "Medium", "Low"];

          const formatDate = (val) => {
            if (!val) return "";
            if (val instanceof Date) return val.toISOString().slice(0, 10);
            const s = String(val).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const d = new Date(s);
            return isNaN(d) ? "" : d.toISOString().slice(0, 10);
          };

          const imported = [];
          const skipped  = [];

          rows.forEach((raw, i) => {
            // Normalize keys
            const row = {};
            Object.entries(raw).forEach(([k, v]) => {
              const mapped = FIELD_MAP[k.toLowerCase().trim()];
              if (mapped) row[mapped] = v;
            });

            if (!row.name || !String(row.name).trim()) { skipped.push(i + 2); return; }

            const progress = Math.min(100, Math.max(0, Number(row.progress) || 0));
            const status   = VALID_STATUSES.includes(row.status) ? row.status
                             : progress === 100 ? "Completed" : "Planning";
            const priority = VALID_PRIORITIES.includes(row.priority) ? row.priority : "Medium";
            const tags     = row.tags ? String(row.tags).split(",").map(t => t.trim()).filter(Boolean) : [];

            imported.push({
              id:          genId(),
              createdAt:   new Date().toISOString().slice(0, 10),
              name:        String(row.name).trim(),
              client:      String(row.client || "").trim(),
              industry:    String(row.industry || "").trim(),
              status,
              priority,
              startDate:   formatDate(row.startDate),
              deadline:    formatDate(row.deadline),
              budget:      Number(row.budget) || 0,
              paid:        Number(row.paid) || 0,
              progress,
              techStack:   String(row.techStack || "").trim(),
              description: String(row.description || "").trim(),
              tags,
              pending:     Math.max(0, (Number(row.budget) || 0) - (Number(row.paid) || 0)),
            });
          });

          if (imported.length === 0) {
            toast(`No valid rows found${skipped.length ? ` (${skipped.length} skipped — missing name)` : ""}`, "error");
            setImporting(false);
            return;
          }

          const updated = [...imported, ...projects];
          setProjects(updated);
          saveWorkspaceData("projects", updated, currentWorkspaceId);
          addAudit("Projects", "Import", `Imported ${imported.length} projects from Excel`);
          toast(`Imported ${imported.length} project${imported.length !== 1 ? "s" : ""}${skipped.length ? ` · ${skipped.length} row${skipped.length !== 1 ? "s" : ""} skipped` : ""}`);
        } catch (err) {
          console.error(err);
          toast("Import failed — make sure you're using the correct template", "error");
        }
        setImporting(false);
      };
      reader.readAsArrayBuffer(file);
    }).catch(() => {
      toast("Could not load Excel parser. Check your connection.", "error");
      setImporting(false);
    });
  }, [projects, currentWorkspaceId, addAudit]);

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

    // Also count roadmap items linked via linkedProjectId or via project's linkedRoadmapItemIds
    const roadmapByLinkedProjectId = {};
    (roadmapItems || []).forEach(r => {
      if (r.linkedProjectId) roadmapByLinkedProjectId[r.linkedProjectId] = (roadmapByLinkedProjectId[r.linkedProjectId] || 0) + 1;
    });

    const result = {};
    projects.forEach(p => {
      const explicitRoadmapCount = Array.isArray(p.linkedRoadmapItemIds) ? p.linkedRoadmapItemIds.length : 0;
      const implicitRoadmapCount = (roadmapC[p.id] || 0) + (roadmapByLinkedProjectId[p.id] || 0);
      result[p.id] = {
        tasks:     taskC[p.id]     || 0,
        invoices:  invoiceC[p.id]  || 0,
        notes:     noteC[p.id]     || 0,
        roadmap:   Math.max(explicitRoadmapCount, implicitRoadmapCount),
        documents: documentC[p.id] || 0,
      };
    });
    return result;
  }, [projects, tasks, invoices, notes, roadmapItems, documents]);

  const closeDetail = useCallback(() => setViewing(null), []);

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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}
            >
              <option value="createdAt">Newest</option>
              <option value="name">Name</option>
              <option value="deadline">Deadline</option>
              <option value="budget">Budget</option>
              <option value="progress">Progress</option>
              <option value="priority">Priority</option>
            </select>
            {/* Grid / List toggle */}
            {!isMobile && (
              <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                {["grid", "list"].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    fontSize: 13, padding: "3px 9px", border: "none", cursor: "pointer",
                    background: viewMode === m ? "var(--accent)" : "transparent",
                    color: viewMode === m ? "#fff" : "var(--text-muted)",
                  }}>{m === "grid" ? "⊞" : "☰"}</button>
                ))}
              </div>
            )}
            <button style={btnStyle("ghost", "sm")} onClick={handleExport}>↓ Export</button>
            {/* Import dropdown */}
            <div style={{ position: "relative" }} ref={importMenuRef}>
              <button
                style={btnStyle("ghost", "sm")}
                onClick={() => setImportMenuOpen(o => !o)}
                disabled={importing}
              >
                {importing ? "Importing…" : "⬆ Import ▾"}
              </button>
              {importMenuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
                  background: "var(--surface-raised)", border: "1px solid var(--border)",
                  borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 210, overflow: "hidden",
                }}>
                  <div style={{ padding: "8px 12px 6px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                    Excel Import
                  </div>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--text)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={handleDownloadTemplate}
                  >
                    <span style={{ fontSize: 16 }}>📥</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>Download Template</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Get the .xlsx import template</div>
                    </div>
                  </button>
                  <div style={{ height: 1, background: "var(--border)", margin: "0 10px" }} />
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--text)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={() => { importFileRef.current?.click(); }}
                  >
                    <span style={{ fontSize: 16 }}>📤</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>Import from Excel</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Upload a filled .xlsx file</div>
                    </div>
                  </button>
                  <div style={{ padding: "6px 14px 10px", fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Use the template above, fill it in,<br />then upload it here.
                  </div>
                </div>
              )}
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
            <button style={btnStyle("primary", "sm")} onClick={() => { setEditing(null); setShowAdd(true); }}>+ New Project</button>
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
            gridTemplateColumns: viewing
              ? "1fr"
              : viewMode === "list" || isMobile
                ? "1fr"
                : `repeat(auto-fill, minmax(280px, 1fr))`,
            gap: 10, marginTop: 14,
          }}>
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                linkedCounts={linkedCounts[project.id]}
                isSelected={viewing?.id === project.id}
                viewMode={viewMode}
                onEdit={() => { setEditing(project); setShowAdd(true); }}
                onDelete={() => setConfirmDelete(project)}
                onDuplicate={() => handleDuplicate(project)}
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
          zIndex: 9999,
          lineHeight: 1,
        }}
        title="Add Project"
      >+</button>

      {/* Modals */}
      {showAdd && (
        <Modal title={editing ? "Edit Project" : "New Project"} onClose={() => { setShowAdd(false); setEditing(null); }} width={520}>
          <ProjectForm initial={editing} onSave={handleSave} onClose={() => { setShowAdd(false); setEditing(null); }} roadmapItems={roadmapItems || []} />
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
