import { useState, useMemo, useCallback } from "react";
import { Modal, Confirm, FormField, SearchInput, EmptyState, btnStyle, inputStyle, toast } from "../components/ui/UI.jsx";
import { genId, fmtDate, isOverdue } from "../lib/helpers.js";
import { saveWorkspaceData } from "../lib/storage.js";
import { exportToCSV } from "../lib/exports.js";

const STATUSES = ["Active", "Needs Reset", "Expired", "Archived"];
const STATUS_COLORS = {
  "Active": "#10b981",
  "Needs Reset": "#f59e0b",
  "Expired": "#ef4444",
  "Archived": "#9ca3af",
};

function DemoUnitForm({ initial = {}, onSave, onClose }) {
  const [f, setF] = useState({
    name: "",
    url: "",
    email: "",
    password: "",
    status: "Active",
    assignedClient: "",
    expiryDate: "",
    notes: "",
    plan: "",
    features: "",
    lastAccessed: "",
    createdAt: new Date().toISOString().slice(0, 10),
    ...initial,
  });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Unit Name *">
          <input style={inputStyle} value={f.name} onChange={set("name")} autoFocus placeholder="e.g. Client Demo v2" />
        </FormField>
        <FormField label="Status">
          <select style={inputStyle} value={f.status} onChange={set("status")}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="URL" style={{ gridColumn: "1/-1" }}>
          <input style={inputStyle} value={f.url} onChange={set("url")} placeholder="https://demo.yourapp.com" />
        </FormField>
        <FormField label="Login Email">
          <input style={inputStyle} type="email" value={f.email} onChange={set("email")} placeholder="demo@client.com" />
        </FormField>
        <FormField label="Password">
          <input style={inputStyle} value={f.password} onChange={set("password")} placeholder="demo-password-123" />
        </FormField>
        <FormField label="Assigned Client">
          <input style={inputStyle} value={f.assignedClient} onChange={set("assignedClient")} placeholder="Client name" />
        </FormField>
        <FormField label="Expiry Date">
          <input style={inputStyle} type="date" value={f.expiryDate} onChange={set("expiryDate")} />
        </FormField>
        <FormField label="Plan / Tier">
          <input style={inputStyle} value={f.plan} onChange={set("plan")} placeholder="e.g. Pro, Enterprise" />
        </FormField>
        <FormField label="Key Features" style={{ gridColumn: "1/-1" }}>
          <input style={inputStyle} value={f.features} onChange={set("features")} placeholder="Comma-separated features enabled for this demo" />
        </FormField>
        <FormField label="Notes" style={{ gridColumn: "1/-1" }}>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} placeholder="Access instructions, special setup, etc." />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={() => {
          if (!f.name.trim()) { toast("Unit name is required", "error"); return; }
          onSave(f);
        }}>Save Demo Unit</button>
      </div>
    </div>
  );
}

