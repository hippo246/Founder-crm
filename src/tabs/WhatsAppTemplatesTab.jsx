import { useState, useEffect, useMemo, useRef } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { WA_CATEGORIES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: COMMUNICATION TEMPLATES (WhatsApp + Email)
// ══════════════════════════════════════════════════════════════════════════════

const EMAIL_CATEGORIES = ["Welcome", "Invoice", "Proposal", "Follow-up", "Reminder", "Thank You", "General"];

const SAMPLE_VARS = { clientName: "Rahul Sharma", projectName: "Personal CRM", amount: "₹50,000", date: `July 30, ${new Date().getFullYear()}` };
const VARS = ["clientName", "projectName", "amount", "date"];

function applyVars(str = "") {
  return VARS.reduce((s, k) => s.replaceAll(`{${k}}`, SAMPLE_VARS[k]), str);
}

// ── Import helpers ────────────────────────────────────────────────────────────
const WA_IMPORT_COLS    = ["name", "category", "body"];
const EMAIL_IMPORT_COLS = ["name", "category", "subject", "body"];

function buildCSVTemplate(type) {
  const headers = type === "whatsapp" ? WA_IMPORT_COLS : EMAIL_IMPORT_COLS;
  const sample  = type === "whatsapp"
    ? ["Welcome Message", "First Message", "Hi {clientName}! Your project {projectName} is now active."]
    : ["Welcome Email", "Welcome", "Welcome to {projectName}!", "Hi {clientName}, excited to have you on board for {projectName}."];
  return [headers.join(","), sample.map(v => `"${v.replace(/"/g, '""')}"`).join(",")].join("\n");
}

function downloadImportTemplate(type) {
  const blob = new Blob([buildCSVTemplate(type)], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `${type}-templates-sample.csv`; a.click(); URL.revokeObjectURL(a.href);
}

function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(row => {
    const vals = []; let cur = "", inQ = false;
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ; } else if (ch === "," && !inQ) { vals.push(cur); cur = ""; } else cur += ch;
    }
    vals.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").replace(/^"|"$/g, "").trim()]));
  });
}

async function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      try {
        if (window.XLSX && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
          const wb = window.XLSX.read(e.target.result, { type: "binary" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });
          resolve(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase().trim(), String(v).trim()]))));
        } else {
          resolve(parseCSVText(e.target.result));
        }
      } catch (err) { reject(err); }
    };
    if (window.XLSX && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) reader.readAsBinaryString(file);
    else reader.readAsText(file);
  });
}

