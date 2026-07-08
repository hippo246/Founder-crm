import { useState } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"];

export default function FinanceSection({ settings, setSettings, saveAll }) {
  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
  };

  const [rates, setRates] = useState(() => settings.exchangeRates || {
    INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044, CAD: 0.016, AUD: 0.018, SGD: 0.016,
  });

  const updateRate = (currency, value) => {
    const updated = { ...rates, [currency]: parseFloat(value) || 0 };
    setRates(updated);
    setSettings(p => ({ ...p, exchangeRates: updated }));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Base Currency & Billing</div>
        <FormField label="Base currency">
          <select style={inputStyle} value={settings.currency || "INR"} onChange={set("currency")}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Default invoice tax (%)">
          <input style={inputStyle} type="number" min="0" max="100" value={settings.invoiceTax ?? 18} onChange={set("invoiceTax")} />
        </FormField>
        <FormField label="Default payment terms">
          <input style={inputStyle} value={settings.paymentTerms || "Net 30"} onChange={set("paymentTerms")} />
        </FormField>
        <FormField label="Default payment instructions">
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.paymentInstructions || ""} onChange={set("paymentInstructions")} />
        </FormField>
        <FormField label="Invoice prefix">
          <input style={inputStyle} value={settings.invoicePrefix || "INV"} onChange={set("invoicePrefix")} />
        </FormField>
        <FormField label="Receipt prefix">
          <input style={inputStyle} value={settings.receiptPrefix || "RCPT"} onChange={set("receiptPrefix")} />
        </FormField>
        <FormField label="Proposal prefix">
          <input style={inputStyle} value={settings.proposalPrefix || "PROP"} onChange={set("proposalPrefix")} />
        </FormField>
        <FormField label="Invoice footer">
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.invoiceFooter || "Thank you for your business!"} onChange={set("invoiceFooter")} />
        </FormField>
        <button style={btnStyle("primary")} onClick={saveAll}>Save</button>
      </SectionCard>

      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 6 }}>Exchange Rates (vs {settings.currency || "INR"})</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14, padding: "8px 12px", background: "var(--surface-raised)", borderRadius: "var(--r-sm)", borderLeft: "3px solid var(--info)" }}>
          ℹ️ Manual exchange rates — enter 1 {settings.currency || "INR"} = X foreign currency. These apply to invoice currency conversions and reports.
        </div>
        {CURRENCIES.filter(c => c !== (settings.currency || "INR")).map(c => (
          <FormField key={c} label={`1 ${settings.currency || "INR"} = ? ${c}`}>
            <input style={inputStyle} type="number" step="0.0001" min="0"
              value={rates[c] ?? ""} onChange={e => updateRate(c, e.target.value)} />
          </FormField>
        ))}
        <button style={btnStyle("primary")} onClick={() => { saveAll(); toast("Exchange rates saved"); }}>Save Rates</button>
      </SectionCard>
    </div>
  );
}