export default function DemoUnitsTab({ demoUnits = [], setDemoUnits, addAudit, role, workspaceId = "workspace-1" }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [view, setView] = useState("cards");

  const filtered = useMemo(() => {
    let result = demoUnits;
    if (filterStatus !== "All") result = result.filter(u => u.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.assignedClient?.toLowerCase().includes(q) ||
        u.url?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.plan?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [demoUnits, search, filterStatus]);

  const save = useCallback((data) => {
    if (editing) {
      const updated = demoUnits.map(u => u.id === editing.id ? { ...data, id: editing.id } : u);
      setDemoUnits(updated);
      saveWorkspaceData("demoUnits", updated, workspaceId);
      addAudit("Demo Units", "Update", `Updated: ${data.name}`);
      toast("Demo unit updated");
    } else {
      const newUnit = { ...data, id: genId(), createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [newUnit, ...demoUnits];
      setDemoUnits(updated);
      saveWorkspaceData("demoUnits", updated, workspaceId);
      addAudit("Demo Units", "Create", `Created: ${data.name}`);
      toast("Demo unit created");
    }
    setShowForm(false);
    setEditing(null);
  }, [editing, demoUnits, workspaceId, addAudit]);

  const del = useCallback((id) => {
    const unit = demoUnits.find(u => u.id === id);
    const updated = demoUnits.filter(u => u.id !== id);
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Delete", `Deleted: ${unit?.name}`);
    toast("Demo unit deleted", "info");
    setConfirm(null);
  }, [demoUnits, workspaceId, addAudit]);

  const markStatus = useCallback((id, status) => {
    const updated = demoUnits.map(u => u.id === id ? { ...u, status, lastAccessed: status === "Active" ? new Date().toISOString().slice(0, 10) : u.lastAccessed } : u);
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Status", `Marked ${status}: ${demoUnits.find(u => u.id === id)?.name}`);
    toast(`Marked as ${status}`);
  }, [demoUnits, workspaceId, addAudit]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    toast(`${label} copied!`);
  };

  const stats = useMemo(() => ({
    active: demoUnits.filter(u => u.status === "Active").length,
    needsReset: demoUnits.filter(u => u.status === "Needs Reset").length,
    expired: demoUnits.filter(u => u.status === "Expired").length,
    expiringSoon: demoUnits.filter(u => u.expiryDate && !isOverdue(u.expiryDate) && new Date(u.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && u.status === "Active").length,
  }), [demoUnits]);

  const renderCard = (unit) => {
    const expired = unit.status === "Expired" || (unit.expiryDate && isOverdue(unit.expiryDate));
    const expiringSoon = unit.expiryDate && !isOverdue(unit.expiryDate) &&
      new Date(unit.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const statusColor = STATUS_COLORS[unit.status] || "var(--accent)";

    return (
      <div key={unit.id} style={{
        background: "var(--surface)",
        border: `1px solid ${expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--border)"}`,
        borderLeft: `4px solid ${statusColor}`,
        borderRadius: "var(--r-lg)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.10)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.2px" }}>
              🖥️ {unit.name}
            </div>
            {unit.assignedClient && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                👤 {unit.assignedClient}
                {unit.plan && <span style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{unit.plan}</span>}
              </div>
            )}
          </div>
          <span style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 12, fontWeight: 700,
            background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40`,
            flexShrink: 0
          }}>{unit.status}</span>
        </div>

        {/* URL */}
        {unit.url && (
          <a href={unit.url} target="_blank" rel="noreferrer" style={{
            fontSize: 12, color: "var(--accent)", textDecoration: "none",
            background: "var(--accent-dim)", padding: "6px 10px", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--accent-border)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            🔗 {unit.url}
          </a>
        )}

        {/* Credentials */}
        <div style={{ background: "var(--surface-raised)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 8 }}>Credentials</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unit.email && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>📧 {unit.email}</span>
                <button style={{ ...btnStyle("ghost", "sm"), flexShrink: 0, fontSize: 10, padding: "2px 8px" }}
                  onClick={() => copyToClipboard(unit.email, "Email")}>Copy</button>
              </div>
            )}
            {unit.password && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                  🔑 {showPassword[unit.id] ? unit.password : "••••••••••"}
                </span>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button style={{ ...btnStyle("ghost", "sm"), fontSize: 10, padding: "2px 8px" }}
                    onClick={() => setShowPassword(p => ({ ...p, [unit.id]: !p[unit.id] }))}>
                    {showPassword[unit.id] ? "Hide" : "Show"}
                  </button>
                  <button style={{ ...btnStyle("ghost", "sm"), fontSize: 10, padding: "2px 8px" }}
                    onClick={() => copyToClipboard(unit.password, "Password")}>Copy</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dates & Info */}
        {(unit.expiryDate || unit.features) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {unit.expiryDate && (
              <div style={{ fontSize: 12, color: expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                📅 Expires: <strong>{unit.expiryDate}</strong>
                {expired && " 🔴 EXPIRED"}
                {expiringSoon && !expired && " ⚠️ Soon"}
              </div>
            )}
            {unit.features && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                ✨ {unit.features}
              </div>
            )}
          </div>
        )}

        {unit.notes && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, padding: "8px 10px", background: "var(--background)", borderRadius: 6, borderLeft: "2px solid var(--border)" }}>
            {unit.notes}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 8, borderTop: "1px dashed var(--border)", marginTop: "auto" }}>
          {unit.url && (
            <a href={unit.url} target="_blank" rel="noreferrer"
              style={{ ...btnStyle("primary"), fontSize: 12, textDecoration: "none", padding: "5px 14px" }}>
              🚀 Open
            </a>
          )}
          {unit.status !== "Active" && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--success)" }} onClick={() => markStatus(unit.id, "Active")}>✓ Activate</button>
          )}
          {unit.status !== "Needs Reset" && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--warning)" }} onClick={() => markStatus(unit.id, "Needs Reset")}>↺ Needs Reset</button>
          )}
          <button style={btnStyle("ghost", "sm")} onClick={() => { setEditing(unit); setShowForm(true); }}>Edit</button>
          {(role === "Owner" || role === "Admin") && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={() => setConfirm(unit.id)}>Delete</button>
          )}
        </div>
      </div>
    );
  };

  const renderRow = (unit) => {
    const expired = unit.status === "Expired" || (unit.expiryDate && isOverdue(unit.expiryDate));
    const statusColor = STATUS_COLORS[unit.status] || "var(--accent)";
    return (
      <tr key={unit.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-raised)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{unit.name}</td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: `${statusColor}20`, color: statusColor, fontWeight: 700 }}>{unit.status}</span>
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>{unit.assignedClient || "—"}</td>
        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>{unit.email || "—"}</td>
        <td style={{ padding: "10px 12px", fontSize: 12, color: expired ? "var(--danger)" : "var(--text-muted)" }}>{unit.expiryDate || "—"}</td>
        <td style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {unit.url && <a href={unit.url} target="_blank" rel="noreferrer" style={{ ...btnStyle("ghost", "sm"), fontSize: 11, textDecoration: "none" }}>Open</a>}
            <button style={btnStyle("ghost", "sm")} onClick={() => { setEditing(unit); setShowForm(true); }}>Edit</button>
            {(role === "Owner" || role === "Admin") && (
              <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={() => setConfirm(unit.id)}>Del</button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {confirm && (
        <Confirm
          title="Delete Demo Unit"
          message={`Delete "${demoUnits.find(u => u.id === confirm)?.name}"? This cannot be undone.`}
          onConfirm={() => del(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showForm && (
        <Modal title={editing ? "Edit Demo Unit" : "Add Demo Unit"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}>
          <DemoUnitForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.4px" }}>Demo Units</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            {demoUnits.length} units · <span style={{ color: "var(--success)" }}>{stats.active} active</span>
            {stats.needsReset > 0 && <span style={{ color: "var(--warning)" }}> · {stats.needsReset} needs reset</span>}
            {stats.expired > 0 && <span style={{ color: "var(--danger)" }}> · {stats.expired} expired</span>}
            {stats.expiringSoon > 0 && <span style={{ color: "var(--warning)" }}> · {stats.expiringSoon} expiring soon</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}>
            <button style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: view === "cards" ? "var(--primary,#6366f1)" : "transparent", color: view === "cards" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("cards")}>⊞ Cards</button>
            <button style={{ padding: "5px 14px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: view === "table" ? "var(--primary,#6366f1)" : "transparent", color: view === "table" ? "#fff" : "var(--text-muted)" }}
              onClick={() => setView("table")}>≡ Table</button>
          </div>
          <button style={btnStyle("ghost", "sm")} onClick={() => exportToCSV(demoUnits, "demo-units")}>↓ Export</button>
          <button style={btnStyle("primary")} onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Demo Unit</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Active", value: stats.active, color: "var(--success)" },
          { label: "Needs Reset", value: stats.needsReset, color: "var(--warning)" },
          { label: "Expired", value: stats.expired, color: "var(--danger)" },
          { label: "Expiring Soon", value: stats.expiringSoon, color: "var(--warning)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{s.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <SearchInput placeholder="Search demo units..." value={search} onChange={setSearch} />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${filterStatus === s ? "var(--accent)" : "var(--border)"}`,
              background: filterStatus === s ? "var(--accent)" : "transparent", color: filterStatus === s ? "#fff" : "var(--text-muted)",
              fontWeight: filterStatus === s ? 600 : 400, transition: "all 0.1s"
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🖥️"
          title={search || filterStatus !== "All" ? "No matches found" : "No demo units yet"}
          sub={search || filterStatus !== "All" ? "Try adjusting your filters" : "Add your first demo unit to get started"}
          action={
            <button style={btnStyle("primary")} onClick={() => { setEditing(null); setShowForm(true); }}>
              + Add Demo Unit
            </button>
          }
        />
      ) : view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--surface-raised)" }}>
                {["Name", "Status", "Client", "Email", "Expires", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
