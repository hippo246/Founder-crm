import { useState } from "react";
import { Confirm, SectionCard, btnStyle, toast } from "../../components/ui/UI.jsx";
import { getStorageSize, getWorkspaceDataKeys, loadWorkspaceData, saveWorkspaceData } from "../../lib/storage.js";

export default function DataSection({ onResetData, workspaces, currentWorkspaceId, role }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleExport = () => {
    const data = {};
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `founder-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Data exported successfully");
  };

  const handleImport = () => {
    if (!importFile) { toast("Please select a file", "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
        toast("Data imported successfully. Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast("Invalid backup file", "error");
      }
    };
    reader.readAsText(importFile);
    setConfirmImport(false);
    setImportFile(null);
  };

  const handleTransfer = async () => {
    if (!transferTarget) return toast("Select a target workspace first", "error");
    if (transferTarget === currentWorkspaceId) return toast("Cannot transfer to the same workspace", "error");
    
    setIsTransferring(true);
    try {
      const keys = getWorkspaceDataKeys(currentWorkspaceId);
      for (const key of keys) {
        const data = loadWorkspaceData(key, null, currentWorkspaceId);
        if (data !== null) {
          saveWorkspaceData(key, data, transferTarget);
        }
      }
      toast("Data transferred successfully to target workspace.");
    } catch (err) {
      toast("Failed to transfer data", "error");
    } finally {
      setIsTransferring(false);
    }
  };

  const isAdmin = role === "Owner" || role === "Admin";

  return (
    <>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Data Management</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Storage usage: {getStorageSize()}</div>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", padding: "8px 12px", background: "var(--surface-raised)", borderRadius: "var(--r-sm)", borderLeft: "3px solid var(--warning)" }}>
            ⚠️ Data is stored locally in your browser. Export regularly to keep a local backup.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <button style={btnStyle("primary")} onClick={handleExport}>Export Local Backup</button>
          <button style={btnStyle("ghost")} onClick={() => setConfirmImport(true)}>Restore from Backup</button>
          <button style={{ ...btnStyle("ghost"), color: "var(--danger)" }} onClick={() => setConfirmReset(true)}>Reset Workspace Data</button>
        </div>

        {isAdmin && (workspaces?.length > 1) && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 8 }}>Workspace Data Transfer</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Copy all data from the current workspace to another. Only available to Admins.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13 }} value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
                <option value="">Select target workspace...</option>
                {workspaces.filter(w => w.id !== currentWorkspaceId).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <button style={btnStyle("soft")} onClick={handleTransfer} disabled={isTransferring || !transferTarget}>
                {isTransferring ? "Transferring..." : "Transfer Data"}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {confirmReset && (
        <Confirm
          title="Reset Workspace Data"
          message="This will delete all workspace records and restore starter data. This action cannot be undone."
          onConfirm={() => { onResetData(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmImport && (
        <Confirm
          title="Import Data"
          message={
            <div>
              <p>This will replace all your current data with the imported backup. This action cannot be undone.</p>
              <input
                type="file"
                accept=".json"
                onChange={e => setImportFile(e.target.files[0])}
                style={{ marginTop: 12 }}
              />
            </div>
          }
          onConfirm={handleImport}
          onCancel={() => { setConfirmImport(false); setImportFile(null); }}
        />
      )}
    </>
  );
}
