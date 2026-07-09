export default function ProgressBar({ value, color = "var(--accent)", label }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: color, transition: "width 0.35s ease" }}
      />
    </div>
  );
}
