import { NAV_TABS, NAV_GROUPS } from "../../config/navConfig.js";

export default function Sidebar({ tab, setTab, setMobileMenu, sidebarOpen, setSidebarOpen, businessName, role }) {
  return (
    <aside className="sidebar" style={{ width: sidebarOpen ? 218 : 52 }}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        {sidebarOpen && <span className="sidebar-logo-name">{businessName}</span>}
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav">
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
                  title={!sidebarOpen ? t.label : undefined}
                  style={{ justifyContent: sidebarOpen ? "flex-start" : "center" }}
                >
                  <span className="sidebar-item-icon">{t.icon}</span>
                  {sidebarOpen && <span className="sidebar-item-label">{t.label}</span>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {sidebarOpen && (
          <div className="sidebar-role-badge">
            Role: <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{role}</strong>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarOpen(p => !p)}
          title={sidebarOpen ? "Collapse" : "Expand"}
          style={{ justifyContent: sidebarOpen ? "flex-start" : "center" }}
        >
          <span style={{ fontSize: 10 }}>{sidebarOpen ? "◀" : "▶"}</span>
          {sidebarOpen && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
