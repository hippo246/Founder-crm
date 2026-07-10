import { useState } from "react";
import { Confirm, SectionCard, btnStyle, toast } from "../../components/ui/UI.jsx";
import { getStorageSize, getWorkspaceDataKeys, loadWorkspaceData, saveWorkspaceData } from "../../lib/storage.js";

export default function DataSection({ onResetData, workspaces, currentWorkspaceId, role }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // New state
  const [exportStatus, setExportStatus] = useState(null); // null | "success" | "error"
  const [importStatus, setImportStatus] = useState(null); // null | "success" | "error" | "validating"
  const [importError, setImportError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [transferProgress, setTransferProgress] = useState(null); // null | { done, total }
  const [targetHasData, setTargetHasData] = useState(false);

  // Storage breakdown
  const getStorageBreakdown = () => {
    let totalBytes = 0;
    let keyCount = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (key.length + (localStorage.getItem(key) || "").length) * 2;
        keyCount++;
      }
    }
    const maxBytes = 5 * 1024 * 1024; // 5 MB typical quota
    const usedKB = (totalBytes / 1024).toFixed(1);
    const pct = Math.min(100, Math.round((totalBytes / maxBytes) * 100));
    return { usedKB, pct, keyCount };
  };

  const validateImportShape = (data) => {
    if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
    // Expect string values (localStorage serialized values)
    return Object.values(data).every(v => typeof v === "string");
  };

  const applyImportFile = (file) => {
    if (!file) return;
    setImportFile(file);
    setImportStatus("validating");
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!validateImportShape(data)) {
          setImportStatus("error");
          setImportError("This file doesn't look like a valid backup. Expected a JSON object with string values.");
          setImportFile(null);
        } else {
          setImportStatus(null); // valid, ready to confirm
        }
      } catch {
        setImportStatus("error");
        setImportError("Could not parse this file. Make sure it's a valid .json backup.");
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

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
    setExportStatus("success");
    setTimeout(() => setExportStatus(null), 3000);
  };

  const handleImport = () => {
    if (!importFile) { toast("Please select a file", "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!validateImportShape(data)) {
          setImportStatus("error");
          setImportError("Backup file shape is invalid.");
          return;
        }
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
        setImportStatus("success");
        toast("Data imported successfully. Refreshing...");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        setImportStatus("error");
        setImportError("Invalid backup file.");
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
    setTransferProgress({ done: 0, total: 0 });
    try {
      const keys = getWorkspaceDataKeys(currentWorkspaceId);
      setTransferProgress({ done: 0, total: keys.length });
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const data = loadWorkspaceData(key, null, currentWorkspaceId);
        if (data !== null) {
          saveWorkspaceData(key, data, transferTarget);
        }
        setTransferProgress({ done: i + 1, total: keys.length });
      }
      toast("Data transferred successfully to target workspace.");
    } catch (err) {
      toast("Failed to transfer data", "error");
    } finally {
      setIsTransferring(false);
      setTimeout(() => setTransferProgress(null), 2000);
    }
  };

  const handleTransferTargetChange = (e) => {
    const id = e.target.value;
    setTransferTarget(id);
    if (id) {
      const targetKeys = getWorkspaceDataKeys(id);
      setTargetHasData(targetKeys.length > 0);
    } else {
      setTargetHasData(false);
    }
  };

  const { usedKB, pct, keyCount } = getStorageBreakdown();
  const isAdmin = role === "Owner" || role === "Admin";

  const barColor = pct > 80 ? "var(--danger)" : pct > 50 ? "var(--warning)" : "var(--accent, var(--primary))";

  const actionCardStyle = {
    border: "1px solid var(--border)",
    borderRadius: "var(--r-md, 8px)",
    padding: "14px 16px",
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    background: "var(--surface-raised, var(--surface))",
  };

  const cardIconStyle = {
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 2,
  };

  const cardBodyStyle = { flex: 1, minWidth: 0 };
  const cardTitleStyle = { fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 2 };
  const cardDescStyle = { fontSize: 12, color: "var(--text-muted)", marginBottom: 10 };

  return (
    <>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Data Management</div>

        {/* Storage bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Storage — <strong style={{ color: "var(--text)" }}>{usedKB} KB used</strong>
              <span style={{ color: "var(--text-subtle)", marginLeft: 6 }}>({keyCount} keys)</span>
            </div>
            <div style={{ fontSize: 11, color: pct > 80 ? "var(--danger)" : "var(--text-subtle)" }}>{pct}%</div>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 6, padding: "6px 10px", background: "var(--surface-raised)", borderRadius: "var(--r-sm)", borderLeft: "3px solid var(--warning)" }}>
            ⚠️ Data is stored in your browser. Export regularly to avoid losing it.
          </div>
        </div>

        {/* Three action cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>

          {/* Export card */}
          <div style={actionCardStyle}>
            <span style={cardIconStyle}>📤</span>
            <div style={cardBodyStyle}>
              <div style={cardTitleStyle}>Export backup</div>
              <div style={cardDescStyle}>Download all local data as a .json file you can restore later.</div>
              <button style={btnStyle("primary")} onClick={handleExport}>
                {exportStatus === "success" ? "✓ Exported" : "Export Local Backup"}
              </button>
              {exportStatus === "success" && (
                <span style={{ marginLeft: 10, fontSize: 12, color: "var(--success, green)" }}>Saved to your downloads.</span>
              )}
            </div>
          </div>

          {/* Import card — inline file picker + drag-and-drop, no confirm dialog for file selection */}
          <div
            style={{
              ...actionCardStyle,
              border: dragOver ? "1.5px dashed var(--primary)" : "1px solid var(--border)",
              background: dragOver ? "var(--surface-hover, var(--surface-raised))" : actionCardStyle.background,
              transition: "border 0.15s, background 0.15s",
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) applyImportFile(file);
            }}
          >
            <span style={cardIconStyle}>📥</span>
            <div style={cardBodyStyle}>
              <div style={cardTitleStyle}>Restore from backup</div>
              <div style={cardDescStyle}>
                {dragOver ? "Drop the file to load it." : "Drag a .json backup here, or browse to select one."}
              </div>

              {/* Inline file picker */}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: importFile ? 10 : 0 }}>
                <span style={btnStyle("ghost")}>Browse file…</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) applyImportFile(e.target.files[0]); }}
                />
              </label>

              {importStatus === "validating" && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Validating file…</div>
              )}

              {importStatus === "error" && (
                <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>⚠ {importError}</div>
              )}

              {importFile && importStatus !== "error" && importStatus !== "validating" && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                    <strong style={{ color: "var(--text)" }}>{importFile.name}</strong> ready to restore.
                    {" "}<span style={{ color: "var(--warning)" }}>This will replace all current data.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={btnStyle("primary")} onClick={() => setConfirmImport(true)}>Restore Now</button>
                    <button style={btnStyle("ghost")} onClick={() => { setImportFile(null); setImportStatus(null); setImportError(null); }}>Cancel</button>
                  </div>
                </div>
              )}

              {importStatus === "success" && (
                <div style={{ fontSize: 12, color: "var(--success, green)", marginTop: 8 }}>✓ Import complete. Reloading…</div>
              )}
            </div>
          </div>

          {/* Reset card — visually separated, danger-tinted */}
          <div style={{ ...actionCardStyle, borderColor: "var(--danger-subtle, var(--border))", background: "var(--danger-surface, var(--surface-raised))" }}>
            <span style={cardIconStyle}>🗑️</span>
            <div style={cardBodyStyle}>
              <div style={{ ...cardTitleStyle, color: "var(--danger)" }}>Reset workspace data</div>
              <div style={cardDescStyle}>Delete all workspace records and restore starter data. Cannot be undone.</div>
              <button style={{ ...btnStyle("ghost"), color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => setConfirmReset(true)}>
                Reset Workspace Data
              </button>
            </div>
          </div>
        </div>

        {/* Transfer section — admin only */}
        {isAdmin && (workspaces?.length > 1) && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>Workspace Data Transfer</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Copy all data from the current workspace to another. Admin only.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select
                style={{ padding: "6px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 13 }}
                value={transferTarget}
                onChange={handleTransferTargetChange}
              >
                <option value="">Select target workspace…</option>
                {workspaces.filter(w => w.id !== currentWorkspaceId).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <button style={btnStyle("soft")} onClick={handleTransfer} disabled={isTransferring || !transferTarget}>
                {isTransferring
                  ? transferProgress
                    ? `Transferring… ${transferProgress.done}/${transferProgress.total}`
                    : "Transferring…"
                  : "Transfer Data"}
              </button>
            </div>

            {/* Transfer progress bar */}
            {isTransferring && transferProgress && transferProgress.total > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden", maxWidth: 260 }}>
                  <div style={{ height: "100%", width: `${Math.round((transferProgress.done / transferProgress.total) * 100)}%`, background: "var(--primary)", borderRadius: 99, transition: "width 0.1s linear" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4 }}>
                  {transferProgress.done} of {transferProgress.total} keys copied
                </div>
              </div>
            )}

            {/* Warn if target already has data */}
            {targetHasData && !isTransferring && (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--warning)", display: "flex", alignItems: "center", gap: 6 }}>
                ⚠ The selected workspace already has data — transferring will overwrite it.
              </div>
            )}
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
