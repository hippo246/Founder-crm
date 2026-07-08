export default function EmptyState({ icon = "📭", title, sub, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{sub}</p>
      {action}
    </div>
  );
}
