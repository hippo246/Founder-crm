import { inputStyle, btnStyle } from "../ui/UI.jsx";

export default function Topbar({ onSearchOpen, onMobileMenu, isDark, toggleTheme, role, settings, saveSettings, workspaces, currentWorkspaceId, switchWorkspace, user, onLogout }) {
  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId) || workspaces?.[0];

  return (
    <header className="topbar">
      {/* Mobile hamburger — hidden on desktop via CSS */}
      <button
        data-testid="mobile-menu-btn"
        className="mobile-menu-btn"
        style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)", padding: "4px 6px", borderRadius: "var(--r-sm)", flexShrink: 0 }}
        onClick={onMobileMenu}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Workspace switcher - always visible */}
      <div style={{ position: "relative", marginRight: 8 }}>
        <select
          style={{ 
            ...inputStyle, 
            width: "auto", 
            padding: "6px 32px 6px 12px", 
            fontSize: 12, 
            maxWidth: 200,
            appearance: "none",
            backgroundImage: "none",
            cursor: "pointer",
            fontWeight: 600
          }}
          value={currentWorkspaceId}
          onChange={e => switchWorkspace(e.target.value)}
          aria-label="Switch workspace"
        >
          {workspaces?.map(w => (
            <option key={w.id} value={w.id}>{w.icon || "📁"} {w.name}</option>
          ))}
        </select>
        <div style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          fontSize: 10,
          color: "var(--text-muted)"
        }}>▼</div>
      </div>

      {/* Search trigger */}
      <button data-testid="global-search-trigger" className="topbar-search" onClick={onSearchOpen} aria-label="Global search">
        <span style={{ opacity: 0.4, fontSize: 13 }}>🔍</span>
        <span style={{ fontSize: 13 }}>Search everything…</span>
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.35, background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "2px 5px" }}>⌘K</span>
      </button>

      {/* Right actions */}
      <div className="topbar-actions">
        {/* Theme toggle */}
        <button
          data-testid="theme-toggle"
          style={{ ...btnStyle("ghost", "sm"), padding: "5px 9px", fontSize: 14 }}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        {/* Role selector */}
        <select
          data-testid="role-selector"
          style={{ ...inputStyle, width: "auto", padding: "5px 9px", fontSize: 12, maxWidth: 120 }}
          value={role}
          onChange={e => saveSettings({ ...settings, role: e.target.value })}
          aria-label="Role selector"
        >
          {["Owner", "Admin", "Staff", "Viewer"].map(r => <option key={r}>{r}</option>)}
        </select>

        {/* Logout button */}
        {onLogout && (
          <button
            data-testid="logout-btn"
            style={{ ...btnStyle("ghost", "sm"), padding: "5px 9px", fontSize: 12, color: "var(--text-muted)" }}
            onClick={onLogout}
            aria-label="Logout"
            title={`Logout${user?.ownerName ? ` (${user.ownerName})` : ""}`}
          >
            🚪
          </button>
        )}
      </div>
    </header>
  );
}
