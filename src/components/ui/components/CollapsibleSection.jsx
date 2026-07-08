import { useState } from "react";

export default function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          cursor: "pointer",
          width: "100%",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text)",
          transition: "background 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--surface-raised)"}
      >
        <span style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
        {title}
      </button>
      {isOpen && (
        <div style={{ marginTop: 12, padding: "0 4px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
