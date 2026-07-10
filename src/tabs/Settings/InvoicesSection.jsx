import React, { useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_TERMS_PRESETS = ["Net 7", "Net 14", "Net 30", "Net 60", "Due on receipt", "Custom"];
const COMMON_TAX_RATES = [0, 5, 10, 15, 18, 20, 25];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function previewInvoiceNumber(prefix, startNum = 1) {
  return `${prefix || "INV"}-${String(startNum).padStart(4, "0")}`;
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────
function FieldRow({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  padding: "7px 10px", fontSize: 13,
  borderRadius: "var(--r-sm)", border: "1px solid var(--border)",
  background: "var(--input-bg)", color: "var(--text)",
  width: "100%", boxSizing: "border-box",
};

const cardStyle = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)", padding: 20,
};

// ─── NumberingCard ────────────────────────────────────────────────────────────
function NumberingCard({ f, setF, setIsDirty }) {
  const set = (key) => (e) => { setF(p => ({ ...p, [key]: e.target.value })); setIsDirty(true); };

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Numbering</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow
          label="Invoice prefix"
          hint={`Preview: ${previewInvoiceNumber(f.invoicePrefix, f.invoiceStartNum || 1)}`}
        >
          <input style={inputStyle} value={f.invoicePrefix || "INV"} onChange={set("invoicePrefix")} />
        </FieldRow>

        <FieldRow
          label="Receipt prefix"
          hint={`Preview: ${previewInvoiceNumber(f.receiptPrefix || "RCPT", f.receiptStartNum || 1)}`}
        >
          <input style={inputStyle} value={f.receiptPrefix || "RCPT"} onChange={set("receiptPrefix")} />
        </FieldRow>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FieldRow label="Invoice start #">
            <input
              type="number" min="1"
              style={inputStyle}
              value={f.invoiceStartNum ?? 1}
              onChange={e => { setF(p => ({ ...p, invoiceStartNum: Number(e.target.value) })); setIsDirty(true); }}
            />
          </FieldRow>
          <FieldRow label="Receipt start #">
            <input
              type="number" min="1"
              style={inputStyle}
              value={f.receiptStartNum ?? 1}
              onChange={e => { setF(p => ({ ...p, receiptStartNum: Number(e.target.value) })); setIsDirty(true); }}
            />
          </FieldRow>
        </div>
      </div>
    </div>
  );
}

// ─── TaxCard ──────────────────────────────────────────────────────────────────
function TaxCard({ f, setF, setIsDirty }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Tax</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow label="Default tax rate (%)">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {COMMON_TAX_RATES.map(rate => (
              <button
                key={rate}
                onClick={() => { setF(p => ({ ...p, invoiceTax: rate })); setIsDirty(true); }}
                style={{
                  padding: "3px 10px", fontSize: 12, borderRadius: "var(--r-sm)", cursor: "pointer",
                  border: `1px solid ${(f.invoiceTax ?? 18) === rate ? "var(--accent)" : "var(--border)"}`,
                  background: (f.invoiceTax ?? 18) === rate ? "var(--accent)" : "var(--input-bg)",
                  color: (f.invoiceTax ?? 18) === rate ? "#fff" : "var(--text)",
                  fontWeight: (f.invoiceTax ?? 18) === rate ? 600 : 400,
                }}
              >
                {rate}%
              </button>
            ))}
          </div>
          <input
            type="number" min="0" max="100"
            style={inputStyle}
            value={f.invoiceTax ?? 18}
            onChange={e => { setF(p => ({ ...p, invoiceTax: Number(e.target.value) })); setIsDirty(true); }}
            placeholder="Custom rate"
          />
        </FieldRow>

        <FieldRow label="Tax label">
          <input
            style={inputStyle}
            value={f.taxLabel || "GST"}
            placeholder="e.g. GST, VAT, HST"
            onChange={e => { setF(p => ({ ...p, taxLabel: e.target.value })); setIsDirty(true); }}
          />
        </FieldRow>

        <FieldRow label="Tax registration number">
          <input
            style={inputStyle}
            value={f.taxNumber || ""}
            placeholder="e.g. GSTIN / VAT number"
            onChange={e => { setF(p => ({ ...p, taxNumber: e.target.value })); setIsDirty(true); }}
          />
        </FieldRow>

        {/* Toggle: show tax on invoice */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={f.showTaxOnInvoice !== false}
            onChange={e => { setF(p => ({ ...p, showTaxOnInvoice: e.target.checked })); setIsDirty(true); }}
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />
          Show tax breakdown on invoices
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={f.taxInclusive || false}
            onChange={e => { setF(p => ({ ...p, taxInclusive: e.target.checked })); setIsDirty(true); }}
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />
          Prices are tax-inclusive by default
        </label>
      </div>
    </div>
  );
}

