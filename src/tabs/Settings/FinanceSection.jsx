import { useState, useRef } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD"];

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ", CAD: "CA$", AUD: "A$", SGD: "S$" };
const CURRENCY_FLAGS = { INR: "🇮🇳", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", AED: "🇦🇪", CAD: "🇨🇦", AUD: "🇦🇺", SGD: "🇸🇬" };

const TAX_PRESETS = [0, 5, 12, 18, 28];
const TERMS_PRESETS = ["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SEPARATOR_OPTS = ["-", "/", "_", "."];
const PADDING_OPTS = [3, 4, 5, 6];

const DEFAULT_RATES = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044, CAD: 0.016, AUD: 0.018, SGD: 0.016 };

const DEFAULT_TAX_LINES = [{ id: 1, name: "Tax", rate: 18 }];

const UPI_SNIPPET = "Pay via UPI: yourname@upi\nUPI ID: yourname@bank";
const BANK_SNIPPET = "Bank Transfer:\nAccount Name: Your Business\nAccount No: 000000000000\nIFSC: BANK0000000";
const CHEQUE_SNIPPET = "Cheque payable to: Your Business Name\nMail to: Your Address";

const fmt = (sym, n) => `${sym}${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const chipStyle = (active) => ({
  padding: "3px 10px", fontSize: 11, borderRadius: 99, cursor: "pointer", border: "1px solid",
  borderColor: active ? "var(--accent)" : "var(--border)",
  background: active ? "var(--primary-dim)" : "var(--surface)",
  color: active ? "var(--accent)" : "var(--text-muted)",
  fontWeight: active ? 600 : 400,
});

export default function FinanceSection({ settings, setSettings, saveAll }) {
  const [billingDirty, setBillingDirty] = useState(false);
  const [ratesDirty, setRatesDirty] = useState(false);
  const prevCurrency = useRef(settings.currency || "INR");

  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
    setBillingDirty(true);
  };

  const setDirect = (key, val) => {
    setSettings(p => ({ ...p, [key]: val }));
    setBillingDirty(true);
  };

  // Multi-tax lines
  const [taxLines, setTaxLines] = useState(() => settings.taxLines || DEFAULT_TAX_LINES);
  const updateTaxLine = (id, field, val) => {
    const updated = taxLines.map(t => t.id === id ? { ...t, [field]: field === "rate" ? parseFloat(val) || 0 : val } : t);
    setTaxLines(updated);
    setSettings(p => ({ ...p, taxLines: updated }));
    setBillingDirty(true);
  };
  const addTaxLine = () => {
    const updated = [...taxLines, { id: Date.now(), name: "Tax", rate: 0 }];
    setTaxLines(updated);
    setSettings(p => ({ ...p, taxLines: updated }));
    setBillingDirty(true);
  };
  const removeTaxLine = (id) => {
    if (taxLines.length <= 1) return;
    const updated = taxLines.filter(t => t.id !== id);
    setTaxLines(updated);
    setSettings(p => ({ ...p, taxLines: updated }));
    setBillingDirty(true);
  };
  const totalTaxRate = taxLines.reduce((sum, t) => sum + (t.rate || 0), 0);

  const [rates, setRates] = useState(() => settings.exchangeRates || DEFAULT_RATES);
  const [currencyWarning, setCurrencyWarning] = useState(false);
  const [ratesUpdatedAt] = useState(() => settings.exchangeRatesUpdatedAt || null);
  const [copiedRate, setCopiedRate] = useState(null);
  const [rateFilter, setRateFilter] = useState("");
  const [bulkAdjust, setBulkAdjust] = useState("");
  const [exportCopied, setExportCopied] = useState(false);

  const copyRate = (currency, rate) => {
    navigator.clipboard.writeText(String(rate)).catch(() => {});
    setCopiedRate(currency);
    setTimeout(() => setCopiedRate(null), 1500);
  };

  const applyBulkAdjust = () => {
    const pct = parseFloat(bulkAdjust);
    if (isNaN(pct)) { toast("Enter a valid percentage", "error"); return; }
    const multiplier = 1 + pct / 100;
    const updated = {};
    for (const [c, r] of Object.entries(rates)) {
      updated[c] = c === baseCurrency ? r : parseFloat((r * multiplier).toFixed(6));
    }
    setRates(updated);
    setSettings(p => ({ ...p, exchangeRates: updated }));
    setRatesDirty(true);
    setBulkAdjust("");
    toast(`All rates adjusted ${pct > 0 ? "+" : ""}${pct}%`);
  };

  const exportConfig = () => {
    const config = {
      currency: settings.currency, fiscalYearStart: settings.fiscalYearStart,
      taxLines, invoiceTax: settings.invoiceTax, compoundTax: settings.compoundTax,
      taxInclusive: settings.taxInclusive, roundOffTotals: settings.roundOffTotals,
      lateFeePercent: settings.lateFeePercent, lateFeeGraceDays: settings.lateFeeGraceDays,
      paymentTerms: settings.paymentTerms, paymentInstructions: settings.paymentInstructions,
      invoicePrefix: settings.invoicePrefix, receiptPrefix: settings.receiptPrefix,
      proposalPrefix: settings.proposalPrefix, prefixSeparator: settings.prefixSeparator,
      numberPadding: settings.numberPadding, nextInvoiceNumber: settings.nextInvoiceNumber,
      defaultDiscount: settings.defaultDiscount, discountType: settings.discountType,
      discountLabel: settings.discountLabel, exchangeRates: rates,
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2)).catch(() => {});
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
    toast("Finance config copied to clipboard");
  };

  const updateRate = (currency, value) => {
    const updated = { ...rates, [currency]: parseFloat(value) || 0 };
    setRates(updated);
    setSettings(p => ({ ...p, exchangeRates: updated }));
    setRatesDirty(true);
  };

  const handleCurrencyChange = (e) => {
    if (e.target.value !== prevCurrency.current) setCurrencyWarning(true);
    else setCurrencyWarning(false);
    set("currency")(e);
  };

  const resetRates = () => {
    setRates(DEFAULT_RATES);
    setSettings(p => ({ ...p, exchangeRates: DEFAULT_RATES }));
    setRatesDirty(true);
    toast("Rates reset to defaults");
  };

  const saveRates = () => {
    const now = new Date().toISOString();
    setSettings(p => ({ ...p, exchangeRatesUpdatedAt: now }));
    saveAll();
    setRatesDirty(false);
    toast("Exchange rates saved");
  };

  const appendPaymentSnippet = (snippet) => {
    const current = settings.paymentInstructions || "";
    setDirect("paymentInstructions", current ? `${current}\n\n${snippet}` : snippet);
  };

  const baseCurrency = settings.currency || "INR";
  const sym = CURRENCY_SYMBOLS[baseCurrency] || baseCurrency;
  const invoicePrefix = settings.invoicePrefix || "INV";
  const receiptPrefix = settings.receiptPrefix || "RCPT";
  const proposalPrefix = settings.proposalPrefix || "PROP";
  const separator = settings.prefixSeparator || "-";
  const padding = settings.numberPadding || 4;
  const nextNum = String(settings.nextInvoiceNumber || 1).padStart(padding, "0");
  const fiscalStart = settings.fiscalYearStart || "April";

  const ratesAgeDays = ratesUpdatedAt
    ? Math.floor((Date.now() - new Date(ratesUpdatedAt).getTime()) / 86400000)
    : null;

  // Due date preview from payment terms
  const getDueDate = () => {
    const terms = settings.paymentTerms || "Net 30";
    if (terms === "Due on receipt") return "today";
    const match = terms.match(/Net\s+(\d+)/i);
    if (match) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(match[1]));
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
    return null;
  };
  const dueDate = getDueDate();

  // Tax preview on a sample amount
  const SAMPLE = 10000;
  const taxPreview = (() => {
    if (settings.taxInclusive) {
      const base = SAMPLE / (1 + totalTaxRate / 100);
      return { base: base.toFixed(2), tax: (SAMPLE - base).toFixed(2), total: SAMPLE.toFixed(2) };
    }
    const tax = SAMPLE * totalTaxRate / 100;
    return { base: SAMPLE.toFixed(2), tax: tax.toFixed(2), total: (SAMPLE + tax).toFixed(2) };
  })();

  const filteredCurrencies = CURRENCIES.filter(c => c !== baseCurrency && c.toLowerCase().includes(rateFilter.toLowerCase()));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          Base Currency & Billing
          {billingDirty && <span style={{ fontSize: 10, padding: "1px 7px", background: "var(--warning, #f59e0b)22", color: "var(--warning, #f59e0b)", border: "1px solid var(--warning, #f59e0b)55", borderRadius: 99, fontWeight: 500 }}>Unsaved</span>}
        </div>

        <FormField label="Base currency">
          <select style={inputStyle} value={baseCurrency} onChange={handleCurrencyChange}>
            {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_FLAGS[c]} {c} — {CURRENCY_SYMBOLS[c]}</option>)}
          </select>
        </FormField>
        <FormField label="Fiscal year starts">
          <select style={inputStyle} value={fiscalStart} onChange={e => setDirect("fiscalYearStart", e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </FormField>
        {currencyWarning && (
          <div style={{ fontSize: 11, color: "var(--warning, #f59e0b)", background: "var(--warning, #f59e0b)11", border: "1px solid var(--warning, #f59e0b)44", borderRadius: "var(--r-sm)", padding: "6px 10px", marginBottom: 12 }}>
            ⚠️ Changing base currency means your exchange rates below will need updating.
          </div>
        )}

        <FormField label="Tax lines">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {taxLines.map((t, i) => (
              <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ ...inputStyle, flex: 2 }} value={t.name} onChange={e => updateTaxLine(t.id, "name", e.target.value)} placeholder="e.g. CGST" />
                <input style={{ ...inputStyle, flex: 1 }} type="number" min="0" max="100" step="0.5" value={t.rate} onChange={e => updateTaxLine(t.id, "rate", e.target.value)} placeholder="%" />
                <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 30 }}>{t.rate}%</span>
                {taxLines.length > 1 && (
                  <button style={{ ...chipStyle(false), padding: "2px 8px", color: "var(--danger)" }} onClick={() => removeTaxLine(t.id)}>✕</button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button style={{ ...chipStyle(false), fontSize: 10 }} onClick={addTaxLine}>+ Add tax line</button>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total: <strong>{totalTaxRate}%</strong></span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TAX_PRESETS.map(t => (
                <button key={t} style={chipStyle(taxLines.length === 1 && Number(taxLines[0]?.rate) === t)}
                  onClick={() => { const updated = [{ ...taxLines[0], rate: t }]; setTaxLines(updated); setSettings(p => ({ ...p, taxLines: updated })); setBillingDirty(true); }}>
                  {t}%{t === 18 || t === 28 || t === 5 ? " · GST" : ""}
                </button>
              ))}
              <button style={chipStyle(taxLines.length === 2 && taxLines[0]?.rate === 9 && taxLines[1]?.rate === 9)}
                onClick={() => { const updated = [{ id: 1, name: "CGST", rate: 9 }, { id: 2, name: "SGST", rate: 9 }]; setTaxLines(updated); setSettings(p => ({ ...p, taxLines: updated })); setBillingDirty(true); }}>
                CGST+SGST 18%
              </button>
            </div>
            {/* Tax preview */}
            {totalTaxRate > 0 && (
              <div style={{ fontSize: 11, background: "var(--surface-raised)", borderRadius: "var(--r-sm)", padding: "8px 10px", lineHeight: 1.7, marginTop: 2 }}>
                <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: 2, fontSize: 10 }}>PREVIEW ON {sym}10,000</div>
                <div style={{ color: "var(--text-muted)" }}>Base: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>{fmt(sym, taxPreview.base)}</span></div>
                <div style={{ color: "var(--text-muted)" }}>Tax ({totalTaxRate}%{settings.taxInclusive ? ", inclusive" : ""}): <span style={{ color: "var(--text)", fontFamily: "monospace" }}>{fmt(sym, taxPreview.tax)}</span></div>
                <div style={{ color: "var(--text)", fontWeight: 600 }}>Total: <span style={{ fontFamily: "monospace" }}>{fmt(sym, taxPreview.total)}</span></div>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!settings.taxInclusive} onChange={set("taxInclusive")} />
                Prices are tax-inclusive
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!settings.compoundTax} onChange={set("compoundTax")} />
                Compound tax
              </label>
            </div>
          </div>
        </FormField>

        <FormField label="Default discount">
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, flex: 2 }} placeholder="Label (e.g. Early bird)" value={settings.discountLabel || ""} onChange={set("discountLabel")} />
            <input style={{ ...inputStyle, flex: 1 }} type="number" min="0" step="0.5" placeholder="Amount" value={settings.defaultDiscount || ""} onChange={set("defaultDiscount")} />
            <select style={{ ...inputStyle, flex: 1 }} value={settings.discountType || "%"} onChange={set("discountType")}>
              <option value="%">%</option>
              <option value="flat">{sym} flat</option>
            </select>
          </div>
          {settings.defaultDiscount > 0 && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
              On {fmt(sym, 10000)}: discount = {settings.discountType === "flat"
                ? fmt(sym, settings.defaultDiscount)
                : fmt(sym, 10000 * settings.defaultDiscount / 100)}
              {settings.discountLabel ? ` (${settings.discountLabel})` : ""}
            </div>
          )}
        </FormField>

        <FormField label="Late fee">
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Fee (%)</div>
              <input style={inputStyle} type="number" min="0" step="0.5" value={settings.lateFeePercent ?? ""} onChange={set("lateFeePercent")} placeholder="e.g. 1.5" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Grace period (days)</div>
              <input style={inputStyle} type="number" min="0" value={settings.lateFeeGraceDays ?? ""} onChange={set("lateFeeGraceDays")} placeholder="e.g. 7" />
            </div>
          </div>
          {settings.lateFeePercent > 0 && (
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
              {settings.lateFeePercent}% applied after {settings.lateFeeGraceDays || 0} day grace period
            </div>
          )}
        </FormField>

        <FormField label="Default payment terms">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...inputStyle, flex: 1 }} value={settings.paymentTerms || "Net 30"} onChange={set("paymentTerms")} />
              {dueDate && <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Due: {dueDate}</span>}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TERMS_PRESETS.map(t => (
                <button key={t} style={chipStyle((settings.paymentTerms || "Net 30") === t)} onClick={() => setDirect("paymentTerms", t)}>{t}</button>
              ))}
            </div>
          </div>
        </FormField>

        <FormField label="Default payment instructions">
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.paymentInstructions || ""} onChange={set("paymentInstructions")} placeholder="e.g. Pay via UPI: example@upi or bank transfer to Acc# 1234" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[["UPI", UPI_SNIPPET], ["Bank", BANK_SNIPPET], ["Cheque", CHEQUE_SNIPPET]].map(([label, snippet]) => (
                <button key={label} style={{ ...chipStyle(false), fontSize: 10 }} onClick={() => appendPaymentSnippet(snippet)}>+ {label}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{(settings.paymentInstructions || "").length} chars</div>
          </div>
        </FormField>

        <FormField label="Document numbering">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Starting number</div>
                <input style={inputStyle} type="number" min="1" value={settings.nextInvoiceNumber || 1} onChange={set("nextInvoiceNumber")} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Separator</div>
                <select style={{ ...inputStyle, width: 60 }} value={separator} onChange={e => setDirect("prefixSeparator", e.target.value)}>
                  {SEPARATOR_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Digits</div>
                <select style={{ ...inputStyle, width: 60 }} value={padding} onChange={e => setDirect("numberPadding", Number(e.target.value))}>
                  {PADDING_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[["Invoice", invoicePrefix, "invoicePrefix"], ["Receipt", receiptPrefix, "receiptPrefix"], ["Proposal", proposalPrefix, "proposalPrefix"]].map(([label, val, key]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>{label}</div>
                  <input style={inputStyle} value={val} onChange={set(key)} placeholder={val} />
                  <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 3, fontFamily: "monospace" }}>{val}{separator}{nextNum}</div>
                </div>
              ))}
            </div>
          </div>
        </FormField>

        <FormField label="Invoice footer">
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.invoiceFooter || "Thank you for your business!"} onChange={set("invoiceFooter")} />
          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", marginTop: 2 }}>{(settings.invoiceFooter || "").length} chars</div>
        </FormField>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", cursor: "pointer", marginBottom: 12 }}>
          <input type="checkbox" checked={!!settings.roundOffTotals} onChange={set("roundOffTotals")} />
          Round invoice totals to nearest whole {sym}
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} onClick={exportConfig}>
            {exportCopied ? "✓ Copied!" : "Export config"}
          </button>
          <button style={{ ...btnStyle("primary"), flex: 1, opacity: billingDirty ? 1 : 0.5, cursor: billingDirty ? "pointer" : "default" }}
            onClick={() => { saveAll(); setBillingDirty(false); prevCurrency.current = baseCurrency; setCurrencyWarning(false); toast("Settings saved"); }}
            disabled={!billingDirty}
          >Save changes</button>
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          Exchange Rates
          {ratesDirty && <span style={{ fontSize: 10, padding: "1px 7px", background: "var(--warning, #f59e0b)22", color: "var(--warning, #f59e0b)", border: "1px solid var(--warning, #f59e0b)55", borderRadius: 99, fontWeight: 500 }}>Unsaved</span>}
        </div>

        {ratesAgeDays !== null && ratesAgeDays > 7 && (
          <div style={{ fontSize: 11, color: "var(--warning, #f59e0b)", background: "var(--warning, #f59e0b)11", border: "1px solid var(--warning, #f59e0b)44", borderRadius: "var(--r-sm)", padding: "6px 10px", marginBottom: 10 }}>
            ⚠️ Rates last updated {ratesAgeDays} days ago — consider refreshing them.
          </div>
        )}
        {ratesAgeDays !== null && ratesAgeDays <= 7 && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 10 }}>
            Last updated {ratesAgeDays === 0 ? "today" : `${ratesAgeDays}d ago`}
          </div>
        )}

        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, padding: "8px 10px", background: "var(--surface-raised)", borderRadius: "var(--r-sm)", borderLeft: "3px solid var(--info, #3b82f6)" }}>
          Enter how many foreign units equal 1 {baseCurrency}. Used for invoice conversions and reports.
        </div>

        {/* Bulk adjust */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Adjust all by</span>
          <input style={{ ...inputStyle, flex: 1 }} type="number" step="0.1" value={bulkAdjust}
            onChange={e => setBulkAdjust(e.target.value)} placeholder="e.g. +2.5 or -1" />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>%</span>
          <button style={{ ...chipStyle(false), whiteSpace: "nowrap" }} onClick={applyBulkAdjust}>Apply</button>
        </div>

        {/* Search filter */}
        <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Filter currencies…" value={rateFilter} onChange={e => setRateFilter(e.target.value)} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredCurrencies.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 12 }}>No currencies match "{rateFilter}"</div>
          )}
          {filteredCurrencies.map(c => {
            const rate = rates[c] ?? 0;
            const inverse = rate > 0 ? (1 / rate).toFixed(4) : "—";
            const copied = copiedRate === c;
            return (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{CURRENCY_FLAGS[c]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>1 {baseCurrency} = ? {c}</div>
                  <input style={inputStyle} type="number" step="0.0001" min="0"
                    value={rate} onChange={e => updateRate(c, e.target.value)} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", minWidth: 84, flexShrink: 0, lineHeight: 1.5 }}>
                  <div>{CURRENCY_SYMBOLS[c]}{rate} / {sym}1</div>
                  <div style={{ opacity: 0.7 }}>= {sym}{inverse} / {CURRENCY_SYMBOLS[c]}1</div>
                </div>
                <button title="Copy rate" style={{ ...chipStyle(copied), padding: "4px 8px", flexShrink: 0 }}
                  onClick={() => copyRate(c, rate)}>{copied ? "✓" : "⧉"}</button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} onClick={resetRates}>Reset to defaults</button>
          <button style={{ ...btnStyle("primary"), opacity: ratesDirty ? 1 : 0.5, cursor: ratesDirty ? "pointer" : "default", flex: 1 }}
            disabled={!ratesDirty} onClick={saveRates}>Save rates</button>
        </div>
      </SectionCard>
    </div>
  );
}
