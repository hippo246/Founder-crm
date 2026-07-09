import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { DOC_TYPES, DOC_STATUSES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════


// ── DocForm lifted out of DocumentsTab so it isn't recreated on every render ──
function DocForm({ initial={}, onSave, onClose, projects=[], tags=[] }) {
  const [f, setF] = useState({ name:"", type:"Proposal", relatedClient:"", relatedProject:"", url:"", status:"Draft", notes:"", tags:[], createdAt: new Date().toISOString().slice(0,10), ...initial });
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const toggleTag = t => setF(p=>({...p, tags: p.tags.includes(t) ? p.tags.filter(x=>x!==t) : [...p.tags, t]}));

  const handleSave = () => {
    if (!f.name.trim()) { toast("Name is required", "error"); return; }
    onSave(f);
  };

  const allTags = [...new Set([...tags, "Contract", "Signed", "Internal", "Client-Facing", "NDA", "Template"])];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Name"><input style={inputStyle} value={f.name} onChange={set("name")} /></FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Client"><input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} /></FormField>
        <FormField label="Project"><select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{DOC_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        <FormField label="URL / Link"><input style={inputStyle} value={f.url} onChange={set("url")} placeholder="https://…" /></FormField>
      </div>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      {allTags.length > 0 && (
        <FormField label="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
            {allTags.map(t => (
              <span key={t} onClick={() => toggleTag(t)} style={{ padding: "3px 11px", borderRadius: 999, fontSize: 12, fontWeight: f.tags.includes(t) ? 600 : 400, cursor: "pointer", background: f.tags.includes(t) ? "var(--accent,#6c63ff)" : "transparent", color: f.tags.includes(t) ? "#fff" : "var(--text-muted)", border: `1.5px solid ${f.tags.includes(t) ? "var(--accent,#6c63ff)" : "var(--border)"}`, transition: "all 0.12s ease" }}>{t}</span>
            ))}
          </div>
        </FormField>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

export default function DocumentsTab({ documents, setDocuments, addAudit, role, contacts, projects, tags, workspaceId = "workspace-1", onLinkedSave }) {

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (documents||[]).filter(d => {
    const q = search.toLowerCase();
    return (!q || d.name?.toLowerCase().includes(q) || d.relatedClient?.toLowerCase().includes(q) || d.relatedProject?.toLowerCase().includes(q))
      && (filterType === "All" || d.type === filterType)
      && (filterStatus === "All" || d.status === filterStatus);
  }), [documents, search, filterType, filterStatus]);


  const closeForm = () => { setShowForm(false); setEditing(null); };

  const save = (f) => {
    if (editing) { const u = (documents||[]).map(d=>d.id===editing.id?{...editing,...f,updatedAt:new Date().toISOString()}:d); setDocuments(u); saveWorkspaceData("documents", u, workspaceId); addAudit("Documents","Update",`Updated doc: ${f.name}`); toast("Document updated"); }
    else { const nd = {...f, id: genId(), createdAt: new Date().toISOString().slice(0,10)}; const u = [nd,...(documents||[])]; setDocuments(u); saveWorkspaceData("documents", u, workspaceId); addAudit("Documents","Create",`Added doc: ${f.name}`); toast("Document added"); }
    closeForm();
  };
  const del = (id) => { const d = (documents||[]).find(x=>x.id===id); const u = (documents||[]).filter(x=>x.id!==id); setDocuments(u); saveWorkspaceData("documents", u, workspaceId); addAudit("Documents","Delete",`Deleted doc: ${d?.name}`); toast("Deleted","info"); setConfirm(null); };
  
  const handleExport = () => { exportToCSV("documents", filtered); toast("Documents exported to CSV"); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this document?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit document":"Add document"} onClose={closeForm}><DocForm initial={editing||{}} onSave={save} onClose={closeForm} projects={projects||[]} tags={tags||[]} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Documents</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(documents||[]).length} documents</p></div>
        <div style={{display:"flex", gap:"8px"}}>
          <button style={btnStyle("ghost","sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add document</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All">All types</option>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{DOC_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📄" title="No documents" sub="Track your proposals, contracts, and files." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add document</button>} /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--surface)" }}>{["Name","Type","Client","Project","Status","Created","Link","Actions"].map(h=><th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((d,i) => (
              <tr key={d.id} style={{ borderTop: "1px solid var(--border)", background: i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>{d.name}</td>
                <td style={{ padding: "12px 14px" }}><Badge label={d.type} /></td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{d.relatedClient || "—"}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{d.relatedProject || "—"}</td>
                <td style={{ padding: "12px 14px" }}><Badge label={d.status} /></td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{d.createdAt ? fmtDate(d.createdAt) : "—"}</td>
                <td style={{ padding: "12px 14px" }}>{d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ ...btnStyle("soft","sm"), textDecoration: "none" }}>🔗 Open</a>}</td>
                <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>{role!=="Viewer"&&<button style={btnStyle("ghost","sm")} onClick={() => setEditing(d)}>Edit</button>}{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(d.id)}>Del</button>}{onLinkedSave && role !== "Viewer" && <><button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("note",{title:`Note — ${d.name}`,relatedTo:d.name,relatedType:"Document",body:"",tags:[]})}>📝 Note</button><button style={btnStyle("ghost","sm")} onClick={() => onLinkedSave("communication",{contact:d.relatedClient||"",relatedTo:d.name,method:"Email",date:new Date().toISOString().slice(0,10),summary:""})}>💬 Comm</button></>}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );

}
