export default function StatMini({ label, value, color = "var(--text)", onClick }) {
  return (
    <div
      className={`stat-card${onClick ? " clickable" : ""}`}
      onClick={onClick}
    >
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
    </div>
  );
}
