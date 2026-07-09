export default function BottomNav({ tab, setTab, setMobileMenu, mobileMenu }) {
  const tabs = [
    { id: "dashboard", icon: "⊞", label: "Home" },
    { id: "contacts", icon: "👥", label: "Contacts" },
    { id: "leads", icon: "🎯", label: "Leads" },
    { id: "tasks", icon: "✅", label: "Tasks" }
  ];

  return (
    <div className="mobile-nav-bar" style={{
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 16px",
      paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
      gap: 8,
      position: "fixed",
      bottom: "env(safe-area-inset-bottom, 16px)",
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 32px)",
      maxWidth: 400,
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: 24,
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
      zIndex: 100,
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
              background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              cursor: "pointer",
              color: active ? "var(--text)" : "var(--text-muted)",
              flex: 1,
              height: 48,
              borderRadius: 16,
              position: "relative",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: active ? "scale(1.05)" : "scale(1)",
              boxShadow: active ? "0 0 15px rgba(99, 102, 241, 0.2)" : "none"
            }}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 24,
                height: 3,
                borderRadius: 3,
                background: "var(--accent)",
                boxShadow: "0 2px 10px var(--accent)"
              }} />
            )}
            <span style={{ 
              fontSize: active ? 22 : 20, 
              lineHeight: 1, 
              color: active ? "var(--accent)" : "inherit",
              transition: "all 0.3s ease",
              filter: active ? "drop-shadow(0 0 8px rgba(99,102,241,0.5))" : "none"
            }}>
              {t.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.02em", opacity: active ? 1 : 0.8 }}>{t.label}</span>
          </button>
        );
      })}

      {/* Menu / More Button */}
      <button
        onClick={() => setMobileMenu(v => !v)}
        aria-label="Open menu"
        aria-expanded={!!mobileMenu}
        style={{
          background: mobileMenu ? "rgba(255, 255, 255, 0.1)" : "transparent",
          border: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          cursor: "pointer",
          color: mobileMenu ? "var(--text)" : "var(--text-muted)",
          flex: 1,
          height: 48,
          borderRadius: 16,
          position: "relative",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: mobileMenu ? "scale(1.05)" : "scale(1)",
        }}
      >
        <span style={{ 
          fontSize: mobileMenu ? 22 : 20, 
          lineHeight: 1,
          transition: "all 0.3s ease"
        }}>
          {mobileMenu ? "✕" : "☰"}
        </span>
        <span style={{ fontSize: 10, fontWeight: mobileMenu ? 700 : 500, letterSpacing: "0.02em" }}>Menu</span>
      </button>
    </div>
  );
}
