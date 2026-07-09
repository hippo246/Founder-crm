import { NAV_TABS, NAV_GROUPS } from "../../config/navConfig.js";

export default function Sidebar({ tab, setTab, setMobileMenu, sidebarOpen, setSidebarOpen, businessName, role }) {
  return (
    <aside
      className="sidebar"
      style={{
        width: sidebarOpen ? 218 : 52,
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden"
      }}
    >
      {/* Logo */}
      <div className="sidebar-logo" style={{ overflow: "hidden", flexShrink: 0 }}>
        <div className="sidebar-logo-icon">⚡</div>
        {sidebarOpen && (
          <span className="sidebar-logo-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {businessName}
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_GROUPS.map(group => {
          const groupTabs = NAV_TABS.filter(t => t.group === group);
          return (
            <div key={group} style={{ marginBottom: 4 }}>
              {sidebarOpen && <div className="sidebar-group-label">{group}</div>}
              {groupTabs.map(t => (
                <button
                  key={t.id}
                  data-testid={`nav-${t.id}`}
                  className={`sidebar-item${tab === t.id ? " active" : ""}`}
                  onClick={() => { setTab(t.id); if (setMobileMenu) setMobileMenu(false); }}
                  title={t.label}
                  aria-current={tab === t.id ? "page" : undefined}
                  aria-label={t.label}
                  style={{ justifyContent: sidebarOpen ? "flex-start" : "center" }}
                >
                  <span className="sidebar-item-icon">{t.icon}</span>
                  {sidebarOpen && (
                    <span className="sidebar-item-label" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ flexShrink: 0, overflow: "hidden" }}>
        {sidebarOpen ? (
          <div className="sidebar-role-badge" style={{ whiteSpace: "nowrap" }}>
            Role: <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{role}</strong>
          </div>
        ) : (
          <div title={`Role: ${role}`} style={{
            display: "flex", justifyContent: "center", marginBottom: 4
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--accent)", opacity: 0.8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "#fff",
              textTransform: "uppercase"
            }}>
              {role?.slice(0, 2) || "??"}
            </span>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarOpen(p => !p)}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          style={{ justifyContent: sidebarOpen ? "flex-start" : "center" }}
        >
          <span style={{ fontSize: 11, lineHeight: 1 }}>{sidebarOpen ? "‹‹" : "››"}</span>
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
