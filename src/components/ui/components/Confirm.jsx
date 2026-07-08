import { btnStyle } from "../styles.js";

export default function Confirm({ msg, message, title, onYes, onNo, onConfirm, onCancel, yesLabel = "Delete", yesVariant = "danger" }) {
  // Support both onYes/onNo and onConfirm/onCancel patterns
  const handleYes = onYes || onConfirm;
  const handleNo = onNo || onCancel;
  const displayMsg = msg || message;
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        {title && <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 10 }}>{title}</div>}
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{displayMsg}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={btnStyle("ghost")} onClick={handleNo}>Cancel</button>
          <button style={btnStyle(yesVariant)} onClick={handleYes}>{yesLabel}</button>
        </div>
      </div>
    </div>
  );
}
