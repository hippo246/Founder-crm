import { useState, useEffect } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";

export default function APIKeysSection({ addAudit }) {
  const [keys, setKeys] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState("Read Only");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mock_api_keys") || "[]");
      setKeys(stored);
    } catch {}
  }, []);

  const saveKeys = (newKeys) => {
    setKeys(newKeys);
    localStorage.setItem("mock_api_keys", JSON.stringify(newKeys));
  };

  const generateKey = () => {
    if (!newKeyName.trim()) { toast("Key name is required", "error"); return; }
    
    // Generate a secure looking mock token
    const randomHex = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const token = `fdr_${randomHex}`;
    
    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      scope: newKeyScope,
      token,
      lastUsed: null,
      createdAt: new Date().toISOString()
    };
    
    saveKeys([newKey, ...keys]);
    addAudit("Security", "API Key Created", `Generated new API key: ${newKeyName}`);
    toast("API Key generated successfully");
    
    setShowNew(false);
    setNewKeyName("");
  };

  const revokeKey = (id) => {
    const key = keys.find(k => k.id === id);
    saveKeys(keys.filter(k => k.id !== id));
    addAudit("Security", "API Key Revoked", `Revoked API key: ${key?.name}`);
    toast("API Key revoked", "info");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Developer API Keys</div>
          <button style={btnStyle("primary", "sm")} onClick={() => setShowNew(true)}>+ Generate New Key</button>
        </div>
        
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          Use API keys to authenticate external scripts and integrations with Founder OS. Treat these keys like passwords and never commit them to version control.
        </div>

        {showNew && (
          <div style={{ padding: 16, background: "var(--surface-raised)", borderRadius: 8, marginBottom: 16, border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Generate New Key</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Key Name">
                <input style={inputStyle} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Zapier Integration" />
              </FormField>
              <FormField label="Permissions">
                <select style={inputStyle} value={newKeyScope} onChange={e => setNewKeyScope(e.target.value)}>
                  <option value="Read Only">Read Only</option>
                  <option value="Read & Write">Read & Write</option>
                  <option value="Full Access">Full Access</option>
                </select>
              </FormField>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={btnStyle("primary", "sm")} onClick={generateKey}>Generate Key</button>
              <button style={btnStyle("ghost", "sm")} onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 24, textAlign: "center", background: "var(--surface-raised)", borderRadius: 8 }}>
            No API keys generated yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {keys.map(k => (
              <div key={k.id} style={{ padding: 16, background: "var(--surface-raised)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      {k.name}
                      <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--primary-dim)", color: "var(--accent)", borderRadius: 12, fontWeight: 600 }}>{k.scope}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Created {new Date(k.createdAt).toLocaleDateString()} · Last used: {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never"}</div>
                  </div>
                  <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => revokeKey(k.id)}>Revoke</button>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <code style={{ flex: 1, fontSize: 13, fontFamily: "monospace", color: "var(--text)" }}>{k.token}</code>
                  <button style={btnStyle("ghost", "xs")} onClick={() => copyToClipboard(k.token)}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
