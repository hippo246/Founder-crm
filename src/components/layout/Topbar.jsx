import { inputStyle, btnStyle } from "../ui/UI.jsx";

export default function Topbar({ onSearchOpen, onMobileMenu, isDark, toggleTheme, role, settings, saveSettings, workspaces, currentWorkspaceId, switchWorkspace, user, onLogout }) {
  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId) || workspaces?.[0];
  const ownerName = user?.ownerName || settings?.businessName || "";
  const initials = ownerName
    ? ownerName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

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

      {/* Workspace switcher */}
      <div style={{ position: "relative", marginRight: 8, flexShrink: 0 }}>
        <select
          style={{
            ...inputStyle,
            width: "auto",
            padding: "6px 28px 6px 10px",
            fontSize: 12,
            maxWidth: 180,
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
          position: "absolute", right: 8, top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none", fontSize: 9, color: "var(--text-muted)"
        }}>▼</div>
      </div>

      {/* Search trigger */}
      <button
        data-testid="global-search-trigger"
        className="topbar-search"
        onClick={onSearchOpen}
        aria-label="Global search (⌘K)"
      >
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
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        {/* User + logout */}
        {onLogout && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {ownerName && (
              <div
                title={ownerName}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), #6366F1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  flexShrink: 0, userSelect: "none", cursor: "default"
                }}
              >
                {initials}
              </div>
            )}
            <button
              data-testid="logout-btn"
              style={{ ...btnStyle("ghost", "sm"), padding: "5px 9px", fontSize: 12, color: "var(--text-muted)" }}
              onClick={onLogout}
              aria-label={`Logout${ownerName ? ` (${ownerName})` : ""}`}
              title={`Logout${ownerName ? ` (${ownerName})` : ""}`}
            >
              🚪
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
