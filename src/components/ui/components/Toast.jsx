import { useState, useEffect } from "react";

let _setToasts = null;
export const toast = (msg, type = "success") => {
  if (_setToasts) _setToasts(p => [...p, { id: Math.random().toString(36).slice(2), msg, type }]);
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3200);
    return () => clearTimeout(t);
  }, [toasts]);
  const cls = { success: "toast-success", error: "toast-error", info: "toast-info" };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${cls[t.type] || "toast-success"}`}>{t.msg}</div>
      ))}
    </div>
  );
}
