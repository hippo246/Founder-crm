import React from "react";

export default function DashboardSection({ settings, setSettings, setIsDirty, saveAll }) {
  const f = settings;
  const setF = setSettings;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      {[
        ["Dashboard density", "dashboardDensity", ["Compact", "Comfortable", "Spacious"]],
        ["Revenue currency display", "currency", ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"]],
        ["Default date format", "dateFormat", ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]],
      ].map(([label, key, opts]) => (
        <div key={key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 16 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</label>
          <select style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%" }}
            value={f[key] || opts[0]} onChange={e => { setF(p => ({...p, [key]: e.target.value})); setIsDirty(true); }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <div style={{ gridColumn: "1 / -1" }}>
        <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={saveAll}>Save Settings</button>
      </div>
    </div>
  );
}
