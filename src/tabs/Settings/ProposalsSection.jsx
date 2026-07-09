import React from "react";

export default function ProposalsSection({ settings, setSettings, setIsDirty, saveAll }) {
  const f = settings;
  const setF = setSettings;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Proposal Settings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Proposal prefix</label>
          <input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", maxWidth: 300, boxSizing: "border-box" }} value={f.proposalPrefix || "PROP"} onChange={e => { setF(p => ({...p, proposalPrefix: e.target.value})); setIsDirty(true); }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default validity days</label>
          <input type="number" min="1" style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", maxWidth: 120, boxSizing: "border-box" }} value={f.proposalValidityDays || 30} onChange={e => { setF(p => ({...p, proposalValidityDays: Number(e.target.value)})); setIsDirty(true); }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default terms</label>
          <textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical" }} value={f.proposalTerms || ""} onChange={e => { setF(p => ({...p, proposalTerms: e.target.value})); setIsDirty(true); }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default footer</label>
          <textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.proposalFooter || "Thank you for considering our services."} onChange={e => { setF(p => ({...p, proposalFooter: e.target.value})); setIsDirty(true); }} />
        </div>
        <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer", width: "fit-content" }} onClick={saveAll}>Save Proposal Settings</button>
      </div>
    </div>
  );
}
