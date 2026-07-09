import { useState, useEffect } from "react";
import { SectionCard, FormField, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";

export default function IPAllowlistSection({ addAudit }) {
  const [ips, setIps] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("mock_ip_allowlist") || "[]");
      setIps(stored);
      setEnabled(localStorage.getItem("mock_ip_enforce") === "true");
    } catch {}
  }, []);

  const saveState = (newIps, newEnabled) => {
    setIps(newIps);
    setEnabled(newEnabled);
    localStorage.setItem("mock_ip_allowlist", JSON.stringify(newIps));
    localStorage.setItem("mock_ip_enforce", newEnabled.toString());
  };

  const addIp = () => {
    if (!newIp.trim()) { toast("IP Address is required", "error"); return; }
    
    // Basic IP validation regex (IPv4)
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?$/;
    if (!ipv4Regex.test(newIp.trim())) {
      toast("Invalid IP or CIDR format", "error");
      return;
    }
    
    const entry = {
      id: Date.now().toString(),
      ip: newIp.trim(),
      desc: newDesc.trim() || "Whitelisted IP",
      addedAt: new Date().toISOString()
    };
    
    const newIps = [entry, ...ips];
    saveState(newIps, enabled);
    addAudit("Security", "IP Added", `Added ${entry.ip} to allowlist`);
    toast("IP added to allowlist");
    
    setNewIp("");
    setNewDesc("");
  };

  const removeIp = (id) => {
    const key = ips.find(k => k.id === id);
    const newIps = ips.filter(k => k.id !== id);
    saveState(newIps, enabled);
    addAudit("Security", "IP Removed", `Removed ${key?.ip} from allowlist`);
    toast("IP removed");
  };

  const toggleEnforce = (val) => {
    saveState(ips, val);
    addAudit("Security", "Toggle IP Enforce", `IP Allowlist enforcement set to ${val}`);
    toast(`IP restrictions ${val ? 'enabled' : 'disabled'}`);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>IP Allowlisting & Geofencing</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={enabled} onChange={e => toggleEnforce(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
            Enforce IP Restrictions
          </label>
        </div>
        
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          Restrict access to your workspace to only the IP addresses or CIDR ranges listed below. 
          If enforcement is enabled and a user attempts to log in from an unlisted IP, their access will be blocked.
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 24, padding: 16, background: "var(--surface-raised)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ flex: 1 }}>
            <FormField label="IP Address or CIDR (e.g. 192.168.1.1 or 10.0.0.0/24)">
              <input style={inputStyle} value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="0.0.0.0" />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Description">
              <input style={inputStyle} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Office HQ" />
            </FormField>
          </div>
          <button style={{ ...btnStyle("primary"), height: 38, marginBottom: 2 }} onClick={addIp}>Add IP</button>
        </div>

        {ips.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: 24, textAlign: "center", background: "var(--surface-raised)", borderRadius: 8 }}>
            No IP addresses configured. (Warning: If you enable enforcement now, you might lock yourself out!)
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--surface-raised)" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>IP / Range</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Description</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Added</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase" }}>Actions</th>
            </tr></thead>
            <tbody>{ips.map((ip) => (
              <tr key={ip.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "12px", fontWeight: 600 }}>{ip.ip}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)" }}>{ip.desc}</td>
                <td style={{ padding: "12px", color: "var(--text-muted)" }}>{new Date(ip.addedAt).toLocaleDateString()}</td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => removeIp(ip.id)}>Remove</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
