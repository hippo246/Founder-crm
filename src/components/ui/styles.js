export const inputStyle = {
  width: "100%", 
  padding: "10px 16px", 
  borderRadius: "var(--r-md)",
  border: "1px solid var(--border-strong)", 
  fontSize: 14, 
  lineHeight: 1.5,
  background: "var(--input-bg)", 
  color: "var(--text)", 
  outline: "none",
  boxSizing: "border-box", 
  transition: "all 0.25s ease",
  fontFamily: "inherit",
  backdropFilter: "var(--glass-blur)",
  WebkitBackdropFilter: "var(--glass-blur)",
  boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.05)"
};

// Focus styles to spread onto input onFocus (complement inputStyle)
export const inputFocusStyle = {
  borderColor: "var(--accent)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), inset 0 1px 3px rgba(0, 0, 0, 0.05)",
  background: "var(--surface)",
  transform: "translateY(-1px)",
};

export const btnStyle = (variant = "primary", size = "md") => {
  const base = {
    border: "1px solid transparent", 
    borderRadius: "var(--r-md)", 
    cursor: "pointer", 
    fontWeight: 600,
    fontSize: size === "sm" ? 13 : size === "xs" ? 12 : 14,
    padding: size === "sm" ? "8px 16px" : size === "xs" ? "6px 12px" : "12px 24px",
    display: "inline-flex", 
    alignItems: "center", 
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", 
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    letterSpacing: "0.2px"
  };

  const solid = (bg, hoverBg, color = "#fff", shadow = "none") => ({
    ...base,
    background: bg, 
    color,
    boxShadow: shadow,
    // Note: We use a pseudo-element strategy in real CSS for advanced gradients, but inline styles we use BoxShadow.
  });

  if (variant === "primary") {
    return {
      ...base,
      background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
      color: "#fff",
      boxShadow: "var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.2)",
      border: "1px solid rgba(0,0,0,0.1)",
    };
  }
  
  if (variant === "secondary") {
    return {
      ...base,
      background: "var(--surface-raised)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
      backdropFilter: "var(--glass-blur)",
      WebkitBackdropFilter: "var(--glass-blur)",
    };
  }
  
  if (variant === "success") {
    return solid("var(--success)", "var(--success)", "#fff", "var(--shadow-sm)");
  }
  
  if (variant === "danger") {
    return solid("var(--danger)", "var(--danger)", "#fff", "var(--shadow-sm)");
  }
  
  if (variant === "warning") {
    return solid("var(--warning)", "var(--warning)", "#fff", "var(--shadow-sm)");
  }

  // Outline/transparent variants
  const outline = (extra = {}) => ({
    ...base,
    background: "transparent",
    border: "1px solid var(--border-strong)",
    color: "var(--text)",
    backdropFilter: "var(--glass-blur)",
    WebkitBackdropFilter: "var(--glass-blur)",
    ...extra,
  });

  if (variant === "ghost") return { ...base, background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" };
  if (variant === "soft")  return outline({ background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid transparent" });

  return base;
};
