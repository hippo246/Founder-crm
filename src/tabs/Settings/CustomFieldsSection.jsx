import { useState } from "react";
import { Modal, FormField, SectionCard, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";
import { saveLS, saveWorkspaceData } from "../../lib/storage.js";

export default function CustomFieldsSection({ customFields, setCustomFields, workspaceId = "workspace-1" }) {
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState(null);
  const [customFieldForm, setCustomFieldForm] = useState({ name: "", type: "text", entityType: "Contact", options: "" });

  const openAddCustomField = () => {
    setEditingCustomField(null);
    setCustomFieldForm({ name: "", type: "text", entityType: "Contact", options: "" });
    setShowCustomFieldModal(true);
  };

  const openEditCustomField = (field) => {
    setEditingCustomField(field);
    setCustomFieldForm({ ...field });
    setShowCustomFieldModal(true);
  };

  const saveCustomField = () => {
    if (!customFieldForm.name.trim()) { toast("Field name is required", "error"); return; }
    if (editingCustomField) {
      const updated = customFields.map(f => f.id === editingCustomField.id ? { ...customFieldForm } : f);
      setCustomFields(updated);
      saveWorkspaceData("customFields", updated, workspaceId);
      toast("Custom field updated");
    } else {
      const newField = { ...customFieldForm, id: Date.now().toString() };
      const updated = [newField, ...customFields];
      setCustomFields(updated);
      saveWorkspaceData("customFields", updated, workspaceId);
      toast("Custom field created");
    }
    setShowCustomFieldModal(false);
  };

  const deleteCustomField = (fieldId) => {
    const updated = customFields.filter(f => f.id !== fieldId);
    setCustomFields(updated);
    saveWorkspaceData("customFields", updated, workspaceId);
    toast("Custom field deleted");
  };

  const groupedFields = customFields.reduce((acc, field) => {
    if (!acc[field.entityType]) acc[field.entityType] = [];
    acc[field.entityType].push(field);
    return acc;
  }, {});

  return (
    <>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Custom Fields</div>
          <button style={btnStyle("primary", "sm")} onClick={openAddCustomField}>+ Add Field</button>
        </div>
        
        {Object.keys(groupedFields).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No custom fields created yet. Click "Add Field" to create your first custom field.
          </div>
        ) : (
          Object.entries(groupedFields).map(([entityType, fields]) => (
            <div key={entityType} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" }}>{entityType}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fields.map(field => (
                  <div key={field.id} style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{field.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{field.type}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={btnStyle("ghost", "xs")} onClick={() => openEditCustomField(field)}>Edit</button>
                      <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => deleteCustomField(field.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </SectionCard>

      {showCustomFieldModal && (
        <Modal title={editingCustomField ? "Edit Custom Field" : "New Custom Field"} onClose={() => setShowCustomFieldModal(false)} width={450}>
          <FormField label="Field Name">
            <input style={inputStyle} value={customFieldForm.name} onChange={e => setCustomFieldForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., LinkedIn Profile" autoFocus />
          </FormField>
          <FormField label="Entity Type">
            <select style={inputStyle} value={customFieldForm.entityType} onChange={e => setCustomFieldForm(p => ({ ...p, entityType: e.target.value }))}>
              <option value="Contact">Contact</option>
              <option value="Lead">Lead</option>
              <option value="Project">Project</option>
              <option value="Task">Task</option>
              <option value="Invoice">Invoice</option>
            </select>
          </FormField>
          <FormField label="Field Type">
            <select style={inputStyle} value={customFieldForm.type} onChange={e => setCustomFieldForm(p => ({ ...p, type: e.target.value }))}>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select (Dropdown)</option>
              <option value="checkbox">Checkbox</option>
              <option value="url">URL</option>
              <option value="email">Email</option>
            </select>
          </FormField>
          {customFieldForm.type === "select" && (
            <FormField label="Options (comma-separated)">
              <input style={inputStyle} value={customFieldForm.options} onChange={e => setCustomFieldForm(p => ({ ...p, options: e.target.value }))} placeholder="Option 1, Option 2, Option 3" />
            </FormField>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btnStyle("ghost")} onClick={() => setShowCustomFieldModal(false)}>Cancel</button>
            <button style={btnStyle("primary")} onClick={saveCustomField}>{editingCustomField ? "Update Field" : "Create Field"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
