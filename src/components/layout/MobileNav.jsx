import { NAV_TABS, NAV_GROUPS } from "../../config/navConfig.js";

export default function MobileNav({ tab, setTab, mobileMenu, setMobileMenu, businessName, workspaces = [], currentWorkspaceId, switchWorkspace }) {
  // Always render so the slide animation works; visibility controlled by transform
  return (
    <>
      <style>{`
        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 8px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.04);
          background: rgba(255,255,255,0.02); color: var(--text-muted);
          cursor: pointer; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-nav-btn:active {
          transform: scale(0.92);
          background: rgba(255,255,255,0.06);
        }
        .mobile-nav-btn.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.05));
          border-color: rgba(99,102,241,0.3);
          color: var(--text);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 16px rgba(0,0,0,0.2);
        }
        .mobile-nav-icon {
          font-size: 26px; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .mobile-nav-btn.active .mobile-nav-icon {
          filter: drop-shadow(0 0 12px rgba(99,102,241,0.7));
          transform: translateY(-2px) scale(1.1);
        }
        .mobile-sheet-content::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        pointerEvents: mobileMenu ? "auto" : "none"
      }}
      aria-modal={mobileMenu ? "true" : undefined}
      role="dialog"
      inert={!mobileMenu ? true : undefined}
    >
      {/* Backdrop (must cover everything, absolute positioned) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          opacity: mobileMenu ? 1 : 0,
          transition: "opacity 0.22s ease",
          zIndex: 1
        }}
        onClick={() => setMobileMenu(false)}
        aria-label="Close menu"
      />
      {/* Bottom Sheet Menu */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        background: "rgba(15, 23, 42, 0.85)", // Glassmorphic background
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.5)",
        transform: mobileMenu ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1)",
        willChange: "transform",
        zIndex: 2,
        paddingBottom: "env(safe-area-inset-bottom, 16px)"
      }} className="mobile-sheet-content">
        {/* Drag Handle Indicator */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Header with Workspace Switcher */}
        <div style={{
          padding: "8px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "var(--r-sm)",
                background: "linear-gradient(135deg, #3B82F6, #6366F1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13
              }}>⚡</div>
              <span style={{ fontWeight: 700, color: "#E8EEFF", fontSize: 13 }}>{businessName}</span>
            </div>
            <button
              onClick={() => setMobileMenu(false)}
              style={{
                background: "rgba(255,255,255,0.06)", border: "none",
                color: "var(--text-muted)", fontSize: 16, cursor: "pointer",
                padding: "5px 8px", borderRadius: "var(--r-sm)",
                display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: 32, minHeight: 32
              }}
              aria-label="Close menu"
            >✕</button>
          </div>
          
          <div style={{ position: "relative" }}>
            <select
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "var(--r-md)", color: "#E8EEFF", fontSize: 14,
                appearance: "none", cursor: "pointer", outline: "none"
              }}
              value={currentWorkspaceId}
              onChange={(e) => switchWorkspace(e.target.value)}
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} style={{ color: "#000" }}>
                  {ws.icon || "📁"} {ws.name}
                </option>
              ))}
            </select>
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--text-muted)" }}>▼</div>
          </div>
        </div>

        {/* Nav Grid */}
        <nav className="mobile-sheet-content" style={{ flex: 1, padding: "16px 20px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {NAV_GROUPS.map(group => {
            const groupTabs = NAV_TABS.filter(t => t.group === group);
            return (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                  {groupTabs.map(t => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setMobileMenu(false); }}
                        className={`mobile-nav-btn ${active ? "active" : ""}`}
                      >
                        <span className="mobile-nav-icon">{t.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em" }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
    </>

  );
}
