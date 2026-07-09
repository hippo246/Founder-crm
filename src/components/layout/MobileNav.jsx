import { NAV_TABS, NAV_GROUPS } from "../../config/navConfig.js";

export default function MobileNav({ tab, setTab, mobileMenu, setMobileMenu, businessName }) {
  // Always render so the slide animation works; visibility controlled by transform
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200, display: "flex",
        pointerEvents: mobileMenu ? "auto" : "none"
      }}
      aria-modal={mobileMenu ? "true" : undefined}
      role="dialog"
      aria-hidden={!mobileMenu}
    >
      {/* Drawer */}
      <div style={{
        width: 240,
        background: "var(--sidebar-bg)",
        overflowY: "auto",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "var(--shadow-xl)",
        transform: mobileMenu ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "transform"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 14px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0
        }}>
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
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 16,
              cursor: "pointer",
              padding: "5px 8px",
              borderRadius: "var(--r-sm)",
              lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 32, minHeight: 32
            }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
          {NAV_GROUPS.map(group => {
            const groupTabs = NAV_TABS.filter(t => t.group === group);
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <div className="sidebar-group-label">{group}</div>
                {groupTabs.map(t => (
                  <button
                    key={t.id}
                    className={`sidebar-item${tab === t.id ? " active" : ""}`}
                    onClick={() => { setTab(t.id); setMobileMenu(false); }}
                    aria-current={tab === t.id ? "page" : undefined}
                  >
                    <span className="sidebar-item-icon">{t.icon}</span>
                    <span className="sidebar-item-label">{t.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Backdrop */}
      <div
        style={{
          flex: 1,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          opacity: mobileMenu ? 1 : 0,
          transition: "opacity 0.22s ease"
        }}
        onClick={() => setMobileMenu(false)}
        aria-label="Close menu"
      />
    </div>
  );
}