// Extracted outside component to prevent remount on every render
function TemplateForm({ type, initial = {}, onSave, onClose }) {
  const isWA = type === "whatsapp";
  const categories = isWA ? WA_CATEGORIES : EMAIL_CATEGORIES;
  const defaults = { name: "", category: categories[0], body: "", subject: "", active: true, createdAt: new Date().toISOString().slice(0, 10) };
  const [f, setF] = useState({ ...defaults, ...initial });
  const [showLivePreview, setShowLivePreview] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const insertVar = v => setF(p => ({ ...p, body: p.body + `{${v}}` }));
  const usedVars = VARS.filter(v => f.body.includes(`{${v}}`) || f.subject?.includes(`{${v}}`));

  const handleSave = () => {
    if (!f.name.trim()) { toast("Template name is required", "error"); return; }
    if (!f.body.trim()) { toast("Message body is required", "error"); return; }
    if (!isWA && !f.subject.trim()) { toast("Subject line is required", "error"); return; }
    onSave(f);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Template name"><input style={inputStyle} value={f.name} onChange={set("name")} autoFocus /></FormField>
        <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}>{categories.map(c => <option key={c}>{c}</option>)}</select></FormField>
      </div>
      {!isWA && <FormField label="Subject line"><input style={inputStyle} value={f.subject} onChange={set("subject")} placeholder="e.g. Invoice for {projectName}" /></FormField>}
      <FormField label="Message body">
        <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }} value={f.body} onChange={set("body")} placeholder={`Hi {clientName}, your {projectName} is ready…`} />
      </FormField>

      {/* Toolbar row: var chips + char count + preview toggle */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 2 }}>Insert:</span>
        {VARS.map(v => (
          <button key={v} type="button" onClick={() => insertVar(v)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)", background: usedVars.includes(v) ? "var(--accent-soft, #e8f4ff)" : "var(--surface-2, var(--surface))", color: usedVars.includes(v) ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: usedVars.includes(v) ? 600 : 400 }}>
            {`{${v}}`}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {isWA && <span style={{ fontSize: 11, color: f.body.length > 900 ? "#DC2626" : "var(--text-muted)" }}>{f.body.length}/1024</span>}
          <button type="button" onClick={() => setShowLivePreview(p => !p)} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 6, border: "1px solid var(--border)", background: showLivePreview ? "var(--accent)" : "transparent", color: showLivePreview ? "#fff" : "var(--text-muted)", cursor: "pointer" }}>
            {showLivePreview ? "Hide preview" : "Live preview"}
          </button>
        </div>
      </div>

      {/* Live preview panel */}
      {showLivePreview && (
        <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "6px 12px", background: "var(--surface-2, var(--surface))", borderBottom: "1px solid var(--border)" }}>
            Preview with sample data · {isWA ? "WhatsApp" : "Email"}
          </div>
          <div style={{ background: isWA ? "#DCF8C6" : "#f9f9f9", padding: "12px 16px", fontSize: 13, lineHeight: 1.6, color: isWA ? "#0A0A0A" : "#333", fontFamily: isWA ? "sans-serif" : "inherit" }}>
            {!isWA && f.subject && <div style={{ fontWeight: 700, marginBottom: 6, color: "#111" }}>{applyVars(f.subject) || <span style={{ color: "#bbb" }}>Subject line…</span>}</div>}
            <div style={{ whiteSpace: "pre-wrap" }}>{applyVars(f.body) || <span style={{ color: "#bbb" }}>{isWA ? "Message body…" : "Email body…"}</span>}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={f.active} onChange={e => setF(p => ({ ...p, active: e.target.checked }))} id="tplActive" />
          <label htmlFor="tplActive" style={{ fontSize: 13, cursor: "pointer", color: "var(--text)" }}>Active</label>
        </div>
        {usedVars.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Uses: {usedVars.map(v => <code key={v} style={{ marginLeft: 4 }}>{`{${v}}`}</code>)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={handleSave}>Save template</button>
      </div>
    </div>
  );
}


export default function WhatsAppTemplatesTab({ whatsappTemplates, setWhatsappTemplates, emailTemplates = [], setEmailTemplates, addAudit, role, workspaceId = "workspace-1" }) {

  const [activeSubtab, setActiveSubtab] = useState("whatsapp");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const importRef = useRef(null);

  // Migrate any data previously stored under the old localStorage key on first mount
  useEffect(() => {
    const oldKey = `workspace-${workspaceId}-emailTemplates`;
    const legacy = localStorage.getItem(oldKey);
    if (legacy && emailTemplates.length === 0) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed.length) { setEmailTemplates(parsed); saveWorkspaceData("emailTemplates", parsed, workspaceId); }
        localStorage.removeItem(oldKey);
      } catch { /* ignore */ }
    }
  }, [workspaceId]); // eslint-disable-line

  const filtered = useMemo(() => {
    const templates = activeSubtab === "whatsapp" ? (whatsappTemplates||[]) : emailTemplates;
    const list = templates.filter(t => {
      const q = search.toLowerCase();
      return (!q || t.name?.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q))
        && (filterCategory==="All" || t.category===filterCategory);
    });
    if (sortBy === "oldest")   list.sort((a, b) => (a.createdAt||"") > (b.createdAt||"") ?  1 : -1);
    else if (sortBy === "az")  list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "za")  list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortBy === "used") list.sort((a, b) => (b.lastUsed||"") > (a.lastUsed||"") ? 1 : -1);
    else /* newest */          list.sort((a, b) => (b.createdAt||"") > (a.createdAt||"") ?  1 : -1);
    return list;
  }, [whatsappTemplates, emailTemplates, search, filterCategory, activeSubtab, sortBy]);

  // Returns {list, set, persist, auditPrefix} for the active subtab — eliminates duplicated if/else blocks
  const ops = (() => {
    if (activeSubtab === "whatsapp") return {
      list: whatsappTemplates || [],
      set: setWhatsappTemplates,
      persist: u => saveWorkspaceData("whatsappTemplates", u, workspaceId),
      auditPrefix: "WA Templates",
    };
    return {
      list: emailTemplates,
      set: setEmailTemplates,
      persist: u => saveWorkspaceData("emailTemplates", u, workspaceId),
      auditPrefix: "Email Templates",
    };
  })();

  const save = (f) => {
    if (editing) {
      const u = ops.list.map(t => t.id === editing.id ? { ...editing, ...f } : t);
      ops.set(u); ops.persist(u); addAudit(ops.auditPrefix, "Update", `Updated: ${f.name}`); toast("Template updated");
    } else {
      const u = [{ ...f, id: genId() }, ...ops.list];
      ops.set(u); ops.persist(u); addAudit(ops.auditPrefix, "Create", `Created: ${f.name}`); toast("Template added");
    }
    setShowForm(false); setEditing(null);
  };

  const del = (id) => {
    const t = ops.list.find(x => x.id === id);
    const u = ops.list.filter(x => x.id !== id);
    ops.set(u); ops.persist(u); addAudit(ops.auditPrefix, "Delete", `Deleted: ${t?.name}`); toast("Deleted", "info"); setConfirm(null);
  };

  const toggleActive = (id) => {
    const t = ops.list.find(x => x.id === id);
    const u = ops.list.map(x => x.id === id ? { ...x, active: !x.active } : x);
    ops.set(u); ops.persist(u);
    addAudit(ops.auditPrefix, "Toggle", `${t?.active ? "Deactivated" : "Activated"}: ${t?.name}`);
    toast(t?.active ? "Deactivated" : "Activated");
  };

  const copyMsg = (body, id) => {
    navigator.clipboard?.writeText(applyVars(body)).catch(() => {});
    // track lastUsed so "recently used" sort works
    if (id) {
      const u = ops.list.map(x => x.id === id ? { ...x, lastUsed: new Date().toISOString() } : x);
      ops.set(u); ops.persist(u);
    }
    toast("Message copied to clipboard");
  };

  const duplicate = (t) => {
    const nt = { ...t, id: genId(), name: `${t.name} (copy)`, createdAt: new Date().toISOString().slice(0, 10), lastUsed: undefined };
    const u = [nt, ...ops.list];
    ops.set(u); ops.persist(u); addAudit(ops.auditPrefix, "Duplicate", `Duplicated: ${t.name}`); toast("Template duplicated");
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    try {
      const rows = await readImportFile(file);
      const today = new Date().toISOString().slice(0, 10);
      const valid = rows
        .filter(r => r.name?.trim() && r.body?.trim())
        .map(r => ({
          id: genId(),
          name: r.name.trim(),
          category: (() => {
            const cats = activeSubtab === "whatsapp" ? WA_CATEGORIES : EMAIL_CATEGORIES;
            const match = cats.find(c => c.toLowerCase() === r.category?.trim().toLowerCase());
            return match || cats[0];
          })(),
          body: r.body.trim(),
          subject: r.subject?.trim() || "",
          active: true,
          createdAt: today,
        }));
      if (!valid.length) { toast("No valid rows found — check your file has name + body columns", "error"); return; }
      setImportRows(valid);
    } catch { toast("Could not read file", "error"); }
  };

  const confirmImport = (rows) => {
    const u = [...rows, ...ops.list];
    ops.set(u); ops.persist(u);
    addAudit(ops.auditPrefix, "Import", `Imported ${rows.length} template${rows.length > 1 ? "s" : ""}`);
    toast(`${rows.length} template${rows.length > 1 ? "s" : ""} imported`);
    setImportRows(null);
  };

  const handleExport = () => { 
    const filename = activeSubtab === "whatsapp" ? "whatsapp-templates" : "email-templates";
    exportToCSV(filename, filtered); 
    toast(`${activeSubtab === "whatsapp" ? "WhatsApp" : "Email"} templates exported to CSV`);
  };

  const currentCategories = activeSubtab === "whatsapp" ? WA_CATEGORIES : EMAIL_CATEGORIES;
  const currentTemplates = ops.list;

  return (
    <div>
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />

      {confirm && <Confirm msg="Delete this template?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? `Edit ${activeSubtab} template` : `New ${activeSubtab} template`} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><TemplateForm type={activeSubtab} initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}

      {/* Import confirmation modal */}
      {importRows && (
        <Modal title={`Import ${importRows.length} ${activeSubtab} template${importRows.length > 1 ? "s" : ""}`} onClose={() => setImportRows(null)} width={640}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Review before importing. Rows with no name or body were skipped.
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {importRows.map((r, i) => (
              <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span style={{ background: "var(--surface-2,#f0f0f0)", borderRadius: 4, padding: "1px 6px", marginRight: 6 }}>{r.category}</span>
                    {activeSubtab === "email" && r.subject && <span style={{ fontStyle: "italic" }}>{r.subject}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.body}</div>
                </div>
                <button onClick={() => setImportRows(prev => prev.filter((_, j) => j !== i))} style={{ fontSize: 12, color: "var(--danger,#DC2626)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
            <button style={btnStyle("ghost", "sm")} onClick={() => { downloadImportTemplate(activeSubtab); }}>📥 Download template CSV</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnStyle("ghost")} onClick={() => setImportRows(null)}>Cancel</button>
              <button style={btnStyle("primary")} onClick={() => confirmImport(importRows)}>Import {importRows.length} template{importRows.length > 1 ? "s" : ""}</button>
            </div>
          </div>
        </Modal>
      )}
      {preview && (
        <Modal title="Message Preview" onClose={() => setPreview(null)} width={500}>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>Sample variables applied:</div>
          <div style={{ background: activeSubtab === "whatsapp" ? "#DCF8C6" : "#f5f5f5", borderRadius: 12, padding: "14px 16px", fontSize: 14, color: activeSubtab === "whatsapp" ? "#0A0A0A" : "#333", lineHeight: 1.6, fontFamily: activeSubtab === "whatsapp" ? "sans-serif" : "monospace", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            {activeSubtab === "email" && preview.subject && <div style={{ fontWeight: 600, marginBottom: 8 }}>{applyVars(preview.subject)}</div>}
            <div style={{ whiteSpace: "pre-wrap" }}>{applyVars(preview.body)}</div>
          </div>
          <div style={{ marginTop:14 }}><button style={btnStyle("primary")} onClick={() => { copyMsg(preview.body, preview.id); setPreview(null); }}>📋 Copy message</button></div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Message Templates</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{currentTemplates.length} templates — WhatsApp &amp; Email</p></div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>⬇ Export CSV</button>
          {role !== "Viewer" && <>
            <button style={btnStyle("ghost", "sm")} onClick={() => downloadImportTemplate(activeSubtab)} title={`Download a sample CSV template for ${activeSubtab} import`}>📥 Sample CSV</button>
            <button style={btnStyle("ghost", "sm")} onClick={() => importRef.current?.click()}>⬆ Import</button>
            <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>
          </>}
        </div>
      </div>
      
      {/* Subtabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        {["whatsapp", "email"].map(subtab => (
          <button
            key={subtab}
            onClick={() => { setActiveSubtab(subtab); setFilterCategory("All"); setSearch(""); }}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              background: "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              color: activeSubtab === subtab ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.15s"
            }}
          >
            {subtab === "whatsapp" ? "WhatsApp" : "Email"}
          </button>
        ))}
      </div>
      
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18, alignItems:"center" }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="All">All categories</option>{currentCategories.map(c=><option key={c}>{c}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto", fontSize: 12 }} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="used">Recently used</option>
        </select>
        <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:"auto" }}>{filtered.length} of {currentTemplates.length}</span>
      </div>
      {filtered.length===0 ? <EmptyState icon={activeSubtab==="whatsapp"?"💬":"📧"} title={`No ${activeSubtab} templates`} sub={`Create your first ${activeSubtab} message template.`} action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>} /> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {filtered.map(t => {
            const isNew = t.createdAt === new Date().toISOString().slice(0, 10);
            const cardVars = VARS.filter(v => (t.body + (t.subject||"")).includes(`{${v}}`));
            const charCount = t.body?.length || 0;
            return (
              <div key={t.id} style={{ background:"var(--surface)", border:`1px solid ${t.active ? "var(--border)" : "#FCA5A5"}`, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:9, opacity: t.active ? 1 : 0.75 }}>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                    {isNew && <span style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#059669", borderRadius:4, padding:"1px 5px", flexShrink:0 }}>NEW</span>}
                    <div style={{ fontWeight:600, fontSize:14, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</div>
                  </div>
                  <span style={{ fontSize:11, color:t.active?"#059669":"#DC2626", fontWeight:600, flexShrink:0 }}>{t.active?"● Active":"○ Inactive"}</span>
                </div>

                {/* Meta row */}
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <Badge label={t.category} size="sm" />
                  {activeSubtab==="whatsapp" && <span style={{ fontSize:10, color: charCount > 900 ? "#DC2626" : "var(--text-muted)", marginLeft:"auto" }}>{charCount} chars</span>}
                </div>

                {/* Email subject */}
                {activeSubtab==="email" && t.subject && (
                  <div style={{ fontSize:12, color:"var(--text)", fontWeight:500, padding:"4px 8px", background:"var(--surface-2,#f5f5f5)", borderRadius:6, borderLeft:"3px solid var(--accent)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.subject}</div>
                )}

                {/* Body preview */}
                <p style={{ fontSize:12, color:"var(--text-muted)", margin:0, lineHeight:1.55, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>{t.body}</p>

                {/* Variable chips */}
                {cardVars.length > 0 && (
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {cardVars.map(v => <span key={v} style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background:"var(--accent-soft,#e8f4ff)", color:"var(--accent)", fontFamily:"monospace" }}>{`{${v}}`}</span>)}
                  </div>
                )}

                {/* Last used */}
                {t.lastUsed && (
                  <div style={{ fontSize:10, color:"var(--text-muted)" }}>Last used {new Date(t.lastUsed).toLocaleDateString()}</div>
                )}

                {/* Actions */}
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingTop:2, borderTop:"1px solid var(--border)", marginTop:2 }}>
                  <button style={btnStyle("soft","sm")} onClick={() => setPreview(t)}>👁 Preview</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => copyMsg(t.body, t.id)}>📋 Copy</button>
                  {role!=="Viewer" && <>
                    <button style={btnStyle("ghost","sm")} onClick={() => duplicate(t)} title="Duplicate">⧉</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => toggleActive(t.id)}>{t.active ? "Deactivate" : "Activate"}</button>
                    <button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>
                    {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"var(--danger,#DC2626)", marginLeft:"auto" }} onClick={() => setConfirm(t.id)}>Del</button>}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

}
