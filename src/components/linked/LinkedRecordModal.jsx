import { useState } from "react";
import { Modal, FormField, inputStyle, btnStyle, toast } from "../ui/UI.jsx";
import { genId } from "../../lib/helpers.js";
import { getAvailableLinkedActions, buildDefaultLinkedPayload } from "./linkedActionsConfig.js";

// Simple form generators for each entity type
const FORM_GENERATORS = {
  lead: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Service">
        <input style={inputStyle} value={payload.service || ""} onChange={e => setPayload(p => ({ ...p, service: e.target.value }))} />
      </FormField>
      <FormField label="Value">
        <input style={inputStyle} type="number" value={payload.value || ""} onChange={e => setPayload(p => ({ ...p, value: Number(e.target.value) }))} />
      </FormField>
      <FormField label="Stage">
        <select style={inputStyle} value={payload.stage || "New"} onChange={e => setPayload(p => ({ ...p, stage: e.target.value }))}>
          <option>New</option>
          <option>Interested</option>
          <option>Meeting Done</option>
          <option>Proposal Sent</option>
          <option>Negotiation</option>
          <option>Won</option>
          <option>Lost</option>
        </select>
      </FormField>
      <FormField label="Source">
        <input style={inputStyle} value={payload.source || ""} onChange={e => setPayload(p => ({ ...p, source: e.target.value }))} />
      </FormField>
      <FormField label="Priority">
        <select style={inputStyle} value={payload.priority || "Medium"} onChange={e => setPayload(p => ({ ...p, priority: e.target.value }))}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
      </FormField>
    </div>
  ),
  
  project: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Name" required>
        <input style={inputStyle} value={payload.name || ""} onChange={e => setPayload(p => ({ ...p, name: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Industry">
        <input style={inputStyle} value={payload.industry || ""} onChange={e => setPayload(p => ({ ...p, industry: e.target.value }))} />
      </FormField>
      <FormField label="Budget">
        <input style={inputStyle} type="number" value={payload.budget || ""} onChange={e => setPayload(p => ({ ...p, budget: Number(e.target.value) }))} />
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Planning"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Planning</option>
          <option>Design</option>
          <option>Development</option>
          <option>Testing</option>
          <option>Completed</option>
          <option>On Hold</option>
        </select>
      </FormField>
      <FormField label="Deadline">
        <input style={inputStyle} type="date" value={payload.deadline || ""} onChange={e => setPayload(p => ({ ...p, deadline: e.target.value }))} />
      </FormField>
      <FormField label="Priority">
        <select style={inputStyle} value={payload.priority || "Medium"} onChange={e => setPayload(p => ({ ...p, priority: e.target.value }))}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
      </FormField>
    </div>
  ),
  
  task: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Todo"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Inbox</option>
          <option>Todo</option>
          <option>Doing</option>
          <option>Waiting</option>
          <option>Blocked</option>
          <option>Review</option>
          <option>Done</option>
        </select>
      </FormField>
      <FormField label="Priority">
        <select style={inputStyle} value={payload.priority || "Medium"} onChange={e => setPayload(p => ({ ...p, priority: e.target.value }))}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
          <option>Critical</option>
        </select>
      </FormField>
      <FormField label="Due Date">
        <input style={inputStyle} type="date" value={payload.dueDate || ""} onChange={e => setPayload(p => ({ ...p, dueDate: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  followUp: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Person" required>
        <input style={inputStyle} value={payload.person || ""} onChange={e => setPayload(p => ({ ...p, person: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Type">
        <select style={inputStyle} value={payload.type || "Call"} onChange={e => setPayload(p => ({ ...p, type: e.target.value }))}>
          <option>Call</option>
          <option>Email</option>
          <option>Meeting</option>
          <option>WhatsApp</option>
          <option>LinkedIn</option>
        </select>
      </FormField>
      <FormField label="Due Date">
        <input style={inputStyle} type="date" value={payload.dueDate || ""} onChange={e => setPayload(p => ({ ...p, dueDate: e.target.value }))} />
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Pending"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Pending</option>
          <option>Completed</option>
          <option>Missed</option>
        </select>
      </FormField>
    </div>
  ),
  
  note: (payload, setPayload) => (
    <div>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Body">
        <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={payload.body || ""} onChange={e => setPayload(p => ({ ...p, body: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  invoice: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Invoice Title" required>
        <input style={inputStyle} value={payload.invoiceTitle || ""} onChange={e => setPayload(p => ({ ...p, invoiceTitle: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Issue Date">
        <input style={inputStyle} type="date" value={payload.issueDate || ""} onChange={e => setPayload(p => ({ ...p, issueDate: e.target.value }))} />
      </FormField>
      <FormField label="Due Date">
        <input style={inputStyle} type="date" value={payload.dueDate || ""} onChange={e => setPayload(p => ({ ...p, dueDate: e.target.value }))} />
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Draft"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Draft</option>
          <option>Sent</option>
          <option>Paid</option>
          <option>Overdue</option>
        </select>
      </FormField>
    </div>
  ),
  
  payment: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Amount" required>
        <input style={inputStyle} type="number" value={payload.amount || ""} onChange={e => setPayload(p => ({ ...p, amount: Number(e.target.value) }))} autoFocus />
      </FormField>
      <FormField label="Date">
        <input style={inputStyle} type="date" value={payload.date || ""} onChange={e => setPayload(p => ({ ...p, date: e.target.value }))} />
      </FormField>
      <FormField label="Method">
        <select style={inputStyle} value={payload.method || ""} onChange={e => setPayload(p => ({ ...p, method: e.target.value }))}>
          <option>Bank Transfer</option>
          <option>UPI</option>
          <option>Cash</option>
          <option>Cheque</option>
          <option>Card</option>
        </select>
      </FormField>
      <FormField label="Reference">
        <input style={inputStyle} value={payload.reference || ""} onChange={e => setPayload(p => ({ ...p, reference: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  proposal: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Service">
        <input style={inputStyle} value={payload.service || ""} onChange={e => setPayload(p => ({ ...p, service: e.target.value }))} />
      </FormField>
      <FormField label="Price">
        <input style={inputStyle} type="number" value={payload.price || ""} onChange={e => setPayload(p => ({ ...p, price: Number(e.target.value) }))} />
      </FormField>
      <FormField label="Date">
        <input style={inputStyle} type="date" value={payload.date || ""} onChange={e => setPayload(p => ({ ...p, date: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  communication: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Contact" required>
        <input style={inputStyle} value={payload.contact || ""} onChange={e => setPayload(p => ({ ...p, contact: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Method">
        <select style={inputStyle} value={payload.method || ""} onChange={e => setPayload(p => ({ ...p, method: e.target.value }))}>
          <option>Call</option>
          <option>Email</option>
          <option>Meeting</option>
          <option>WhatsApp</option>
          <option>LinkedIn</option>
        </select>
      </FormField>
      <FormField label="Date">
        <input style={inputStyle} type="date" value={payload.date || ""} onChange={e => setPayload(p => ({ ...p, date: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  calendarEvent: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Date">
        <input style={inputStyle} type="date" value={payload.date || ""} onChange={e => setPayload(p => ({ ...p, date: e.target.value }))} />
      </FormField>
      <FormField label="Type">
        <select style={inputStyle} value={payload.type || ""} onChange={e => setPayload(p => ({ ...p, type: e.target.value }))}>
          <option>Meeting</option>
          <option>Call</option>
          <option>Deadline</option>
          <option>Reminder</option>
        </select>
      </FormField>
    </div>
  ),
  
  supportTicket: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Priority">
        <select style={inputStyle} value={payload.priority || "Medium"} onChange={e => setPayload(p => ({ ...p, priority: e.target.value }))}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Open"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
      </FormField>
    </div>
  ),
  
  roadmapItem: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Item / Feature" required>
        <input style={inputStyle} value={payload.item || ""} onChange={e => setPayload(p => ({ ...p, item: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Status">
        <select style={inputStyle} value={payload.status || "Planned"} onChange={e => setPayload(p => ({ ...p, status: e.target.value }))}>
          <option>Planned</option>
          <option>Backlog</option>
          <option>In Progress</option>
          <option>Blocked</option>
          <option>Done</option>
        </select>
      </FormField>
      <FormField label="Priority">
        <select style={inputStyle} value={payload.priority || "Medium"} onChange={e => setPayload(p => ({ ...p, priority: e.target.value }))}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
          <option>Critical</option>
        </select>
      </FormField>
      <FormField label="Target Date">
        <input style={inputStyle} type="date" value={payload.targetDate || ""} onChange={e => setPayload(p => ({ ...p, targetDate: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  prompt: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Tool">
        <select style={inputStyle} value={payload.tool || "Kiro"} onChange={e => setPayload(p => ({ ...p, tool: e.target.value }))}>
          <option>Kiro</option>
          <option>Claude</option>
          <option>GPT-4</option>
          <option>Other</option>
        </select>
      </FormField>
    </div>
  ),
  
  projectLog: (payload, setPayload) => (
    <div>
      <FormField label="Summary" required>
        <input style={inputStyle} value={payload.summary || ""} onChange={e => setPayload(p => ({ ...p, summary: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Details">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={payload.details || ""} onChange={e => setPayload(p => ({ ...p, details: e.target.value }))} />
      </FormField>
    </div>
  ),
  
  document: (payload, setPayload) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      <FormField label="Title" required>
        <input style={inputStyle} value={payload.title || ""} onChange={e => setPayload(p => ({ ...p, title: e.target.value }))} autoFocus />
      </FormField>
      <FormField label="Type">
        <select style={inputStyle} value={payload.type || ""} onChange={e => setPayload(p => ({ ...p, type: e.target.value }))}>
          <option>Contract</option>
          <option>Invoice</option>
          <option>Proposal</option>
          <option>Report</option>
          <option>Other</option>
        </select>
      </FormField>
    </div>
  ),
};

export default function LinkedRecordModal({ 
  sourceEntity, 
  sourceEntityType, 
  targetModule, 
  onClose, 
  onSave,
  workspaceId 
}) {
  const [payload, setPayload] = useState(() => 
    buildDefaultLinkedPayload(sourceEntity, targetModule)
  );
  
  const handleSave = () => {
    // Validate required fields
    if (targetModule === 'lead' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'project' && !payload.name) {
      toast("Name is required", "error");
      return;
    }
    if (targetModule === 'task' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'followUp' && !payload.person) {
      toast("Person is required", "error");
      return;
    }
    if (targetModule === 'note' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'invoice' && !payload.invoiceTitle) {
      toast("Invoice title is required", "error");
      return;
    }
    if (targetModule === 'payment' && !payload.amount) {
      toast("Amount is required", "error");
      return;
    }
    if (targetModule === 'proposal' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'communication' && !payload.contact) {
      toast("Contact is required", "error");
      return;
    }
    if (targetModule === 'calendarEvent' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'supportTicket' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'roadmapItem' && !payload.item) {
      toast("Item is required", "error");
      return;
    }
    if (targetModule === 'prompt' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    if (targetModule === 'projectLog' && !payload.summary) {
      toast("Summary is required", "error");
      return;
    }
    if (targetModule === 'document' && !payload.title) {
      toast("Title is required", "error");
      return;
    }
    
    // Add ID and save
    const record = { ...payload, id: genId() };
    onSave(targetModule, record);
    onClose();
  };
  
  const FormGenerator = FORM_GENERATORS[targetModule];
  
  return (
    <Modal 
      title={`Add ${targetModule.charAt(0).toUpperCase() + targetModule.slice(1)}`} 
      onClose={onClose} 
      width={500}
    >
      {FormGenerator ? (
        <div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Creating linked record from: {sourceEntity.title || sourceEntity.name || sourceEntity.item || 'selected item'}
          </p>
          <FormGenerator payload={payload} setPayload={setPayload} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
            <button style={btnStyle("primary")} onClick={handleSave}>Create</button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Form generator for "{targetModule}" is not yet implemented.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={btnStyle("ghost")} onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
