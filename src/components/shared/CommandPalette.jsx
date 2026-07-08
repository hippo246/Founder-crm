import { useState, useEffect, useCallback } from "react";
import { btnStyle, inputStyle } from "../ui/UI.jsx";

export default function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd => {
    const q = search.toLowerCase();
    return cmd.label.toLowerCase().includes(q) || cmd.keywords?.some(k => k.toLowerCase().includes(q));
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="command-palette-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh"
      }}
    >
      <div
        className="command-palette-box"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <input
            style={{
              ...inputStyle,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              fontSize: 14,
              padding: "10px 12px",
              fontWeight: 400
            }}
            placeholder="Type a command or search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        
        <div style={{ maxHeight: 380, overflow: "auto", padding: "4px" }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No results found
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); onClose(); }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: idx === selectedIndex ? "var(--accent-bg)" : "transparent",
                  border: idx === selectedIndex ? "1px solid var(--accent-border)" : "1px solid transparent",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  marginBottom: 2
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span style={{ fontSize: 16, opacity: 0.8 }}>{cmd.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: "var(--text)" }}>{cmd.label}</div>
                  {cmd.description && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{cmd.description}</div>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd style={{
                    padding: "2px 6px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 3,
                    fontSize: 10,
                    color: "var(--text-muted)",
                    fontFamily: "inherit"
                  }}>
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
        
        <div style={{ 
          padding: "8px 16px", 
          borderTop: "1px solid var(--border)", 
          fontSize: 11, 
          color: "var(--text-muted)",
          background: "var(--surface)"
        }}>
          <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
        </div>
      </div>
    </div>
  );
}
