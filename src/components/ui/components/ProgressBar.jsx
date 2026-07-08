export default function ProgressBar({ value, color = "var(--accent)" }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(100, value || 0)}%`, background: color }} />
    </div>
  );
}
