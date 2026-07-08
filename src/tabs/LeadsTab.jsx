import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveLS, saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { LEAD_STAGES, LEAD_PRIORITIES, LEAD_SOURCES, KANBAN_STAGES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: LEADS
// ══════════════════════════════════════════════════════════════════════════════

// ── Excel helpers ─────────────────────────────────────────────────────────────
const EXCEL_COLUMNS = ["Title", "Contact", "Company", "Service", "Source", "Stage", "Priority", "Value", "Probability", "FollowUpDate", "Notes"];

const downloadLeadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    EXCEL_COLUMNS,
    ["Example Lead", "Jane Smith", "Acme Corp", "Web Design", "LinkedIn", "New", "High", "50000", "70", "2024-12-31", "Met at conference"],
  ]);
  ws["!cols"] = EXCEL_COLUMNS.map(c => ({ wch: Math.max(c.length + 4, 16) }));
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.writeFile(wb, "leads_import_template.xlsx");
};

const parseLeadsFromExcel = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const leads = rows.map(row => ({
        id: genId(),
        title: String(row["Title"] || "").trim(),
        contact: String(row["Contact"] || "").trim(),
        company: String(row["Company"] || "").trim(),
        service: String(row["Service"] || "").trim(),
        source: String(row["Source"] || "LinkedIn").trim(),
        stage: String(row["Stage"] || "New").trim(),
        priority: String(row["Priority"] || "Medium").trim(),
        value: Number(row["Value"]) || 0,
        probability: Math.min(100, Math.max(0, Number(row["Probability"]) || 50)),
        followUpDate: String(row["FollowUpDate"] || "").trim(),
        notes: String(row["Notes"] || "").trim(),
        tags: [],
        lostReason: "",
        contactId: "",
        projectId: "",
        createdAt: new Date().toISOString().slice(0, 10),
      })).filter(l => l.title);
      resolve(leads);
    } catch (err) {
      reject(err);
    }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
});