// ─── PaymentCard ──────────────────────────────────────────────────────────────
function PaymentCard({ f, setF, setIsDirty }) {
  const [customTerms, setCustomTerms] = useState(
    !PAYMENT_TERMS_PRESETS.slice(0, -1).includes(f.paymentTerms || "Net 30")
  );

  const handleTermsPreset = (val) => {
    if (val === "Custom") {
      setCustomTerms(true);
      return;
    }
    setCustomTerms(false);
    setF(p => ({ ...p, paymentTerms: val }));
    setIsDirty(true);
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Payment</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow label="Default payment terms">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {PAYMENT_TERMS_PRESETS.map(preset => {
              const isActive = preset === "Custom"
                ? customTerms
                : (!customTerms && (f.paymentTerms || "Net 30") === preset);
              return (
                <button
                  key={preset}
                  onClick={() => handleTermsPreset(preset)}
                  style={{
                    padding: "3px 10px", fontSize: 12, borderRadius: "var(--r-sm)", cursor: "pointer",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    background: isActive ? "var(--accent)" : "var(--input-bg)",
                    color: isActive ? "#fff" : "var(--text)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          {customTerms && (
            <input
              style={inputStyle}
              value={f.paymentTerms || ""}
              placeholder="e.g. 2/10 Net 30"
              onChange={e => { setF(p => ({ ...p, paymentTerms: e.target.value })); setIsDirty(true); }}
              autoFocus
            />
          )}
        </FieldRow>

        <FieldRow label="Default payment instructions">
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={f.paymentInstructions || ""}
            placeholder="Bank details, payment methods, etc."
            onChange={e => { setF(p => ({ ...p, paymentInstructions: e.target.value })); setIsDirty(true); }}
          />
        </FieldRow>

        <FieldRow label="Late payment fee (%)">
          <input
            type="number" min="0" max="50" step="0.5"
            style={inputStyle}
            value={f.latePaymentFee ?? ""}
            placeholder="e.g. 1.5"
            onChange={e => { setF(p => ({ ...p, latePaymentFee: e.target.value ? Number(e.target.value) : null })); setIsDirty(true); }}
          />
        </FieldRow>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={f.requireDeposit || false}
            onChange={e => { setF(p => ({ ...p, requireDeposit: e.target.checked })); setIsDirty(true); }}
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />
          Require deposit before work starts
        </label>

        {f.requireDeposit && (
          <FieldRow label="Deposit percentage (%)">
            <input
              type="number" min="1" max="100"
              style={inputStyle}
              value={f.depositPercent ?? 50}
              onChange={e => { setF(p => ({ ...p, depositPercent: Number(e.target.value) })); setIsDirty(true); }}
            />
          </FieldRow>
        )}
      </div>
    </div>
  );
}

// ─── AppearanceCard ───────────────────────────────────────────────────────────
function AppearanceCard({ f, setF, setIsDirty }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Appearance & Content</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FieldRow label="Default invoice notes / footer">
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={f.invoiceFooter || "Thank you for your business!"}
            onChange={e => { setF(p => ({ ...p, invoiceFooter: e.target.value })); setIsDirty(true); }}
          />
        </FieldRow>

        <FieldRow label="Default invoice notes (internal)" hint="Shown on invoice but not on receipt">
          <textarea
            style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
            value={f.invoiceNotes || ""}
            placeholder="Optional notes for the client…"
            onChange={e => { setF(p => ({ ...p, invoiceNotes: e.target.value })); setIsDirty(true); }}
          />
        </FieldRow>

        <FieldRow label="Currency">
          <select
            style={inputStyle}
            value={f.currency || "USD"}
            onChange={e => { setF(p => ({ ...p, currency: e.target.value })); setIsDirty(true); }}
          >
            {[
              ["USD", "USD – US Dollar"],
              ["EUR", "EUR – Euro"],
              ["GBP", "GBP – British Pound"],
              ["INR", "INR – Indian Rupee"],
              ["AUD", "AUD – Australian Dollar"],
              ["CAD", "CAD – Canadian Dollar"],
              ["SGD", "SGD – Singapore Dollar"],
              ["AED", "AED – UAE Dirham"],
            ].map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Date format">
          <select
            style={inputStyle}
            value={f.dateFormat || "MM/DD/YYYY"}
            onChange={e => { setF(p => ({ ...p, dateFormat: e.target.value })); setIsDirty(true); }}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="D MMM YYYY">D MMM YYYY (e.g. 1 Jan 2025)</option>
          </select>
        </FieldRow>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={f.showDueDate !== false}
              onChange={e => { setF(p => ({ ...p, showDueDate: e.target.checked })); setIsDirty(true); }}
              style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
            />
            Show due date
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={f.showLogo !== false}
              onChange={e => { setF(p => ({ ...p, showLogo: e.target.checked })); setIsDirty(true); }}
              style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
            />
            Show company logo
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={f.showSignatureLine || false}
              onChange={e => { setF(p => ({ ...p, showSignatureLine: e.target.checked })); setIsDirty(true); }}
              style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
            />
            Signature line
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={f.showItemNumbers || false}
              onChange={e => { setF(p => ({ ...p, showItemNumbers: e.target.checked })); setIsDirty(true); }}
              style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
            />
            Number line items
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── RemindersCard ────────────────────────────────────────────────────────────
function RemindersCard({ f, setF, setIsDirty }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Reminders & Overdue</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={f.sendReminders || false}
            onChange={e => { setF(p => ({ ...p, sendReminders: e.target.checked })); setIsDirty(true); }}
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />
          Send automatic payment reminders
        </label>

        {f.sendReminders && (
          <>
            <FieldRow label="Send reminder (days before due date)">
              <input
                type="number" min="1" max="30"
                style={inputStyle}
                value={f.reminderDaysBefore ?? 3}
                onChange={e => { setF(p => ({ ...p, reminderDaysBefore: Number(e.target.value) })); setIsDirty(true); }}
              />
            </FieldRow>
            <FieldRow label="Send overdue notice (days after due date)">
              <input
                type="number" min="1" max="60"
                style={inputStyle}
                value={f.overdueNoticeDays ?? 7}
                onChange={e => { setF(p => ({ ...p, overdueNoticeDays: Number(e.target.value) })); setIsDirty(true); }}
              />
            </FieldRow>
          </>
        )}

        <FieldRow label="Auto-mark invoices overdue after (days)">
          <input
            type="number" min="1"
            style={inputStyle}
            value={f.autoOverdueDays ?? 30}
            onChange={e => { setF(p => ({ ...p, autoOverdueDays: Number(e.target.value) })); setIsDirty(true); }}
          />
        </FieldRow>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function InvoicesSection({ settings, setSettings, setIsDirty, saveAll }) {
  const f = settings;
  const setF = setSettings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <NumberingCard f={f} setF={setF} setIsDirty={setIsDirty} />
        <TaxCard f={f} setF={setF} setIsDirty={setIsDirty} />
        <PaymentCard f={f} setF={setF} setIsDirty={setIsDirty} />
        <AppearanceCard f={f} setF={setF} setIsDirty={setIsDirty} />
        <RemindersCard f={f} setF={setF} setIsDirty={setIsDirty} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          style={{
            padding: "9px 22px", fontSize: 13, fontWeight: 600,
            background: "var(--accent)", color: "#fff",
            border: "none", borderRadius: "var(--r-md)", cursor: "pointer",
          }}
          onClick={saveAll}
        >
          Save Invoice Settings
        </button>
      </div>
    </div>
  );
}
