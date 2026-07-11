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
import SecurityTab from "../SecurityTab.jsx";
import InvoicesSection from "./InvoicesSection.jsx";
import ProposalsSection from "./ProposalsSection.jsx";
import TasksRoadmapSection from "./TasksRoadmapSection.jsx";
import DashboardSection from "./DashboardSection.jsx";
import UsersSection from "./UsersSection.jsx";
import FirebaseSection from "./FirebaseSection.jsx";
const SUB_TABS = [
  { id: "workspaces",    label: "Workspaces" },
  { id: "users",         label: "Users & Team" },
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
  { id: "security",      label: "Security" },
  { id: "firebase",      label: "Firebase" },
];

export default function SettingsTab({ settings, setSettings, role, onResetData, workspaces, setWorkspaces, currentWorkspaceId, switchWorkspace, tags, setTags, customFields, setCustomFields, workspaceId = "workspace-1", updateWorkspace, user }) {
  const [activeTab, setActiveTab] = useState("workspaces");
  const [f, setF] = useState({ ...settings });
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(settings));
  const [isDirty, setIsDirty] = useState(false);

  const saveAll = () => {
    setSettings(f);
    saveWorkspaceData("settings", f, workspaceId);
    setSavedSnapshot(JSON.stringify(f));
    setIsDirty(false);
    toast("Settings saved");
  };

  const discardChanges = () => {
    setF({ ...settings });
    setIsDirty(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Settings Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Settings</h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Configure your Founder OS workspace</p>
        </div>
        {isDirty && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", padding: "8px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--border)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 13, color: "var(--warning, #f59e0b)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor" }}></span>
              Unsaved changes
            </span>
            <button style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer", transition: "opacity 0.2s" }} onClick={saveAll} onMouseOver={e => e.currentTarget.style.opacity = "0.9"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>Save all</button>
            <button style={{ padding: "6px 14px", fontSize: 13, fontWeight: 500, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--r-md)", cursor: "pointer", transition: "background 0.2s" }} onClick={discardChanges} onMouseOver={e => e.currentTarget.style.background = "var(--hover)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>Discard</button>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar & Content Area */}
      <div className="settings-layout" style={{ display: "flex", gap: 32, flex: 1, minHeight: 0 }}>
        
        {/* Left Sidebar Navigation */}
        <div className="settings-sidebar" style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {SUB_TABS.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  background: isActive ? "var(--hover)" : "transparent",
                  border: "none",
                  borderRadius: "var(--r-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={e => !isActive && (e.currentTarget.style.background = "var(--hover)", e.currentTarget.style.color = "var(--text)")}
                onMouseOut={e => !isActive && (e.currentTarget.style.background = "transparent", e.currentTarget.style.color = "var(--text-muted)")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 10, paddingBottom: 40 }}>
          {activeTab === "workspaces" && (
            <WorkspacesSection workspaces={workspaces} setWorkspaces={setWorkspaces} currentWorkspaceId={currentWorkspaceId} switchWorkspace={switchWorkspace} />
          )}
          {activeTab === "users" && (
            <UsersSection workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} updateWorkspace={updateWorkspace} user={user} />
          )}
          {activeTab === "business" && (
            <BusinessSection settings={f} setSettings={setF} saveAll={saveAll} />
          )}
          {activeTab === "finance" && (
            <FinanceSection settings={f} setSettings={setF} saveAll={saveAll} />
          )}
          {activeTab === "invoices" && (
            <InvoicesSection settings={f} setSettings={setF} saveAll={saveAll} setIsDirty={setIsDirty} />
          )}
          {activeTab === "proposals" && (
            <ProposalsSection settings={f} setSettings={setF} saveAll={saveAll} setIsDirty={setIsDirty} />
          )}
          {activeTab === "tasksRoadmap" && (
            <TasksRoadmapSection settings={f} setSettings={setF} saveAll={saveAll} setIsDirty={setIsDirty} />
          )}
          {activeTab === "dashboard" && (
            <DashboardSection settings={f} setSettings={setF} saveAll={saveAll} setIsDirty={setIsDirty} />
          )}
          {activeTab === "appearance" && (
            <AppearanceSection settings={f} setSettings={setF} saveAll={saveAll} role={role} />
          )}
          {activeTab === "tags" && (
            <TagsSection tags={tags} setTags={setTags} workspaceId={workspaceId} />
          )}
          {activeTab === "customFields" && (
            <CustomFieldsSection customFields={customFields} setCustomFields={setCustomFields} workspaceId={workspaceId} />
          )}
          {activeTab === "data" && (
            <DataSection onResetData={onResetData} workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} role={role} />
          )}
          {activeTab === "security" && (
            <SecurityTab settings={f} setSettings={setF} workspaceId={workspaceId} />
          )}
          {activeTab === "firebase" && (
            <FirebaseSection 
              role={role} 
              user={user} 
              currentWorkspaceId={currentWorkspaceId} 
              currentWorkspace={workspaces?.find(w => w.id === currentWorkspaceId)} 
              memberRole={role} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
