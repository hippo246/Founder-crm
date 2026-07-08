import { useState } from "react";
import { Confirm, SectionCard, btnStyle, toast } from "../../components/ui/UI.jsx";
import { getStorageSize } from "../../lib/storage.js";

export default function DataSection({ onResetData }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importFile, setImportFile] = useState(null);

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btnStyle("primary")} onClick={handleExport}>Export Local Backup</button>
          <button style={btnStyle("ghost")} onClick={() => setConfirmImport(true)}>Restore from Backup</button>
          <button style={{ ...btnStyle("ghost"), color: "var(--danger)" }} onClick={() => setConfirmReset(true)}>Reset Workspace Data</button>
        </div>
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
