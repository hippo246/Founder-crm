import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";
import { WA_CATEGORIES } from "../config/crmConfig.js";

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: COMMUNICATION TEMPLATES (WhatsApp + Email)
// ══════════════════════════════════════════════════════════════════════════════

const EMAIL_CATEGORIES = ["Welcome", "Invoice", "Proposal", "Follow-up", "Reminder", "Thank You", "General"];


export default function WhatsAppTemplatesTab({ whatsappTemplates, setWhatsappTemplates, addAudit, role, workspaceId = "workspace-1" }) {

  const [activeSubtab, setActiveSubtab] = useState("whatsapp");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Email templates state — use workspace-scoped key for consistency
  const [emailTemplates, setEmailTemplates] = useState(() => {
    // Try workspace-scoped key first, fall back to old key for migration
    const scopedKey = `${workspaceId}_emailTemplates`;
    const oldKey = `workspace-${workspaceId}-emailTemplates`;
    const stored = localStorage.getItem(scopedKey) || localStorage.getItem(oldKey);
    return stored ? JSON.parse(stored) : [];
  });

  const filtered = useMemo(() => {
    const templates = activeSubtab === "whatsapp" ? (whatsappTemplates||[]) : emailTemplates;
    const categories = activeSubtab === "whatsapp" ? WA_CATEGORIES : EMAIL_CATEGORIES;
    return templates.filter(t => {
      const q = search.toLowerCase();
      return (!q || t.name?.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q))
        && (filterCategory==="All" || t.category===filterCategory);
    });
  }, [whatsappTemplates, emailTemplates, search, filterCategory, activeSubtab]);

  const WaForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ name:"", category:"First Message", body:"", active:true, createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Template name"><input style={inputStyle} value={f.name} onChange={set("name")} /></FormField>
          <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}>{WA_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormField>
        </div>
        <FormField label="Message body"><textarea style={{ ...inputStyle, minHeight:120, resize:"vertical", fontFamily:"monospace" }} value={f.body} onChange={set("body")} placeholder="Use {clientName}, {projectName}, {amount}, {date} as variables" /></FormField>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:12 }}>Available variables: <code>{"{clientName}"}</code>, <code>{"{projectName}"}</code>, <code>{"{amount}"}</code>, <code>{"{date}"}</code></div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><input type="checkbox" checked={f.active} onChange={e=>setF(p=>({...p,active:e.target.checked}))} id="waActive" /><label htmlFor="waActive" style={{ fontSize:13, cursor:"pointer", color:"var(--text)" }}>Active</label></div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save template</button></div>
      </div>
    );
  };

  const EmailForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ name:"", category:"Welcome", subject:"", body:"", active:true, createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Template name"><input style={inputStyle} value={f.name} onChange={set("name")} /></FormField>
          <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}>{EMAIL_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormField>
        </div>
        <FormField label="Subject line"><input style={inputStyle} value={f.subject} onChange={set("subject")} placeholder="Use {clientName}, {projectName}, {amount}, {date} as variables" /></FormField>
        <FormField label="Email body"><textarea style={{ ...inputStyle, minHeight:120, resize:"vertical", fontFamily:"monospace" }} value={f.body} onChange={set("body")} placeholder="Use {clientName}, {projectName}, {amount}, {date} as variables" /></FormField>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:12 }}>Available variables: <code>{"{clientName}"}</code>, <code>{"{projectName}"}</code>, <code>{"{amount}"}</code>, <code>{"{date}"}</code></div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><input type="checkbox" checked={f.active} onChange={e=>setF(p=>({...p,active:e.target.checked}))} id="emailActive" /><label htmlFor="emailActive" style={{ fontSize:13, cursor:"pointer", color:"var(--text)" }}>Active</label></div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save template</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (activeSubtab === "whatsapp") {
      if (editing) { const u=(whatsappTemplates||[]).map(t=>t.id===editing.id?{...editing,...f}:t); setWhatsappTemplates(u); saveWorkspaceData("whatsappTemplates",u,workspaceId); addAudit("WA Templates","Update",`Updated: ${f.name}`); toast("Template updated"); }
      else { const nt={...f,id:genId()}; const u=[nt,...(whatsappTemplates||[])]; setWhatsappTemplates(u); saveWorkspaceData("whatsappTemplates",u,workspaceId); addAudit("WA Templates","Create",`Created: ${f.name}`); toast("Template added"); }
    } else {
      if (editing) { const u=emailTemplates.map(t=>t.id===editing.id?{...editing,...f}:t); setEmailTemplates(u); localStorage.setItem(`${workspaceId}_emailTemplates`,JSON.stringify(u)); addAudit("Email Templates","Update",`Updated: ${f.name}`); toast("Template updated"); }
      else { const nt={...f,id:genId()}; const u=[nt,...emailTemplates]; setEmailTemplates(u); localStorage.setItem(`${workspaceId}_emailTemplates`,JSON.stringify(u)); addAudit("Email Templates","Create",`Created: ${f.name}`); toast("Template added"); }
    }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (activeSubtab === "whatsapp") {
      const t=(whatsappTemplates||[]).find(x=>x.id===id); const u=(whatsappTemplates||[]).filter(x=>x.id!==id); setWhatsappTemplates(u); saveWorkspaceData("whatsappTemplates",u,workspaceId); addAudit("WA Templates","Delete",`Deleted: ${t?.name}`); toast("Deleted","info"); setConfirm(null);
    } else {
      const t=emailTemplates.find(x=>x.id===id); const u=emailTemplates.filter(x=>x.id!==id); setEmailTemplates(u); localStorage.setItem(`${workspaceId}_emailTemplates`,JSON.stringify(u)); addAudit("Email Templates","Delete",`Deleted: ${t?.name}`); toast("Deleted","info"); setConfirm(null);
    }
  };
  const toggleActive = (id) => {
    if (activeSubtab === "whatsapp") {
      const u=(whatsappTemplates||[]).map(t=>t.id===id?{...t,active:!t.active}:t); setWhatsappTemplates(u); saveWorkspaceData("whatsappTemplates",u,workspaceId); toast("Toggled");
    } else {
      const u=emailTemplates.map(t=>t.id===id?{...t,active:!t.active}:t); setEmailTemplates(u); localStorage.setItem(`${workspaceId}_emailTemplates`,JSON.stringify(u)); toast("Toggled");
    }
  };
  const copyMsg = (body) => {
    const currentYear = new Date().getFullYear();
    const sample = body.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM").replace(/\{amount\}/g,"₹50,000").replace(/\{date\}/g,`July 30, ${currentYear}`);
    navigator.clipboard?.writeText(sample).catch(()=>{});
    toast("Message copied to clipboard");
  };
  
  const handleExport = () => { 
    const filename = activeSubtab === "whatsapp" ? "whatsapp-templates" : "email-templates";
    exportToCSV(filename, filtered); 
    toast(`${activeSubtab === "whatsapp" ? "WhatsApp" : "Email"} templates exported to CSV`);
  };

  const currentCategories = activeSubtab === "whatsapp" ? WA_CATEGORIES : EMAIL_CATEGORIES;
  const currentTemplates = activeSubtab === "whatsapp" ? (whatsappTemplates||[]) : emailTemplates;
  const CurrentForm = activeSubtab === "whatsapp" ? WaForm : EmailForm;

  return (
    <div>
      {confirm && <Confirm msg="Delete this template?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?`Edit ${activeSubtab} template`:`New ${activeSubtab} template`} onClose={() => { setShowForm(false); setEditing(null); }} width={600}><CurrentForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      {preview && (
        <Modal title="Message Preview" onClose={() => setPreview(null)} width={500}>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>Sample variables applied:</div>
          <div style={{ background:activeSubtab==="whatsapp"?"#DCF8C6":"#f5f5f5", borderRadius:12, padding:"14px 16px", fontSize:14, color:activeSubtab==="whatsapp"?"#0A0A0A":"#333", lineHeight:1.6, fontFamily:activeSubtab==="whatsapp"?"sans-serif":"monospace", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            {activeSubtab==="whatsapp" && (() => {
              const currentYear = new Date().getFullYear();
              return preview.body.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM").replace(/\{amount\}/g,"₹50,000").replace(/\{date\}/g,`July 30, ${currentYear}`);
            })()}
            {activeSubtab==="email" && (() => {
              const currentYear = new Date().getFullYear();
              return (
                <div>
                  <div style={{ fontWeight:600, marginBottom:8 }}>{preview.subject?.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM")}</div>
                  <div style={{ whiteSpace:"pre-wrap" }}>{preview.body.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM").replace(/\{amount\}/g,"₹50,000").replace(/\{date\}/g,`July 30, ${currentYear}`)}</div>
                </div>
              );
            })()}
          </div>
          <div style={{ marginTop:14 }}><button style={btnStyle("primary")} onClick={() => { copyMsg(preview.body); setPreview(null); }}>📋 Copy message</button></div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Message Templates</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{currentTemplates.length} templates — WhatsApp &amp; Email</p></div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>}
        </div>
      </div>
      
      {/* Subtabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        {["whatsapp", "email"].map(subtab => (
          <button
            key={subtab}
            onClick={() => setActiveSubtab(subtab)}
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
      
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="All">All categories</option>{currentCategories.map(c=><option key={c}>{c}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon={activeSubtab==="whatsapp"?"💬":"📧"} title={`No ${activeSubtab} templates`} sub={`Create your first ${activeSubtab} message template.`} action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>} /> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ background:"var(--surface)", border:`1px solid ${t.active?"var(--border)":"#FCA5A5"}`, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{t.name}</div>
                <span style={{ fontSize:11, color:t.active?"#059669":"#DC2626", fontWeight:600 }}>{t.active?"● Active":"○ Inactive"}</span>
              </div>
              <Badge label={t.category} size="sm" />
              {activeSubtab==="email" && t.subject && <div style={{ fontSize:12, color:"var(--text-muted)", fontWeight:500 }}>{t.subject}</div>}
              <p style={{ fontSize:12, color:"var(--text-muted)", margin:0, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>{t.body}</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button style={btnStyle("soft","sm")} onClick={() => setPreview(t)}>👁 Preview</button>
                <button style={btnStyle("ghost","sm")} onClick={() => copyMsg(t.body)}>📋 Copy</button>
                {role!=="Viewer"&&<><button style={btnStyle("ghost","sm")} onClick={() => toggleActive(t.id)}>{t.active?"Deactivate":"Activate"}</button><button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"var(--danger)" }} onClick={() => setConfirm(t.id)}>Del</button>}</>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
