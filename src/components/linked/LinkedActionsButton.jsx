import { useState } from "react";
import { btnStyle } from "../ui/UI.jsx";
import { getAvailableLinkedActions } from "./linkedActionsConfig.js";
import LinkedRecordModal from "./LinkedRecordModal.jsx";

export default function LinkedActionsButton({ 
  sourceEntity, 
  sourceEntityType, 
  onSave, 
  workspaceId,
  label = "+ Linked Record"
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  const availableActions = getAvailableLinkedActions(sourceEntityType);
  
  if (availableActions.length === 0) {
    return null;
  }
  
  const handleActionClick = (action) => {
    setSelectedTarget(action.target);
    setShowModal(true);
  };
  
  const handleModalSave = (targetModule, record) => {
    onSave(targetModule, record);
    setShowModal(false);
    setSelectedTarget(null);
  };
  
  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          style={btnStyle("primary", "sm")}
          onClick={() => setShowModal(true)}
        >
          {label}
        </button>
      </div>
      
      {showModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              background: "var(--surface)",
              borderRadius: "var(--r-lg)",
              padding: 20,
              minWidth: 400,
              maxWidth: 600,
              maxHeight: "80vh",
              overflowY: "auto",
              border: "1px solid var(--border)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              Create Linked Record
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
              From: {sourceEntity.title || sourceEntity.name || sourceEntity.item || 'selected item'}
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {availableActions.map(action => (
                <button
                  key={action.target}
                  style={{
                    ...btnStyle("ghost"),
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 16,
                    minHeight: 80,
                  }}
                  onClick={() => handleActionClick(action)}
                >
                  <span style={{ fontSize: 24 }}>{action.icon}</span>
                  <span style={{ fontSize: 12, textAlign: "center" }}>{action.label}</span>
                </button>
              ))}
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button style={btnStyle("ghost")} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedTarget && (
        <LinkedRecordModal
          sourceEntity={sourceEntity}
          sourceEntityType={sourceEntityType}
          targetModule={selectedTarget}
          onClose={() => {
            setShowModal(false);
            setSelectedTarget(null);
          }}
          onSave={handleModalSave}
          workspaceId={workspaceId}
        />
      )}
    </>
  );
}
