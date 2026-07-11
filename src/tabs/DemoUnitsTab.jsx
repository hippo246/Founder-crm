import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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

const PLAN_PRESETS = ["Starter", "Pro", "Business", "Enterprise", "Custom"];

const CSV_HEADERS = ["name", "url", "email", "password", "status", "assignedClient", "expiryDate", "plan", "features", "notes"];

const CSV_TEMPLATES = {
  "Blank Template": [CSV_HEADERS.join(","), ""].join("\n"),
  "Sample — 3 Demo Units": [
    CSV_HEADERS.join(","),
    'Acme Corp Demo,https://demo.acme.com,demo@acme.com,acme-demo-2024,Active,Acme Corp,2025-12-31,Enterprise,"SSO,Analytics,Reports",Sandbox environment',
    'Beta Client Trial,https://beta.example.com,trial@beta.com,beta-pass-99,Needs Reset,Beta Ltd,,Pro,"Dashboard,API","Reset password before next call"',
    'Internal Sandbox,,internal@company.com,int-sandbox-42,Active,Internal,,Starter,,"Dev environment — do not share"',
  ].join("\n"),
  "Sample — SaaS Demos": [
    CSV_HEADERS.join(","),
    'Enterprise Demo A,https://enterprise-a.demo.com,admin@demo-a.com,ent-demo-a1,Active,TechCorp Global,2025-06-30,Enterprise,"SSO,SAML,Audit Logs,Custom Branding",Full enterprise setup',
    'Mid-Market Demo,https://mid.demo.com,demo@mid.com,mid-demo-22,Active,Growth Co,2025-03-15,Business,"Analytics,Integrations,API",Standard mid-market config',
    'SMB Trial,https://smb.demo.com,trial@smb.com,smb-trial-1,Active,Small Biz LLC,,Starter,"Basic Reports","Free trial demo"',
    'Partner POC,https://poc.demo.com,poc@partner.com,poc-secret-7,Needs Reset,Partner Inc,2025-01-01,Pro,"API,Webhooks","POC expired — needs refresh"',
  ].join("\n"),
};

