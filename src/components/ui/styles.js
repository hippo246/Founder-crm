export const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)",
  border: "1px solid var(--border-strong)", fontSize: 13,
  background: "var(--input-bg)", color: "var(--text)", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "inherit",
};

export const btnStyle = (variant = "primary", size = "md") => {
  const base = {
    border: "none", borderRadius: "var(--r-md)", cursor: "pointer", fontWeight: 600,
    fontSize: size === "sm" ? 12 : size === "xs" ? 11 : 13,
    padding: size === "sm" ? "6px 12px" : size === "xs" ? "4px 8px" : "10px 20px",
    display: "inline-flex", alignItems: "center", gap: 6,
    transition: "all 0.2s ease", whiteSpace: "nowrap",
    fontFamily: "inherit",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };
  if (variant === "primary") return { ...base, background: "var(--gradient-primary)", color: "#fff" };
  if (variant === "success") return { ...base, background: "var(--gradient-success)", color: "#fff" };
  if (variant === "danger")  return { ...base, background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#fff" };
  if (variant === "warning") return { ...base, background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff" };
  if (variant === "ghost")   return { ...base, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", boxShadow: "none" };
  if (variant === "soft")    return { ...base, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)", boxShadow: "none" };
  return base;
};
