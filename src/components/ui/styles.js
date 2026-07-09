export const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)",
  border: "1px solid var(--border-strong)", fontSize: 13, lineHeight: 1.5,
  background: "var(--input-bg)", color: "var(--text)", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "inherit",
};

// Focus styles to spread onto input onFocus (complement inputStyle)
export const inputFocusStyle = {
  borderColor: "var(--accent)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent)",
};

export const btnStyle = (variant = "primary", size = "md") => {
  const base = {
    border: "none", borderRadius: "var(--r-md)", cursor: "pointer", fontWeight: 600,
    fontSize: size === "sm" ? 12 : size === "xs" ? 11 : 13,
    padding: size === "sm" ? "6px 12px" : size === "xs" ? "4px 8px" : "10px 20px",
    display: "inline-flex", alignItems: "center", gap: 6,
    transition: "opacity 0.15s, box-shadow 0.15s", whiteSpace: "nowrap",
    fontFamily: "inherit",
  };

  // Solid variants — subtle shadow, lighten on hover via opacity
  const solid = (bg, color = "#fff") => ({
    ...base,
    background: bg, color,
    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
  });

  if (variant === "primary")   return solid("var(--accent)");
  if (variant === "secondary") return solid("var(--surface-raised)", "var(--text)");
  if (variant === "success")   return solid("var(--success)");
  if (variant === "danger")    return solid("var(--danger)");
  if (variant === "warning")   return solid("var(--warning)");

  // Outline/transparent variants — no shadow
  const outline = (extra = {}) => ({
    ...base,
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    ...extra,
  });

  if (variant === "ghost") return outline();
  if (variant === "soft")  return outline({ background: "var(--surface-raised)" });

  return base;
};
