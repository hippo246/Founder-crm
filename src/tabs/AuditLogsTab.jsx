import { useState, useMemo } from "react";
import { Badge, Modal, Confirm, FormField, SearchInput, EmptyState, SectionCard, StatMini, ProgressBar, btnStyle, inputStyle, toast, CollapsibleSection } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue, isToday } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";


// ══════════════════════════════════════════════════════════════════════════════
// MODULE: AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════

const SEVERITY_COLOR = { Info: "var(--info)", Warning: "var(--warning)", Critical: "var(--danger)" };
const SEVERITY_BG    = { Info: "var(--info-dim)", Warning: "var(--warning-dim)", Critical: "var(--danger-dim)" };

export default function AuditLogsTab({ audit, setAudit, role, workspaceId = "workspace-1" }) {

  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [filterUser, setFilterUser] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);

  const modules  = useMemo(() => ["All", ...new Set((audit||[]).map(a=>a.module).filter(Boolean))], [audit]);
  const actions  = useMemo(() => ["All", ...new Set((audit||[]).map(a=>a.action).filter(Boolean))], [audit]);
  const users    = useMemo(() => ["All", ...new Set((audit||[]).map(a=>a.userName||a.user).filter(Boolean))], [audit]);

  const filtered = useMemo(() => (audit||[]).filter(a => {
    const q = search.toLowerCase();
    const userName = a.userName || a.user || "";
    const matchesSearch = (!q || a.desc?.toLowerCase().includes(q) || a.module?.toLowerCase().includes(q) || userName.toLowerCase().includes(q) || a.recordLabel?.toLowerCase().includes(q));
    const matchesModule   = filterModule === "All"   || a.module === filterModule;
    const matchesAction   = filterAction === "All"   || a.action === filterAction;
    const matchesUser     = filterUser === "All"     || userName === filterUser;
    const matchesSeverity = filterSeverity === "All" || (a.severity || "Info") === filterSeverity;
    const matchesDateFrom = !filterDateFrom || new Date(a.ts) >= new Date(filterDateFrom);
    const matchesDateTo   = !filterDateTo   || new Date(a.ts) <= new Date(filterDateTo + "T23:59:59");
    return matchesSearch && matchesModule && matchesAction && matchesUser && matchesSeverity && matchesDateFrom && matchesDateTo;
  }), [audit, search, filterModule, filterAction, filterUser, filterSeverity, filterDateFrom, filterDateTo]);

  const clearLogs = () => { setAudit([]); saveWorkspaceData("audit",[],workspaceId); toast("Audit logs cleared","info"); setConfirmClear(false); };
  
  const handleExport = () => { exportToCSV("audit-logs", filtered); toast("Audit logs exported to CSV"); };

  const formatValue = (val) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  return (
    <div>
      {confirmClear && <Confirm msg="Clear all audit logs? This cannot be undone." yesLabel="Clear Logs" onYes={clearLogs} onNo={() => setConfirmClear(false)} />}
      {viewingEntry && (
        <Modal title="Audit Entry Details" onClose={() => setViewingEntry(null)} width={640}>
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Time</span><div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(viewingEntry.ts).toLocaleString()}</div></div>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>User</span><div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{viewingEntry.userName || viewingEntry.user || "—"}</div></div>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Severity</span>
                <div style={{ marginTop: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-pill)", background: SEVERITY_BG[viewingEntry.severity||"Info"], color: SEVERITY_COLOR[viewingEntry.severity||"Info"] }}>{viewingEntry.severity || "Info"}</span>
                </div>
              </div>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Module</span><div style={{ fontSize: 13 }}>{viewingEntry.module}</div></div>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Action</span><div style={{ marginTop: 3 }}><Badge label={viewingEntry.action} /></div></div>
              <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Source Tab</span><div style={{ fontSize: 13 }}>{viewingEntry.sourceTab || "—"}</div></div>
              {viewingEntry.recordLabel && <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Record</span><div style={{ fontSize: 13 }}>{viewingEntry.recordLabel}</div></div>}
              {viewingEntry.recordType && <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Record Type</span><div style={{ fontSize: 13 }}>{viewingEntry.recordType}</div></div>}
              {viewingEntry.workspaceId && <div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Workspace</span><div style={{ fontSize: 13 }}>{viewingEntry.workspaceId}</div></div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Description</span>
              <div style={{ fontSize: 13, marginTop: 4, padding: "8px 12px", background: "var(--surface-raised)", borderRadius: "var(--r-sm)" }}>{viewingEntry.desc}</div>
            </div>
            {viewingEntry.changedFields?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Changed fields</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {viewingEntry.changedFields.map(f => <span key={f} style={{ fontSize: 11, padding: "2px 8px", background: "var(--accent-dim)", color: "var(--accent)", borderRadius: "var(--r-pill)" }}>{f}</span>)}
                </div>
              </div>
            )}
            {(viewingEntry.before || viewingEntry.after) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {viewingEntry.before && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Before:</div>
                    <pre style={{ background: "var(--surface-raised)", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200, margin: 0 }}>{formatValue(viewingEntry.before)}</pre>
                  </div>
                )}
                {viewingEntry.after && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>After:</div>
                    <pre style={{ background: "var(--surface-raised)", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200, margin: 0 }}>{formatValue(viewingEntry.after)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
      
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Audit Logs</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{filtered.length} of {(audit||[]).length} entries</p></div>
        <div style={{ display:"flex", gap:"8px" }}>
          {role==="Owner" && <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>}
          {role==="Owner" && <button style={btnStyle("danger")} onClick={() => setConfirmClear(true)}>Clear logs</button>}
        </div>
      </div>
      
      <CollapsibleSection title="Filters" defaultOpen={true}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
          <select style={{ ...inputStyle, width:"auto" }} value={filterModule}   onChange={e=>setFilterModule(e.target.value)}>{modules.map(m=><option key={m}>{m}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterAction}   onChange={e=>setFilterAction(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterUser}     onChange={e=>setFilterUser(e.target.value)}>{users.map(u=><option key={u}>{u}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterSeverity} onChange={e=>setFilterSeverity(e.target.value)}>
            <option value="All">All severity</option>
            <option>Info</option><option>Warning</option><option>Critical</option>
          </select>
          <input style={{ ...inputStyle, width:"auto" }} type="date" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} />
          <input style={{ ...inputStyle, width:"auto" }} type="date" value={filterDateTo}   onChange={e=>setFilterDateTo(e.target.value)} />
        </div>
      </CollapsibleSection>
      
      {filtered.length===0 ? <EmptyState icon="📋" title="No audit logs" sub="Actions will appear here." /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--surface)" }}>{["Severity","Time","User","Module","Action","Description","Changes",""].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((a,i)=>{
              const sev = a.severity || "Info";
              const userName = a.userName || a.user || "—";
              return (
                <tr key={a.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)", cursor:"pointer" }} onClick={() => setViewingEntry(a)}>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:"var(--r-pill)", background: SEVERITY_BG[sev], color: SEVERITY_COLOR[sev] }}>{sev}</span>
                  </td>
                  <td style={{ padding:"10px 14px", color:"var(--text-muted)", whiteSpace:"nowrap", fontSize:11 }}>{new Date(a.ts).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</td>
                  <td style={{ padding:"10px 14px", color:"var(--accent)", fontWeight:500 }}>{userName}</td>
                  <td style={{ padding:"10px 14px", color:"var(--text-muted)" }}>{a.module}</td>
                  <td style={{ padding:"10px 14px" }}><Badge label={a.action} size="sm" /></td>
                  <td style={{ padding:"10px 14px", color:"var(--text)", maxWidth:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.desc}</td>
                  <td style={{ padding:"10px 14px", color:"var(--text-muted)" }}>{(a.before || a.after) ? "📝" : "—"}</td>
                  <td style={{ padding:"10px 14px" }}><button style={btnStyle("ghost","sm")}>View</button></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );

}
