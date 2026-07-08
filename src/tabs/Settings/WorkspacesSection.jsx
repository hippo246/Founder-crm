import { useState } from "react";
import { Modal, FormField, SectionCard, btnStyle, inputStyle, toast } from "../../components/ui/UI.jsx";
import { saveWorkspaces, saveCurrentWorkspaceId } from "../../lib/storage.js";

export default function WorkspacesSection({ workspaces, setWorkspaces, currentWorkspaceId, switchWorkspace }) {
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [workspaceForm, setWorkspaceForm] = useState({});
  const [workspaceTab, setWorkspaceTab] = useState("basic");

  const openAddWorkspace = () => {
    setEditingWorkspace(null);
    setWorkspaceTab("basic");
    setWorkspaceForm({
      name: "", icon: "📁", color: "#667eea", currency: "INR", businessName: "", ownerName: "", ownerEmail: "",
      ownerPhone: "", businessWebsite: "", businessId: "", invoicePrefix: "INV",
      proposalPrefix: "PROP", receiptPrefix: "REC", invoiceTax: 18,
      paymentTerms: "Net 30", paymentInstructions: "Please pay via UPI or bank transfer",
      invoiceFooter: "Thank you for your business!", dateFormat: "DD/MM/YYYY",
      exchangeRates: { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044, CAD: 0.016, AUD: 0.018, SGD: 0.016 },
    });
    setShowWorkspaceModal(true);
  };

  const openEditWorkspace = (workspace) => {
    setEditingWorkspace(workspace);
    setWorkspaceForm({ ...workspace });
    setWorkspaceTab("basic");
    setShowWorkspaceModal(true);
  };

  const saveWorkspace = () => {
    if (!workspaceForm.name.trim()) { toast("Workspace name is required", "error"); return; }
    if (editingWorkspace) {
      const updated = workspaces.map(w => w.id === editingWorkspace.id ? { ...workspaceForm } : w);
      setWorkspaces(updated);
      saveWorkspaces(updated);
      toast("Workspace updated");
    } else {
      const newWorkspace = { ...workspaceForm, id: `workspace-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [...workspaces, newWorkspace];
      setWorkspaces(updated);
      saveWorkspaces(updated);
      toast("Workspace created");
    }
    setShowWorkspaceModal(false);
  };

  const deleteWorkspace = (workspaceId) => {
    if (workspaces.length <= 1) { toast("Cannot delete the last workspace", "error"); return; }
    const updated = workspaces.filter(w => w.id !== workspaceId);
    setWorkspaces(updated);
    saveWorkspaces(updated);
    if (workspaceId === currentWorkspaceId) {
      switchWorkspace(updated[0].id);
      saveCurrentWorkspaceId(updated[0].id);
    }
    toast("Workspace deleted");
  };

  return (
    <>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Workspaces</span>
          <button style={btnStyle("primary", "xs")} onClick={openAddWorkspace}>+ New Workspace</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workspaces.map(w => (
            <div key={w.id} style={{
              padding: 10,
              border: `1px solid ${w.id === currentWorkspaceId ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--r-sm)",
              background: w.id === currentWorkspaceId ? "var(--primary-dim)" : "var(--surface)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{w.icon || "📁"}</span>
                  {w.name}
                  {w.id === currentWorkspaceId && <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent)", color: "#fff", borderRadius: 99, fontWeight: 500 }}>Active</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.currency}{w.businessName ? ` • ${w.businessName}` : ""} • Created {w.createdAt}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {w.id !== currentWorkspaceId && (
                  <button style={btnStyle("ghost", "xs")} onClick={() => switchWorkspace(w.id)}>Switch</button>
                )}
                <button style={btnStyle("ghost", "xs")} onClick={() => openEditWorkspace(w)}>Edit</button>
                {workspaces.length > 1 && (
                  <button style={{ ...btnStyle("ghost", "xs"), color: "var(--danger)" }} onClick={() => deleteWorkspace(w.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {showWorkspaceModal && (
        <Modal title={editingWorkspace ? "Edit Workspace" : "New Workspace"} onClose={() => setShowWorkspaceModal(false)} width={600}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={{ ...btnStyle("soft", "xs"), background: workspaceTab === "basic" ? "var(--surface-raised)" : "transparent" }} onClick={() => setWorkspaceTab("basic")}>Basic</button>
            <button style={{ ...btnStyle("soft", "xs"), background: workspaceTab === "finance" ? "var(--surface-raised)" : "transparent" }} onClick={() => setWorkspaceTab("finance")}>Finance</button>
          </div>

          {workspaceTab === "basic" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <FormField label="Workspace Name *">
                <input style={inputStyle} value={workspaceForm.name} onChange={e => setWorkspaceForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., My Business" autoFocus />
              </FormField>
              <FormField label="Currency">
                <select style={inputStyle} value={workspaceForm.currency} onChange={e => setWorkspaceForm(p => ({ ...p, currency: e.target.value }))}>
                  {["INR","USD","EUR","GBP","AED","CAD","AUD","SGD"].map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Business Name">
                <input style={inputStyle} value={workspaceForm.businessName} onChange={e => setWorkspaceForm(p => ({ ...p, businessName: e.target.value }))} />
              </FormField>
              <FormField label="Owner Name">
                <input style={inputStyle} value={workspaceForm.ownerName} onChange={e => setWorkspaceForm(p => ({ ...p, ownerName: e.target.value }))} />
              </FormField>
              <FormField label="Owner Email">
                <input style={inputStyle} type="email" value={workspaceForm.ownerEmail} onChange={e => setWorkspaceForm(p => ({ ...p, ownerEmail: e.target.value }))} />
              </FormField>
              <FormField label="Owner Phone">
                <input style={inputStyle} value={workspaceForm.ownerPhone} onChange={e => setWorkspaceForm(p => ({ ...p, ownerPhone: e.target.value }))} />
              </FormField>
              <FormField label="Business Website">
                <input style={inputStyle} value={workspaceForm.businessWebsite} onChange={e => setWorkspaceForm(p => ({ ...p, businessWebsite: e.target.value }))} placeholder="https://" />
              </FormField>
              <FormField label="Business ID / GSTIN">
                <input style={inputStyle} value={workspaceForm.businessId} onChange={e => setWorkspaceForm(p => ({ ...p, businessId: e.target.value }))} />
              </FormField>
              <FormField label="Icon">
                <input style={inputStyle} value={workspaceForm.icon} onChange={e => setWorkspaceForm(p => ({ ...p, icon: e.target.value }))} placeholder="📁" />
              </FormField>
              <FormField label="Color">
                <input style={inputStyle} type="color" value={workspaceForm.color} onChange={e => setWorkspaceForm(p => ({ ...p, color: e.target.value }))} />
              </FormField>
              <FormField label="Date Format">
                <select style={inputStyle} value={workspaceForm.dateFormat} onChange={e => setWorkspaceForm(p => ({ ...p, dateFormat: e.target.value }))}>
                  {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(fmt => <option key={fmt}>{fmt}</option>)}
                </select>
              </FormField>
            </div>
          )}

          {workspaceTab === "finance" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <FormField label="Invoice Prefix">
                <input style={inputStyle} value={workspaceForm.invoicePrefix} onChange={e => setWorkspaceForm(p => ({ ...p, invoicePrefix: e.target.value }))} />
              </FormField>
              <FormField label="Proposal Prefix">
                <input style={inputStyle} value={workspaceForm.proposalPrefix} onChange={e => setWorkspaceForm(p => ({ ...p, proposalPrefix: e.target.value }))} />
              </FormField>
              <FormField label="Receipt Prefix">
                <input style={inputStyle} value={workspaceForm.receiptPrefix} onChange={e => setWorkspaceForm(p => ({ ...p, receiptPrefix: e.target.value }))} />
              </FormField>
              <FormField label="Default Tax %">
                <input style={inputStyle} type="number" min={0} max={100} value={workspaceForm.invoiceTax} onChange={e => setWorkspaceForm(p => ({ ...p, invoiceTax: Number(e.target.value) }))} />
              </FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Payment Terms">
                  <input style={inputStyle} value={workspaceForm.paymentTerms} onChange={e => setWorkspaceForm(p => ({ ...p, paymentTerms: e.target.value }))} />
                </FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Payment Instructions">
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={workspaceForm.paymentInstructions} onChange={e => setWorkspaceForm(p => ({ ...p, paymentInstructions: e.target.value }))} />
                </FormField>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Invoice Footer">
                  <textarea style={{ ...inputStyle, minHeight: 60 }} value={workspaceForm.invoiceFooter} onChange={e => setWorkspaceForm(p => ({ ...p, invoiceFooter: e.target.value }))} />
                </FormField>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button style={btnStyle("ghost")} onClick={() => setShowWorkspaceModal(false)}>Cancel</button>
            <button style={btnStyle("primary")} onClick={saveWorkspace}>{editingWorkspace ? "Update Workspace" : "Create Workspace"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
