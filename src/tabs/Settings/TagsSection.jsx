import { useState } from "react";
import { Modal, FormField, SectionCard, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";
import { saveLS, saveWorkspaceData } from "../../lib/storage.js";

export default function TagsSection({ tags, setTags, workspaceId = "workspace-1" }) {
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ name: "", color: "#667eea", icon: "🏷️" });

  const openAddTag = () => {
    setEditingTag(null);
    setTagForm({ name: "", color: "#667eea", icon: "🏷️" });
    setShowTagModal(true);
  };

  const openEditTag = (tag) => {
    setEditingTag(tag);
    setTagForm({ ...tag });
    setShowTagModal(true);
  };

  const saveTag = () => {
    if (!tagForm.name.trim()) { toast("Tag name is required", "error"); return; }
    if (editingTag) {
      const updated = tags.map(t => t.id === editingTag.id ? { ...tagForm } : t);
      setTags(updated);
      saveWorkspaceData("tags", updated, workspaceId);
      toast("Tag updated");
    } else {
      const newTag = { ...tagForm, id: Date.now().toString() };
      const updated = [newTag, ...tags];
      setTags(updated);
      saveWorkspaceData("tags", updated, workspaceId);
      toast("Tag created");
    }
    setShowTagModal(false);
  };

  const deleteTag = (tagId) => {
    const updated = tags.filter(t => t.id !== tagId);
    setTags(updated);
    saveWorkspaceData("tags", updated, workspaceId);
    toast("Tag deleted");
  };

  return (
    <>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Tags Management</div>
          <button style={btnStyle("primary", "sm")} onClick={openAddTag}>+ Add Tag</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {tags.map(tag => (
            <div key={tag.id} style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              display: "flex",
              alignItems: "center",
              gap: 10
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: tag.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16
              }}>
                {tag.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{tag.name}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={btnStyle("ghost", "xs")} onClick={() => openEditTag(tag)}>Edit</button>
                <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => deleteTag(tag.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {tags.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No tags created yet. Click "Add Tag" to create your first tag.
          </div>
        )}
      </SectionCard>

      {showTagModal && (
        <Modal title={editingTag ? "Edit Tag" : "New Tag"} onClose={() => setShowTagModal(false)} width={400}>
          <FormField label="Tag Name">
            <input style={inputStyle} value={tagForm.name} onChange={e => setTagForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., High Priority" autoFocus />
          </FormField>
          <FormField label="Color">
            <input style={inputStyle} type="color" value={tagForm.color} onChange={e => setTagForm(p => ({ ...p, color: e.target.value }))} />
          </FormField>
          <FormField label="Icon">
            <input style={inputStyle} value={tagForm.icon} onChange={e => setTagForm(p => ({ ...p, icon: e.target.value }))} placeholder="🏷️" />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btnStyle("ghost")} onClick={() => setShowTagModal(false)}>Cancel</button>
            <button style={btnStyle("primary")} onClick={saveTag}>{editingTag ? "Update Tag" : "Create Tag"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
