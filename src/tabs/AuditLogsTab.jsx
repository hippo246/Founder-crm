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
  const [page, setPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [sortCol, setSortCol] = useState("ts");
  const [sortDir, setSortDir] = useState("desc");
  const PAGE_SIZE = 50;

  const relTime = (ts) => {
    const diff = Date.now() - new Date(ts);
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { dateStyle: "short" });
  };

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

  const SEV_ORDER = { Critical: 0, Warning: 1, Info: 2 };
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av, bv;
      if (sortCol === "ts")       { av = new Date(a.ts); bv = new Date(b.ts); }
      else if (sortCol === "sev") { av = SEV_ORDER[a.severity||"Info"]; bv = SEV_ORDER[b.severity||"Info"]; }
      else if (sortCol === "user"){ av = (a.userName||a.user||"").toLowerCase(); bv = (b.userName||b.user||"").toLowerCase(); }
      else if (sortCol === "mod") { av = (a.module||"").toLowerCase(); bv = (b.module||"").toLowerCase(); }
      else { av = 0; bv = 0; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } setPage(1); };
  const SortIcon = ({ col }) => sortCol !== col ? <span style={{ opacity:0.3, marginLeft:4 }}>⇅</span> : sortDir === "asc" ? <span style={{ marginLeft:4 }}>↑</span> : <span style={{ marginLeft:4 }}>↓</span>;

  const activeFilterCount = [search, filterModule !== "All", filterAction !== "All", filterUser !== "All", filterSeverity !== "All", filterDateFrom, filterDateTo].filter(Boolean).length;

  const resetFilters = () => { setSearch(""); setFilterModule("All"); setFilterAction("All"); setFilterUser("All"); setFilterSeverity("All"); setFilterDateFrom(""); setFilterDateTo(""); setPage(1); };

  const severityCounts = useMemo(() => ({
    Critical: (audit||[]).filter(a => a.severity === "Critical").length,
    Warning:  (audit||[]).filter(a => a.severity === "Warning").length,
    Info:     (audit||[]).filter(a => (a.severity || "Info") === "Info").length,
  }), [audit]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const viewingIndex = viewingEntry ? sorted.findIndex(a => a.id === viewingEntry.id) : -1;
  const goEntry = (delta) => { const next = sorted[viewingIndex + delta]; if (next) setViewingEntry(next); };

  // Keyboard: Esc closes modal, arrow keys navigate entries
  useState(() => {
    const handler = (e) => {
      if (!viewingEntry) return;
      if (e.key === "Escape") setViewingEntry(null);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goEntry(1); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); goEntry(-1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewingEntry, viewingIndex]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const setToday = () => { setFilterDateFrom(todayStr); setFilterDateTo(todayStr); setPage(1); };

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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <button style={btnStyle("ghost","sm")} disabled={viewingIndex <= 0} onClick={() => goEntry(-1)} title="Previous entry (←)">←</button>
                <span style={{ fontSize:11, color:"var(--text-muted)", minWidth:60, textAlign:"center" }}>{viewingIndex + 1} / {sorted.length}</span>
                <button style={btnStyle("ghost","sm")} disabled={viewingIndex >= sorted.length - 1} onClick={() => goEntry(1)} title="Next entry (→)">→</button>
              </div>
              <button style={btnStyle("ghost","sm")} onClick={() => { navigator.clipboard.writeText(JSON.stringify(viewingEntry, null, 2)); toast("Copied to clipboard","info"); }}>Copy JSON</button>
            </div>
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
      
      {(audit||[]).length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[["Critical", SEVERITY_COLOR.Critical, SEVERITY_BG.Critical], ["Warning", SEVERITY_COLOR.Warning, SEVERITY_BG.Warning], ["Info", SEVERITY_COLOR.Info, SEVERITY_BG.Info]].map(([sev, col, bg]) => (
            <div key={sev} onClick={() => { setFilterSeverity(sev === filterSeverity ? "All" : sev); setPage(1); }}
              style={{ padding:"6px 14px", borderRadius:"var(--r-sm)", background: bg, color: col, fontSize:12, fontWeight:600, cursor:"pointer", border: filterSeverity === sev ? `1.5px solid ${col}` : "1.5px solid transparent", userSelect:"none" }}>
              {sev}: {severityCounts[sev]}
            </div>
          ))}
        </div>
      )}

      <CollapsibleSection title="Filters" defaultOpen={true}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
          <select style={{ ...inputStyle, width:"auto" }} value={filterModule}   onChange={e=>{setFilterModule(e.target.value);setPage(1);}}>{modules.map(m=><option key={m}>{m}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterAction}   onChange={e=>{setFilterAction(e.target.value);setPage(1);}}>{actions.map(a=><option key={a}>{a}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterUser}     onChange={e=>{setFilterUser(e.target.value);setPage(1);}}>{users.map(u=><option key={u}>{u}</option>)}</select>
          <select style={{ ...inputStyle, width:"auto" }} value={filterSeverity} onChange={e=>{setFilterSeverity(e.target.value);setPage(1);}}>
            <option value="All">All severity</option>
            <option>Info</option><option>Warning</option><option>Critical</option>
          </select>
          <input style={{ ...inputStyle, width:"auto" }} type="date" value={filterDateFrom} onChange={e=>{setFilterDateFrom(e.target.value);setPage(1);}} />
          <input style={{ ...inputStyle, width:"auto" }} type="date" value={filterDateTo}   onChange={e=>{setFilterDateTo(e.target.value);setPage(1);}} />
          <button style={btnStyle(filterDateFrom===todayStr && filterDateTo===todayStr ? "primary" : "ghost","sm")} onClick={filterDateFrom===todayStr && filterDateTo===todayStr ? ()=>{setFilterDateFrom("");setFilterDateTo("");setPage(1);} : setToday}>Today</button>
          {activeFilterCount > 0 && (
            <button style={btnStyle("ghost","sm")} onClick={resetFilters}>
              Reset{" "}
              <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:16, height:16, borderRadius:"50%", background:"var(--accent)", color:"#fff", fontSize:10, fontWeight:700, marginLeft:4 }}>{activeFilterCount}</span>
            </button>
          )}
        </div>
      </CollapsibleSection>
      
      {filtered.length===0 ? (
        (audit||[]).length > 0
          ? <EmptyState icon="🔍" title="No matching logs" sub={<span>No entries match your filters. <button style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", padding:0, fontSize:"inherit" }} onClick={resetFilters}>Clear filters</button></span>} />
          : <EmptyState icon="📋" title="No audit logs" sub="Actions will appear here." />
      ) : (
        <>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--surface)" }}>
              {[
                { label:"Severity", col:"sev"  },
                { label:"Time",     col:"ts"   },
                { label:"User",     col:"user" },
                { label:"Module",   col:"mod"  },
                { label:"Action",   col:null   },
                { label:"Description", col:null },
                { label:"Changes",  col:null   },
                { label:"",         col:null   },
              ].map(({ label, col }) => (
                <th key={label} onClick={col ? () => toggleSort(col) : undefined}
                  style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap", cursor: col ? "pointer" : "default", userSelect:"none" }}>
                  {label}{col && <SortIcon col={col} />}
                </th>
              ))}
            </tr></thead>
            <tbody>{paginated.map((a,i)=>{
              const sev = a.severity || "Info";
              const userName = a.userName || a.user || "—";
              const isHovered = hoveredRow === a.id;
              return (
                <tr key={a.id}
                  style={{ borderTop:"1px solid var(--border)", background: isHovered ? "var(--accent-dim)" : i%2===0?"transparent":"var(--stripe)", cursor:"pointer", transition:"background 0.1s" }}
                  onClick={() => setViewingEntry(a)}
                  onMouseEnter={() => setHoveredRow(a.id)}
                  onMouseLeave={() => setHoveredRow(null)}>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:"var(--r-pill)", background: SEVERITY_BG[sev], color: SEVERITY_COLOR[sev] }}>{sev}</span>
                  </td>
                  <td style={{ padding:"10px 14px", color:"var(--text-muted)", whiteSpace:"nowrap", fontSize:11 }} title={new Date(a.ts).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}>{relTime(a.ts)}</td>
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
        {totalPages > 1 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>
              Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display:"flex", gap:6 }}>
              <button style={btnStyle("ghost","sm")} disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
              {Array.from({length: Math.min(totalPages, 7)}, (_,i) => {
                const p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i;
                return <button key={p} style={{ ...btnStyle(p===page?"primary":"ghost","sm"), minWidth:32 }} onClick={()=>setPage(p)}>{p}</button>;
              })}
              <button style={btnStyle("ghost","sm")} disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );

}
