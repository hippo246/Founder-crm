import { useState, useEffect } from "react";
import { SectionCard, btnStyle, toast, Badge } from "../../components/ui/UI.jsx";

export default function DeviceManagementSection({ addAudit }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // Generate some mock active sessions based on user agent
    const currentDevice = {
      id: "sess_1",
      device: "Mac OS",
      browser: "Chrome",
      ip: "192.168.1.100",
      location: "San Francisco, CA",
      lastActive: new Date().toISOString(),
      isCurrent: true
    };
    
    const mockSessions = [
      currentDevice,
      {
        id: "sess_2",
        device: "iOS",
        browser: "Safari",
        ip: "172.56.21.34",
        location: "San Jose, CA",
        lastActive: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
        isCurrent: false
      }
    ];
    setSessions(mockSessions);
  }, []);

  const revokeSession = (id) => {
    setSessions(sessions.filter(s => s.id !== id));
    addAudit("Security", "Revoke Session", `Revoked device session: ${id}`);
    toast("Session revoked successfully");
  };

  const revokeAllOther = () => {
    setSessions(sessions.filter(s => s.isCurrent));
    addAudit("Security", "Revoke All Sessions", "Revoked all other device sessions");
    toast("All other sessions signed out");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Active Sessions</div>
          {sessions.length > 1 && (
            <button style={{ ...btnStyle("ghost", "sm"), color: "var(--danger)" }} onClick={revokeAllOther}>
              Sign out of all other sessions
            </button>
          )}
        </div>
        
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
          These devices are currently logged into your account. If you recognize a device you don't use anymore, you can sign out of it here.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map(s => (
            <div key={s.id} style={{ padding: 16, background: "var(--surface-raised)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: s.isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ fontSize: 24 }}>{s.device === "iOS" ? "📱" : "💻"}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
                    {s.device} · {s.browser}
                    {s.isCurrent && <Badge label="Current Device" style={{ background: "var(--accent)", color: "#fff" }} />}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {s.location} ({s.ip}) · Last active: {s.isCurrent ? "Just now" : new Date(s.lastActive).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {!s.isCurrent && (
                <button style={{ ...btnStyle("ghost", "sm") }} onClick={() => revokeSession(s.id)}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
