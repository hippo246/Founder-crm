import { STATUS_COLORS } from "../../../config/crmConfig.js";

export default function Badge({ label, size = "sm" }) {
  const s = STATUS_COLORS[label] || { bg: "rgba(100,116,139,0.12)", color: "#94A3B8" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: size === "sm" ? "2px 8px" : "4px 12px",
      borderRadius: 999, fontSize: size === "sm" ? 11 : 12,
      fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
      letterSpacing: "0.2px",
    }}>
      {label}
    </span>
  );
}
