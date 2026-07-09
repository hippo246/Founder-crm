import React from "react";

export default function InvoicesSection({ settings, setSettings, setIsDirty, saveAll }) {
  const f = settings;
  const setF = setSettings;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Invoice Settings</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Invoice prefix</label>
            <input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.invoicePrefix || "INV"} onChange={e => { setF(p => ({...p, invoicePrefix: e.target.value})); setIsDirty(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Receipt prefix</label>
            <input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.receiptPrefix || "RCPT"} onChange={e => { setF(p => ({...p, receiptPrefix: e.target.value})); setIsDirty(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default tax rate (%)</label>
            <input type="number" min="0" max="100" style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.invoiceTax ?? 18} onChange={e => { setF(p => ({...p, invoiceTax: Number(e.target.value)})); setIsDirty(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default payment terms</label>
            <input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.paymentTerms || "Net 30"} onChange={e => { setF(p => ({...p, paymentTerms: e.target.value})); setIsDirty(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default payment instructions</label>
            <textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.paymentInstructions || ""} onChange={e => { setF(p => ({...p, paymentInstructions: e.target.value})); setIsDirty(true); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default invoice footer</label>
            <textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.invoiceFooter || "Thank you for your business!"} onChange={e => { setF(p => ({...p, invoiceFooter: e.target.value})); setIsDirty(true); }} />
          </div>
          <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={saveAll}>Save Invoice Settings</button>
        </div>
      </div>
    </div>
  );
}