function ImportModal({ onImport, onClose, existingNames = [] }) {
  const [mode, setMode] = useState("csv"); // csv | json
  const [template, setTemplate] = useState("");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState("input"); // input | preview
  const [conflictMode, setConflictMode] = useState("skip"); // skip | overwrite | rename
  const fileRef = useRef(null);

  const downloadTemplate = (name) => {
    const content = CSV_TEMPLATES[name] || CSV_TEMPLATES["Blank Template"];
    const blob = new Blob([content], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `demo-units-template.csv`; a.click();
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (!lines.length) return { rows: [], errs: ["File is empty"] };
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const errs = [];
    const rows = [];
    lines.slice(1).forEach((line, i) => {
      // naive CSV parse — handles quoted fields
      const cols = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
      if (!obj.name) { errs.push(`Row ${i + 2}: missing name — skipped`); return; }
      if (!STATUSES.includes(obj.status)) obj.status = "Active";
      rows.push({ ...obj, id: genId(), createdAt: new Date().toISOString().slice(0, 10) });
    });
    return { rows, errs };
  };

  const parseJSON = (text) => {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.demoUnits || [];
      const errs = [];
      const rows = arr.map((item, i) => {
        if (!item.name) { errs.push(`Item ${i + 1}: missing name — skipped`); return null; }
        if (!STATUSES.includes(item.status)) item.status = "Active";
        return { ...item, id: genId(), createdAt: item.createdAt || new Date().toISOString().slice(0, 10) };
      }).filter(Boolean);
      return { rows, errs };
    } catch {
      return { rows: [], errs: ["Invalid JSON — check your file format"] };
    }
  };

  const handleParse = () => {
    const { rows, errs } = mode === "csv" ? parseCSV(raw) : parseJSON(raw);
    setParsed(rows); setErrors(errs);
    if (rows.length) setStep("preview");
    else toast("No valid rows found", "error");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "json") setMode("json"); else setMode("csv");
    file.text().then(t => setRaw(t));
  };

  const resolvedRows = parsed.map(row => {
    const clash = existingNames.includes(row.name);
    if (!clash) return { ...row, _action: "import" };
    if (conflictMode === "skip") return { ...row, _action: "skip" };
    if (conflictMode === "overwrite") return { ...row, _action: "overwrite" };
    return { ...row, name: `${row.name} (imported)`, _action: "rename" };
  });

  const toImport = resolvedRows.filter(r => r._action !== "skip");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {step === "input" ? (
        <>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
            {["csv", "json"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 18px", border: "none", background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px" }}>{m}</button>
            ))}
          </div>

          {/* Template dropdown — CSV only */}
          {mode === "csv" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Template:</span>
              <select style={{ ...inputStyle, width: "auto", fontSize: 12 }} value={template} onChange={e => { setTemplate(e.target.value); if (e.target.value) setRaw(CSV_TEMPLATES[e.target.value]); }}>
                <option value="">— Choose a template —</option>
                {Object.keys(CSV_TEMPLATES).map(t => <option key={t}>{t}</option>)}
              </select>
              {template && (
                <button style={btnStyle("ghost", "sm")} onClick={() => downloadTemplate(template)}>⬇ Download</button>
              )}
            </div>
          )}

          {/* File drop / paste area */}
          <div style={{ position: "relative" }}>
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; const file = e.dataTransfer.files[0]; if (file) { const r = new FileReader(); r.onload = ev => setRaw(ev.target.result); r.readAsText(file); const ext = file.name.split(".").pop(); if (ext === "json") setMode("json"); else setMode("csv"); } }}
              onClick={() => fileRef.current?.click()}
              style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s", marginBottom: 8, background: "var(--surface-raised)" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>📂</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Drop a .csv or .json file here, or <span style={{ color: "var(--accent)", fontWeight: 600 }}>click to browse</span></div>
              <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: "none" }} onChange={handleFile} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 6 }}>— or paste below —</div>
            <textarea
              style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
              placeholder={mode === "csv"
                ? `name,url,email,password,status,assignedClient,expiryDate,plan,features,notes\nMy Demo,https://...,demo@...,pass123,Active,Client Name,2025-12-31,Pro,"Feature A,Feature B",Notes here`
                : `[{"name":"My Demo","url":"https://...","email":"demo@...","status":"Active"}]`}
              value={raw} onChange={e => setRaw(e.target.value)}
            />
          </div>

          {/* Required columns hint for CSV */}
          {mode === "csv" && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-raised)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <strong>Required:</strong> <code>name</code> &nbsp;·&nbsp; <strong>Optional:</strong> {CSV_HEADERS.filter(h => h !== "name").map(h => <code key={h} style={{ marginRight: 4 }}>{h}</code>)}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
            <button style={btnStyle("primary")} onClick={handleParse} disabled={!raw.trim()}>Preview Import →</button>
          </div>
        </>
      ) : (
        <>
          {/* Preview */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {parsed.length} rows parsed · <span style={{ color: "var(--success)" }}>{toImport.length} will import</span>
              {resolvedRows.filter(r => r._action === "skip").length > 0 && <span style={{ color: "var(--warning)" }}> · {resolvedRows.filter(r => r._action === "skip").length} skipped (name clash)</span>}
              {errors.length > 0 && <span style={{ color: "var(--danger)" }}> · {errors.length} error{errors.length > 1 ? "s" : ""}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>On name clash:</span>
              {[["skip", "Skip"], ["overwrite", "Overwrite"], ["rename", "Rename"]].map(([val, label]) => (
                <button key={val} onClick={() => setConflictMode(val)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, border: `1px solid ${conflictMode === val ? "var(--accent)" : "var(--border)"}`, background: conflictMode === val ? "var(--accent-dim)" : "transparent", color: conflictMode === val ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: conflictMode === val ? 700 : 400 }}>{label}</button>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid var(--danger)", borderRadius: 8, padding: "8px 12px" }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 11, color: "var(--danger)" }}>⚠ {e}</div>)}
            </div>
          )}

          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)", maxHeight: 280, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface-raised)" }}>
                <tr>{["Status","Name","Client","Plan","Email","Expiry"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {resolvedRows.map((row, i) => {
                  const actionColor = row._action === "skip" ? "var(--text-muted)" : row._action === "overwrite" ? "var(--warning)" : "var(--success)";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", opacity: row._action === "skip" ? 0.45 : 1 }}>
                      <td style={{ padding: "6px 10px" }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: `${actionColor}20`, color: actionColor, fontWeight: 700 }}>
                          {row._action === "skip" ? "SKIP" : row._action === "overwrite" ? "OVERWRITE" : row._action === "rename" ? "RENAME" : "NEW"}
                        </span>
                      </td>
                      <td style={{ padding: "6px 10px", fontWeight: 600, color: "var(--text)" }}>{row.name}</td>
                      <td style={{ padding: "6px 10px", color: "var(--text-muted)" }}>{row.assignedClient || "—"}</td>
                      <td style={{ padding: "6px 10px", color: "var(--text-muted)" }}>{row.plan || "—"}</td>
                      <td style={{ padding: "6px 10px", color: "var(--text-muted)", fontFamily: "monospace" }}>{row.email || "—"}</td>
                      <td style={{ padding: "6px 10px", color: "var(--text-muted)" }}>{row.expiryDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button style={btnStyle("ghost")} onClick={() => setStep("input")}>← Back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
              <button style={btnStyle("primary")} disabled={!toImport.length} onClick={() => onImport(toImport, conflictMode)}>
                Import {toImport.length} Unit{toImport.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DemoUnitForm({ initial = {}, onSave, onClose, existingNames = [] }) {
  const isEdit = !!initial.id;
  const [step, setStep] = useState(0);
  const STEPS = ["Basic Info", "Access & Credentials", "Details & Notes"];
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
    tags: "",
    lastAccessed: "",
    createdAt: new Date().toISOString().slice(0, 10),
    ...initial,
  });
  const [errors, setErrors] = useState({});
  const set = k => e => {
    setF(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Unit name is required";
    else if (existingNames.includes(f.name.trim()) && f.name.trim() !== initial.name) e.name = "A unit with this name already exists";
    if (f.url && !/^https?:\/\/.+/.test(f.url)) e.url = "URL must start with http:// or https://";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Invalid email format";
    if (f.expiryDate && new Date(f.expiryDate) < new Date(new Date().toDateString())) e.expiryDate = "Expiry date is in the past";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const errStyle = { borderColor: "var(--danger)" };
  const errMsg = (k) => errors[k] ? <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 3 }}>{errors[k]}</div> : null;

  const quickExpiry = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    setF(p => ({ ...p, expiryDate: d.toISOString().slice(0, 10) }));
    if (errors.expiryDate) setErrors(p => ({ ...p, expiryDate: null }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!f.name.trim()) e.name = "Unit name is required";
      else if (existingNames.includes(f.name.trim()) && f.name.trim() !== initial.name) e.name = "A unit with this name already exists";
      if (f.url && !/^https?:\/\/.+/.test(f.url)) e.url = "URL must start with http:// or https://";
    }
    if (s === 1) {
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Invalid email format";
      if (f.expiryDate && new Date(f.expiryDate) < new Date(new Date().toDateString())) e.expiryDate = "Expiry date is in the past";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)); };
  const submit = () => { if (validateStep(step)) onSave(f); };

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Step progress — only show for new units */}
      {!isEdit && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            {STEPS.map((s, i) => (
              <div key={s} onClick={() => i < step && setStep(i)} style={{ fontSize: 11, fontWeight: i === step ? 700 : 400, color: i === step ? "var(--accent)" : i < step ? "var(--success)" : "var(--text-muted)", cursor: i < step ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: i === step ? "var(--accent)" : i < step ? "var(--success)" : "var(--border)", color: i <= step ? "#fff" : "var(--text-muted)" }}>{i < step ? "✓" : i + 1}</span>
                {s}
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--accent)", transition: "width 0.3s ease", borderRadius: 2 }} />
          </div>
        </div>
      )}

      {/* Step 0 – Basic Info */}
      {(isEdit || step === 0) && (
        <div style={{ display: isEdit ? "contents" : undefined }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormField label="Unit Name *">
              <input style={{ ...inputStyle, ...(errors.name ? errStyle : {}) }} value={f.name} onChange={set("name")} autoFocus placeholder="e.g. Client Demo v2" />
              {errMsg("name")}
            </FormField>
            <FormField label="Status">
              <select style={inputStyle} value={f.status} onChange={set("status")}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="URL" style={{ gridColumn: "1/-1" }}>
              <input style={{ ...inputStyle, ...(errors.url ? errStyle : {}) }} value={f.url} onChange={set("url")} placeholder="https://demo.yourapp.com" />
              {errMsg("url")}
            </FormField>
            <FormField label="Assigned Client">
              <input style={inputStyle} value={f.assignedClient} onChange={set("assignedClient")} placeholder="Client name" />
            </FormField>
            <FormField label="Plan / Tier">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <input style={inputStyle} value={f.plan} onChange={set("plan")} placeholder="e.g. Pro, Enterprise" list="plan-presets" />
                <datalist id="plan-presets">{PLAN_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {PLAN_PRESETS.map(p => (
                    <button key={p} type="button" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, border: `1px solid ${f.plan === p ? "var(--accent)" : "var(--border)"}`, background: f.plan === p ? "var(--accent-dim)" : "transparent", color: f.plan === p ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: f.plan === p ? 600 : 400 }}
                      onClick={() => setF(p2 => ({ ...p2, plan: p2.plan === p ? "" : p }))}>{p}</button>
                  ))}
                </div>
              </div>
            </FormField>
          </div>
        </div>
      )}

      {/* Step 1 – Access & Credentials */}
      {(isEdit || step === 1) && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormField label="Login Email">
              <input style={{ ...inputStyle, ...(errors.email ? errStyle : {}) }} type="email" value={f.email} onChange={set("email")} placeholder="demo@client.com" />
              {errMsg("email")}
            </FormField>
            <FormField label="Password">
              <input style={inputStyle} value={f.password} onChange={set("password")} placeholder="demo-password-123" />
            </FormField>
            <FormField label="Expiry Date">
              <input style={{ ...inputStyle, ...(errors.expiryDate ? errStyle : {}) }} type="date" value={f.expiryDate} onChange={set("expiryDate")} />
              {errMsg("expiryDate")}
              <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                {[["7d", 7], ["30d", 30], ["90d", 90], ["1yr", 365]].map(([label, days]) => (
                  <button key={label} type="button" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-muted)", cursor: "pointer" }}
                    onClick={() => quickExpiry(days)}>+{label}</button>
                ))}
                {f.expiryDate && <button type="button" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--danger)", cursor: "pointer" }}
                  onClick={() => setF(p => ({ ...p, expiryDate: "" }))}>✕ Clear</button>}
              </div>
            </FormField>
          </div>
        </div>
      )}

      {/* Step 2 – Details & Notes */}
      {(isEdit || step === 2) && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormField label="Key Features" style={{ gridColumn: "1/-1" }}>
              <input style={inputStyle} value={f.features} onChange={set("features")} placeholder="Comma-separated features enabled for this demo" />
              {f.features && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                {f.features.split(",").map(ft => ft.trim()).filter(Boolean).map(ft => (
                  <span key={ft} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{ft}</span>
                ))}
              </div>}
            </FormField>
            <FormField label="Tags / Labels" style={{ gridColumn: "1/-1" }}>
              <input style={inputStyle} value={f.tags} onChange={set("tags")} placeholder="e.g. high-priority, EMEA, Q1-2025" />
              {f.tags && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                {f.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)", fontWeight: 600 }}>{t}</span>
                ))}
              </div>}
            </FormField>
            <FormField label="Notes" style={{ gridColumn: "1/-1" }}>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} placeholder="Access instructions, special setup, etc." />
              {f.notes && <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", marginTop: 2 }}>{f.notes.length} chars</div>}
            </FormField>
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <button style={btnStyle("ghost")} onClick={isEdit || step === 0 ? onClose : back}>{isEdit || step === 0 ? "Cancel" : "← Back"}</button>
        <div style={{ display: "flex", gap: 8 }}>
          {!isEdit && step < STEPS.length - 1
            ? <button style={btnStyle("primary")} onClick={next}>Next →</button>
            : <button style={btnStyle("primary")} onClick={submit}>{isEdit ? "Save Changes" : "✓ Create Demo Unit"}</button>
          }
        </div>
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
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [undoStack, setUndoStack] = useState([]);
  const [collapsedNotes, setCollapsedNotes] = useState({});
  const [filterPlan, setFilterPlan] = useState("All");
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setEditing(null); setShowForm(true); }
      if (e.key === "Escape") { setShowForm(false); setEditing(null); clearBulk(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && undoStack.length) {
        e.preventDefault();
        const prev = undoStack[undoStack.length - 1];
        setDemoUnits(prev.units);
        saveWorkspaceData("demoUnits", prev.units, workspaceId);
        toast(`Undone: ${prev.label}`, "info");
        setUndoStack(s => s.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoStack, workspaceId, showForm]);

  const pushUndo = (label) => setUndoStack(s => [...s.slice(-9), { label, units: demoUnits }]);

  const duplicate = useCallback((unit) => {
    pushUndo(`Duplicate ${unit.name}`);
    const copy = { ...unit, id: genId(), name: `${unit.name} (copy)`, createdAt: new Date().toISOString().slice(0, 10), lastAccessed: "" };
    const updated = [copy, ...demoUnits];
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Duplicate", `Duplicated: ${unit.name}`);
    toast(`Duplicated "${unit.name}"`);
  }, [demoUnits, workspaceId, addAudit]);

  const allPlans = useMemo(() => {
    const plans = [...new Set(demoUnits.map(u => u.plan).filter(Boolean))].sort();
    return plans;
  }, [demoUnits]);

  const filtered = useMemo(() => {
    let result = demoUnits;
    if (filterStatus !== "All") result = result.filter(u => u.status === filterStatus);
    if (filterPlan !== "All") result = result.filter(u => u.plan === filterPlan);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.assignedClient?.toLowerCase().includes(q) ||
        u.url?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.plan?.toLowerCase().includes(q) ||
        u.features?.toLowerCase().includes(q) ||
        u.notes?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const av = a[sortField] || "";
      const bv = b[sortField] || "";
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [demoUnits, search, filterStatus, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleBulk = (id) => setBulkSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearBulk = () => setBulkSelected(new Set());

  const bulkDelete = useCallback(() => {
    if (!bulkSelected.size) return;
    const names = [...bulkSelected].map(id => demoUnits.find(u => u.id === id)?.name).filter(Boolean).join(", ");
    pushUndo(`Bulk delete ${bulkSelected.size} units`);
    const updated = demoUnits.filter(u => !bulkSelected.has(u.id));
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Bulk Delete", `Deleted: ${names}`);
    toast(`Deleted ${bulkSelected.size} unit${bulkSelected.size > 1 ? "s" : ""} — Ctrl+Z to undo`, "info");
    clearBulk();
  }, [bulkSelected, demoUnits, workspaceId, addAudit]);

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
    pushUndo(`Delete ${unit?.name}`);
    const updated = demoUnits.filter(u => u.id !== id);
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Delete", `Deleted: ${unit?.name}`);
    toast("Demo unit deleted — Ctrl+Z to undo", "info");
    setConfirm(null);
  }, [demoUnits, workspaceId, addAudit]);

  const markStatus = useCallback((id, status) => {
    const updated = demoUnits.map(u => u.id === id ? { ...u, status, lastAccessed: status === "Active" ? new Date().toISOString().slice(0, 10) : u.lastAccessed } : u);
    setDemoUnits(updated);
    saveWorkspaceData("demoUnits", updated, workspaceId);
    addAudit("Demo Units", "Status", `Marked ${status}: ${demoUnits.find(u => u.id === id)?.name}`);
    toast(`Marked as ${status}`);
  }, [demoUnits, workspaceId, addAudit]);

  const copyToClipboard = (text, label, unitId) => {
    navigator.clipboard?.writeText(text).then(() => toast(`${label} copied!`)).catch(() => toast(`${label} copied!`));
    if (unitId) {
      const updated = demoUnits.map(u => u.id === unitId ? { ...u, lastAccessed: new Date().toISOString().slice(0, 10) } : u);
      setDemoUnits(updated);
      saveWorkspaceData("demoUnits", updated, workspaceId);
    }
  };

  const daysUntilExpiry = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const stats = useMemo(() => ({
    active: demoUnits.filter(u => u.status === "Active").length,
    needsReset: demoUnits.filter(u => u.status === "Needs Reset").length,
    expired: demoUnits.filter(u => u.status === "Expired").length,
    expiringSoon: demoUnits.filter(u => u.expiryDate && !isOverdue(u.expiryDate) && new Date(u.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && u.status === "Active").length,
    total: demoUnits.length,
    archived: demoUnits.filter(u => u.status === "Archived").length,
  }), [demoUnits]);

  const renderCard = (unit) => {
    const expired = unit.status === "Expired" || (unit.expiryDate && isOverdue(unit.expiryDate));
    const days = daysUntilExpiry(unit.expiryDate);
    const expiringSoon = unit.expiryDate && !isOverdue(unit.expiryDate) &&
      new Date(unit.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const statusColor = STATUS_COLORS[unit.status] || "var(--accent)";
    const isSelected = bulkSelected.has(unit.id);

    return (
      <div key={unit.id} style={{
        background: "var(--surface)",
        border: `1px solid ${isSelected ? "var(--accent)" : expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--border)"}`,
        borderLeft: `4px solid ${statusColor}`,
        borderRadius: "var(--r-lg)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: isSelected ? "0 0 0 2px var(--accent)22" : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "transform 0.15s, box-shadow 0.15s",
        opacity: unit.status === "Archived" ? 0.65 : 1,
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isSelected ? "0 0 0 2px var(--accent)44" : "0 8px 20px rgba(0,0,0,0.10)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = isSelected ? "0 0 0 2px var(--accent)22" : "0 2px 8px rgba(0,0,0,0.05)"; }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4, letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleBulk(unit.id)}
                style={{ cursor: "pointer", accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
              🖥️ {unit.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {unit.assignedClient && <span>👤 {unit.assignedClient}</span>}
              {unit.plan && <span style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{unit.plan}</span>}
              {unit.lastAccessed && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>· last used {unit.lastAccessed}</span>}
            </div>
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
        {(unit.email || unit.password) && (
          <div style={{ background: "var(--surface-raised)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 8 }}>Credentials</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {unit.email && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>📧 {unit.email}</span>
                  <button style={{ ...btnStyle("ghost", "sm"), flexShrink: 0, fontSize: 10, padding: "2px 8px" }}
                    onClick={() => copyToClipboard(unit.email, "Email", unit.id)}>Copy</button>
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
                      onClick={() => copyToClipboard(unit.password, "Password", unit.id)}>Copy</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dates & Info */}
        {(unit.expiryDate || unit.features) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unit.expiryDate && (
              <div style={{ fontSize: 12, color: expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                📅 Expires: <strong>{unit.expiryDate}</strong>
                {expired && <span style={{ background: "var(--danger)", color: "#fff", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>EXPIRED</span>}
                {expiringSoon && !expired && <span style={{ background: "var(--warning)", color: "#fff", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{days}d left</span>}
              </div>
            )}
            {unit.features && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {unit.features.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                  <span key={f} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)", fontWeight: 500 }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {unit.notes && (
          <div>
            <button onClick={() => setCollapsedNotes(c => ({ ...c, [unit.id]: !c[unit.id] }))}
              style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              {collapsedNotes[unit.id] ? "▶" : "▼"} Notes
            </button>
            {!collapsedNotes[unit.id] && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, padding: "8px 10px", background: "var(--background)", borderRadius: 6, borderLeft: "2px solid var(--border)" }}>
                {unit.notes}
              </div>
            )}
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
          {(unit.email || unit.password) && (
            <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} title="Copy email + password to clipboard"
              onClick={() => copyToClipboard(`Email: ${unit.email || ""}\nPassword: ${unit.password || ""}`, "Credentials", unit.id)}>
              📋 Copy All Creds
            </button>
          )}
          {unit.status !== "Active" && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--success)" }} onClick={() => markStatus(unit.id, "Active")}>✓ Activate</button>
          )}
          {unit.status !== "Needs Reset" && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--warning)" }} onClick={() => markStatus(unit.id, "Needs Reset")}>↺ Needs Reset</button>
          )}
          <button style={btnStyle("ghost", "sm")} onClick={() => { setEditing(unit); setShowForm(true); }}>Edit</button>
          <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} title="Duplicate this unit" onClick={() => duplicate(unit)}>⧉ Dupe</button>
          {(role === "Owner" || role === "Admin") && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={() => setConfirm(unit.id)}>Delete</button>
          )}
        </div>
      </div>
    );
  };

  const renderRow = (unit) => {
    const expired = unit.status === "Expired" || (unit.expiryDate && isOverdue(unit.expiryDate));
    const days = daysUntilExpiry(unit.expiryDate);
    const expiringSoon = unit.expiryDate && !isOverdue(unit.expiryDate) && days <= 7;
    const statusColor = STATUS_COLORS[unit.status] || "var(--accent)";
    const isSelected = bulkSelected.has(unit.id);
    return (
      <tr key={unit.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s", background: isSelected ? "var(--accent-dim)" : "transparent", opacity: unit.status === "Archived" ? 0.6 : 1 }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--surface-raised)"; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
        <td style={{ padding: "10px 12px" }}>
          <input type="checkbox" checked={isSelected} onChange={() => toggleBulk(unit.id)} style={{ cursor: "pointer", accentColor: "var(--accent)" }} />
        </td>
        <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 13, color: "var(--text)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.name}</td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: `${statusColor}20`, color: statusColor, fontWeight: 700 }}>{unit.status}</span>
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)" }}>{unit.assignedClient || "—"}</td>
        <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
          {unit.email
            ? <span onClick={() => copyToClipboard(unit.email, "Email", unit.id)} title="Click to copy" style={{ cursor: "pointer" }}>{unit.email}</span>
            : "—"}
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12 }}>
          {unit.plan
            ? <span style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{unit.plan}</span>
            : <span style={{ color: "var(--text-muted)" }}>—</span>}
        </td>
        <td style={{ padding: "10px 12px", fontSize: 12 }}>
          {unit.expiryDate
            ? <span style={{ color: expired ? "var(--danger)" : expiringSoon ? "var(--warning)" : "var(--text-muted)", fontWeight: expired || expiringSoon ? 600 : 400 }}>
                {unit.expiryDate}{expiringSoon && !expired ? ` (${days}d)` : ""}{expired ? " ⚠" : ""}
              </span>
            : <span style={{ color: "var(--text-muted)" }}>—</span>}
        </td>
        <td style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {unit.url && <a href={unit.url} target="_blank" rel="noreferrer" style={{ ...btnStyle("ghost", "sm"), fontSize: 11, textDecoration: "none" }}>Open</a>}
            <button style={btnStyle("ghost", "sm")} onClick={() => { setEditing(unit); setShowForm(true); }}>Edit</button>
            <button style={{ ...btnStyle("ghost", "sm"), fontSize: 11 }} onClick={() => duplicate(unit)} title="Duplicate">⧉</button>
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
          <DemoUnitForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} existingNames={demoUnits.map(u => u.name)} />
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
          {undoStack.length > 0 && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--accent)" }}
              onClick={() => {
                const prev = undoStack[undoStack.length - 1];
                setDemoUnits(prev.units);
                saveWorkspaceData("demoUnits", prev.units, workspaceId);
                toast(`Undone: ${prev.label}`, "info");
                setUndoStack(s => s.slice(0, -1));
              }}>↩ Undo</button>
          )}
          <button style={btnStyle("ghost", "sm")} onClick={() => exportToCSV(filtered, "demo-units")} title="Exports currently filtered results">↓ Export</button>
          <button style={btnStyle("primary")} onClick={() => { setEditing(null); setShowForm(true); }} title="Shortcut: N">+ Add Demo Unit</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Active", value: stats.active, color: "var(--success)", filter: "Active" },
          { label: "Needs Reset", value: stats.needsReset, color: "var(--warning)", filter: "Needs Reset" },
          { label: "Expired", value: stats.expired, color: "var(--danger)", filter: "Expired" },
          { label: "Expiring Soon", value: stats.expiringSoon, color: "var(--warning)", filter: null },
        ].map(s => (
          <div key={s.label} onClick={() => s.filter && setFilterStatus(f => f === s.filter ? "All" : s.filter)}
            style={{ background: filterStatus === s.filter ? `${s.color}10` : "var(--surface)", border: `1px solid ${filterStatus === s.filter ? s.color : "var(--border)"}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: s.filter ? "pointer" : "default", transition: "border-color 0.15s, background 0.15s" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{s.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {bulkSelected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{bulkSelected.size} selected</span>
          <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--success)" }} onClick={() => { [...bulkSelected].forEach(id => markStatus(id, "Active")); clearBulk(); }}>✓ Activate All</button>
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--warning)" }} onClick={() => { [...bulkSelected].forEach(id => markStatus(id, "Needs Reset")); clearBulk(); }}>↺ Mark Reset</button>
            {(role === "Owner" || role === "Admin") && (
              <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={bulkDelete}>🗑 Delete Selected</button>
            )}
          </div>
          <button style={{ ...btnStyle("ghost", "sm"), marginLeft: "auto" }} onClick={clearBulk}>✕ Clear</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput placeholder="Search name, client, URL, features, notes… (N to add)" value={search} onChange={setSearch} />
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
        {allPlans.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Plan:</span>
            {["All", ...allPlans].map(p => (
              <button key={p} onClick={() => setFilterPlan(p)} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${filterPlan === p ? "var(--accent)" : "var(--border)"}`,
                background: filterPlan === p ? "var(--accent-dim)" : "transparent",
                color: filterPlan === p ? "var(--accent)" : "var(--text-muted)",
                fontWeight: filterPlan === p ? 600 : 400, transition: "all 0.1s"
              }}>{p}</button>
            ))}
          </div>
        )}
        {(search || filterStatus !== "All" || filterPlan !== "All") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing {filtered.length} of {demoUnits.length}</span>
            <button style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPlan("All"); }}>✕ Clear all filters</button>
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🖥️"
          title={search || filterStatus !== "All" || filterPlan !== "All" ? "No matches found" : "No demo units yet"}
          sub={search || filterStatus !== "All" || filterPlan !== "All" ? "Try adjusting your filters" : "Add your first demo unit to get started"}
          action={
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {(search || filterStatus !== "All" || filterPlan !== "All") && (
                <button style={btnStyle("ghost")} onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPlan("All"); }}>Clear Filters</button>
              )}
              <button style={btnStyle("primary")} onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Demo Unit</button>
            </div>
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
                <th style={{ padding: "10px 12px", width: 32 }}>
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(u => bulkSelected.has(u.id))}
                    onChange={() => {
                      const allSelected = filtered.every(u => bulkSelected.has(u.id));
                      setBulkSelected(allSelected ? new Set() : new Set(filtered.map(u => u.id)));
                    }}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                  />
                </th>
                {[["name","Name"],["status","Status"],["assignedClient","Client"],["email","Email"],["plan","Plan"],["expiryDate","Expires"]].map(([field, label]) => (
                  <th key={field} onClick={() => toggleSort(field)} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: sortField === field ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                    {label} {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
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