// ── Add Lead Dropdown ─────────────────────────────────────────────────────────
const AddLeadDropdown = ({ onAddNew, onImported, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const leads = await parseLeadsFromExcel(file);
      if (!leads.length) { toast("No valid leads found in file", "error"); return; }
      onImported(leads);
      toast(`Imported ${leads.length} lead${leads.length !== 1 ? "s" : ""} successfully`);
    } catch {
      toast("Failed to read file — ensure it's a valid .xlsx", "error");
    } finally {
      e.target.value = "";
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
        {/* primary action */}
        <button
          style={{
            ...btnStyle("primary"),
            borderRadius: "8px 0 0 8px",
            borderRight: "1px solid rgba(255,255,255,0.2)",
            fontWeight: 600,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
          onClick={() => { setOpen(false); onAddNew(); }}
          disabled={disabled}
        >
          + New Lead
        </button>
        {/* chevron toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          disabled={disabled}
          aria-label="More add options"
          style={{
            ...btnStyle("primary"),
            borderRadius: "0 8px 8px 0",
            padding: "0 10px",
            minWidth: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="11" height="7" viewBox="0 0 11 7" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
            <path d="M1 1L5.5 6L10 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          minWidth: 210,
          zIndex: 100,
          overflow: "hidden",
          animation: "fadeSlideDown 0.12s ease",
        }}>
          <style>{`@keyframes fadeSlideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{ padding: "6px" }}>
            <button
              onClick={() => { setOpen(false); fileRef.current?.click(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 7, border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 16 }}>📥</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Import from Excel</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Upload a filled .xlsx file</div>
              </div>
            </button>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            <button
              onClick={() => { setOpen(false); downloadLeadTemplate(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 7, border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left", transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 16 }}>📋</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Download Template</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Get the Excel import template</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LeadForm = ({ initial = {}, onSave, onClose }) => {
  const [f, setF] = useState({ 
    title: "", 
    contact: "", 
    company: "", 
    service: "", 
    source: "LinkedIn", 
    value: 0, 
    probability: 50, 
    stage: "New", 
    priority: "Medium", 
    followUpDate: "", 
    notes: "", 
    tags: [], 
    lostReason: "", 
    contactId: "",
    projectId: "",
    createdAt: new Date().toISOString().slice(0,10), 
    ...initial 
  });
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => { const e = {}; if (!f.title.trim()) e.title = "Title required"; if (Object.keys(e).length) { setErr(e); return; } onSave(f); };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Lead title" required><input style={inputStyle} value={f.title} onChange={set("title")} />{err.title && <span style={{ color: "var(--danger)", fontSize: 11 }}>{err.title}</span>}</FormField>
        <FormField label="Contact name"><input style={inputStyle} value={f.contact} onChange={set("contact")} /></FormField>
        <FormField label="Company"><input style={inputStyle} value={f.company} onChange={set("company")} /></FormField>
        <FormField label="Service / Product"><input style={inputStyle} value={f.service} onChange={set("service")} /></FormField>
        <FormField label="Source"><select style={inputStyle} value={f.source} onChange={set("source")}>{LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Stage"><select style={inputStyle} value={f.stage} onChange={set("stage")}>{LEAD_STAGES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{LEAD_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Value (₹)"><input style={inputStyle} type="number" value={f.value} onChange={set("value")} /></FormField>
        <FormField label="Probability %"><input style={inputStyle} type="number" min="0" max="100" value={f.probability} onChange={set("probability")} /></FormField>
        <FormField label="Follow-up date"><input style={inputStyle} type="date" value={f.followUpDate} onChange={set("followUpDate")} /></FormField>
      </div>
      {f.stage === "Lost" && <FormField label="Lost reason"><input style={inputStyle} value={f.lostReason} onChange={set("lostReason")} placeholder="Why was this lead lost?" /></FormField>}
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={submit}>Save lead</button>
      </div>
    </div>
  );
};

const PRIORITY_DOT = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const STAGE_ACCENT = { New: "#6366f1", Contacted: "#3b82f6", Qualified: "#8b5cf6", Proposal: "#f59e0b", Negotiation: "#f97316", Won: "#22c55e", Lost: "#ef4444" };

const LeadCard = ({ lead, onEdit, onDelete, onMarkWonLost, role, isDragging, onDragStart, onDragEnd }) => {
  const overdue = lead.followUpDate && isOverdue(lead.followUpDate);
  const todayFU = lead.followUpDate && isToday(lead.followUpDate);
  const initials = (lead.contact || lead.title || "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const prob = Number(lead.probability) || 0;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--surface)",
        border: `1px solid ${isDragging ? "var(--primary,#6366f1)" : "var(--border)"}`,
        borderLeft: `3px solid ${PRIORITY_DOT[lead.priority] || "#6366f1"}`,
        borderRadius: 10,
        padding: "11px 12px",
        marginBottom: 8,
        cursor: "grab",
        opacity: isDragging ? 0.45 : 1,
        transform: isDragging ? "rotate(1.5deg) scale(0.97)" : "none",
        transition: "box-shadow 0.15s, opacity 0.15s, transform 0.15s",
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.18)" : "0 1px 3px rgba(0,0,0,0.06)",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* drag grip */}
      <div style={{ position: "absolute", top: 10, right: 10, color: "var(--text-muted)", opacity: 0.35, fontSize: 12, letterSpacing: 1, lineHeight: 1 }}>⠿</div>

      {/* top row: avatar + title */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
          background: `linear-gradient(135deg, ${STAGE_ACCENT[lead.stage] || "#6366f1"}33, ${STAGE_ACCENT[lead.stage] || "#6366f1"}66)`,
          color: STAGE_ACCENT[lead.stage] || "#6366f1",
          fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${STAGE_ACCENT[lead.stage] || "#6366f1"}44`,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text)", lineHeight: 1.3, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lead.tags?.includes("Hot Lead") && <span style={{ marginRight: 4 }}>🔥</span>}
            {lead.title}
          </div>
          {lead.contact && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lead.contact}{lead.company ? ` · ${lead.company}` : ""}
            </div>
          )}
        </div>
      </div>

      {/* value + tags row */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginBottom: 7 }}>
        {lead.value > 0 && (
          <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700, background: "#dcfce7", borderRadius: 6, padding: "1px 6px" }}>
            ₹{Number(lead.value).toLocaleString("en-IN")}
          </span>
        )}
        {overdue && <span style={{ fontSize: 10, background: "#FEE2E2", color: "var(--danger)", borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>⏰ Overdue</span>}
        {todayFU && <span style={{ fontSize: 10, background: "#FEF9C3", color: "#92400e", borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>📅 Today</span>}
      </div>

      {/* probability bar */}
      {prob > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Win probability</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: prob >= 70 ? "var(--success)" : prob >= 40 ? "var(--warning,#f59e0b)" : "var(--danger)" }}>{prob}%</span>
          </div>
          <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${prob}%`, borderRadius: 99, background: prob >= 70 ? "var(--success)" : prob >= 40 ? "#f59e0b" : "#ef4444", transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {role !== "Viewer" && (
        <div style={{ display: "flex", gap: 4, borderTop: "1px solid var(--border)", paddingTop: 7, marginTop: 2 }}>
          <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11, padding: "3px 8px" }} onClick={() => onEdit(lead)}>Edit</button>
          {lead.stage !== "Won" && <button style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 6, background: "#dcfce7", color: "#166534", cursor: "pointer", fontWeight: 600 }} onClick={() => onMarkWonLost(lead, "Won")}>✓ Won</button>}
          {lead.stage !== "Lost" && <button style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 6, background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 600 }} onClick={() => onMarkWonLost(lead, "Lost")}>✕ Lost</button>}
          {(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11, padding: "3px 8px", marginLeft: "auto", color: "var(--danger)" }} onClick={() => onDelete(lead.id)}>Del</button>}
        </div>
      )}
    </div>
  );
};

