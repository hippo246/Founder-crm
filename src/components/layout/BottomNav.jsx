export default function BottomNav({ tab, setTab, setMobileMenu, mobileMenu }) {
  const tabs = [
    { id: "dashboard", icon: "⊞", label: "Home" },
    { id: "contacts", icon: "👥", label: "Contacts" },
    { id: "leads", icon: "🎯", label: "Leads" },
    { id: "tasks", icon: "✅", label: "Tasks" }
  ];

  return (
    <div className="mobile-nav-bar" style={{
      justifyContent: "space-around",
      alignItems: "center",
      paddingTop: 6,
      paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
      gap: 0
    }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMobileMenu(false); }}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              color: active ? "var(--accent)" : "var(--text-muted)",
              flex: 1,
              padding: "6px 4px",
              position: "relative",
              transition: "color 0.15s"
            }}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 20,
                height: 2,
                borderRadius: "0 0 2px 2px",
                background: "var(--accent)"
              }} />
            )}
            <span style={{ fontSize: 19, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>{t.label}</span>
          </button>
        );
      })}

      {/* Menu / More Button */}
      <button
        onClick={() => setMobileMenu(v => !v)}
        aria-label="Open menu"
        aria-expanded={!!mobileMenu}
        style={{
          background: "none",
          border: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          cursor: "pointer",
          color: mobileMenu ? "var(--accent)" : "var(--text-muted)",
          flex: 1,
          padding: "6px 4px",
          position: "relative",
          transition: "color 0.15s"
        }}
      >
        {mobileMenu && (
          <span style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 20,
            height: 2,
            borderRadius: "0 0 2px 2px",
            background: "var(--accent)"
          }} />
        )}
        <span style={{ fontSize: 19, lineHeight: 1 }}>☰</span>
        <span style={{ fontSize: 10, fontWeight: mobileMenu ? 700 : 500, letterSpacing: "0.01em" }}>Menu</span>
      </button>
    </div>
  );
}
