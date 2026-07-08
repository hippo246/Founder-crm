import { useState, useMemo } from "react";
import { inputStyle } from "../ui/UI.jsx";
import { runGlobalSearch, getSearchDisplayLabel, getSearchDisplaySub } from "../../lib/search.js";

export default function SearchModal({ onClose, setTab, data }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => runGlobalSearch(q, data), [q, data]);

  const modTabMap = {
    contacts: "contacts", leads: "leads", projects: "projects", tasks: "tasks",
    "follow-ups": "follow-ups", notes: "notes", documents: "documents",
    invoices: "invoices", payments: "payments", proposals: "proposals",
    communications: "communications", calendar: "calendar", support: "support",
    "wa-templates": "wa-templates", prompts: "prompts",
    "project-logs": "project-logs", roadmap: "roadmap",
  };

  const handleClick = (mod) => {
    if (modTabMap[mod] && setTab) setTab(modTabMap[mod]);
    onClose();
  };

  return (
    <div className="search-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="search-modal-box">
        <div className="search-modal-input-row">
          <span style={{ fontSize: 16, opacity: 0.4 }}>🔍</span>
          <input
            autoFocus
            className="search-modal-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search across everything…"
          />
          {q && (
            <button onClick={() => setQ("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
          )}
        </div>

        <div className="search-modal-results">
          {!results && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "28px 0" }}>
              Start typing to search across all modules…
            </div>
          )}

          {results && Object.entries(results).every(([, items]) => items.length === 0) && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: "28px 0" }}>
              No results for "<strong>{q}</strong>"
            </div>
          )}

          {results && Object.entries(results).map(([mod, items]) =>
            items.length > 0 ? (
              <div key={mod} style={{ marginBottom: 14 }}>
                <div className="search-result-group-label">{mod}</div>
                {items.slice(0, 4).map(item => (
                  <div
                    key={item.id || item.name}
                    className="search-result-item"
                    onClick={() => handleClick(mod)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {getSearchDisplayLabel(item)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {getSearchDisplaySub(item)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
