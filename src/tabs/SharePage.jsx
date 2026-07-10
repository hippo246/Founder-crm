// ─── SharePage.jsx ────────────────────────────────────────────────────────────
// Public read-only view for shared documents.
// Mounted at /#/share/{workspaceId}/{token}  (see routing note in App.jsx patch)
//
// No authentication is required. The token is the secret.
// Renders the document HTML, plus Download (print-to-PDF) and Print buttons.
// If allowUpload is true, client can also attach files.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { getShareToken, addClientUpload } from "../lib/shareSync.js";

// ── Tiny inline helpers ───────────────────────────────────────────────────────

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

// ── SharePage ─────────────────────────────────────────────────────────────────

export default function SharePage() {
  // Parse /#/share/{workspaceId}/{token} from the hash
  const hash   = window.location.hash.replace(/^#\/share\//, "");
  const parts  = hash.split("/");
  const workspaceId = parts[0] || null;
  const token       = parts[1] || null;

  const [state, setState]   = useState("loading"); // loading | ready | error
  const [tokenData, setTokenData] = useState(null);

  // Upload state
  const [uploads, setUploads]   = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef = useRef(null);

  // ── Load token on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId || !token) {
      setState("error");
      return;
    }
    getShareToken(workspaceId, token).then(data => {
      if (!data) { setState("error"); return; }
      setTokenData(data);
      setState("ready");
    }).catch(() => setState("error"));
  }, [workspaceId, token]);

  // ── Print / Download ──────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${tokenData.docName}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.6; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ccc; padding: 6px 10px; }
        @media print { body { margin: 0; } .no-print { display: none !important; } }
      </style>
    </head><body>
      <h1>${tokenData.docName}</h1>
      <div class="meta">
        Type: ${tokenData.docType} &nbsp;|&nbsp; Status: ${tokenData.docStatus}
        ${tokenData.relatedClient ? ` &nbsp;|&nbsp; Client: ${tokenData.relatedClient}` : ""}
      </div>
      ${tokenData.content || "<p><em>No content.</em></p>"}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUploads = [];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const result = await addClientUpload(workspaceId, token, {
          name:   file.name,
          size:   file.size,
          dataUrl,
        });
        if (result) newUploads.push(result);
      } catch (err) {
        console.warn("Upload failed for", file.name, err);
      }
    }
    setUploads(prev => [...prev, ...newUploads]);
    setUploading(false);
    setUploadDone(true);
    setTimeout(() => setUploadDone(false), 3000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={styles.spinner} />
          <p style={{ color: "#888", marginTop: 16, fontSize: 14 }}>Loading document…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: "#222", fontSize: 20, marginBottom: 8 }}>Link not found or expired</h2>
          <p style={{ color: "#888", fontSize: 14, maxWidth: 360, textAlign: "center" }}>
            This link may have been revoked or is invalid. Please ask the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Header bar ── */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{tokenData.docName}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {tokenData.docType}
              {tokenData.relatedClient ? ` · ${tokenData.relatedClient}` : ""}
              {" · "}
              <span style={{ background: "#f0f0f0", padding: "1px 7px", borderRadius: 10, fontSize: 11 }}>
                {tokenData.docStatus}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={styles.btnSecondary}>
              🖨 Print
            </button>
            <button onClick={handlePrint} style={styles.btnPrimary}>
              ⬇ Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Document content ── */}
      <div style={styles.docWrap}>
        <div
          style={styles.docBody}
          dangerouslySetInnerHTML={{ __html: tokenData.content || "<p><em>This document has no content yet.</em></p>" }}
        />
      </div>

      {/* ── Client upload section ── */}
      {tokenData.allowUpload && (
        <div style={styles.uploadSection}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 4 }}>
            📎 Upload files
          </h3>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
            Attach files for the sender to review. No account needed.
          </p>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? "#6c63ff" : "#ccc",
              background: dragOver ? "rgba(108,99,255,0.04)" : "#fafafa",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={e => handleFiles(e.target.files)}
            />
            {uploading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={styles.spinner} />
                <span style={{ fontSize: 13, color: "#888" }}>Uploading…</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
                  Click to choose files or drag & drop
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Any file type accepted</div>
              </>
            )}
          </div>

          {/* Success toast */}
          {uploadDone && (
            <div style={styles.toast}>
              ✅ Files uploaded successfully — the sender can now see them.
            </div>
          )}

          {/* Uploaded file list */}
          {uploads.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
                Uploaded this session
              </div>
              {uploads.map(f => (
                <div key={f.id} style={styles.fileRow}>
                  <span style={{ fontSize: 18 }}>📎</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{fmtSize(f.size)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>✓ Sent</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={styles.footer}>
        Shared document · read-only view · powered by your CRM
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f4f5",
    fontFamily: "Arial, sans-serif",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #6c63ff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 24px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 860,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  btnPrimary: {
    padding: "7px 16px",
    borderRadius: 7,
    border: "none",
    background: "#6c63ff",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "7px 16px",
    borderRadius: 7,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
  },
  docWrap: {
    maxWidth: 860,
    margin: "32px auto",
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    padding: "40px 48px",
  },
  docBody: {
    lineHeight: 1.7,
    color: "#111",
    fontSize: 14,
  },
  uploadSection: {
    maxWidth: 860,
    margin: "0 auto 32px",
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    padding: "28px 32px",
  },
  dropZone: {
    border: "2px dashed #ccc",
    borderRadius: 9,
    padding: "32px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  },
  toast: {
    marginTop: 12,
    padding: "10px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 7,
    color: "#15803d",
    fontSize: 13,
    fontWeight: 600,
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 7,
    background: "#fafafa",
  },
  footer: {
    textAlign: "center",
    color: "#bbb",
    fontSize: 11,
    padding: "24px 0 32px",
  },
};

// Inject keyframe animation for spinner
if (typeof document !== "undefined" && !document.getElementById("share-spin-style")) {
  const s = document.createElement("style");
  s.id = "share-spin-style";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}
