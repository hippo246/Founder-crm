import { useState } from "react";
import { inputStyle } from "../styles.js";

export default function LinkedRecordSelector({ label, value, onChange, options, placeholder = "Select...", allowClear = true }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedOption = options.find(opt => opt.value === value);
  
  return (
    <div style={{ position: "relative" }}>
      {label && <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...inputStyle,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none"
        }}
      >
        <span style={{ color: selectedOption ? "var(--text)" : "var(--text-muted)" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          marginTop: 4,
          maxHeight: 200,
          overflow: "auto",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}>
          <input
            style={{ ...inputStyle, border: "none", borderBottom: "1px solid var(--border)", borderRadius: 0 }}
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          {allowClear && (
            <div
              onClick={e => { e.stopPropagation(); onChange(""); setIsOpen(false); }}
              style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
            >
              — Clear selection —
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "12px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>No results</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt.value}
                onClick={e => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  color: opt.value === value ? "var(--accent)" : "var(--text)",
                  cursor: "pointer",
                  background: opt.value === value ? "var(--accent-dim)" : "transparent",
                  fontWeight: opt.value === value ? 600 : 400
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
