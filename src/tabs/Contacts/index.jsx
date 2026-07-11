import React, { useState, useMemo } from "react";
import { Modal, Confirm, SearchInput, EmptyState, btnStyle, toast } from "../../components/ui/UI.jsx";
import { genId } from "../../lib/helpers.js";
import { saveWorkspaceData } from "../../lib/storage.js";
import { exportToCSV } from "../../lib/exports.js";
import ContactForm from "./ContactForm.jsx";
import ContactCard from "./ContactCard.jsx";

export default function ContactsTab({ contacts, setContacts, tags, addAudit, role, leads = [], setLeads, followUps = [], setFollowUps, notes = [], setNotes, projects = [], tasks = [], invoices = [], proposals = [], communications = [], documents = [], supportTickets = [], calendarEvents = [], workspaceId = "workspace-1" }) {
  // tags from seed is array of objects {id, name} — normalize to strings
  const tagNames = (tags || []).map(t => (typeof t === "string" ? t : t.name)).filter(Boolean);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const [expandedRow, setExpandedRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showImportMenu, setShowImportMenu] = useState(false);

  const filtered = useMemo(() => {
    let result = contacts;
    if (statusFilter !== "All") result = result.filter(c => c.status === statusFilter);
    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }, [contacts, search, statusFilter]);

  const statuses = ["All", ...Array.from(new Set(contacts.map(c => c.status).filter(Boolean)))];

  const handleSave = (data) => {
    if (editing) {
      const updated = contacts.map(c => c.id === editing.id ? { ...data, id: editing.id } : c);
      setContacts(updated);
      saveWorkspaceData("contacts", updated, workspaceId);
      toast("Contact updated");
      addAudit("Contacts", "Update", `Updated contact: ${data.name}`);
    } else {
      const newContact = { ...data, id: genId(), createdAt: new Date().toISOString().slice(0, 10) };
      const updated = [newContact, ...contacts];
      setContacts(updated);
      saveWorkspaceData("contacts", updated, workspaceId);
      toast("Contact created");
      addAudit("Contacts", "Create", `Created contact: ${data.name}`);
    }
    setShowAdd(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const updated = contacts.filter(c => c.id !== confirmDelete.id);
    setContacts(updated);
    saveWorkspaceData("contacts", updated, workspaceId);
    toast("Contact deleted");
    addAudit("Contacts", "Delete", `Deleted contact: ${confirmDelete.name}`);
    setConfirmDelete(null);
    setViewing(null);
  };

  const handleExport = () => {
    exportToCSV(contacts, "contacts");
    toast("Contacts exported");
  };

  const downloadImportTemplate = () => {
    const templateData = [
      {
        "Name": "John Doe",
        "Company": "Tech Corp",
        "Phone": "+1234567890",
        "Email": "john@example.com",
        "Status": "Active",
        "Tags": "client, important"
      }
    ];
    exportToCSV(templateData, "contacts-import-template");
    toast("Template downloaded");
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = event.target.result;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const importedContacts = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
          const contact = {};
          
          headers.forEach((header, index) => {
            contact[header] = values[index] || '';
          });
          
          importedContacts.push({
            id: genId(),
            name: contact["Name"] || "",
            company: contact["Company"] || "",
            phone: contact["Phone"] || "",
            email: contact["Email"] || "",
            status: contact["Status"] || "Active",
            tags: contact["Tags"] ? contact["Tags"].split(',').map(t => t.trim()) : [],
            createdAt: new Date().toISOString().slice(0,10)
          });
        }
        
        const newContacts = [...contacts, ...importedContacts];
        setContacts(newContacts);
        saveWorkspaceData("contacts", newContacts, workspaceId);
        addAudit("Contacts", "Import", `Imported ${importedContacts.length} contact(s)`);
        toast(`${importedContacts.length} contact(s) imported successfully`);
        setShowImportMenu(false);
      } catch (error) {
        console.error("Import error:", error);
        toast("Failed to import CSV", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Contacts</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{contacts.length} contacts</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <button style={btnStyle("ghost", "sm")} onClick={() => setShowImportMenu(!showImportMenu)}>Import CSV</button>
            {showImportMenu && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-md)",
                padding: "8px 0",
                minWidth: "200px",
                zIndex: 100
              }}>
                <button style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13
                }} onClick={downloadImportTemplate}>
                  📄 Download Template
                </button>
                <label style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "block",
                  fontSize: 13
                }}>
                  📂 Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleImportCSV}
                  />
                </label>
              </div>
            )}
          </div>
          <button style={btnStyle("ghost", "sm")} onClick={handleExport}>Export CSV</button>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
            <button onClick={() => setViewMode("cards")} style={{ padding: "4px 10px", fontSize: 13, background: viewMode === "cards" ? "var(--accent)" : "transparent", color: viewMode === "cards" ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer" }}>⊞</button>
            <button onClick={() => setViewMode("table")} style={{ padding: "4px 10px", fontSize: 13, background: viewMode === "table" ? "var(--accent)" : "transparent", color: viewMode === "table" ? "#fff" : "var(--text-muted)", border: "none", cursor: "pointer" }}>☰</button>
          </div>
          <button style={btnStyle("primary", "sm")} onClick={() => { setEditing(null); setShowAdd(true); }}>+ Add Contact</button>
        </div>
      </div>

      <SearchInput placeholder="Search contacts..." value={search} onChange={setSearch} />
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "3px 12px", fontSize: 12, borderRadius: 999, cursor: "pointer", border: "1px solid var(--border)", background: statusFilter === s ? "var(--accent)" : "var(--surface-raised)", color: statusFilter === s ? "#fff" : "var(--text-muted)", fontWeight: statusFilter === s ? 600 : 400, transition: "all 0.15s" }}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? "No contacts found" : "No contacts yet"} />
      ) : viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 16 }}>
          {filtered.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => { setEditing(contact); setShowAdd(true); }}
              onDelete={() => setConfirmDelete(contact)}
              onView={() => setViewing(contact)}
              leads={leads}
              followUps={followUps}
              projects={projects}
              tasks={tasks}
              invoices={invoices}
              communications={communications}
            />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                {["Name", "Company", "Phone", "Email", "Status", "Tags", ""].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, i) => {
                const avatarColors = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
                const color = avatarColors[(contact.name?.charCodeAt(0) || 0) % avatarColors.length];
                const isExpanded = expandedRow === contact.id;
                const contactLeads = leads.filter(l => l.contactId === contact.id || l.contact === contact.name);
                const contactFollowUps = followUps.filter(f => f.contactId === contact.id || f.contact === contact.name);
                const contactNotes = notes.filter(n => n.contactId === contact.id || n.contact === contact.name);
                return (
                  <React.Fragment key={contact.id}>
                    <tr
                      onClick={() => setExpandedRow(isExpanded ? null : contact.id)}
                      style={{ borderBottom: "1px solid var(--border)", background: isExpanded ? "var(--surface-raised)" : i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)", cursor: "pointer", transition: "background 0.1s" }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                            {contact.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{contact.name}</div>
                            {contact.role && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{contact.role}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{contact.company || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{contact.phone || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contact.email || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontWeight: 600 }}>{contact.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {contact.tags?.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>{t}</span>)}
                          {contact.tags?.length > 2 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{contact.tags.length - 2}</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => { setEditing(contact); setShowAdd(true); }} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>
                          <button onClick={() => setConfirmDelete(contact)} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--danger)", cursor: "pointer" }}>Del</button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (() => {
                      const cProjects = projects.filter(p => p.contactId === contact.id || p.contact === contact.name || p.clientName === contact.name);
                      const cTasks = tasks.filter(t => t.contactId === contact.id || t.contact === contact.name);
                      const cInvoices = invoices.filter(inv => inv.contactId === contact.id || inv.contact === contact.name || inv.clientName === contact.name);
                      const cProposals = proposals.filter(p => p.contactId === contact.id || p.contact === contact.name || p.clientName === contact.name);
                      const cComms = communications.filter(c2 => c2.contactId === contact.id || c2.contact === contact.name);
                      const cDocs = documents.filter(d => d.contactId === contact.id || d.contact === contact.name);
                      const cTickets = supportTickets.filter(t => t.contactId === contact.id || t.contact === contact.name);
                      const cEvents = calendarEvents.filter(e => e.contactId === contact.id || e.contact === contact.name);

                      const sec = (label, count) => (
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                          <span>{label}</span>
                          {count > 0 && <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "0 5px", fontSize: 9 }}>{count}</span>}
                        </div>
                      );
                      const pill = (label, color2) => (
                        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: color2 ? `${color2}22` : "var(--surface)", color: color2 || "var(--text-muted)", border: `1px solid ${color2 ? `${color2}44` : "var(--border)"}`, fontWeight: 600 }}>{label}</span>
                      );
                      const row = (left, right, rightColor) => (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, gap: 8 }}>
                          <span style={{ color: "var(--text)", fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left}</span>
                          <span style={{ color: rightColor || "var(--text-muted)", fontWeight: 600, flexShrink: 0, fontSize: 11 }}>{right}</span>
                        </div>
                      );

                      return (
                        <tr key={`${contact.id}-exp`} style={{ borderBottom: "2px solid var(--accent)", background: "var(--surface-raised)" }}>
                          <td colSpan={7} style={{ padding: "16px 18px" }}>

                            {/* Top: contact details + quick actions */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
                              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                                {contact.phone && <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>📞 {contact.phone}</a>}
                                {(contact.whatsapp || contact.phone) && <a href={`https://wa.me/${(contact.whatsapp || contact.phone).replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>💬 WhatsApp</a>}
                                {contact.email && <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>✉️ {contact.email}</a>}
                                {contact.website && <a href={contact.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>🌐 Website</a>}
                                {contact.location && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {contact.location}</span>}
                                {contact.source && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>via {contact.source}</span>}
                                {contact.createdAt && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Added {contact.createdAt}</span>}
                                {contact.tags?.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>{t}</span>)}
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                {setLeads && <button onClick={(e) => { e.stopPropagation(); const nl = { id: Math.random().toString(36).slice(2), contactId: contact.id, name: `${contact.name} Lead`, contact: contact.name, company: contact.company || "", stage: "New", source: contact.source || "Other", value: 0, createdAt: new Date().toISOString().slice(0,10), notes: "" }; setLeads(prev => [nl, ...prev]); addAudit?.("Contacts","Create",`Lead from ${contact.name}`); toast("Lead created"); }} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>🎯 Add Lead</button>}
                                <button onClick={(e) => { e.stopPropagation(); setViewing(contact); }} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer" }}>Open Profile</button>
                              </div>
                            </div>

                            {/* Bio grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>

                              {/* Leads */}
                              <div>
                                {sec("Leads", contactLeads.length)}
                                {contactLeads.length === 0 ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No leads</div> : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {contactLeads.map(l => <React.Fragment key={l.id}>{row(l.name || "Unnamed lead", l.stage)}</React.Fragment>)}
                                  </div>
                                )}
                              </div>

                              {/* Projects */}
                              <div>
                                {sec("Projects", cProjects.length)}
                                {cProjects.length === 0 ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No projects</div> : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cProjects.map(p => <React.Fragment key={p.id}>{row(p.name || p.title || "Unnamed", p.status)}</React.Fragment>)}
                                  </div>
                                )}
                              </div>

                              {/* Tasks */}
                              <div>
                                {sec("Tasks", cTasks.length)}
                                {cTasks.length === 0 ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No tasks</div> : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cTasks.map(t => <React.Fragment key={t.id}>{row(t.title || t.name || "Unnamed", t.status, t.status === "Done" ? "#10b981" : t.status === "Blocked" ? "#ef4444" : undefined)}</React.Fragment>)}
                                  </div>
                                )}
                              </div>

                              {/* Follow-ups */}
                              <div>
                                {sec("Follow-Ups", contactFollowUps.length)}
                                {contactFollowUps.length === 0 ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No follow-ups</div> : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {contactFollowUps.map(f => <React.Fragment key={f.id}>{row(`${f.type}${f.dueDate ? ` · ${f.dueDate}` : ""}`, f.status, f.status === "Done" ? "#10b981" : f.status === "Missed" ? "#ef4444" : undefined)}</React.Fragment>)}
                                  </div>
                                )}
                              </div>

                              {/* Invoices */}
                              <div>
                                {sec("Invoices", cInvoices.length)}
                                {cInvoices.length === 0 ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No invoices</div> : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cInvoices.map(inv => <React.Fragment key={inv.id}>{row(inv.number || inv.title || "Invoice", `${inv.status}${inv.total ? ` · ₹${inv.total}` : ""}`, inv.status === "Paid" ? "#10b981" : inv.status === "Overdue" ? "#ef4444" : undefined)}</React.Fragment>)}
                                  </div>
                                )}
                              </div>

                              {/* Proposals */}
                              {cProposals.length > 0 && (
                                <div>
                                  {sec("Proposals", cProposals.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cProposals.map(p => <React.Fragment key={p.id}>{row(p.title || p.name || "Proposal", p.status, p.status === "Accepted" ? "#10b981" : p.status === "Rejected" ? "#ef4444" : undefined)}</React.Fragment>)}
                                  </div>
                                </div>
                              )}

                              {/* Communications */}
                              {cComms.length > 0 && (
                                <div>
                                  {sec("Communications", cComms.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cComms.slice(0, 4).map(c2 => <React.Fragment key={c2.id}>{row(`${c2.method || c2.type || "Comm"}${c2.date ? ` · ${c2.date}` : ""}`, c2.outcome || c2.status || "")}</React.Fragment>)}
                                  </div>
                                </div>
                              )}

                              {/* Support Tickets */}
                              {cTickets.length > 0 && (
                                <div>
                                  {sec("Support Tickets", cTickets.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cTickets.map(t => <React.Fragment key={t.id}>{row(t.title || t.subject || "Ticket", t.status, t.status === "Closed" || t.status === "Fixed" ? "#10b981" : t.priority === "Urgent" ? "#ef4444" : undefined)}</React.Fragment>)}
                                  </div>
                                </div>
                              )}

                              {/* Documents */}
                              {cDocs.length > 0 && (
                                <div>
                                  {sec("Documents", cDocs.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cDocs.map(d => <React.Fragment key={d.id}>{row(d.name || d.title || "Doc", d.status || d.type || "")}</React.Fragment>)}
                                  </div>
                                </div>
                              )}

                              {/* Calendar Events */}
                              {cEvents.length > 0 && (
                                <div>
                                  {sec("Events", cEvents.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cEvents.slice(0, 4).map(e => <React.Fragment key={e.id}>{row(e.title || e.name || "Event", e.date || e.start || "")}</React.Fragment>)}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {(contactNotes.length > 0 || contact.notes) && (
                                <div>
                                  {sec("Notes", contactNotes.length)}
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {contact.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "5px 8px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>{contact.notes.slice(0, 120)}{contact.notes.length > 120 ? "…" : ""}</div>}
                                    {contactNotes.slice(0, 2).map(n => (
                                      <div key={n.id} style={{ fontSize: 12, color: "var(--text-muted)", padding: "5px 8px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                                        {(n.content || n.text || "").slice(0, 120)}{(n.content || n.text || "").length > 120 ? "…" : ""}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title={editing ? "Edit Contact" : "New Contact"} onClose={() => { setShowAdd(false); setEditing(null); }} width={500}>
          <ContactForm initial={editing} onSave={handleSave} onClose={() => { setShowAdd(false); setEditing(null); }} allTags={tagNames} leads={leads} />
        </Modal>
      )}

      {viewing && (() => {
        const contactLeads = leads.filter(l => l.contactId === viewing.id || l.contact === viewing.name);
        const contactFollowUps = followUps.filter(f => f.contactId === viewing.id || f.contact === viewing.name);
        const contactNotes = notes.filter(n => n.contactId === viewing.id || n.contact === viewing.name);
        const avatarColors = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
        const color = avatarColors[(viewing.name?.charCodeAt(0) || 0) % avatarColors.length];
        const infoRow = (label, value, href) => value ? (
          <div key={label} style={{ display: "flex", gap: 8, fontSize: 13, alignItems: "flex-start" }}>
            <span style={{ color: "var(--text-muted)", minWidth: 80, flexShrink: 0 }}>{label}</span>
            {href ? <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{value}</a> : <span style={{ color: "var(--text)" }}>{value}</span>}
          </div>
        ) : null;
        return (
          <Modal title="" onClose={() => setViewing(null)} width={460}>
            {/* Header */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16, padding: "0 0 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: `0 0 0 3px ${color}33` }}>
                {viewing.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>{viewing.name}</div>
                {(viewing.role || viewing.company) && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{viewing.role}{viewing.role && viewing.company ? " · " : ""}{viewing.company}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontWeight: 600 }}>{viewing.status}</span>
                  {viewing.source && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--surface-raised)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{viewing.source}</span>}
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {viewing.phone && <a href={`tel:${viewing.phone}`} style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none", cursor: "pointer" }}>📞 Call</a>}
              {(viewing.whatsapp || viewing.phone) && <a href={`https://wa.me/${(viewing.whatsapp || viewing.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none" }}>💬 WhatsApp</a>}
              {viewing.email && <a href={`mailto:${viewing.email}`} style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)", textDecoration: "none" }}>✉️ Email</a>}
              {setLeads && <button onClick={() => { const newLead = { id: Math.random().toString(36).slice(2), contactId: viewing.id, name: `${viewing.name} Lead`, contact: viewing.name, company: viewing.company || "", stage: "New", source: viewing.source || "Other", value: 0, createdAt: new Date().toISOString().slice(0,10), notes: "" }; setLeads(prev => [newLead, ...prev]); addAudit?.("Contacts", "Create", `Created lead from contact: ${viewing.name}`); toast("Lead created"); setViewing(null); }} style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>🎯 Add Lead</button>}
            </div>

            {/* Contact details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {infoRow("Phone", viewing.phone, `tel:${viewing.phone}`)}
              {infoRow("WhatsApp", viewing.whatsapp)}
              {infoRow("Email", viewing.email, `mailto:${viewing.email}`)}
              {infoRow("Website", viewing.website, viewing.website)}
              {infoRow("Location", viewing.location)}
              {infoRow("Address", viewing.address)}
              {infoRow("Added", viewing.createdAt)}
            </div>

            {/* Tags */}
            {viewing.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
                {viewing.tags.map(t => <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>{t}</span>)}
              </div>
            )}

            {/* Related leads */}
            {contactLeads.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Leads ({contactLeads.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {contactLeads.slice(0, 3).map(l => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--surface-raised)", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12 }}>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>{l.name || l.title || "Unnamed lead"}</span>
                      <span style={{ color: "var(--text-muted)" }}>{l.stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related follow-ups */}
            {contactFollowUps.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Follow-Ups ({contactFollowUps.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {contactFollowUps.slice(0, 3).map(f => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--surface-raised)", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12 }}>
                      <span style={{ color: "var(--text)" }}>{f.type} — {f.notes || f.note || "No notes"}</span>
                      <span style={{ color: f.status === "Done" ? "#10b981" : f.status === "Missed" ? "#ef4444" : "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{f.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related notes */}
            {contactNotes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 6 }}>Notes ({contactNotes.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {contactNotes.slice(0, 2).map(n => (
                    <div key={n.id} style={{ padding: "6px 10px", background: "var(--surface-raised)", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
                      {(n.content || n.text || "").slice(0, 120)}{(n.content || n.text || "").length > 120 ? "…" : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes field */}
            {viewing.notes && (
              <div style={{ background: "var(--surface-raised)", borderRadius: 8, padding: 10, fontSize: 12, color: "var(--text-muted)", marginBottom: 14, border: "1px solid var(--border)" }}>{viewing.notes}</div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={{ padding: "7px 14px", fontSize: 12, background: "transparent", border: "1px solid var(--border)", color: "var(--danger)", borderRadius: 8, cursor: "pointer" }} onClick={() => { setConfirmDelete(viewing); setViewing(null); }}>Delete</button>
              <button style={{ padding: "7px 14px", fontSize: 12, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }} onClick={() => { setEditing(viewing); setViewing(null); setShowAdd(true); }}>Edit Contact</button>
            </div>
          </Modal>
        );
      })()}

      {confirmDelete && (
        <Confirm
          title="Delete Contact"
          message={`Are you sure you want to delete ${confirmDelete.name}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
