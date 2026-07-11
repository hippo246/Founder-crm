import { useState } from "react";
import { inputStyle, btnStyle } from "../ui/UI.jsx";
import Calculator from "../Calculator.jsx";

export default function Topbar({ onSearchOpen, onMobileMenu, isDark, toggleTheme, role, settings, saveSettings, workspaces, currentWorkspaceId, switchWorkspace, user, onLogout }) {
  const currentWorkspace = workspaces?.find(w => w.id === currentWorkspaceId) || workspaces?.[0];
  const ownerName = user?.ownerName || settings?.businessName || "";
  const initials = ownerName
    ? ownerName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Close dropdown when clicking outside
  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

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
        {/* Calculator */}
        <Calculator 
          exchangeRates={settings.exchangeRates || {}}
          defaultCurrency={settings.currency || "INR"}
        />

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

        {/* User Profile Dropdown */}
        {onLogout && (
          <div style={{ position: "relative" }} onClick={handleDropdownClick}>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              {/* Online status indicator */}
              <div style={{ position: "relative" }}>
                <div
                  title={ownerName}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), #6366F1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff",
                    flexShrink: 0, userSelect: "none"
                  }}
                >
                  {initials}
                </div>
                {/* Active status dot */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    background: "var(--success)",
                    borderRadius: "50%",
                    border: "2px solid var(--surface)",
                    zIndex: 1
                  }}
                  title="Online"
                />
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: 8,
                  minWidth: 200,
                  boxShadow: "var(--shadow-md)",
                  zIndex: 1000
                }}
              >
                {/* User Info */}
                <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{ownerName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{role}</div>
                  <div style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, background: "var(--success)", borderRadius: "50%" }} />
                    Online
                  </div>
                </div>

                {/* Theme Toggle */}
                <button
                  style={{ ...btnStyle("ghost", "sm"), width: "100%", justifyContent: "flex-start" }}
                  onClick={() => {
                    toggleTheme();
                    setShowProfileDropdown(false);
                  }}
                >
                  {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
                </button>

                {/* Logout */}
                <button
                  data-testid="logout-btn"
                  style={{ ...btnStyle("ghost", "sm"), width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}
                  onClick={() => {
                    onLogout();
                    setShowProfileDropdown(false);
                  }}
                  aria-label={`Logout${ownerName ? ` (${ownerName})` : ""}`}
                  title={`Logout${ownerName ? ` (${ownerName})` : ""}`}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {showProfileDropdown && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
    </header>
  );
}
