import { useState } from "react";
import { toast } from "../../components/ui/UI.jsx";
import { saveWorkspaceData } from "../../lib/storage.js";
import WorkspacesSection from "./WorkspacesSection.jsx";
import BusinessSection from "./BusinessSection.jsx";
import FinanceSection from "./FinanceSection.jsx";
import AppearanceSection from "./AppearanceSection.jsx";
import TagsSection from "./TagsSection.jsx";
import CustomFieldsSection from "./CustomFieldsSection.jsx";
import DataSection from "./DataSection.jsx";

const SUB_TABS = [
  { id: "workspaces",    label: "Workspaces" },
  { id: "business",      label: "Business" },
  { id: "finance",       label: "Finance" },
  { id: "invoices",      label: "Invoices" },
  { id: "proposals",     label: "Proposals" },
  { id: "tasksRoadmap",  label: "Tasks & Roadmap" },
  { id: "dashboard",     label: "Dashboard" },
  { id: "appearance",    label: "Appearance" },
  { id: "tags",          label: "Tags" },
  { id: "customFields",  label: "Custom Fields" },
  { id: "data",          label: "Data" },
];

const subTabBarStyle = {
  display: "flex",
  gap: 0,
  borderBottom: "1px solid var(--border)",
  marginBottom: 20,
};

const subTabBtn = (active) => ({
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? "var(--accent)" : "var(--text-muted)",
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
  cursor: "pointer",
  marginBottom: -1,
  transition: "color 0.15s",
  whiteSpace: "nowrap",
});

export default function SettingsTab({ settings, setSettings, role, onResetData, workspaces, setWorkspaces, currentWorkspaceId, switchWorkspace, tags, setTags, customFields, setCustomFields, workspaceId = "workspace-1" }) {
  const [activeTab, setActiveTab] = useState("workspaces");
  const [f, setF] = useState({ ...settings });
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(settings));
  const [isDirty, setIsDirty] = useState(false);

  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF(p => ({ ...p, [key]: val }));
    setIsDirty(true);
  };

  const saveAll = () => {
    setSettings(f);
    saveWorkspaceData("settings", f, workspaceId);
    setSavedSnapshot(JSON.stringify(f));
    setIsDirty(false);
    toast("Settings saved");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Settings</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Configure your Founder OS workspace</p>
        </div>
        {isDirty && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--warning, #f59e0b)", fontWeight: 500 }}>● Unsaved changes</span>
            <button style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={saveAll}>Save all</button>
            <button style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={() => { setF({ ...settings }); setIsDirty(false); }}>Discard</button>
          </div>
        )}
      </div>

      <div style={{ ...subTabBarStyle, overflowX: "auto" }}>
        {SUB_TABS.map(t => (
          <button key={t.id} style={subTabBtn(activeTab === t.id)} onClick={() => handleTabChange(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === "workspaces" && (
        <WorkspacesSection 
          workspaces={workspaces} 
          setWorkspaces={setWorkspaces} 
          currentWorkspaceId={currentWorkspaceId} 
          switchWorkspace={switchWorkspace}
        />
      )}

      {activeTab === "business" && (
        <BusinessSection 
          settings={f} 
          setSettings={setF} 
          saveAll={saveAll}
        />
      )}

      {activeTab === "finance" && (
        <FinanceSection 
          settings={f} 
          setSettings={setF} 
          saveAll={saveAll}
        />
      )}

      {activeTab === "appearance" && (
        <AppearanceSection 
          settings={f} 
          setSettings={setF} 
          saveAll={saveAll}
          role={role}
        />
      )}

      {activeTab === "tags" && (
        <TagsSection tags={tags} setTags={setTags} workspaceId={workspaceId} />
      )}

      {activeTab === "customFields" && (
        <CustomFieldsSection customFields={customFields} setCustomFields={setCustomFields} workspaceId={workspaceId} />
      )}

      {activeTab === "data" && (
        <DataSection 
          onResetData={onResetData}
        />
      )}

      {/* ── INVOICES & RECEIPTS ── */}
      {activeTab === "invoices" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Invoice Settings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Invoice prefix</label><input style={{ ...f, ...{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" } }} value={f.invoicePrefix || "INV"} onChange={e => { setF(p => ({...p, invoicePrefix: e.target.value})); setIsDirty(true); }} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Receipt prefix</label><input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.receiptPrefix || "RCPT"} onChange={e => { setF(p => ({...p, receiptPrefix: e.target.value})); setIsDirty(true); }} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default tax rate (%)</label><input type="number" min="0" max="100" style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.invoiceTax ?? 18} onChange={e => { setF(p => ({...p, invoiceTax: Number(e.target.value)})); setIsDirty(true); }} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default payment terms</label><input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box" }} value={f.paymentTerms || "Net 30"} onChange={e => { setF(p => ({...p, paymentTerms: e.target.value})); setIsDirty(true); }} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default payment instructions</label><textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.paymentInstructions || ""} onChange={e => { setF(p => ({...p, paymentInstructions: e.target.value})); setIsDirty(true); }} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default invoice footer</label><textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.invoiceFooter || "Thank you for your business!"} onChange={e => { setF(p => ({...p, invoiceFooter: e.target.value})); setIsDirty(true); }} /></div>
              <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={saveAll}>Save Invoice Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROPOSALS ── */}
      {activeTab === "proposals" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Proposal Settings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Proposal prefix</label><input style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", maxWidth: 300, boxSizing: "border-box" }} value={f.proposalPrefix || "PROP"} onChange={e => { setF(p => ({...p, proposalPrefix: e.target.value})); setIsDirty(true); }} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default validity days</label><input type="number" min="1" style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", maxWidth: 120, boxSizing: "border-box" }} value={f.proposalValidityDays || 30} onChange={e => { setF(p => ({...p, proposalValidityDays: Number(e.target.value)})); setIsDirty(true); }} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default terms</label><textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical" }} value={f.proposalTerms || ""} onChange={e => { setF(p => ({...p, proposalTerms: e.target.value})); setIsDirty(true); }} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Default footer</label><textarea style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }} value={f.proposalFooter || "Thank you for considering our services."} onChange={e => { setF(p => ({...p, proposalFooter: e.target.value})); setIsDirty(true); }} /></div>
            <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer", width: "fit-content" }} onClick={saveAll}>Save Proposal Settings</button>
          </div>
        </div>
      )}

      {/* ── TASKS & ROADMAP ── */}
      {activeTab === "tasksRoadmap" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            ["Default task view", "defaultTaskView", ["Kanban", "My Day", "Inbox", "By Project", "All Tasks"]],
            ["Default roadmap phase type", "defaultPhaseType", ["Numeric", "Named", "Sprint", "Milestone"]],
            ["Default task priority", "defaultTaskPriority", ["Low", "Medium", "High", "Urgent"]],
            ["Default dashboard density", "dashboardDensity", ["Compact", "Comfortable", "Spacious"]],
          ].map(([label, key, opts]) => (
            <div key={key} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</label>
              <select style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%" }}
                value={f[key] || opts[0]} onChange={e => { setF(p => ({...p, [key]: e.target.value})); setIsDirty(true); }}>
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Follow-up reminder days</label>
            <input type="number" min="1" max="30" style={{ padding: "7px 10px", fontSize: 13, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", width: "100%" }}
              value={f.followUpDays || 3} onChange={e => { setF(p => ({...p, followUpDays: Number(e.target.value)})); setIsDirty(true); }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer" }} onClick={saveAll}>Save Settings</button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {activeTab === "dashboard" && (
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
      )}
    </div>
  );
}