export default function LeadsTab({ leads, setLeads, addAudit, role, projects, setProjects, contacts , workspaceId = "workspace-1" , onLinkedSave}) {

  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase();
    return (!q || l.title.toLowerCase().includes(q) || l.contact?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q))
      && (filterPriority === "All" || l.priority === filterPriority);
  }), [leads, search, filterPriority]);
  const save = (f) => {
    if (editing) { const u = leads.map(l => l.id === editing.id ? { ...editing, ...f } : l); setLeads(u); saveWorkspaceData("leads", u, workspaceId); addAudit("Leads", "Update", `Updated lead: ${f.title}`); toast("Lead updated"); }
    else { const nl = { ...f, id: genId() }; const u = [nl, ...leads]; setLeads(u); saveWorkspaceData("leads", u, workspaceId); addAudit("Leads", "Create", `Created lead: ${f.title}`); toast("Lead added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const l = leads.find(x => x.id === id); const u = leads.filter(x => x.id !== id); setLeads(u); saveWorkspaceData("leads", u, workspaceId); addAudit("Leads", "Delete", `Deleted lead: ${l?.title}`); toast("Lead deleted", "info"); setConfirm(null); };
  const markWonLost = (lead, status) => {
    const u = leads.map(l => l.id === lead.id ? { ...l, stage: status } : l); setLeads(u); saveWorkspaceData("leads", u, workspaceId);
    addAudit("Leads", "Status", `Marked lead ${status}: ${lead.title}`); toast(`Lead marked ${status}`);
    if (status === "Won") {
      const np = { id: genId(), name: `Project — ${lead.title}`, client: lead.contact, industry: "", status: "Planning", budget: lead.value || 0, paid: 0, pending: lead.value || 0, deadline: "", progress: 0, techStack: "", priority: lead.priority, description: lead.notes || "", tags: lead.tags || [], createdAt: new Date().toISOString().slice(0,10) };
      const pu = [np, ...projects]; setProjects(pu); saveWorkspaceData("projects", pu, workspaceId); toast(`Project created from won lead`);
    }
  };
  
  const moveLeadToStage = (id, stage) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.stage === stage) return;
    const u = leads.map(l => l.id === id ? { ...l, stage } : l);
    setLeads(u); saveWorkspaceData("leads", u, workspaceId);
    addAudit("Leads", "Move", `Moved lead to ${stage}: ${lead.title}`);
    toast(`Moved to ${stage}`);
    if (stage === "Won") {
      const np = { id: genId(), name: `Project — ${lead.title}`, client: lead.contact, industry: "", status: "Planning", budget: lead.value || 0, paid: 0, pending: lead.value || 0, deadline: "", progress: 0, techStack: "", priority: lead.priority, description: lead.notes || "", tags: lead.tags || [], createdAt: new Date().toISOString().slice(0,10) };
      const pu = [np, ...projects]; setProjects(pu); saveWorkspaceData("projects", pu, workspaceId); toast(`Project created from won lead`);
    }
  };

  const handleExport = () => {
    exportToCSV("leads", filtered);
    toast("Leads exported to CSV");
  };

  const handleImport = (importedLeads) => {
    const u = [...importedLeads, ...leads];
    setLeads(u);
    saveWorkspaceData("leads", u, workspaceId);
    addAudit("Leads", "Import", `Imported ${importedLeads.length} leads via Excel`);
  };
  return (
    <div>
      {confirm && <Confirm msg="Delete this lead?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? "Edit lead" : "Add lead"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><LeadForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <style>{`
        @media (max-width: 600px) {
          .leads-header { flex-direction: column !important; align-items: flex-start !important; }
          .leads-actions { width: 100% !important; justify-content: space-between !important; }
          .leads-view-toggle button { padding: 5px 10px !important; font-size: 11px !important; }
        }
      `}</style>
      <div className="leads-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Leads</h2>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, background: "var(--border)", borderRadius: 20, padding: "2px 9px", color: "var(--text-muted)", fontWeight: 600 }}>{leads.length} total</span>
            <span style={{ fontSize: 11, background: "#dcfce7", borderRadius: 20, padding: "2px 9px", color: "#166534", fontWeight: 600 }}>✓ {leads.filter(l=>l.stage==="Won").length} won</span>
            <span style={{ fontSize: 11, background: "#fee2e2", borderRadius: 20, padding: "2px 9px", color: "#991b1b", fontWeight: 600 }}>✕ {leads.filter(l=>l.stage==="Lost").length} lost</span>
            {leads.filter(l=>l.followUpDate && isOverdue(l.followUpDate)).length > 0 && (
              <span style={{ fontSize: 11, background: "#fef3c7", borderRadius: 20, padding: "2px 9px", color: "#92400e", fontWeight: 600 }}>
                ⏰ {leads.filter(l=>l.followUpDate && isOverdue(l.followUpDate)).length} overdue
              </span>
            )}
          </div>
        </div>
        <div className="leads-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="leads-view-toggle" style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "kanban" ? "var(--primary,#6366f1)" : "transparent", color: view === "kanban" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("kanban")}
            >⬛ Kanban</button>
            <button
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s, color 0.15s", background: view === "list" ? "var(--primary,#6366f1)" : "transparent", color: view === "list" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("list")}
            >≡ List</button>
          </div>
          <button style={{ ...btnStyle("ghost", "sm"), fontSize: 12 }} onClick={handleExport}>↓ Export</button>
          {role !== "Viewer" && (
            <AddLeadDropdown
              onAddNew={() => setShowForm(true)}
              onImported={handleImport}
            />
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search leads…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}><option value="All">All priorities</option>{LEAD_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
      </div>
      {view === "kanban" ? (
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, minWidth: 980 }}>
            {KANBAN_STAGES.map(stage => {
              const sl = filtered.filter(l => l.stage === stage);
              const sv = sl.reduce((a, l) => a + (Number(l.value) || 0), 0);
              const accent = STAGE_ACCENT[stage] || "#6366f1";
              const isOver = dragOverStage === stage;
              return (
                <div
                  key={stage}
                  onDragOver={e => { e.preventDefault(); setDragOverStage(stage); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={e => { e.preventDefault(); if (dragId) moveLeadToStage(dragId, stage); setDragId(null); setDragOverStage(null); }}
                  style={{
                    flex: "0 0 210px",
                    background: isOver ? `${accent}0d` : "var(--surface)",
                    borderRadius: 14,
                    padding: "0 0 8px 0",
                    border: isOver ? `2px dashed ${accent}88` : "2px solid transparent",
                    transition: "background 0.15s, border 0.15s",
                    overflow: "hidden",
                  }}
                >
                  {/* column accent bar */}
                  <div style={{ height: 3, background: accent, borderRadius: "14px 14px 0 0", marginBottom: 10 }} />
                  <div style={{ padding: "0 10px" }}>
                    <div style={{ marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: accent, textTransform: "uppercase", letterSpacing: "0.07em" }}>{stage}</span>
                      <span style={{ background: `${accent}22`, color: accent, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{sl.length}</span>
                    </div>
                    {sv > 0 && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>₹</span>
                        <span style={{ color: "var(--text)", fontSize: 13 }}>{sv.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {isOver && dragId && (
                      <div style={{ border: `2px dashed ${accent}66`, borderRadius: 10, padding: "10px 0", textAlign: "center", marginBottom: 8, fontSize: 11, color: accent, fontWeight: 600 }}>
                        Drop to move here
                      </div>
                    )}
                    {sl.length === 0 && !isOver
                      ? <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "24px 0", opacity: 0.4, border: "1.5px dashed var(--border)", borderRadius: 10 }}>No leads</div>
                      : sl.map(l => (
                          <LeadCard
                            key={l.id}
                            lead={l}
                            role={role}
                            onEdit={setEditing}
                            onDelete={(id) => setConfirm(id)}
                            onMarkWonLost={markWonLost}
                            isDragging={dragId === l.id}
                            onDragStart={() => setDragId(l.id)}
                            onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
                          />
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        filtered.length === 0 ? <EmptyState icon="🎯" title="No leads" sub="Add your first lead." action={<AddLeadDropdown onAddNew={() => setShowForm(true)} onImported={handleImport} />} /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface)", borderBottom: "2px solid var(--border)" }}>
                  {["Title", "Contact", "Value", "Stage", "Priority", "Follow-up", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{filtered.map((l) => {
                const ov = l.followUpDate && isOverdue(l.followUpDate);
                const accent = PRIORITY_DOT[l.priority] || "#6366f1";
                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--text)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 3, height: 28, borderRadius: 99, background: accent, flexShrink: 0 }} />
                        <div>
                          <div>{l.tags?.includes("Hot Lead") && <span style={{ marginRight: 4 }}>🔥</span>}{l.title}</div>
                          {l.company && <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{l.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: 13 }}>{l.contact || "—"}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 13 }}>
                      {l.value ? <span style={{ color: "#166534", background: "#dcfce7", borderRadius: 6, padding: "2px 7px" }}>₹{Number(l.value).toLocaleString("en-IN")}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_ACCENT[l.stage] || "var(--text-muted)", background: `${STAGE_ACCENT[l.stage] || "#6366f1"}18`, borderRadius: 20, padding: "3px 9px" }}>{l.stage}</span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_DOT[l.priority] || "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: PRIORITY_DOT[l.priority] || "#aaa", display: "inline-block" }} />
                        {l.priority}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", color: ov ? "#DC2626" : "var(--text-muted)", fontWeight: ov ? 700 : 400, fontSize: 12 }}>{l.followUpDate ? fmtDate(l.followUpDate) : "—"}{ov && " ⏰"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {role !== "Viewer" && <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} onClick={() => setEditing(l)}>Edit</button>}
                        {(role === "Owner" || role === "Admin") && <button style={{ fontSize: 11, padding: "3px 8px", border: "none", borderRadius: 6, background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 600 }} onClick={() => setConfirm(l.id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )
      )}
    </div>
  );

}
