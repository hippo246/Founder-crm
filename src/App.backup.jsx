import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtCurrency = (n, currency = "INR") => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
};

const loadLS = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

const saveLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

const isOverdue = (dateStr) => dateStr && new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
const isToday = (dateStr) => dateStr && new Date(dateStr).toDateString() === new Date().toDateString();

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedContacts = [
  { id: genId(), name: "Rahul Sharma", company: "TechNova Pvt Ltd", role: "CEO", phone: "9876543210", whatsapp: "9876543210", email: "rahul@technova.in", location: "Mumbai", source: "LinkedIn", tags: ["Hot Lead", "High Value"], status: "Client", notes: "Very responsive, prefers WhatsApp.", createdAt: "2024-11-15" },
  { id: genId(), name: "Priya Mehta", company: "Bloom Clinic", role: "Director", phone: "9123456789", whatsapp: "9123456789", email: "priya@bloomclinic.in", location: "Pune", source: "Friend Referral", tags: ["Clinic", "Needs Follow-Up"], status: "Warm", notes: "Interested in clinic CRM.", createdAt: "2025-01-10" },
  { id: genId(), name: "Arjun Patel", company: "Spice Route Restaurant", role: "Owner", phone: "9988776655", whatsapp: "9988776655", email: "arjun@spiceroute.in", location: "Ahmedabad", source: "Instagram", tags: ["Restaurant", "Urgent"], status: "New", notes: "Saw Instagram ad. Follow up ASAP.", createdAt: "2025-03-01" },
  { id: genId(), name: "Sneha Rao", company: "AutoEdge Motors", role: "Manager", phone: "9001234567", whatsapp: "9001234567", email: "sneha@autoedge.in", location: "Bangalore", source: "Website", tags: ["Automotive"], status: "Active", notes: "Working on automotive CRM demo.", createdAt: "2025-02-14" },
  { id: genId(), name: "Karan Joshi", company: "CaféBlend", role: "Founder", phone: "9112233445", whatsapp: "9112233445", email: "karan@cafeblend.in", location: "Delhi", source: "Cold Outreach", tags: ["Waiting Payment"], status: "Future", notes: "Quoted ₹45k. Said will confirm next month.", createdAt: "2025-03-20" },
];

const seedLeads = [
  { id: genId(), title: "Personal CRM Build", contact: "Rahul Sharma", company: "TechNova Pvt Ltd", service: "Custom CRM Development", source: "LinkedIn", value: 150000, probability: 85, stage: "Proposal Sent", priority: "High", followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0,10), notes: "Sent proposal v2. Waiting for approval.", tags: ["High Value", "Hot Lead"], lostReason: "", createdAt: "2024-12-01" },
  { id: genId(), title: "Bloom Clinic CRM", contact: "Priya Mehta", company: "Bloom Clinic", service: "Clinic CRM", source: "Friend Referral", value: 80000, probability: 60, stage: "Demo Sent", priority: "Medium", followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10), notes: "Demo well received. Need to follow up.", tags: ["Clinic"], lostReason: "", createdAt: "2025-01-15" },
  { id: genId(), title: "Restaurant OS", contact: "Arjun Patel", company: "Spice Route Restaurant", service: "Restaurant CRM", source: "Instagram", value: 60000, probability: 40, stage: "Interested", priority: "Urgent", followUpDate: new Date().toISOString().slice(0,10), notes: "Needs custom KOT module.", tags: ["Restaurant", "Urgent"], lostReason: "", createdAt: "2025-03-02" },
  { id: genId(), title: "AutoEdge CRM", contact: "Sneha Rao", company: "AutoEdge Motors", service: "Automotive CRM", source: "Website", value: 120000, probability: 70, stage: "Meeting Done", priority: "High", followUpDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0,10), notes: "Met on Zoom. Very interested.", tags: ["Automotive"], lostReason: "", createdAt: "2025-02-20" },
  { id: genId(), title: "Website Redesign", contact: "Karan Joshi", company: "CaféBlend", service: "Website Design", source: "Cold Outreach", value: 45000, probability: 30, stage: "New", priority: "Low", followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10), notes: "Initial contact made.", tags: [], lostReason: "", createdAt: "2025-03-21" },
  { id: genId(), title: "Multi-Office CRM", contact: "Rahul Sharma", company: "TechNova Pvt Ltd", service: "Enterprise CRM", source: "LinkedIn", value: 250000, probability: 50, stage: "Negotiation", priority: "High", followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10), notes: "Price negotiation ongoing.", tags: ["High Value"], lostReason: "", createdAt: "2025-01-05" },
  { id: genId(), title: "Cafe CRM Lite", contact: "Karan Joshi", company: "CaféBlend", service: "Cafe CRM", source: "Cold Outreach", value: 35000, probability: 20, stage: "Won", priority: "Low", followUpDate: "", notes: "Won! Setup phase starts next week.", tags: [], lostReason: "", createdAt: "2025-02-01" },
  { id: genId(), title: "Clinic Analytics Module", contact: "Priya Mehta", company: "Bloom Clinic", service: "Analytics Add-on", source: "Friend Referral", value: 30000, probability: 0, stage: "Lost", priority: "Low", followUpDate: "", notes: "Budget constraint.", tags: [], lostReason: "Budget constraints", createdAt: "2025-01-20" },
];

const seedProjects = [
  { id: genId(), name: "Personal Founder CRM", client: "Internal", industry: "SaaS", status: "Development", budget: 0, paid: 0, pending: 0, deadline: "2025-08-31", progress: 62, techStack: "React, Vite, localStorage", priority: "Urgent", description: "Full Founder OS with 15+ modules.", tags: ["CRM", "High Value"], createdAt: "2024-11-01" },
  { id: genId(), name: "Bloom Clinic CRM", client: "Priya Mehta", industry: "Healthcare", status: "Design", budget: 80000, paid: 20000, pending: 60000, deadline: "2025-07-15", progress: 25, techStack: "React, Node.js, MongoDB", priority: "High", description: "Patient management + billing + appointments.", tags: ["Clinic"], createdAt: "2025-02-01" },
  { id: genId(), name: "Spice Route Restaurant OS", client: "Arjun Patel", industry: "F&B", status: "Planning", budget: 60000, paid: 0, pending: 60000, deadline: "2025-09-01", progress: 8, techStack: "React, Supabase", priority: "Medium", description: "KOT, menu management, staff & billing.", tags: ["Restaurant"], createdAt: "2025-03-05" },
  { id: genId(), name: "AutoEdge Motors CRM", client: "Sneha Rao", industry: "Automotive", status: "Development", budget: 120000, paid: 60000, pending: 60000, deadline: "2025-10-01", progress: 40, techStack: "React, Firebase", priority: "High", description: "Vehicle inventory, service tracking, leads.", tags: ["Automotive"], createdAt: "2025-02-20" },
];

const seedTasks = [
  { id: genId(), title: "Build Contacts module", description: "Full CRUD, search, filter, profile modal.", project: "Personal Founder CRM", contact: "Internal", status: "Done", priority: "Urgent", dueDate: "2025-04-10", checklist: [{id:genId(),text:"Add/Edit form",done:true},{id:genId(),text:"Search & filter",done:true}], tags: ["CRM"], createdAt: "2025-04-01" },
  { id: genId(), title: "Design Clinic patient form", description: "Patient intake form with validation.", project: "Bloom Clinic CRM", contact: "Priya Mehta", status: "Doing", priority: "High", dueDate: new Date(Date.now() + 86400000).toISOString().slice(0,10), checklist: [{id:genId(),text:"Fields spec",done:true},{id:genId(),text:"UI mockup",done:false}], tags: ["Clinic"], createdAt: "2025-04-15" },
  { id: genId(), title: "Setup Supabase schema for Restaurant OS", description: "Tables: orders, menu, staff, tables.", project: "Spice Route Restaurant OS", contact: "Arjun Patel", status: "Todo", priority: "Medium", dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0,10), checklist: [], tags: ["Restaurant"], createdAt: "2025-04-20" },
  { id: genId(), title: "Fix vehicle inventory search bug", description: "Search returns duplicates on filter change.", project: "AutoEdge Motors CRM", contact: "Sneha Rao", status: "Blocked", priority: "High", dueDate: new Date(Date.now() - 86400000).toISOString().slice(0,10), checklist: [{id:genId(),text:"Reproduce bug",done:true},{id:genId(),text:"Write fix",done:false}], tags: ["Automotive"], createdAt: "2025-04-18" },
  { id: genId(), title: "Leads kanban board", description: "Drag-and-drop stage columns with badges.", project: "Personal Founder CRM", contact: "Internal", status: "Doing", priority: "High", dueDate: new Date().toISOString().slice(0,10), checklist: [{id:genId(),text:"Kanban layout",done:true},{id:genId(),text:"Move between stages",done:false}], tags: ["CRM"], createdAt: "2025-04-22" },
];

// ─── New Module Seed Data ─────────────────────────────────────────────────────

const seedFollowUps = [
  { id: genId(), person: "Rahul Sharma", relatedTo: "Personal CRM Build", relatedType: "Lead", type: "WhatsApp", dueDate: new Date().toISOString().slice(0,10), status: "Pending", notes: "Check if proposal was reviewed.", outcome: "", createdAt: "2025-06-01" },
  { id: genId(), person: "Priya Mehta", relatedTo: "Bloom Clinic CRM", relatedType: "Lead", type: "Call", dueDate: new Date(Date.now() - 86400000).toISOString().slice(0,10), status: "Missed", notes: "She was unavailable. Call again.", outcome: "", createdAt: "2025-06-02" },
  { id: genId(), person: "Sneha Rao", relatedTo: "AutoEdge Motors CRM", relatedType: "Project", type: "Meeting", dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10), status: "Pending", notes: "Phase 2 planning meeting.", outcome: "", createdAt: "2025-06-03" },
];

const seedNotes = [
  { id: genId(), title: "Personal CRM Architecture", body: "Using React + Vite + localStorage. Plan to migrate to Firebase once MVP is done. Keep components modular.", relatedTo: "Personal Founder CRM", relatedType: "Project", type: "Technical", tags: ["CRM"], pinned: true, createdAt: "2025-05-01" },
  { id: genId(), title: "Priya Mehta call notes", body: "She wants patient portal with SMS reminders. Budget is ₹80k. Decision in 2 weeks.", relatedTo: "Priya Mehta", relatedType: "Contact", type: "Call", tags: ["Clinic"], pinned: false, createdAt: "2025-05-10" },
  { id: genId(), title: "Restaurant OS key decision", body: "Decided to use Supabase for real-time KOT updates. Arjun approved the tech choice.", relatedTo: "Spice Route Restaurant OS", relatedType: "Project", type: "Decision", tags: ["Restaurant"], pinned: false, createdAt: "2025-05-15" },
];

const seedDocuments = [
  { id: genId(), name: "TechNova Proposal v2", type: "Proposal", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", url: "https://docs.google.com", status: "Sent", notes: "Sent on June 1.", tags: ["High Value"], createdAt: "2025-06-01" },
  { id: genId(), name: "AutoEdge NDA", type: "NDA", relatedClient: "Sneha Rao", relatedProject: "AutoEdge Motors CRM", url: "https://drive.google.com", status: "Signed", notes: "Signed copy received.", tags: [], createdAt: "2025-04-10" },
  { id: genId(), name: "Bloom Clinic Contract", type: "Contract", relatedClient: "Priya Mehta", relatedProject: "Bloom Clinic CRM", url: "https://drive.google.com", status: "Draft", notes: "Pending legal review.", tags: ["Clinic"], createdAt: "2025-05-20" },
];

const seedInvoices = [
  { id: genId(), invoiceNumber: "INV-001", client: "Sneha Rao", project: "AutoEdge Motors CRM", amount: 60000, tax: 10800, discount: 0, total: 70800, status: "Paid", issueDate: "2025-03-01", dueDate: "2025-03-15", notes: "First installment paid.", createdAt: "2025-03-01" },
  { id: genId(), invoiceNumber: "INV-002", client: "Priya Mehta", project: "Bloom Clinic CRM", amount: 20000, tax: 3600, discount: 0, total: 23600, status: "Partially Paid", issueDate: "2025-04-01", dueDate: "2025-04-30", notes: "Partial advance received.", createdAt: "2025-04-01" },
  { id: genId(), invoiceNumber: "INV-003", client: "Rahul Sharma", project: "Personal Founder CRM", amount: 50000, tax: 9000, discount: 5000, total: 54000, status: "Sent", issueDate: "2025-06-01", dueDate: "2025-06-30", notes: "Awaiting payment.", createdAt: "2025-06-01" },
  { id: genId(), invoiceNumber: "INV-004", client: "Arjun Patel", project: "Spice Route Restaurant OS", amount: 30000, tax: 5400, discount: 0, total: 35400, status: "Overdue", issueDate: "2025-05-01", dueDate: "2025-05-15", notes: "Follow up urgently.", createdAt: "2025-05-01" },
];

const seedPayments = [
  { id: genId(), client: "Sneha Rao", project: "AutoEdge Motors CRM", invoiceNumber: "INV-001", amount: 70800, method: "Bank Transfer", date: "2025-03-15", reference: "TXN-987654", notes: "Full payment received.", createdAt: "2025-03-15" },
  { id: genId(), client: "Priya Mehta", project: "Bloom Clinic CRM", invoiceNumber: "INV-002", amount: 10000, method: "UPI", date: "2025-04-05", reference: "UPI-123456", notes: "Advance payment.", createdAt: "2025-04-05" },
];

const seedProposals = [
  { id: genId(), title: "Personal CRM — Phase 2", client: "Rahul Sharma", service: "Enterprise CRM Development", scope: "Add analytics, reporting, multi-user support, and mobile app.", deliverables: "Web app, Admin panel, Mobile app", timeline: "3 months", price: 250000, terms: "40% advance, 40% mid, 20% delivery", status: "Sent", date: "2025-06-01", createdAt: "2025-06-01" },
  { id: genId(), title: "Bloom Clinic Patient Portal", client: "Priya Mehta", service: "Clinic CRM + Patient Portal", scope: "Patient registration, appointments, billing, SMS reminders.", deliverables: "Web app, Patient portal", timeline: "2 months", price: 80000, terms: "50% advance, 50% delivery", status: "Draft", date: "2025-05-20", createdAt: "2025-05-20" },
  { id: genId(), title: "Restaurant OS Full Build", client: "Arjun Patel", service: "Restaurant Management System", scope: "KOT, menu, staff, billing, analytics.", deliverables: "Web app + Android", timeline: "4 months", price: 60000, terms: "30% advance, 40% mid, 30% delivery", status: "Accepted", date: "2025-04-15", createdAt: "2025-04-15" },
];

const seedCommunications = [
  { id: genId(), contact: "Rahul Sharma", method: "WhatsApp", summary: "Discussed proposal v2. He liked the new pricing.", outcome: "Positive", relatedTo: "Personal CRM Build", relatedType: "Lead", date: "2025-06-02", nextStep: "Follow up after 3 days if no response.", createdAt: "2025-06-02" },
  { id: genId(), contact: "Priya Mehta", method: "Call", summary: "30-min call about clinic requirements. She wants SMS feature.", outcome: "Interested", relatedTo: "Bloom Clinic CRM", relatedType: "Project", date: "2025-05-28", nextStep: "Send updated proposal.", createdAt: "2025-05-28" },
  { id: genId(), contact: "Sneha Rao", method: "Meeting", summary: "Zoom meeting for phase 2 planning. Approved Figma designs.", outcome: "Approved", relatedTo: "AutoEdge Motors CRM", relatedType: "Project", date: "2025-05-20", nextStep: "Start development sprint 3.", createdAt: "2025-05-20" },
];

const seedCalendarEvents = [
  { id: genId(), title: "Follow-up call — Rahul Sharma", type: "Call", date: new Date().toISOString().slice(0,10), time: "11:00", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", notes: "Discuss proposal approval.", createdAt: "2025-06-01" },
  { id: genId(), title: "Payment deadline — INV-003", type: "Payment", date: "2025-06-30", time: "", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", notes: "Invoice INV-003 due.", createdAt: "2025-06-01" },
  { id: genId(), title: "AutoEdge Sprint 3 Kickoff", type: "Meeting", date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10), time: "10:00", relatedClient: "Sneha Rao", relatedProject: "AutoEdge Motors CRM", notes: "Zoom call with Sneha and team.", createdAt: "2025-05-25" },
  { id: genId(), title: "Restaurant OS Deployment", type: "Deployment", date: "2025-09-01", time: "09:00", relatedClient: "Arjun Patel", relatedProject: "Spice Route Restaurant OS", notes: "Production deployment day.", createdAt: "2025-06-01" },
];

const seedSupportTickets = [
  { id: genId(), title: "Login page not loading on mobile", client: "Sneha Rao", project: "AutoEdge Motors CRM", priority: "High", status: "Open", issueType: "Bug", description: "Login page shows blank screen on iOS Safari.", resolutionNotes: "", createdAt: "2025-06-01" },
  { id: genId(), title: "Add export to CSV feature", client: "Priya Mehta", project: "Bloom Clinic CRM", priority: "Medium", status: "In Progress", issueType: "Change Request", description: "Client needs export for patient data.", resolutionNotes: "Working on it.", createdAt: "2025-05-25" },
  { id: genId(), title: "Invoice calculation wrong", client: "Arjun Patel", project: "Spice Route Restaurant OS", priority: "Urgent", status: "Fixed", issueType: "Bug", description: "Tax not applied correctly on split bills.", resolutionNotes: "Fixed in v1.2.3 build.", createdAt: "2025-05-18" },
];

const seedWhatsappTemplates = [
  { id: genId(), name: "First Outreach", category: "First Message", body: "Hi {clientName}! I'm Rahil, a software developer. I build custom CRM and business management apps. Would love to show you how I can help {projectName}. Are you free for a quick call?", active: true, createdAt: "2025-01-01" },
  { id: genId(), name: "Follow-up After Demo", category: "Follow-Up", body: "Hi {clientName}, just checking in after our demo session. Did you get a chance to review it? Happy to answer any questions or customize the demo for {projectName}.", active: true, createdAt: "2025-01-01" },
  { id: genId(), name: "Payment Reminder", category: "Payment Reminder", body: "Hi {clientName}, this is a gentle reminder that ₹{amount} is due for {projectName} by {date}. Please let me know if you have any questions. Thank you!", active: true, createdAt: "2025-01-01" },
  { id: genId(), name: "Proposal Sent", category: "Proposal Sent", body: "Hi {clientName}! I've just sent over the proposal for {projectName}. Please have a look when you get a chance and let me know your thoughts. Looking forward to working with you!", active: true, createdAt: "2025-01-01" },
];

const seedPromptHistory = [
  { id: genId(), title: "Build Contacts Module", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 1, tool: "Kiro", promptBody: "Build a full Contacts module with CRUD, search, filter by status/source, profile modal, tag system, and convert to lead feature.", outputSummary: "Full ContactsModule component with ContactForm, ContactProfile, search, filters, table view.", status: "Applied", date: "2025-04-10", tags: ["CRM", "Contacts"], createdAt: "2025-04-10" },
  { id: genId(), title: "Add Leads Kanban + List", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 2, tool: "Kiro", promptBody: "Add LeadsModule with kanban board and list view, mark won/lost, auto-create project on won.", outputSummary: "LeadsModule with kanban stages, LeadCard, won/lost logic, project auto-creation.", status: "Applied", date: "2025-04-15", tags: ["CRM", "Leads"], createdAt: "2025-04-15" },
  { id: genId(), title: "Full 18-Module Founder OS", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 3, tool: "Kiro", promptBody: "Add 18 new modules: Follow-ups, Notes, Documents, Invoices, Payments, Proposals, Communications, Calendar, Analytics, Settings, Security, Audit Logs, Tags, Support Tickets, WhatsApp Templates, Prompt History, Project Logs, Roadmap.", outputSummary: "All 18 modules added with seed data, CRUD, filters, audit integration.", status: "Applied", date: "2025-07-06", tags: ["CRM", "FounderOS"], createdAt: "2025-07-06" },
];

const seedProjectLogs = [
  { id: genId(), project: "Personal Founder CRM", title: "Initial project scaffolded", type: "Build", description: "React + Vite setup with localStorage. First 5 modules built.", result: "Running successfully on localhost.", date: "2025-04-01", status: "Success", relatedPrompt: "Prompt #1", relatedTask: "Build Contacts module", createdAt: "2025-04-01" },
  { id: genId(), project: "AutoEdge Motors CRM", title: "Fixed duplicate search bug", type: "Bug Fix", description: "Vehicle inventory search was returning duplicate results on filter change.", result: "Bug fixed. Search now deduplicates correctly.", date: "2025-05-10", status: "Success", relatedPrompt: "", relatedTask: "Fix vehicle inventory search bug", createdAt: "2025-05-10" },
  { id: genId(), project: "Bloom Clinic CRM", title: "UI redesign for patient form", type: "UI Change", description: "Redesigned patient intake form with better validation and UX.", result: "Client approved the new design.", date: "2025-05-20", status: "Success", relatedPrompt: "", relatedTask: "", createdAt: "2025-05-20" },
];

const seedRoadmapItems = [
  { id: genId(), item: "Build 18-module Founder OS", project: "Personal CRM", sector: "SaaS", phase: "Phase 1", priority: "Urgent", status: "In Progress", progress: 65, targetDate: "2025-08-31", notes: "Core modules done. Finance, System, Founder OS modules pending.", createdAt: "2025-04-01" },
  { id: genId(), item: "Launch Bloom Clinic CRM MVP", project: "Clinic CRM", sector: "Healthcare", phase: "Phase 1", priority: "High", status: "In Progress", progress: 30, targetDate: "2025-07-15", notes: "Design phase done. Development in progress.", createdAt: "2025-02-01" },
  { id: genId(), item: "Restaurant OS — KOT Module", project: "Restaurant CRM", sector: "F&B", phase: "Phase 1", priority: "Medium", status: "Planned", progress: 10, targetDate: "2025-09-01", notes: "Schema designed. UI pending.", createdAt: "2025-03-01" },
  { id: genId(), item: "AutoEdge Phase 2 — Mobile App", project: "Automotive CRM", sector: "Automotive", phase: "Phase 2", priority: "High", status: "Backlog", progress: 0, targetDate: "2025-12-01", notes: "React Native app for service technicians.", createdAt: "2025-04-01" },
  { id: genId(), item: "Multi-Office CRM — Admin Panel", project: "Multi-Office CRM", sector: "Enterprise", phase: "Phase 1", priority: "Medium", status: "Backlog", progress: 0, targetDate: "2026-03-01", notes: "High value deal with TechNova. Needs planning.", createdAt: "2025-05-01" },
  { id: genId(), item: "Website Demos — 5 Industry Templates", project: "Website Demos", sector: "Web", phase: "Phase 1", priority: "Low", status: "Planned", progress: 20, targetDate: "2025-10-01", notes: "Healthcare, F&B, Automotive, Cafe, Real Estate.", createdAt: "2025-04-15" },
  { id: genId(), item: "Semi-Cafe CRM MVP", project: "Semi-Cafe CRM", sector: "F&B", phase: "Phase 1", priority: "Low", status: "Backlog", progress: 0, targetDate: "2026-01-01", notes: "Lighter version of restaurant OS for small cafes.", createdAt: "2025-06-01" },
  { id: genId(), item: "Firebase Auth + Firestore Migration", project: "Personal CRM", sector: "SaaS", phase: "Phase 2", priority: "High", status: "Backlog", progress: 0, targetDate: "2025-10-01", notes: "Migrate from localStorage to Firebase. Enable multi-user.", createdAt: "2025-06-01" },
];

const seedTags = ["Hot Lead", "Waiting Payment", "Website", "CRM", "Clinic", "Restaurant", "Urgent", "Friend Referral", "Needs Follow-Up", "High Value", "Automotive", "Decision", "Technical"];

const seedCustomFields = [
  { id: genId(), fieldName: "GST Number", appliesTo: "Contact", type: "Text", options: "", active: true },
  { id: genId(), fieldName: "Contract Value", appliesTo: "Lead", type: "Number", options: "", active: true },
  { id: genId(), fieldName: "Industry Sector", appliesTo: "Project", type: "Select", options: "Healthcare,F&B,Automotive,SaaS,Education,Real Estate,Other", active: true },
];

const initAudit = () => [
  { id: genId(), ts: new Date().toISOString(), user: "Owner", module: "System", action: "Init", desc: "App initialized with demo data." },
];

// ─── Theme / Settings ─────────────────────────────────────────────────────────

const defaultSettings = {
  businessName: "Founder OS",
  currency: "INR",
  theme: "light",
  role: "Owner",
  followUpDays: 3,
  invoiceTax: 18,
};

// ─── Status Badge Colors ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  New: { bg: "#EEF2FF", color: "#4338CA" },
  Warm: { bg: "#FFF7ED", color: "#C2410C" },
  Active: { bg: "#F0FDF4", color: "#15803D" },
  Client: { bg: "#ECFDF5", color: "#065F46" },
  Lost: { bg: "#FEF2F2", color: "#B91C1C" },
  Future: { bg: "#F5F3FF", color: "#6D28D9" },
  "Follow-Up Later": { bg: "#FEF9C3", color: "#854D0E" },
  Contacted: { bg: "#E0F2FE", color: "#0369A1" },
  Interested: { bg: "#F0FDF4", color: "#166534" },
  "Demo Sent": { bg: "#EDE9FE", color: "#5B21B6" },
  "Meeting Done": { bg: "#FEF3C7", color: "#92400E" },
  "Proposal Sent": { bg: "#DBEAFE", color: "#1E40AF" },
  Negotiation: { bg: "#FEE2E2", color: "#991B1B" },
  Won: { bg: "#D1FAE5", color: "#065F46" },
  Planning: { bg: "#F3F4F6", color: "#374151" },
  Design: { bg: "#EDE9FE", color: "#5B21B6" },
  Development: { bg: "#DBEAFE", color: "#1D4ED8" },
  Testing: { bg: "#FEF3C7", color: "#92400E" },
  "Client Review": { bg: "#F0FDF4", color: "#15803D" },
  Revisions: { bg: "#FEE2E2", color: "#B91C1C" },
  Deployment: { bg: "#ECFDF5", color: "#047857" },
  Maintenance: { bg: "#F1F5F9", color: "#475569" },
  Completed: { bg: "#D1FAE5", color: "#065F46" },
  "On Hold": { bg: "#FEF9C3", color: "#854D0E" },
  Todo: { bg: "#F3F4F6", color: "#374151" },
  Doing: { bg: "#DBEAFE", color: "#1D4ED8" },
  Blocked: { bg: "#FEE2E2", color: "#991B1B" },
  Done: { bg: "#D1FAE5", color: "#065F46" },
  Low: { bg: "#F0FDF4", color: "#15803D" },
  Medium: { bg: "#FEF3C7", color: "#92400E" },
  High: { bg: "#FEE2E2", color: "#991B1B" },
  Urgent: { bg: "#FEE2E2", color: "#7F1D1D" },
  Pending: { bg: "#FEF9C3", color: "#92400E" },
  Missed: { bg: "#FEE2E2", color: "#991B1B" },
  Rescheduled: { bg: "#EDE9FE", color: "#5B21B6" },
  Draft: { bg: "#F3F4F6", color: "#374151" },
  Sent: { bg: "#DBEAFE", color: "#1E40AF" },
  Signed: { bg: "#D1FAE5", color: "#065F46" },
  Approved: { bg: "#ECFDF5", color: "#047857" },
  Archived: { bg: "#F1F5F9", color: "#475569" },
  Paid: { bg: "#D1FAE5", color: "#065F46" },
  "Partially Paid": { bg: "#FEF3C7", color: "#92400E" },
  Overdue: { bg: "#FEE2E2", color: "#991B1B" },
  Cancelled: { bg: "#F1F5F9", color: "#475569" },
  Viewed: { bg: "#E0F2FE", color: "#0369A1" },
  Accepted: { bg: "#D1FAE5", color: "#065F46" },
  Rejected: { bg: "#FEE2E2", color: "#991B1B" },
  Revised: { bg: "#EDE9FE", color: "#5B21B6" },
  Open: { bg: "#DBEAFE", color: "#1E40AF" },
  "In Progress": { bg: "#FEF3C7", color: "#92400E" },
  "Waiting Client": { bg: "#EDE9FE", color: "#5B21B6" },
  Fixed: { bg: "#D1FAE5", color: "#065F46" },
  Closed: { bg: "#F1F5F9", color: "#475569" },
  Planned: { bg: "#E0F2FE", color: "#0369A1" },
  Backlog: { bg: "#F3F4F6", color: "#374151" },
  Info: { bg: "#DBEAFE", color: "#1E40AF" },
  Success: { bg: "#D1FAE5", color: "#065F46" },
  Warning: { bg: "#FEF3C7", color: "#92400E" },
  Failed: { bg: "#FEE2E2", color: "#991B1B" },
  Applied: { bg: "#D1FAE5", color: "#065F46" },
  "Needs Fix": { bg: "#FEE2E2", color: "#991B1B" },
  "Completed": { bg: "#D1FAE5", color: "#065F46" },
};

const Badge = ({ label, size = "sm" }) => {
  const s = STATUS_COLORS[label] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: size === "sm" ? "2px 8px" : "4px 12px",
      borderRadius: 20, fontSize: size === "sm" ? 11 : 12,
      fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
    }}>{label}</span>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

let _setToasts = null;
const toast = (msg, type = "success") => {
  if (_setToasts) _setToasts(p => [...p, { id: genId(), msg, type }]);
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [toasts]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#FEE2E2" : t.type === "info" ? "#DBEAFE" : "#D1FAE5",
          color: t.type === "error" ? "#991B1B" : t.type === "info" ? "#1E40AF" : "#065F46",
          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxWidth: 320,
        }}>{t.msg}</div>
      ))}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
  }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: "var(--modal-bg)", borderRadius: 16, width: "100%", maxWidth: width,
      maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>×</button>
      </div>
      <div style={{ padding: "20px 24px 24px" }}>{children}</div>
    </div>
  </div>
);

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

const Confirm = ({ msg, onYes, onNo, yesLabel = "Delete", yesVariant = "danger" }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ background: "var(--modal-bg)", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "var(--text)" }}>{msg}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onNo} style={btnStyle("ghost")}>Cancel</button>
        <button onClick={onYes} style={btnStyle(yesVariant)}>{yesLabel}</button>
      </div>
    </div>
  </div>
);

// ─── Button styles ────────────────────────────────────────────────────────────

const btnStyle = (variant = "primary", size = "md") => {
  const base = {
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 500,
    fontSize: size === "sm" ? 12 : 13, padding: size === "sm" ? "5px 12px" : "8px 16px",
    transition: "opacity .15s, background .15s", display: "inline-flex", alignItems: "center", gap: 5,
  };
  if (variant === "primary") return { ...base, background: "#2563EB", color: "#fff" };
  if (variant === "success") return { ...base, background: "#059669", color: "#fff" };
  if (variant === "danger") return { ...base, background: "#DC2626", color: "#fff" };
  if (variant === "warning") return { ...base, background: "#D97706", color: "#fff" };
  if (variant === "ghost") return { ...base, background: "transparent", border: "1px solid var(--border)", color: "var(--text)" };
  if (variant === "soft") return { ...base, background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text)" };
  return base;
};

// ─── Input / Field styles ─────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, background: "var(--input-bg)", color: "var(--text)", outline: "none",
  boxSizing: "border-box",
};

const FormField = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>
      {label}{required && " *"}
    </label>
    {children}
  </div>
);

const SearchInput = ({ value, onChange, placeholder = "Search…" }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ ...inputStyle, padding: "8px 14px", maxWidth: 280 }} />
);

const ProgressBar = ({ value, color = "#2563EB" }) => (
  <div style={{ background: "var(--border)", borderRadius: 8, height: 6, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, value || 0)}%`, height: "100%", background: color, borderRadius: 8, transition: "width .3s" }} />
  </div>
);

const EmptyState = ({ icon = "📭", title, sub, action }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <h3 style={{ margin: "0 0 6px", color: "var(--text)", fontSize: 16 }}>{title}</h3>
    <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: 13 }}>{sub}</p>
    {action}
  </div>
);

const SectionCard = ({ children, style = {} }) => (
  <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, ...style }}>
    {children}
  </div>
);

const StatMini = ({ label, value, color = "#374151", onClick }) => (
  <div onClick={onClick} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", cursor: onClick ? "pointer" : "default" }}>
    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: CONTACTS
// ══════════════════════════════════════════════════════════════════════════════

const CONTACT_STATUSES = ["New", "Warm", "Active", "Client", "Lost", "Future"];
const CONTACT_SOURCES = ["LinkedIn", "Instagram", "Website", "Friend Referral", "Cold Outreach", "Google", "Other"];

const ContactForm = ({ initial = {}, onSave, onClose, allTags }) => {
  const [f, setF] = useState({
    name: "", company: "", role: "", phone: "", whatsapp: "", email: "",
    location: "", source: "LinkedIn", tags: [], status: "New", notes: "", createdAt: new Date().toISOString().slice(0,10),
    ...initial,
  });
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const validate = () => { const e = {}; if (!f.name.trim()) e.name = "Name is required"; if (!f.phone.trim()) e.phone = "Phone is required"; return e; };
  const submit = () => { const e = validate(); if (Object.keys(e).length) { setErr(e); return; } onSave(f); };
  const toggleTag = (t) => setF(p => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }));
  const tagsToShow = [...new Set([...allTags, "Hot Lead", "Waiting Payment", "Urgent", "High Value", "Needs Follow-Up"])];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Name" required><input style={inputStyle} value={f.name} onChange={set("name")} />{err.name && <span style={{ color: "#DC2626", fontSize: 11 }}>{err.name}</span>}</FormField>
        <FormField label="Company"><input style={inputStyle} value={f.company} onChange={set("company")} /></FormField>
        <FormField label="Role"><input style={inputStyle} value={f.role} onChange={set("role")} /></FormField>
        <FormField label="Phone" required><input style={inputStyle} value={f.phone} onChange={set("phone")} />{err.phone && <span style={{ color: "#DC2626", fontSize: 11 }}>{err.phone}</span>}</FormField>
        <FormField label="WhatsApp"><input style={inputStyle} value={f.whatsapp} onChange={set("whatsapp")} /></FormField>
        <FormField label="Email"><input style={inputStyle} value={f.email} onChange={set("email")} /></FormField>
        <FormField label="Location"><input style={inputStyle} value={f.location} onChange={set("location")} /></FormField>
        <FormField label="Source"><select style={inputStyle} value={f.source} onChange={set("source")}>{CONTACT_SOURCES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{CONTACT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
      </div>
      <FormField label="Tags">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {tagsToShow.map(t => (
            <span key={t} onClick={() => toggleTag(t)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: f.tags.includes(t) ? "#2563EB" : "var(--card-bg)", color: f.tags.includes(t) ? "#fff" : "var(--text)", border: "1px solid var(--border)" }}>{t}</span>
          ))}
        </div>
      </FormField>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={submit}>Save contact</button>
      </div>
    </div>
  );
};

const ContactProfile = ({ contact, onClose, onEdit, onConvertLead }) => (
  <Modal title="Contact profile" onClose={onClose} width={520}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#1E40AF" }}>{contact.name.charAt(0)}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{contact.name}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{contact.role}{contact.company ? ` · ${contact.company}` : ""}</div>
      </div>
      <div style={{ marginLeft: "auto" }}><Badge label={contact.status} size="md" /></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 16 }}>
      {[["📞 Phone", contact.phone], ["💬 WhatsApp", contact.whatsapp], ["📧 Email", contact.email], ["📍 Location", contact.location], ["🔗 Source", contact.source], ["📅 Added", fmtDate(contact.createdAt)]].map(([k, v]) => v ? (
        <div key={k}><span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{k}</span><div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{v}</div></div>
      ) : null)}
    </div>
    {contact.tags?.length > 0 && <div style={{ marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>{contact.tags.map(t => <Badge key={t} label={t} />)}</div>}
    {contact.notes && <div style={{ background: "var(--card-bg)", borderRadius: 8, padding: 12, fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{contact.notes}</div>}
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button style={btnStyle("ghost", "sm")} onClick={() => { onConvertLead(contact); onClose(); }}>Convert to lead</button>
      <button style={btnStyle("primary", "sm")} onClick={() => onEdit(contact)}>Edit</button>
    </div>
  </Modal>
);

const ContactsModule = ({ contacts, setContacts, addAudit, role, leads, setLeads }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSource, setFilterSource] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const allTags = useMemo(() => [...new Set(contacts.flatMap(c => c.tags || []))], [contacts]);
  const filtered = useMemo(() => contacts.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q))
      && (filterStatus === "All" || c.status === filterStatus)
      && (filterSource === "All" || c.source === filterSource);
  }), [contacts, search, filterStatus, filterSource]);
  const save = (f) => {
    if (editing) { const u = contacts.map(c => c.id === editing.id ? { ...editing, ...f } : c); setContacts(u); saveLS("contacts", u); addAudit("Contacts", "Update", `Updated contact: ${f.name}`); toast("Contact updated"); }
    else { const nc = { ...f, id: genId(), createdAt: new Date().toISOString().slice(0,10) }; const u = [nc, ...contacts]; setContacts(u); saveLS("contacts", u); addAudit("Contacts", "Create", `Created contact: ${f.name}`); toast("Contact added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const c = contacts.find(x => x.id === id); const u = contacts.filter(x => x.id !== id); setContacts(u); saveLS("contacts", u); addAudit("Contacts", "Delete", `Deleted contact: ${c?.name}`); toast("Contact deleted", "info"); setConfirm(null); };
  const convertToLead = (contact) => {
    const nl = { id: genId(), title: `Lead — ${contact.name}`, contact: contact.name, company: contact.company || "", service: "", source: contact.source, value: 0, probability: 30, stage: "New", priority: "Medium", followUpDate: "", notes: "", tags: contact.tags || [], lostReason: "", createdAt: new Date().toISOString().slice(0,10) };
    const u = [nl, ...leads]; setLeads(u); saveLS("leads", u); addAudit("Leads", "Create", `Converted contact to lead: ${contact.name}`); toast(`${contact.name} converted to lead`);
  };
  return (
    <div>
      {confirm && <Confirm msg="Delete this contact?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? "Edit contact" : "Add contact"} onClose={() => { setShowForm(false); setEditing(null); }}><ContactForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} allTags={allTags} /></Modal>}
      {viewing && <ContactProfile contact={viewing} onClose={() => setViewing(null)} onEdit={(c) => { setEditing(c); setViewing(null); }} onConvertLead={(c) => { convertToLead(c); setViewing(null); }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Contacts</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{filtered.length} of {contacts.length} contacts</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add contact</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, company, phone…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{CONTACT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterSource} onChange={e => setFilterSource(e.target.value)}><option value="All">All sources</option>{CONTACT_SOURCES.map(s => <option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="👤" title="No contacts found" sub="Add your first contact." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add contact</button>} /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--card-bg)" }}>{["Name", "Company", "Phone", "Email", "Source", "Status", "Tags", ""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((c, i) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                <td style={{ padding: "12px 14px" }}><span style={{ fontWeight: 600, color: "var(--text)", cursor: "pointer" }} onClick={() => setViewing(c)}>{c.name}</span>{c.tags?.includes("Hot Lead") && <span style={{ marginLeft: 6, fontSize: 11, background: "#FEE2E2", color: "#991B1B", borderRadius: 12, padding: "1px 7px" }}>🔥 Hot</span>}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{c.company || "—"}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{c.phone || "—"}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{c.email || "—"}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{c.source || "—"}</td>
                <td style={{ padding: "12px 14px" }}><Badge label={c.status} /></td>
                <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(c.tags || []).slice(0, 2).map(t => <Badge key={t} label={t} />)}</div></td>
                <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}><button style={btnStyle("soft", "sm")} onClick={() => setViewing(c)}>View</button>{role !== "Viewer" && <button style={btnStyle("ghost", "sm")} onClick={() => setEditing(c)}>Edit</button>}{(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => setConfirm(c.id)}>Del</button>}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: LEADS
// ══════════════════════════════════════════════════════════════════════════════

const LEAD_STAGES = ["New", "Contacted", "Interested", "Demo Sent", "Meeting Done", "Proposal Sent", "Negotiation", "Won", "Lost", "Follow-Up Later"];
const LEAD_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const LEAD_SOURCES = ["LinkedIn", "Instagram", "Website", "Friend Referral", "Cold Outreach", "Google", "Other"];
const KANBAN_STAGES = ["New", "Contacted", "Interested", "Demo Sent", "Meeting Done", "Proposal Sent", "Negotiation", "Won", "Lost"];

const LeadForm = ({ initial = {}, onSave, onClose }) => {
  const [f, setF] = useState({ title: "", contact: "", company: "", service: "", source: "LinkedIn", value: 0, probability: 50, stage: "New", priority: "Medium", followUpDate: "", notes: "", tags: [], lostReason: "", createdAt: new Date().toISOString().slice(0,10), ...initial });
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => { const e = {}; if (!f.title.trim()) e.title = "Title required"; if (Object.keys(e).length) { setErr(e); return; } onSave(f); };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Lead title" required><input style={inputStyle} value={f.title} onChange={set("title")} />{err.title && <span style={{ color: "#DC2626", fontSize: 11 }}>{err.title}</span>}</FormField>
        <FormField label="Contact"><input style={inputStyle} value={f.contact} onChange={set("contact")} /></FormField>
        <FormField label="Company"><input style={inputStyle} value={f.company} onChange={set("company")} /></FormField>
        <FormField label="Service"><input style={inputStyle} value={f.service} onChange={set("service")} /></FormField>
        <FormField label="Source"><select style={inputStyle} value={f.source} onChange={set("source")}>{LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Stage"><select style={inputStyle} value={f.stage} onChange={set("stage")}>{LEAD_STAGES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{LEAD_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Value (₹)"><input style={inputStyle} type="number" value={f.value} onChange={set("value")} /></FormField>
        <FormField label="Probability %"><input style={inputStyle} type="number" min="0" max="100" value={f.probability} onChange={set("probability")} /></FormField>
        <FormField label="Follow-up date"><input style={inputStyle} type="date" value={f.followUpDate} onChange={set("followUpDate")} /></FormField>
      </div>
      {f.stage === "Lost" && <FormField label="Lost reason"><input style={inputStyle} value={f.lostReason} onChange={set("lostReason")} /></FormField>}
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button style={btnStyle("ghost")} onClick={onClose}>Cancel</button>
        <button style={btnStyle("primary")} onClick={submit}>Save lead</button>
      </div>
    </div>
  );
};

const LeadCard = ({ lead, onEdit, onDelete, onMarkWonLost, role }) => {
  const overdue = lead.followUpDate && isOverdue(lead.followUpDate);
  const todayFU = lead.followUpDate && isToday(lead.followUpDate);
  return (
    <div style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{lead.title}</div>
      {lead.contact && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{lead.contact}{lead.company ? ` · ${lead.company}` : ""}</div>}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        <Badge label={lead.priority} size="sm" />
        {lead.value > 0 && <span style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>₹{Number(lead.value).toLocaleString("en-IN")}</span>}
        {lead.tags?.includes("Hot Lead") && <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B", borderRadius: 12, padding: "1px 7px" }}>🔥</span>}
        {overdue && <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B", borderRadius: 12, padding: "1px 7px" }}>⏰ Overdue</span>}
        {todayFU && <span style={{ fontSize: 11, background: "#FEF9C3", color: "#854D0E", borderRadius: 12, padding: "1px 7px" }}>📅 Today</span>}
      </div>
      {role !== "Viewer" && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button style={btnStyle("ghost", "sm")} onClick={() => onEdit(lead)}>Edit</button>
          {lead.stage !== "Won" && <button style={{ ...btnStyle("ghost", "sm"), color: "#059669" }} onClick={() => onMarkWonLost(lead, "Won")}>Won</button>}
          {lead.stage !== "Lost" && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => onMarkWonLost(lead, "Lost")}>Lost</button>}
          {(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => onDelete(lead.id)}>Del</button>}
        </div>
      )}
    </div>
  );
};

const LeadsModule = ({ leads, setLeads, addAudit, role, projects, setProjects, contacts }) => {
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase();
    return (!q || l.title.toLowerCase().includes(q) || l.contact?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q))
      && (filterPriority === "All" || l.priority === filterPriority);
  }), [leads, search, filterPriority]);
  const save = (f) => {
    if (editing) { const u = leads.map(l => l.id === editing.id ? { ...editing, ...f } : l); setLeads(u); saveLS("leads", u); addAudit("Leads", "Update", `Updated lead: ${f.title}`); toast("Lead updated"); }
    else { const nl = { ...f, id: genId() }; const u = [nl, ...leads]; setLeads(u); saveLS("leads", u); addAudit("Leads", "Create", `Created lead: ${f.title}`); toast("Lead added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const l = leads.find(x => x.id === id); const u = leads.filter(x => x.id !== id); setLeads(u); saveLS("leads", u); addAudit("Leads", "Delete", `Deleted lead: ${l?.title}`); toast("Lead deleted", "info"); setConfirm(null); };
  const markWonLost = (lead, status) => {
    const u = leads.map(l => l.id === lead.id ? { ...l, stage: status } : l); setLeads(u); saveLS("leads", u);
    addAudit("Leads", "Status", `Marked lead ${status}: ${lead.title}`); toast(`Lead marked ${status}`);
    if (status === "Won") {
      const np = { id: genId(), name: `Project — ${lead.title}`, client: lead.contact, industry: "", status: "Planning", budget: lead.value || 0, paid: 0, pending: lead.value || 0, deadline: "", progress: 0, techStack: "", priority: lead.priority, description: lead.notes || "", tags: lead.tags || [], createdAt: new Date().toISOString().slice(0,10) };
      const pu = [np, ...projects]; setProjects(pu); saveLS("projects", pu); toast(`Project created from won lead`);
    }
  };
  return (
    <div>
      {confirm && <Confirm msg="Delete this lead?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? "Edit lead" : "Add lead"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><LeadForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Leads</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{leads.length} total · {leads.filter(l=>l.stage==="Won").length} won · {leads.filter(l=>l.stage==="Lost").length} lost</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnStyle(view === "kanban" ? "primary" : "ghost", "sm")} onClick={() => setView("kanban")}>Kanban</button>
          <button style={btnStyle(view === "list" ? "primary" : "ghost", "sm")} onClick={() => setView("list")}>List</button>
          {role !== "Viewer" && <button style={btnStyle("success")} onClick={() => setShowForm(true)}>+ Add lead</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search leads…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}><option value="All">All priorities</option>{LEAD_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
      </div>
      {view === "kanban" ? (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 12, minWidth: 900 }}>
            {KANBAN_STAGES.map(stage => {
              const sl = filtered.filter(l => l.stage === stage);
              const sv = sl.reduce((a, l) => a + (Number(l.value) || 0), 0);
              return (
                <div key={stage} style={{ flex: "0 0 200px", background: "var(--card-bg)", borderRadius: 12, padding: 12 }}>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600, fontSize: 11, color: "var(--text)", textTransform: "uppercase" }}>{stage}</span><span style={{ background: "var(--border)", borderRadius: 12, padding: "2px 7px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{sl.length}</span></div>
                  {sv > 0 && <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginBottom: 6 }}>₹{sv.toLocaleString("en-IN")}</div>}
                  {sl.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0", opacity: .5 }}>No leads</div> : sl.map(l => <LeadCard key={l.id} lead={l} role={role} onEdit={setEditing} onDelete={(id) => setConfirm(id)} onMarkWonLost={markWonLost} />)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        filtered.length === 0 ? <EmptyState icon="🎯" title="No leads" sub="Add your first lead." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add lead</button>} /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "var(--card-bg)" }}>{["Title", "Contact", "Value", "Stage", "Priority", "Follow-up", ""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map((l, i) => {
                const ov = l.followUpDate && isOverdue(l.followUpDate);
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>{l.title}{l.tags?.includes("Hot Lead") && <span style={{ marginLeft: 6, fontSize: 11, background: "#FEE2E2", color: "#991B1B", borderRadius: 12, padding: "1px 7px" }}>🔥</span>}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{l.contact || "—"}</td>
                    <td style={{ padding: "12px 14px", color: "#059669", fontWeight: 600 }}>{l.value ? `₹${Number(l.value).toLocaleString("en-IN")}` : "—"}</td>
                    <td style={{ padding: "12px 14px" }}><Badge label={l.stage} /></td>
                    <td style={{ padding: "12px 14px" }}><Badge label={l.priority} /></td>
                    <td style={{ padding: "12px 14px", color: ov ? "#DC2626" : "var(--text-muted)", fontWeight: ov ? 600 : 400 }}>{l.followUpDate ? fmtDate(l.followUpDate) : "—"}{ov && " ⏰"}</td>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>{role !== "Viewer" && <button style={btnStyle("ghost", "sm")} onClick={() => setEditing(l)}>Edit</button>}{(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => setConfirm(l.id)}>Del</button>}</div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: PROJECTS
// ══════════════════════════════════════════════════════════════════════════════

const PROJECT_STATUSES = ["Planning", "Design", "Development", "Testing", "Client Review", "Revisions", "Deployment", "Maintenance", "Completed", "On Hold"];
const PROJECT_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const projectHealth = (p) => {
  if (p.progress >= 80 || p.status === "Completed") return { label: "Good", color: "#059669", bg: "#D1FAE5" };
  if (p.deadline && isOverdue(p.deadline)) return { label: "Risky", color: "#DC2626", bg: "#FEE2E2" };
  if (p.progress < 30 && p.deadline && new Date(p.deadline) < new Date(Date.now() + 30 * 86400000)) return { label: "Warning", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Good", color: "#059669", bg: "#D1FAE5" };
};

const ProjectForm = ({ initial = {}, onSave, onClose }) => {
  const [f, setF] = useState({ name: "", client: "", industry: "", status: "Planning", budget: 0, paid: 0, pending: 0, deadline: "", progress: 0, techStack: "", priority: "Medium", description: "", tags: [], createdAt: new Date().toISOString().slice(0,10), ...initial });
  const [err, setErr] = useState({});
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => { const e = {}; if (!f.name.trim()) e.name = "Name required"; if (Object.keys(e).length) { setErr(e); return; } onSave({ ...f, pending: Math.max(0, Number(f.budget) - Number(f.paid)) }); };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Project name" required><input style={inputStyle} value={f.name} onChange={set("name")} />{err.name && <span style={{ color: "#DC2626", fontSize: 11 }}>{err.name}</span>}</FormField>
        <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
        <FormField label="Industry"><input style={inputStyle} value={f.industry} onChange={set("industry")} /></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{PROJECT_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Deadline"><input style={inputStyle} type="date" value={f.deadline} onChange={set("deadline")} /></FormField>
        <FormField label="Budget (₹)"><input style={inputStyle} type="number" value={f.budget} onChange={set("budget")} /></FormField>
        <FormField label="Paid (₹)"><input style={inputStyle} type="number" value={f.paid} onChange={set("paid")} /></FormField>
        <FormField label="Progress %"><input style={inputStyle} type="number" min="0" max="100" value={f.progress} onChange={set("progress")} /></FormField>
        <FormField label="Tech stack"><input style={inputStyle} value={f.techStack} onChange={set("techStack")} /></FormField>
      </div>
      <FormField label="Description"><textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={f.description} onChange={set("description")} /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={submit}>Save project</button></div>
    </div>
  );
};

const ProjectCard = ({ p, onEdit, onDelete, role }) => {
  const health = projectHealth(p);
  const paid = Number(p.paid) || 0; const budget = Number(p.budget) || 0; const pending = budget - paid;
  return (
    <div style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div><div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{p.name}</div>{p.client && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.client}</div>}</div>
        <span style={{ fontSize: 11, background: health.bg, color: health.color, padding: "3px 9px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" }}>{health.label}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge label={p.status} /><Badge label={p.priority} /></div>
      <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}><span>Progress</span><span style={{ fontWeight: 600, color: "var(--text)" }}>{p.progress || 0}%</span></div><ProgressBar value={p.progress || 0} color={health.color} /></div>
      {budget > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[["Budget", `₹${budget.toLocaleString("en-IN")}`, "#374151"], ["Paid", `₹${paid.toLocaleString("en-IN")}`, "#059669"], ["Pending", `₹${pending.toLocaleString("en-IN")}`, "#D97706"]].map(([l, v, c]) => (
            <div key={l} style={{ background: "var(--card-bg)", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</div></div>
          ))}
        </div>
      )}
      {p.deadline && <div style={{ fontSize: 12, color: isOverdue(p.deadline) ? "#DC2626" : "var(--text-muted)" }}>📅 Deadline: {fmtDate(p.deadline)}{isOverdue(p.deadline) && " — Overdue!"}</div>}
      {p.techStack && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🛠 {p.techStack}</div>}
      {role !== "Viewer" && <div style={{ display: "flex", gap: 6, marginTop: 4 }}><button style={btnStyle("ghost", "sm")} onClick={() => onEdit(p)}>Edit</button>{(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => onDelete(p.id)}>Delete</button>}</div>}
    </div>
  );
};

const ProjectsModule = ({ projects, setProjects, addAudit, role }) => {
  const [viewMode, setViewMode] = useState("cards");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const filtered = useMemo(() => projects.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q)) && (filterStatus === "All" || p.status === filterStatus);
  }), [projects, search, filterStatus]);
  const save = (f) => {
    if (editing) { const u = projects.map(p => p.id === editing.id ? { ...editing, ...f } : p); setProjects(u); saveLS("projects", u); addAudit("Projects", "Update", `Updated project: ${f.name}`); toast("Project updated"); }
    else { const np = { ...f, id: genId() }; const u = [np, ...projects]; setProjects(u); saveLS("projects", u); addAudit("Projects", "Create", `Created project: ${f.name}`); toast("Project added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const p = projects.find(x => x.id === id); const u = projects.filter(x => x.id !== id); setProjects(u); saveLS("projects", u); addAudit("Projects", "Delete", `Deleted project: ${p?.name}`); toast("Project deleted", "info"); setConfirm(null); };
  const totalBudget = projects.reduce((a, p) => a + (Number(p.budget) || 0), 0);
  const totalPaid = projects.reduce((a, p) => a + (Number(p.paid) || 0), 0);
  return (
    <div>
      {confirm && <Confirm msg="Delete this project?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? "Edit project" : "Add project"} onClose={() => { setShowForm(false); setEditing(null); }} width={680}><ProjectForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Projects</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{projects.length} projects</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnStyle(viewMode === "cards" ? "primary" : "ghost", "sm")} onClick={() => setViewMode("cards")}>Cards</button>
          <button style={btnStyle(viewMode === "table" ? "primary" : "ghost", "sm")} onClick={() => setViewMode("table")}>Table</button>
          {role !== "Viewer" && <button style={btnStyle("success")} onClick={() => setShowForm(true)}>+ Add project</button>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[["Total budget", `₹${totalBudget.toLocaleString("en-IN")}`, "#1D4ED8"], ["Total paid", `₹${totalPaid.toLocaleString("en-IN")}`, "#059669"], ["Pending", `₹${(totalBudget - totalPaid).toLocaleString("en-IN")}`, "#D97706"], ["Active", projects.filter(p => !["Completed","On Hold"].includes(p.status)).length, "#374151"]].map(([l, v, c]) => (
          <div key={l} style={{ background: "var(--card-bg)", borderRadius: 10, padding: "12px 16px" }}><div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div></div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="🗂️" title="No projects" sub="Start a project or adjust filters." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add project</button>} />
        : viewMode === "cards" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>{filtered.map(p => <ProjectCard key={p.id} p={p} role={role} onEdit={setEditing} onDelete={(id) => setConfirm(id)} />)}</div>
        : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "var(--card-bg)" }}>{["Project", "Client", "Status", "Progress", "Budget", "Paid", "Deadline", ""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map((p, i) => {
                const health = projectHealth(p);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--stripe)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>{p.name}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{p.client || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><Badge label={p.status} /></td>
                    <td style={{ padding: "12px 14px", minWidth: 100 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1 }}><ProgressBar value={p.progress || 0} /></div><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.progress || 0}%</span></div></td>
                    <td style={{ padding: "12px 14px" }}>{p.budget ? `₹${Number(p.budget).toLocaleString("en-IN")}` : "—"}</td>
                    <td style={{ padding: "12px 14px", color: "#059669" }}>{p.paid ? `₹${Number(p.paid).toLocaleString("en-IN")}` : "—"}</td>
                    <td style={{ padding: "12px 14px", color: isOverdue(p.deadline) ? "#DC2626" : "var(--text-muted)" }}>{p.deadline ? fmtDate(p.deadline) : "—"}</td>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>{role !== "Viewer" && <button style={btnStyle("ghost", "sm")} onClick={() => setEditing(p)}>Edit</button>}{(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => setConfirm(p.id)}>Del</button>}</div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )
      }
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: TASKS
// ══════════════════════════════════════════════════════════════════════════════

const TASK_STATUSES = ["Todo", "Doing", "Blocked", "Done"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const TaskForm = ({ initial = {}, onSave, onClose, projects }) => {
  const [f, setF] = useState({ title: "", description: "", project: "", contact: "", status: "Todo", priority: "Medium", dueDate: "", checklist: [], tags: [], createdAt: new Date().toISOString().slice(0,10), ...initial });
  const [err, setErr] = useState({});
  const [newItem, setNewItem] = useState("");
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => { const e = {}; if (!f.title.trim()) e.title = "Title required"; if (Object.keys(e).length) { setErr(e); return; } onSave(f); };
  const addCheckItem = () => { if (!newItem.trim()) return; setF(p => ({ ...p, checklist: [...(p.checklist || []), { id: genId(), text: newItem.trim(), done: false }] })); setNewItem(""); };
  const toggleCheck = (id) => setF(p => ({ ...p, checklist: p.checklist.map(ci => ci.id === id ? { ...ci, done: !ci.done } : ci) }));
  const removeCheck = (id) => setF(p => ({ ...p, checklist: p.checklist.filter(ci => ci.id !== id) }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Task title" required><input style={inputStyle} value={f.title} onChange={set("title")} />{err.title && <span style={{ color: "#DC2626", fontSize: 11 }}>{err.title}</span>}</FormField>
        <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— No project —</option>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TASK_PRIORITIES.map(s => <option key={s}>{s}</option>)}</select></FormField>
        <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
        <FormField label="Contact"><input style={inputStyle} value={f.contact} onChange={set("contact")} /></FormField>
      </div>
      <FormField label="Description"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.description} onChange={set("description")} /></FormField>
      <FormField label="Checklist">
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}><input style={{ ...inputStyle, flex: 1 }} value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add item…" onKeyDown={e => e.key === "Enter" && addCheckItem()} /><button style={btnStyle("ghost", "sm")} onClick={addCheckItem}>Add</button></div>
        {(f.checklist || []).map(ci => (
          <div key={ci.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <input type="checkbox" checked={ci.done} onChange={() => toggleCheck(ci.id)} />
            <span style={{ flex: 1, fontSize: 13, color: ci.done ? "var(--text-muted)" : "var(--text)", textDecoration: ci.done ? "line-through" : "none" }}>{ci.text}</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 16 }} onClick={() => removeCheck(ci.id)}>×</button>
          </div>
        ))}
      </FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={submit}>Save task</button></div>
    </div>
  );
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, role }) => {
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "Done";
  const todayDue = task.dueDate && isToday(task.dueDate);
  const done = (task.checklist || []).filter(c => c.done).length;
  const total = (task.checklist || []).length;
  return (
    <div style={{ background: "var(--modal-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 8, opacity: task.status === "Done" ? 0.7 : 1 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4, textDecoration: task.status === "Done" ? "line-through" : "none" }}>{task.title}</div>
      {task.project && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>📁 {task.project}</div>}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
        <Badge label={task.priority} size="sm" />
        {overdue && <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B", borderRadius: 12, padding: "1px 7px" }}>⏰ Overdue</span>}
        {todayDue && task.status !== "Done" && <span style={{ fontSize: 11, background: "#FEF9C3", color: "#854D0E", borderRadius: 12, padding: "1px 7px" }}>📅 Today</span>}
      </div>
      {total > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{done}/{total} done</div><ProgressBar value={(done / total) * 100} /></div>}
      {task.dueDate && <div style={{ fontSize: 11, color: overdue ? "#DC2626" : "var(--text-muted)", marginBottom: 6 }}>Due: {fmtDate(task.dueDate)}</div>}
      {role !== "Viewer" && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {task.status !== "Done" && <button style={{ ...btnStyle("ghost", "sm"), color: "#059669" }} onClick={() => onStatusChange(task.id, "Done")}>✓ Done</button>}
          <button style={btnStyle("ghost", "sm")} onClick={() => onEdit(task)}>Edit</button>
          {(role === "Owner" || role === "Admin") && <button style={{ ...btnStyle("ghost", "sm"), color: "#DC2626" }} onClick={() => onDelete(task.id)}>Del</button>}
        </div>
      )}
    </div>
  );
};

const TasksModule = ({ tasks, setTasks, addAudit, role, projects }) => {
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => tasks.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.title.toLowerCase().includes(q) || t.project?.toLowerCase().includes(q))
      && (filterProject === "All" || t.project === filterProject)
      && (filterPriority === "All" || t.priority === filterPriority)
      && (view === "today" ? (t.dueDate === today && t.status !== "Done") : view === "overdue" ? (isOverdue(t.dueDate) && t.status !== "Done") : true);
  }), [tasks, search, filterProject, filterPriority, view, today]);
  const save = (f) => {
    if (editing) { const u = tasks.map(t => t.id === editing.id ? { ...editing, ...f } : t); setTasks(u); saveLS("tasks", u); addAudit("Tasks", "Update", `Updated task: ${f.title}`); toast("Task updated"); }
    else { const nt = { ...f, id: genId() }; const u = [nt, ...tasks]; setTasks(u); saveLS("tasks", u); addAudit("Tasks", "Create", `Created task: ${f.title}`); toast("Task added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const t = tasks.find(x => x.id === id); const u = tasks.filter(x => x.id !== id); setTasks(u); saveLS("tasks", u); addAudit("Tasks", "Delete", `Deleted task: ${t?.title}`); toast("Task deleted", "info"); setConfirm(null); };
  const changeStatus = (id, status) => { const u = tasks.map(t => t.id === id ? { ...t, status } : t); setTasks(u); saveLS("tasks", u); addAudit("Tasks", "Status", `Task marked ${status}: ${tasks.find(t=>t.id===id)?.title}`); toast(`Task marked ${status}`); };
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "Done").length;
  const todayCount = tasks.filter(t => isToday(t.dueDate) && t.status !== "Done").length;
  return (
    <div>
      {confirm && <Confirm msg="Delete this task?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm || editing) && <Modal title={editing ? "Edit task" : "Add task"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}><TaskForm initial={editing || {}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} projects={projects} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Tasks</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{tasks.length} total · {tasks.filter(t=>t.status==="Done").length} done</p></div>
        {role !== "Viewer" && <button style={btnStyle("success")} onClick={() => setShowForm(true)}>+ Add task</button>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["kanban","Kanban"],["list","List"],["today",`Today${todayCount>0?` (${todayCount})`:""}`],["overdue",`Overdue${overdueCount>0?` (${overdueCount})`:""}`]].map(([v, l]) => (
          <button key={v} style={{ ...btnStyle(view===v?"primary":"ghost","sm"), background: view!==v&&v==="overdue"&&overdueCount>0?"#FEE2E2":undefined, color: view!==v&&v==="overdue"&&overdueCount>0?"#991B1B":undefined }} onClick={() => setView(v)}>{l}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterProject} onChange={e => setFilterProject(e.target.value)}><option value="All">All projects</option>{projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}><option value="All">All priorities</option>{TASK_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
      </div>
      {view === "kanban" ? (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 14, minWidth: 700 }}>
            {TASK_STATUSES.map(status => {
              const st = filtered.filter(t => t.status === status);
              return (
                <div key={status} style={{ flex: "1 1 200px", minWidth: 200, background: "var(--card-bg)", borderRadius: 12, padding: 12 }}>
                  <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", textTransform: "uppercase" }}>{status}</span><span style={{ background: "var(--border)", borderRadius: 12, padding: "2px 8px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{st.length}</span></div>
                  {st.length === 0 ? <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0", opacity: .5 }}>Empty</div> : st.map(t => <TaskCard key={t.id} task={t} role={role} onEdit={setEditing} onDelete={(id) => setConfirm(id)} onStatusChange={changeStatus} />)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        filtered.length === 0 ? <EmptyState icon="✅" title="No tasks" sub={view==="today"?"No tasks due today.":view==="overdue"?"No overdue tasks! 🎉":"Add your first task."} action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add task</button>} /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "var(--card-bg)" }}>{["Task","Project","Status","Priority","Due date","Checklist",""].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map((t, i) => {
                const ov = t.dueDate && isOverdue(t.dueDate) && t.status !== "Done";
                const done = (t.checklist || []).filter(c => c.done).length; const total = (t.checklist || []).length;
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--border)", background: i%2===0?"transparent":"var(--stripe)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)", textDecoration: t.status==="Done"?"line-through":"none" }}>{t.title}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{t.project || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{role!=="Viewer"?<select style={{ ...inputStyle, width: "auto", padding: "4px 8px", fontSize: 12 }} value={t.status} onChange={e => changeStatus(t.id, e.target.value)}>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}</select>:<Badge label={t.status} />}</td>
                    <td style={{ padding: "12px 14px" }}><Badge label={t.priority} /></td>
                    <td style={{ padding: "12px 14px", color: ov?"#DC2626":"var(--text-muted)", fontWeight: ov?600:400 }}>{t.dueDate?fmtDate(t.dueDate):"—"}{ov&&" ⏰"}</td>
                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{total>0?`${done}/${total}`:"—"}</td>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>{role!=="Viewer"&&<button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>}{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(t.id)}>Del</button>}</div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: FOLLOW-UPS
// ══════════════════════════════════════════════════════════════════════════════

const FU_TYPES = ["Call", "WhatsApp", "Email", "Meeting", "Payment", "Proposal", "Demo", "Revision"];
const FU_STATUSES = ["Pending", "Done", "Missed", "Rescheduled"];

const FollowUpForm = ({ initial = {}, onSave, onClose, contacts, leads, projects }) => {
  const [f, setF] = useState({ person: "", relatedTo: "", relatedType: "Lead", type: "WhatsApp", dueDate: new Date().toISOString().slice(0,10), status: "Pending", notes: "", outcome: "", createdAt: new Date().toISOString().slice(0,10), ...initial });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FormField label="Person"><input style={inputStyle} value={f.person} onChange={set("person")} placeholder="Contact name" /></FormField>
        <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select></FormField>
        <FormField label="Related to"><input style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} placeholder="Lead or project name" /></FormField>
        <FormField label="Related type"><select style={inputStyle} value={f.relatedType} onChange={set("relatedType")}><option>Lead</option><option>Project</option><option>Contact</option></select></FormField>
        <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
        <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select></FormField>
      </div>
      <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
      <FormField label="Outcome"><input style={inputStyle} value={f.outcome} onChange={set("outcome")} placeholder="What happened?" /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save</button></div>
    </div>
  );
};

const FollowUpsModule = ({ followUps, setFollowUps, addAudit, role, contacts, leads, projects }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewFilter, setViewFilter] = useState("All");

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return (followUps || []).filter(f => {
      const q = search.toLowerCase();
      return (!q || f.person?.toLowerCase().includes(q) || f.relatedTo?.toLowerCase().includes(q))
        && (filterStatus === "All" || f.status === filterStatus)
        && (filterType === "All" || f.type === filterType)
        && (viewFilter === "Today" ? f.dueDate === today : viewFilter === "Missed" ? f.status === "Missed" : true);
    });
  }, [followUps, search, filterStatus, filterType, viewFilter]);

  const save = (f) => {
    if (editing) { const u = (followUps||[]).map(x => x.id === editing.id ? { ...editing, ...f } : x); setFollowUps(u); saveLS("followUps", u); addAudit("Follow-Ups", "Update", `Updated follow-up: ${f.person}`); toast("Follow-up updated"); }
    else { const nf = { ...f, id: genId() }; const u = [nf, ...(followUps||[])]; setFollowUps(u); saveLS("followUps", u); addAudit("Follow-Ups", "Create", `Created follow-up: ${f.person}`); toast("Follow-up added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const item = (followUps||[]).find(x => x.id === id); const u = (followUps||[]).filter(x => x.id !== id); setFollowUps(u); saveLS("followUps", u); addAudit("Follow-Ups", "Delete", `Deleted follow-up: ${item?.person}`); toast("Deleted", "info"); setConfirm(null); };
  const markStatus = (id, status) => { const u = (followUps||[]).map(x => x.id === id ? { ...x, status } : x); setFollowUps(u); saveLS("followUps", u); addAudit("Follow-Ups", "Status", `Marked follow-up ${status}`); toast(`Marked ${status}`); };

  const todayCount = (followUps||[]).filter(f => f.dueDate === new Date().toISOString().slice(0,10) && f.status === "Pending").length;
  const missedCount = (followUps||[]).filter(f => f.status === "Missed").length;

  return (
    <div>
      {confirm && <Confirm msg="Delete this follow-up?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit follow-up":"Add follow-up"} onClose={() => { setShowForm(false); setEditing(null); }} width={580}><FollowUpForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} contacts={contacts} leads={leads} projects={projects} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Follow-Ups</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(followUps||[]).length} total</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add follow-up</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <StatMini label="Due Today" value={todayCount} color={todayCount>0?"#D97706":"#374151"} onClick={() => setViewFilter("Today")} />
        <StatMini label="Missed" value={missedCount} color={missedCount>0?"#DC2626":"#374151"} onClick={() => setViewFilter("Missed")} />
        <StatMini label="Pending" value={(followUps||[]).filter(f=>f.status==="Pending").length} color="#2563EB" />
        <StatMini label="Done" value={(followUps||[]).filter(f=>f.status==="Done").length} color="#059669" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {["All","Today","Missed"].map(v => <button key={v} style={btnStyle(viewFilter===v?"primary":"ghost","sm")} onClick={() => setViewFilter(v)}>{v}</button>)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by person or related…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{FU_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All">All types</option>{FU_TYPES.map(t => <option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📞" title="No follow-ups" sub="Stay on top of your outreach." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add follow-up</button>} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(fu => {
            const overdue = fu.dueDate && isOverdue(fu.dueDate) && fu.status === "Pending";
            return (
              <div key={fu.id} style={{ background: "var(--card-bg)", border: `1px solid ${overdue?"#FCA5A5":"var(--border)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{fu.person || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{fu.type} · {fu.relatedTo || "—"} · Due: <span style={{ color: overdue?"#DC2626":"var(--text-muted)", fontWeight: overdue?600:400 }}>{fmtDate(fu.dueDate)}{overdue&&" ⏰"}</span></div>
                  {fu.notes && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fu.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge label={fu.status} />
                  {role !== "Viewer" && <>
                    {fu.status !== "Done" && <button style={{ ...btnStyle("ghost","sm"), color:"#059669" }} onClick={() => markStatus(fu.id, "Done")}>✓ Done</button>}
                    {fu.status === "Pending" && <button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => markStatus(fu.id, "Missed")}>Missed</button>}
                    <button style={btnStyle("ghost","sm")} onClick={() => setEditing(fu)}>Edit</button>
                    {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(fu.id)}>Del</button>}
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: NOTES
// ══════════════════════════════════════════════════════════════════════════════

const NOTE_TYPES = ["General", "Meeting", "Call", "Idea", "Technical", "Decision", "Client Requirement"];

const NotesModule = ({ notes, setNotes, addAudit, role, tags }) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = (notes||[]).filter(n =>
      (!q || n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q))
      && (filterType === "All" || n.type === filterType)
      && (filterTag === "All" || (n.tags||[]).includes(filterTag))
    );
    return [...list.filter(n => n.pinned), ...list.filter(n => !n.pinned)];
  }, [notes, search, filterType, filterTag]);

  const allNoteTags = useMemo(() => [...new Set((notes||[]).flatMap(n => n.tags||[]))], [notes]);

  const save = (f) => {
    if (editing) { const u = (notes||[]).map(n => n.id===editing.id ? { ...editing,...f } : n); setNotes(u); saveLS("notes", u); addAudit("Notes","Update",`Updated note: ${f.title}`); toast("Note updated"); }
    else { const nn = { ...f, id: genId(), createdAt: new Date().toISOString().slice(0,10) }; const u = [nn,...(notes||[])]; setNotes(u); saveLS("notes", u); addAudit("Notes","Create",`Created note: ${f.title}`); toast("Note added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const n = (notes||[]).find(x=>x.id===id); const u = (notes||[]).filter(x=>x.id!==id); setNotes(u); saveLS("notes",u); addAudit("Notes","Delete",`Deleted note: ${n?.title}`); toast("Deleted","info"); setConfirm(null); };
  const togglePin = (id) => { const u = (notes||[]).map(n => n.id===id?{...n,pinned:!n.pinned}:n); setNotes(u); saveLS("notes",u); toast("Pin toggled","info"); };

  const NoteForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ title:"", body:"", relatedTo:"", relatedType:"Project", type:"General", tags:[], pinned:false, ...initial });
    const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
    const toggleTag = (t) => setF(p => ({ ...p, tags: p.tags.includes(t)?p.tags.filter(x=>x!==t):[...p.tags,t] }));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{NOTE_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Related to"><input style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} placeholder="Contact, lead, or project" /></FormField>
          <FormField label="Related type"><select style={inputStyle} value={f.relatedType} onChange={set("relatedType")}><option>Contact</option><option>Lead</option><option>Project</option></select></FormField>
        </div>
        <FormField label="Body"><textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={f.body} onChange={set("body")} /></FormField>
        <FormField label="Tags">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...new Set([...tags, ...allNoteTags])].map(t => <span key={t} onClick={() => toggleTag(t)} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: f.tags.includes(t)?"#2563EB":"var(--card-bg)", color: f.tags.includes(t)?"#fff":"var(--text)", border: "1px solid var(--border)" }}>{t}</span>)}
          </div>
        </FormField>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <input type="checkbox" checked={f.pinned} onChange={e => setF(p=>({...p,pinned:e.target.checked}))} id="pinNote" />
          <label htmlFor="pinNote" style={{ fontSize: 13, color: "var(--text)", cursor: "pointer" }}>📌 Pin this note</label>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save note</button></div>
      </div>
    );
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this note?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit note":"Add note"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}><NoteForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Notes</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(notes||[]).length} notes · {(notes||[]).filter(n=>n.pinned).length} pinned</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add note</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search notes…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All">All types</option>{NOTE_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterTag} onChange={e => setFilterTag(e.target.value)}><option value="All">All tags</option>{allNoteTags.map(t=><option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📝" title="No notes" sub="Capture your thoughts and meeting notes." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add note</button>} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {filtered.map(n => (
            <div key={n.id} style={{ background: "var(--card-bg)", border: `1px solid ${n.pinned?"#FCD34D":"var(--border)"}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", flex: 1 }}>{n.pinned && "📌 "}{n.title}</div>
                <Badge label={n.type} size="sm" />
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{n.body}</p>
              {n.relatedTo && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🔗 {n.relatedTo} ({n.relatedType})</div>}
              {(n.tags||[]).length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{n.tags.map(t=><Badge key={t} label={t} size="sm" />)}</div>}
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(n.createdAt)}</div>
              {role !== "Viewer" && (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button style={btnStyle("ghost","sm")} onClick={() => togglePin(n.id)}>{n.pinned?"Unpin":"Pin"}</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(n)}>Edit</button>
                  {(role==="Owner"||role==="Admin") && <button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(n.id)}>Del</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: DOCUMENTS
// ══════════════════════════════════════════════════════════════════════════════

const DOC_TYPES = ["Proposal", "Contract", "Invoice", "NDA", "Brand Asset", "Requirement", "Deployment Note", "Compliance", "Screenshot", "Other"];
const DOC_STATUSES = ["Draft", "Sent", "Signed", "Approved", "Archived"];

const DocumentsModule = ({ documents, setDocuments, addAudit, role, contacts, projects, tags }) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (documents||[]).filter(d => {
    const q = search.toLowerCase();
    return (!q || d.name?.toLowerCase().includes(q) || d.relatedClient?.toLowerCase().includes(q) || d.relatedProject?.toLowerCase().includes(q))
      && (filterType === "All" || d.type === filterType)
      && (filterStatus === "All" || d.status === filterStatus);
  }), [documents, search, filterType, filterStatus]);

  const DocForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ name:"", type:"Proposal", relatedClient:"", relatedProject:"", url:"", status:"Draft", notes:"", tags:[], createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Name"><input style={inputStyle} value={f.name} onChange={set("name")} /></FormField>
          <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{DOC_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="URL / Link"><input style={inputStyle} value={f.url} onChange={set("url")} placeholder="https://…" /></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u = (documents||[]).map(d=>d.id===editing.id?{...editing,...f}:d); setDocuments(u); saveLS("documents",u); addAudit("Documents","Update",`Updated doc: ${f.name}`); toast("Document updated"); }
    else { const nd = {...f, id: genId()}; const u = [nd,...(documents||[])]; setDocuments(u); saveLS("documents",u); addAudit("Documents","Create",`Added doc: ${f.name}`); toast("Document added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const d = (documents||[]).find(x=>x.id===id); const u = (documents||[]).filter(x=>x.id!==id); setDocuments(u); saveLS("documents",u); addAudit("Documents","Delete",`Deleted doc: ${d?.name}`); toast("Deleted","info"); setConfirm(null); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this document?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit document":"Add document"} onClose={() => { setShowForm(false); setEditing(null); }}><DocForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Documents</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(documents||[]).length} documents</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add document</button>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All">All types</option>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{DOC_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="📄" title="No documents" sub="Track your proposals, contracts, and files." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add document</button>} /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--card-bg)" }}>{["Name","Type","Client","Project","Status","",""].map(h=><th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((d,i) => (
              <tr key={d.id} style={{ borderTop: "1px solid var(--border)", background: i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>{d.name}</td>
                <td style={{ padding: "12px 14px" }}><Badge label={d.type} /></td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{d.relatedClient || "—"}</td>
                <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{d.relatedProject || "—"}</td>
                <td style={{ padding: "12px 14px" }}><Badge label={d.status} /></td>
                <td style={{ padding: "12px 14px" }}>{d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ ...btnStyle("soft","sm"), textDecoration: "none" }}>🔗 Open</a>}</td>
                <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>{role!=="Viewer"&&<button style={btnStyle("ghost","sm")} onClick={() => setEditing(d)}>Edit</button>}{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(d.id)}>Del</button>}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: INVOICES
// ══════════════════════════════════════════════════════════════════════════════

const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];

const InvoicesModule = ({ invoices, setInvoices, addAudit, role, projects, contacts, settings }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (invoices||[]).filter(inv => {
    const q = search.toLowerCase();
    return (!q || inv.invoiceNumber?.toLowerCase().includes(q) || inv.client?.toLowerCase().includes(q) || inv.project?.toLowerCase().includes(q))
      && (filterStatus === "All" || inv.status === filterStatus);
  }), [invoices, search, filterStatus]);

  const totalRevenue = (invoices||[]).filter(i=>i.status==="Paid").reduce((a,i)=>a+(Number(i.total)||0),0);
  const pending = (invoices||[]).filter(i=>["Sent","Partially Paid"].includes(i.status)).reduce((a,i)=>a+(Number(i.total)||0),0);
  const overdue = (invoices||[]).filter(i=>i.status==="Overdue").length;

  const InvForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ invoiceNumber:`INV-${String((invoices||[]).length+1).padStart(3,"0")}`, client:"", project:"", amount:0, tax: settings.invoiceTax||18, discount:0, total:0, status:"Draft", issueDate: new Date().toISOString().slice(0,10), dueDate:"", notes:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p => {
      const u = {...p, [k]: e.target.value};
      const amt = Number(u.amount)||0; const tax = Number(u.tax)||0; const disc = Number(u.discount)||0;
      u.total = amt + (amt*tax/100) - disc;
      return u;
    });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Invoice #"><input style={inputStyle} value={f.invoiceNumber} onChange={set("invoiceNumber")} /></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{INVOICE_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Amount (₹)"><input style={inputStyle} type="number" value={f.amount} onChange={set("amount")} /></FormField>
          <FormField label="Tax %"><input style={inputStyle} type="number" value={f.tax} onChange={set("tax")} /></FormField>
          <FormField label="Discount (₹)"><input style={inputStyle} type="number" value={f.discount} onChange={set("discount")} /></FormField>
          <FormField label="Total"><div style={{ ...inputStyle, background: "var(--card-bg)", color: "#059669", fontWeight: 700 }}>₹{Number(f.total||0).toLocaleString("en-IN")}</div></FormField>
          <FormField label="Issue date"><input style={inputStyle} type="date" value={f.issueDate} onChange={set("issueDate")} /></FormField>
          <FormField label="Due date"><input style={inputStyle} type="date" value={f.dueDate} onChange={set("dueDate")} /></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save invoice</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(invoices||[]).map(i=>i.id===editing.id?{...editing,...f}:i); setInvoices(u); saveLS("invoices",u); addAudit("Invoices","Update",`Updated invoice: ${f.invoiceNumber}`); toast("Invoice updated"); }
    else { const ni={...f,id:genId()}; const u=[ni,...(invoices||[])]; setInvoices(u); saveLS("invoices",u); addAudit("Invoices","Create",`Created invoice: ${f.invoiceNumber}`); toast("Invoice added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role === "Staff") { toast("Staff cannot delete invoices","error"); setConfirm(null); return; }
    const inv=(invoices||[]).find(x=>x.id===id); const u=(invoices||[]).filter(x=>x.id!==id); setInvoices(u); saveLS("invoices",u); addAudit("Invoices","Delete",`Deleted invoice: ${inv?.invoiceNumber}`); toast("Deleted","info"); setConfirm(null);
  };
  const markStatus = (id, status) => { const u=(invoices||[]).map(i=>i.id===id?{...i,status}:i); setInvoices(u); saveLS("invoices",u); addAudit("Invoices","Status",`Invoice marked ${status}`); toast(`Invoice ${status}`); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this invoice?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit invoice":"Add invoice"} onClose={() => { setShowForm(false); setEditing(null); }} width={640}><InvForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Invoices</h2><p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{(invoices||[]).length} invoices</p></div>
        {(role==="Owner"||role==="Admin") && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add invoice</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
        <StatMini label="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(0)}k`} color="#059669" />
        <StatMini label="Pending" value={`₹${(pending/1000).toFixed(0)}k`} color="#D97706" />
        <StatMini label="Overdue" value={overdue} color={overdue>0?"#DC2626":"#374151"} />
        <StatMini label="Paid" value={(invoices||[]).filter(i=>i.status==="Paid").length} color="#059669" />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices…" />
        <select style={{ ...inputStyle, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="All">All statuses</option>{INVOICE_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length === 0 ? <EmptyState icon="🧾" title="No invoices" sub="Create your first invoice." action={(role==="Owner"||role==="Admin")&&<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add invoice</button>} /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--card-bg)" }}>{["Invoice #","Client","Project","Total","Status","Due date",""].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((inv,i) => {
              const ov = inv.status === "Overdue";
              return (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--border)", background: i%2===0?"transparent":"var(--stripe)" }}>
                  <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text)" }}>{inv.invoiceNumber}</td>
                  <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{inv.client||"—"}</td>
                  <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{inv.project||"—"}</td>
                  <td style={{ padding:"12px 14px", color:"#059669", fontWeight:600 }}>₹{Number(inv.total||0).toLocaleString("en-IN")}</td>
                  <td style={{ padding:"12px 14px" }}><Badge label={inv.status} /></td>
                  <td style={{ padding:"12px 14px", color:ov?"#DC2626":"var(--text-muted)", fontWeight:ov?600:400 }}>{inv.dueDate?fmtDate(inv.dueDate):"—"}{ov&&" ⏰"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {(role==="Owner"||role==="Admin")&&<>
                        {inv.status!=="Paid"&&<button style={{ ...btnStyle("ghost","sm"), color:"#059669" }} onClick={() => markStatus(inv.id,"Paid")}>Paid</button>}
                        {inv.status!=="Overdue"&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => markStatus(inv.id,"Overdue")}>Overdue</button>}
                        <button style={btnStyle("ghost","sm")} onClick={() => setEditing(inv)}>Edit</button>
                        <button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(inv.id)}>Del</button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: MANUAL PAYMENTS
// ══════════════════════════════════════════════════════════════════════════════

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

const PaymentsModule = ({ payments, setPayments, addAudit, role, projects, invoices }) => {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (payments||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.client?.toLowerCase().includes(q) || p.project?.toLowerCase().includes(q) || p.invoiceNumber?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q))
      && (filterMethod === "All" || p.method === filterMethod);
  }), [payments, search, filterMethod]);

  const totalReceived = (payments||[]).reduce((a,p)=>a+(Number(p.amount)||0),0);

  const methodTotals = PAYMENT_METHODS.reduce((a,m) => { a[m] = (payments||[]).filter(p=>p.method===m).reduce((s,p)=>s+(Number(p.amount)||0),0); return a; }, {});

  const PayForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ client:"", project:"", invoiceNumber:"", amount:0, method:"UPI", date: new Date().toISOString().slice(0,10), reference:"", notes:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
          <FormField label="Invoice #"><select style={inputStyle} value={f.invoiceNumber} onChange={set("invoiceNumber")}><option value="">— None —</option>{(invoices||[]).map(inv=><option key={inv.id} value={inv.invoiceNumber}>{inv.invoiceNumber} — {inv.client}</option>)}</select></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Amount (₹)"><input style={inputStyle} type="number" value={f.amount} onChange={set("amount")} /></FormField>
          <FormField label="Method"><select style={inputStyle} value={f.method} onChange={set("method")}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Reference / TXN ID"><input style={inputStyle} value={f.reference} onChange={set("reference")} /></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save payment</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(payments||[]).map(p=>p.id===editing.id?{...editing,...f}:p); setPayments(u); saveLS("payments",u); addAudit("Payments","Update",`Updated payment from ${f.client}`); toast("Payment updated"); }
    else { const np={...f,id:genId()}; const u=[np,...(payments||[])]; setPayments(u); saveLS("payments",u); addAudit("Payments","Create",`Recorded payment from ${f.client}: ₹${f.amount}`); toast("Payment recorded"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role==="Staff") { toast("Staff cannot delete payments","error"); setConfirm(null); return; }
    const p=(payments||[]).find(x=>x.id===id); const u=(payments||[]).filter(x=>x.id!==id); setPayments(u); saveLS("payments",u); addAudit("Payments","Delete",`Deleted payment from ${p?.client}`); toast("Deleted","info"); setConfirm(null);
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this payment?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit payment":"Record payment"} onClose={() => { setShowForm(false); setEditing(null); }} width={580}><PayForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Manual Payments</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(payments||[]).length} payments recorded</p></div>
        {(role==="Owner"||role==="Admin") && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record payment</button>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:20 }}>
        <StatMini label="Total Received" value={`₹${(totalReceived/1000).toFixed(0)}k`} color="#059669" />
        {PAYMENT_METHODS.filter(m=>methodTotals[m]>0).map(m => <StatMini key={m} label={m} value={`₹${(methodTotals[m]/1000).toFixed(1)}k`} color="#374151" />)}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payments…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}><option value="All">All methods</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="💰" title="No payments" sub="Record your first payment." action={(role==="Owner"||role==="Admin")&&<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Record payment</button>} /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--card-bg)" }}>{["Client","Invoice","Project","Amount","Method","Date","Reference",""].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((p,i) => (
              <tr key={p.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding:"12px 14px", fontWeight:600, color:"var(--text)" }}>{p.client||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.invoiceNumber||"—"}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{p.project||"—"}</td>
                <td style={{ padding:"12px 14px", color:"#059669", fontWeight:600 }}>₹{Number(p.amount||0).toLocaleString("en-IN")}</td>
                <td style={{ padding:"12px 14px" }}><Badge label={p.method} /></td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)" }}>{fmtDate(p.date)}</td>
                <td style={{ padding:"12px 14px", color:"var(--text-muted)", fontSize:11 }}>{p.reference||"—"}</td>
                <td style={{ padding:"12px 14px" }}><div style={{ display:"flex", gap:6 }}>{(role==="Owner"||role==="Admin")&&<><button style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button><button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(p.id)}>Del</button></>}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: PROPOSAL BUILDER
// ══════════════════════════════════════════════════════════════════════════════

const PROPOSAL_STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Revised"];

const ProposalsModule = ({ proposals, setProposals, addAudit, role, projects, setProjects, contacts }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (proposals||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.client?.toLowerCase().includes(q) || p.service?.toLowerCase().includes(q))
      && (filterStatus==="All" || p.status===filterStatus);
  }), [proposals, search, filterStatus]);

  const ProposalForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ title:"", client:"", service:"", scope:"", deliverables:"", timeline:"", price:0, terms:"50% advance, 50% delivery", status:"Draft", date: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
          <FormField label="Service"><input style={inputStyle} value={f.service} onChange={set("service")} /></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{PROPOSAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Price (₹)"><input style={inputStyle} type="number" value={f.price} onChange={set("price")} /></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
        </div>
        <FormField label="Scope"><textarea style={{ ...inputStyle, minHeight:72, resize:"vertical" }} value={f.scope} onChange={set("scope")} /></FormField>
        <FormField label="Deliverables"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.deliverables} onChange={set("deliverables")} /></FormField>
        <FormField label="Timeline"><input style={inputStyle} value={f.timeline} onChange={set("timeline")} /></FormField>
        <FormField label="Terms"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.terms} onChange={set("terms")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save proposal</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(proposals||[]).map(p=>p.id===editing.id?{...editing,...f}:p); setProposals(u); saveLS("proposals",u); addAudit("Proposals","Update",`Updated proposal: ${f.title}`); toast("Proposal updated"); }
    else { const np={...f,id:genId()}; const u=[np,...(proposals||[])]; setProposals(u); saveLS("proposals",u); addAudit("Proposals","Create",`Created proposal: ${f.title}`); toast("Proposal added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => {
    if (role==="Staff") { toast("Staff cannot delete proposals","error"); setConfirm(null); return; }
    const p=(proposals||[]).find(x=>x.id===id); const u=(proposals||[]).filter(x=>x.id!==id); setProposals(u); saveLS("proposals",u); addAudit("Proposals","Delete",`Deleted proposal: ${p?.title}`); toast("Deleted","info"); setConfirm(null);
  };
  const markStatus = (id, status) => { const u=(proposals||[]).map(p=>p.id===id?{...p,status}:p); setProposals(u); saveLS("proposals",u); addAudit("Proposals","Status",`Proposal marked ${status}`); toast(`Proposal ${status}`); };
  const duplicate = (p) => { const np={...p,id:genId(),title:`${p.title} (Copy)`,status:"Draft",createdAt:new Date().toISOString().slice(0,10)}; const u=[np,...(proposals||[])]; setProposals(u); saveLS("proposals",u); addAudit("Proposals","Duplicate",`Duplicated: ${p.title}`); toast("Proposal duplicated"); };
  const convertToProject = (p) => {
    const np={id:genId(),name:`Project — ${p.title}`,client:p.client,industry:"",status:"Planning",budget:p.price||0,paid:0,pending:p.price||0,deadline:"",progress:0,techStack:"",priority:"Medium",description:p.scope||"",tags:[],createdAt:new Date().toISOString().slice(0,10)};
    const pu=[np,...(projects||[])]; setProjects(pu); saveLS("projects",pu); addAudit("Projects","Create",`Project created from proposal: ${p.title}`); toast("Project created from proposal");
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this proposal?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit proposal":"New proposal"} onClose={() => { setShowForm(false); setEditing(null); }} width={660}><ProposalForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      {viewing && (
        <Modal title="Proposal Preview" onClose={() => setViewing(null)} width={660}>
          <div style={{ lineHeight: 1.7 }}>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--text)", marginBottom:4 }}>{viewing.title}</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:16 }}>For: {viewing.client} · {fmtDate(viewing.date)} · <Badge label={viewing.status} /></div>
            <div style={{ background:"var(--card-bg)", borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:6, color:"var(--text)" }}>Service: {viewing.service}</div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Scope</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.scope}</p>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Deliverables</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.deliverables}</p>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Timeline</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:"0 0 12px" }}>{viewing.timeline}</p>
              <div style={{ fontWeight:700, fontSize:16, color:"#059669", marginBottom:8 }}>Investment: ₹{Number(viewing.price||0).toLocaleString("en-IN")}</div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color:"var(--text-muted)" }}>Terms</div>
              <p style={{ fontSize:13, color:"var(--text)", margin:0 }}>{viewing.terms}</p>
            </div>
          </div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Proposals</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(proposals||[]).length} proposals · {(proposals||[]).filter(p=>p.status==="Accepted").length} accepted</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New proposal</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search proposals…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROPOSAL_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="📋" title="No proposals" sub="Start building your first proposal." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New proposal</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text)", marginBottom:4 }}>{p.title}</div>
                <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:4 }}>{p.client} · {p.service} · {fmtDate(p.date)}</div>
                <div style={{ fontSize:13, color:"#059669", fontWeight:600 }}>₹{Number(p.price||0).toLocaleString("en-IN")}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <Badge label={p.status} />
                <button style={btnStyle("soft","sm")} onClick={() => setViewing(p)}>Preview</button>
                {role !== "Viewer" && <>
                  {p.status!=="Accepted" && <button style={{ ...btnStyle("ghost","sm"), color:"#059669" }} onClick={() => markStatus(p.id,"Accepted")}>Accept</button>}
                  {p.status!=="Rejected" && <button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => markStatus(p.id,"Rejected")}>Reject</button>}
                  {p.status==="Accepted" && <button style={{ ...btnStyle("ghost","sm"), color:"#2563EB" }} onClick={() => convertToProject(p)}>→ Project</button>}
                  <button style={btnStyle("ghost","sm")} onClick={() => duplicate(p)}>Duplicate</button>
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button>
                  {(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(p.id)}>Del</button>}
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: COMMUNICATION LOG
// ══════════════════════════════════════════════════════════════════════════════

const COMM_METHODS = ["WhatsApp", "Call", "Email", "Meeting", "Instagram", "LinkedIn", "Other"];

const CommunicationsModule = ({ communications, setCommunications, addAudit, role, contacts, leads, projects }) => {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (communications||[]).filter(c => {
    const q = search.toLowerCase();
    return (!q || c.contact?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q) || c.relatedTo?.toLowerCase().includes(q))
      && (filterMethod==="All" || c.method===filterMethod);
  }).sort((a,b) => new Date(b.date||0) - new Date(a.date||0)), [communications, search, filterMethod]);

  const CommForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ contact:"", method:"WhatsApp", summary:"", outcome:"", relatedTo:"", relatedType:"Lead", date: new Date().toISOString().slice(0,10), nextStep:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Contact"><input style={inputStyle} value={f.contact} onChange={set("contact")} /></FormField>
          <FormField label="Method"><select style={inputStyle} value={f.method} onChange={set("method")}>{COMM_METHODS.map(m=><option key={m}>{m}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Related to"><input style={inputStyle} value={f.relatedTo} onChange={set("relatedTo")} /></FormField>
          <FormField label="Outcome"><input style={inputStyle} value={f.outcome} onChange={set("outcome")} placeholder="Positive, Neutral, Follow-up needed…" /></FormField>
          <FormField label="Next step"><input style={inputStyle} value={f.nextStep} onChange={set("nextStep")} /></FormField>
        </div>
        <FormField label="Summary"><textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={f.summary} onChange={set("summary")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(communications||[]).map(c=>c.id===editing.id?{...editing,...f}:c); setCommunications(u); saveLS("communications",u); addAudit("Communications","Update",`Updated comm with ${f.contact}`); toast("Updated"); }
    else { const nc={...f,id:genId()}; const u=[nc,...(communications||[])]; setCommunications(u); saveLS("communications",u); addAudit("Communications","Create",`Logged ${f.method} with ${f.contact}`); toast("Communication logged"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const c=(communications||[]).find(x=>x.id===id); const u=(communications||[]).filter(x=>x.id!==id); setCommunications(u); saveLS("communications",u); addAudit("Communications","Delete",`Deleted comm with ${c?.contact}`); toast("Deleted","info"); setConfirm(null); };

  const methodIcons = { WhatsApp:"💬", Call:"📞", Email:"📧", Meeting:"🤝", Instagram:"📸", LinkedIn:"💼", Other:"📌" };

  return (
    <div>
      {confirm && <Confirm msg="Delete this communication?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit communication":"Log communication"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}><CommForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Communication Log</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(communications||[]).length} entries</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Log communication</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by contact or summary…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}><option value="All">All methods</option>{COMM_METHODS.map(m=><option key={m}>{m}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="💬" title="No communications logged" sub="Track every interaction with your clients." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Log communication</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {filtered.map((c, idx) => (
            <div key={c.id} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:32, flexShrink:0 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--card-bg)", border:"2px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{methodIcons[c.method]||"📌"}</div>
                {idx < filtered.length-1 && <div style={{ width:2, flex:1, background:"var(--border)", marginTop:4 }} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                  <div>
                    <span style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{c.contact}</span>
                    <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:8 }}>{c.method} · {fmtDate(c.date)}</span>
                    {c.relatedTo && <span style={{ fontSize:12, color:"var(--text-muted)", marginLeft:8 }}>· {c.relatedTo}</span>}
                  </div>
                  {role !== "Viewer" && <div style={{ display:"flex", gap:6 }}><button style={btnStyle("ghost","sm")} onClick={() => setEditing(c)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(c.id)}>Del</button>}</div>}
                </div>
                {c.summary && <p style={{ fontSize:13, color:"var(--text)", margin:"6px 0 0", lineHeight:1.5 }}>{c.summary}</p>}
                {c.outcome && <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:4 }}>Outcome: {c.outcome}</div>}
                {c.nextStep && <div style={{ fontSize:12, color:"#2563EB", marginTop:4, fontWeight:500 }}>Next: {c.nextStep}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: CALENDAR
// ══════════════════════════════════════════════════════════════════════════════

const CAL_TYPES = ["Meeting", "Call", "Deadline", "Payment", "Follow-Up", "Demo", "Deployment", "Maintenance", "Personal"];
const CAL_TYPE_ICONS = { Meeting:"🤝", Call:"📞", Deadline:"⏰", Payment:"💰", "Follow-Up":"📅", Demo:"🖥️", Deployment:"🚀", Maintenance:"🔧", Personal:"👤" };

const CalendarModule = ({ calendarEvents, setCalendarEvents, addAudit, role, contacts, projects }) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [viewMode, setViewMode] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const today = new Date().toISOString().slice(0,10);

  const sorted = useMemo(() => [...(calendarEvents||[])].sort((a,b)=>new Date(a.date||0)-new Date(b.date||0)), [calendarEvents]);
  const filtered = useMemo(() => sorted.filter(e => {
    const q = search.toLowerCase();
    return (!q || e.title?.toLowerCase().includes(q) || e.relatedClient?.toLowerCase().includes(q))
      && (filterType==="All" || e.type===filterType);
  }), [sorted, search, filterType]);

  const todayEvents = filtered.filter(e => e.date === today);
  const upcomingEvents = filtered.filter(e => e.date > today).slice(0, 10);
  const pastEvents = filtered.filter(e => e.date < today);

  const CalForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ title:"", type:"Meeting", date: today, time:"", relatedClient:"", relatedProject:"", notes:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{CAL_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Time"><input style={inputStyle} type="time" value={f.time} onChange={set("time")} /></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.relatedClient} onChange={set("relatedClient")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.relatedProject} onChange={set("relatedProject")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save event</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(calendarEvents||[]).map(e=>e.id===editing.id?{...editing,...f}:e); setCalendarEvents(u); saveLS("calendarEvents",u); addAudit("Calendar","Update",`Updated event: ${f.title}`); toast("Event updated"); }
    else { const ne={...f,id:genId()}; const u=[ne,...(calendarEvents||[])]; setCalendarEvents(u); saveLS("calendarEvents",u); addAudit("Calendar","Create",`Added event: ${f.title}`); toast("Event added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const e=(calendarEvents||[]).find(x=>x.id===id); const u=(calendarEvents||[]).filter(x=>x.id!==id); setCalendarEvents(u); saveLS("calendarEvents",u); addAudit("Calendar","Delete",`Deleted event: ${e?.title}`); toast("Deleted","info"); setConfirm(null); };

  const EventRow = ({ e }) => (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ width:40, height:40, borderRadius:10, background:"var(--card-bg)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{CAL_TYPE_ICONS[e.type]||"📅"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{e.title}</div>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{fmtDate(e.date)}{e.time && ` · ${e.time}`}{e.relatedClient && ` · ${e.relatedClient}`}{e.relatedProject && ` · ${e.relatedProject}`}</div>
        {e.notes && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{e.notes}</div>}
      </div>
      <div style={{ display:"flex", gap:6 }}><Badge label={e.type} size="sm" />{role!=="Viewer"&&<><button style={btnStyle("ghost","sm")} onClick={() => setEditing(e)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(e.id)}>Del</button>}</>}</div>
    </div>
  );

  return (
    <div>
      {confirm && <Confirm msg="Delete this event?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit event":"Add event"} onClose={() => { setShowForm(false); setEditing(null); }} width={560}><CalForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Calendar</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(calendarEvents||[]).length} events</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add event</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search events…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="All">All types</option>{CAL_TYPES.map(t=><option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="📅" title="No events" sub="Add meetings, deadlines, and reminders." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add event</button>} /> : (
        <div>
          {todayEvents.length > 0 && (
            <SectionCard style={{ marginBottom:16, background:"#EFF6FF", borderColor:"#BFDBFE" }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#1D4ED8", marginBottom:10 }}>📅 Today</div>
              {todayEvents.map(e => <EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
          {upcomingEvents.length > 0 && (
            <SectionCard style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:10 }}>Upcoming</div>
              {upcomingEvents.map(e => <EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
          {pastEvents.length > 0 && (
            <SectionCard style={{ opacity:.75 }}>
              <div style={{ fontWeight:700, fontSize:14, color:"var(--text-muted)", marginBottom:10 }}>Past ({pastEvents.length})</div>
              {pastEvents.slice(-5).reverse().map(e => <EventRow key={e.id} e={e} />)}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

const AnalyticsModule = ({ contacts, leads, projects, tasks, followUps, invoices, payments, proposals, communications, supportTickets, roadmapItems }) => {
  const MiniBar = ({ label, value, total, color="#2563EB" }) => (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}><span style={{ color:"var(--text-muted)" }}>{label}</span><span style={{ fontWeight:600, color:"var(--text)" }}>{value}</span></div>
      <ProgressBar value={(value/Math.max(1,total))*100} color={color} />
    </div>
  );

  const totalRevenue = (invoices||[]).filter(i=>i.status==="Paid").reduce((a,i)=>a+(Number(i.total)||0),0);
  const pendingRevenue = (invoices||[]).filter(i=>["Sent","Partially Paid"].includes(i.status)).reduce((a,i)=>a+(Number(i.total)||0),0);

  const leadsByStage = LEAD_STAGES.reduce((a,s)=>{ a[s]=(leads||[]).filter(l=>l.stage===s).length; return a; },{});
  const tasksByStatus = TASK_STATUSES.reduce((a,s)=>{ a[s]=(tasks||[]).filter(t=>t.status===s).length; return a; },{});
  const projByStatus = PROJECT_STATUSES.reduce((a,s)=>{ a[s]=(projects||[]).filter(p=>p.status===s).length; return a; },{});
  const invoiceByStatus = INVOICE_STATUSES.reduce((a,s)=>{ a[s]=(invoices||[]).filter(i=>i.status===s).length; return a; },{});
  const proposalByStatus = PROPOSAL_STATUSES.reduce((a,s)=>{ a[s]=(proposals||[]).filter(p=>p.status===s).length; return a; },{});
  const commByMethod = COMM_METHODS.reduce((a,m)=>{ a[m]=(communications||[]).filter(c=>c.method===m).length; return a; },{});
  const payByMethod = PAYMENT_METHODS.reduce((a,m)=>{ a[m]=(payments||[]).filter(p=>p.method===m).length; return a; },{});
  const ticketByStatus = ["Open","In Progress","Waiting Client","Fixed","Closed"].reduce((a,s)=>{ a[s]=(supportTickets||[]).filter(t=>t.status===s).length; return a; },{});
  const rmDone = (roadmapItems||[]).filter(i=>i.status==="Done").length;
  const rmTotal = (roadmapItems||[]).length;
  const fuDone = (followUps||[]).filter(f=>f.status==="Done").length;
  const fuTotal = (followUps||[]).length;
  const wonLeads = (leads||[]).filter(l=>l.stage==="Won").length;
  const lostLeads = (leads||[]).filter(l=>l.stage==="Lost").length;

  return (
    <div>
      <div style={{ marginBottom:24 }}><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Analytics</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>Business performance overview</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:24 }}>
        <StatMini label="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(0)}k`} color="#059669" />
        <StatMini label="Pending Revenue" value={`₹${(pendingRevenue/1000).toFixed(0)}k`} color="#D97706" />
        <StatMini label="Won Leads" value={wonLeads} color="#059669" />
        <StatMini label="Lost Leads" value={lostLeads} color="#DC2626" />
        <StatMini label="Follow-up Rate" value={fuTotal>0?`${Math.round((fuDone/fuTotal)*100)}%`:"—"} color="#2563EB" />
        <StatMini label="Roadmap Done" value={rmTotal>0?`${Math.round((rmDone/rmTotal)*100)}%`:"—"} color="#7C3AED" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Leads by Stage</div>{LEAD_STAGES.filter(s=>leadsByStage[s]>0).map(s=><MiniBar key={s} label={s} value={leadsByStage[s]} total={leads.length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Projects by Status</div>{PROJECT_STATUSES.filter(s=>projByStatus[s]>0).map(s=><MiniBar key={s} label={s} value={projByStatus[s]} total={projects.length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Tasks by Status</div>{TASK_STATUSES.map(s=><MiniBar key={s} label={s} value={tasksByStatus[s]} total={tasks.length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Invoice Status</div>{INVOICE_STATUSES.filter(s=>invoiceByStatus[s]>0).map(s=><MiniBar key={s} label={s} value={invoiceByStatus[s]} total={invoices.length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Proposal Status</div>{PROPOSAL_STATUSES.filter(s=>proposalByStatus[s]>0).map(s=><MiniBar key={s} label={s} value={proposalByStatus[s]} total={(proposals||[]).length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Communication Methods</div>{COMM_METHODS.filter(m=>commByMethod[m]>0).map(m=><MiniBar key={m} label={m} value={commByMethod[m]} total={(communications||[]).length} color="#2563EB" />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Payment Methods</div>{PAYMENT_METHODS.filter(m=>payByMethod[m]>0).map(m=><MiniBar key={m} label={m} value={payByMethod[m]} total={(payments||[]).length} color="#059669" />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Support Tickets</div>{["Open","In Progress","Waiting Client","Fixed","Closed"].filter(s=>ticketByStatus[s]>0).map(s=><MiniBar key={s} label={s} value={ticketByStatus[s]} total={(supportTickets||[]).length} color={STATUS_COLORS[s]?.color||"#2563EB"} />)}</SectionCard>
        <SectionCard><div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Roadmap Progress</div>
          <div style={{ marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:"var(--text-muted)" }}>Overall completion</span><span style={{ fontWeight:600 }}>{rmTotal>0?`${Math.round((rmDone/rmTotal)*100)}%`:"0%"}</span></div><ProgressBar value={rmTotal>0?(rmDone/rmTotal)*100:0} color="#7C3AED" /></div>
          {["Backlog","Planned","In Progress","Testing","Done","Blocked"].map(s => {
            const c = (roadmapItems||[]).filter(i=>i.status===s).length;
            return c > 0 ? <MiniBar key={s} label={s} value={c} total={rmTotal} color={STATUS_COLORS[s]?.color||"#374151"} /> : null;
          })}
        </SectionCard>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

const SettingsModule = ({ settings, setSettings, role, onResetData }) => {
  const [f, setF] = useState(settings);
  const [confirmReset, setConfirmReset] = useState(false);
  const set = k => e => setF(p=>({...p,[k]:e.target.value}));
  const saveSettings = () => { setSettings(f); saveLS("settings",f); toast("Settings saved"); };

  return (
    <div>
      {confirmReset && <Confirm msg="Reset all demo data? This will clear all your records and restore seed data. Cannot be undone." yesLabel="Reset Data" onYes={() => { onResetData(); setConfirmReset(false); }} onNo={() => setConfirmReset(false)} />}
      <div style={{ marginBottom:24 }}><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Settings</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>Configure your Founder OS</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16 }}>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Business Settings</div>
          <FormField label="Business Name"><input style={inputStyle} value={f.businessName||""} onChange={set("businessName")} /></FormField>
          <FormField label="Currency">
            <select style={inputStyle} value={f.currency||"INR"} onChange={set("currency")}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select>
          </FormField>
          <FormField label="Default Follow-Up Days"><input style={inputStyle} type="number" value={f.followUpDays||3} onChange={set("followUpDays")} /></FormField>
          <FormField label="Default Invoice Tax %"><input style={inputStyle} type="number" value={f.invoiceTax||18} onChange={set("invoiceTax")} /></FormField>
          <button style={btnStyle("primary")} onClick={saveSettings}>Save settings</button>
        </SectionCard>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Appearance</div>
          <FormField label="Theme">
            <select style={inputStyle} value={f.theme||"light"} onChange={set("theme")}><option value="light">Light</option><option value="dark">Dark</option></select>
          </FormField>
          <FormField label="Role Simulation">
            <select style={inputStyle} value={f.role||"Owner"} onChange={set("role")}><option>Owner</option><option>Admin</option><option>Staff</option><option>Viewer</option></select>
          </FormField>
          <button style={btnStyle("primary")} onClick={saveSettings}>Apply changes</button>
        </SectionCard>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Data Management</div>
          <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:14 }}>Export and import your data for backup purposes.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button style={btnStyle("soft")} onClick={() => toast("Export feature coming soon — will download JSON backup","info")}>📥 Export backup (coming soon)</button>
            <button style={btnStyle("soft")} onClick={() => toast("Import feature coming soon — will restore from JSON backup","info")}>📤 Import backup (coming soon)</button>
            {(role==="Owner") && (
              <button style={btnStyle("danger")} onClick={() => setConfirmReset(true)}>🗑️ Reset all demo data</button>
            )}
          </div>
          {role !== "Owner" && <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:10 }}>Only Owner can reset data.</p>}
        </SectionCard>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SECURITY
// ══════════════════════════════════════════════════════════════════════════════

const SecurityModule = ({ settings, setSettings }) => {
  const permMatrix = [
    ["Feature", "Owner", "Admin", "Staff", "Viewer"],
    ["View all data", "✅", "✅", "✅", "✅"],
    ["Add contacts/leads", "✅", "✅", "✅", "❌"],
    ["Edit contacts/leads", "✅", "✅", "✅", "❌"],
    ["Delete contacts/leads", "✅", "✅", "❌", "❌"],
    ["Add/edit invoices", "✅", "✅", "❌", "❌"],
    ["Delete invoices", "✅", "✅", "❌", "❌"],
    ["Add tasks/notes/follow-ups", "✅", "✅", "✅", "❌"],
    ["Add communications/logs", "✅", "✅", "✅", "❌"],
    ["Delete proposals/payments", "✅", "✅", "❌", "❌"],
    ["Clear audit logs", "✅", "❌", "❌", "❌"],
    ["Reset demo data", "✅", "❌", "❌", "❌"],
    ["Manage settings", "✅", "✅", "❌", "❌"],
  ];
  const mockLogin = [
    { time: "2025-07-06 09:14", ip: "192.168.1.1", status: "✅ Success", role: "Owner" },
    { time: "2025-07-05 22:38", ip: "192.168.1.1", status: "✅ Success", role: "Owner" },
    { time: "2025-07-05 18:01", ip: "10.0.0.5", status: "❌ Failed", role: "—" },
    { time: "2025-07-04 11:22", ip: "192.168.1.1", status: "✅ Success", role: "Admin" },
  ];
  const checklist = [
    ["Role-based permissions", true],
    ["Audit logging enabled", true],
    ["Delete confirmations", true],
    ["Data export/backup", false],
    ["Session timeout (coming)", false],
    ["Failed login monitoring (mock)", true],
    ["Firebase Auth (planned)", false],
    ["Firestore Rules (planned)", false],
    ["Server-side validation (planned)", false],
  ];
  return (
    <div>
      <div style={{ marginBottom:24 }}><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Security</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>Local/demo security overview — not production auth</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Current Session</div>
          <div style={{ marginBottom:10 }}><span style={{ fontSize:12, color:"var(--text-muted)" }}>Active role: </span><strong style={{ color:"#2563EB" }}>{settings.role}</strong></div>
          <FormField label="Switch role">
            <select style={inputStyle} value={settings.role} onChange={e => { const ns={...settings,role:e.target.value}; setSettings(ns); saveLS("settings",ns); toast(`Role switched to ${e.target.value}`); }}><option>Owner</option><option>Admin</option><option>Staff</option><option>Viewer</option></select>
          </FormField>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>Session timeout setting (UI only, no backend): <input style={{ ...inputStyle, width:80, display:"inline" }} defaultValue="30" /> mins</div>
        </SectionCard>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Security Checklist</div>
          {checklist.map(([item, done]) => (
            <div key={item} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:16 }}>{done?"✅":"⏳"}</span>
              <span style={{ fontSize:13, color:done?"var(--text)":"var(--text-muted)" }}>{item}</span>
            </div>
          ))}
        </SectionCard>
        <SectionCard style={{ gridColumn:"span 2" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Permission Matrix</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr>{permMatrix[0].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", background:"var(--card-bg)", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{permMatrix.slice(1).map((row,i)=>(
                <tr key={i} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)" }}>
                  {row.map((cell,j)=><td key={j} style={{ padding:"8px 12px", color:j===0?"var(--text)":"var(--text-muted)", fontWeight:j===0?500:400, textAlign:j===0?"left":"center" }}>{cell}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard style={{ gridColumn:"span 2" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Mock Login Activity</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--card-bg)" }}>{["Time","IP","Status","Role"].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
            <tbody>{mockLogin.map((m,i)=><tr key={i} style={{ borderTop:"1px solid var(--border)" }}><td style={{ padding:"8px 12px", color:"var(--text-muted)" }}>{m.time}</td><td style={{ padding:"8px 12px", color:"var(--text-muted)" }}>{m.ip}</td><td style={{ padding:"8px 12px" }}>{m.status}</td><td style={{ padding:"8px 12px", color:"var(--text-muted)" }}>{m.role}</td></tr>)}</tbody>
          </table>
          <div style={{ marginTop:12, fontSize:11, color:"var(--text-muted)", background:"#FEF9C3", padding:"8px 12px", borderRadius:8, borderLeft:"3px solid #D97706" }}>⚠️ This is demo/local security only. Real auth via Firebase is planned for Phase 2.</div>
        </SectionCard>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════

const AuditLogsModule = ({ audit, setAudit, role }) => {
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [confirmClear, setConfirmClear] = useState(false);

  const modules = useMemo(() => ["All", ...new Set((audit||[]).map(a=>a.module))], [audit]);
  const actions = useMemo(() => ["All", ...new Set((audit||[]).map(a=>a.action))], [audit]);

  const filtered = useMemo(() => (audit||[]).filter(a => {
    const q = search.toLowerCase();
    return (!q || a.desc?.toLowerCase().includes(q) || a.module?.toLowerCase().includes(q) || a.user?.toLowerCase().includes(q))
      && (filterModule==="All" || a.module===filterModule)
      && (filterAction==="All" || a.action===filterAction);
  }), [audit, search, filterModule, filterAction]);

  const clearLogs = () => { setAudit([]); saveLS("audit",[]); toast("Audit logs cleared","info"); setConfirmClear(false); };

  return (
    <div>
      {confirmClear && <Confirm msg="Clear all audit logs? This cannot be undone." yesLabel="Clear Logs" onYes={clearLogs} onNo={() => setConfirmClear(false)} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Audit Logs</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{filtered.length} of {(audit||[]).length} entries</p></div>
        {role==="Owner" && <button style={btnStyle("danger")} onClick={() => setConfirmClear(true)}>Clear logs</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterModule} onChange={e=>setFilterModule(e.target.value)}>{modules.map(m=><option key={m}>{m}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterAction} onChange={e=>setFilterAction(e.target.value)}>{actions.map(a=><option key={a}>{a}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="📋" title="No audit logs" sub="Actions will appear here." /> : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"var(--card-bg)" }}>{["Time","User","Module","Action","Description"].map(h=><th key={h} style={{ padding:"10px 14px", textAlign:"left", fontWeight:600, color:"var(--text-muted)", fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map((a,i)=>(
              <tr key={a.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"transparent":"var(--stripe)" }}>
                <td style={{ padding:"10px 14px", color:"var(--text-muted)", whiteSpace:"nowrap", fontSize:11 }}>{new Date(a.ts).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</td>
                <td style={{ padding:"10px 14px", color:"#2563EB", fontWeight:500 }}>{a.user||"—"}</td>
                <td style={{ padding:"10px 14px", color:"var(--text-muted)" }}>{a.module}</td>
                <td style={{ padding:"10px 14px" }}><Badge label={a.action} size="sm" /></td>
                <td style={{ padding:"10px 14px", color:"var(--text)" }}>{a.desc}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: TAGS & CUSTOM FIELDS
// ══════════════════════════════════════════════════════════════════════════════

const TagsModule = ({ tags, setTags, customFields, setCustomFields, addAudit, role }) => {
  const [newTag, setNewTag] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [editTagVal, setEditTagVal] = useState("");
  const [confirmDeleteTag, setConfirmDeleteTag] = useState(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [confirmDeleteField, setConfirmDeleteField] = useState(null);

  const addTag = () => {
    if (!newTag.trim()) return;
    if ((tags||[]).includes(newTag.trim())) { toast("Tag already exists","error"); return; }
    const u = [...(tags||[]), newTag.trim()]; setTags(u); saveLS("tags",u); addAudit("Tags","Create",`Added tag: ${newTag}`); toast("Tag added"); setNewTag("");
  };
  const delTag = (t) => { const u = (tags||[]).filter(x=>x!==t); setTags(u); saveLS("tags",u); addAudit("Tags","Delete",`Deleted tag: ${t}`); toast("Tag deleted","info"); setConfirmDeleteTag(null); };
  const saveEditTag = (old) => { const u = (tags||[]).map(t=>t===old?editTagVal.trim():t); setTags(u); saveLS("tags",u); addAudit("Tags","Update",`Renamed tag: ${old} → ${editTagVal}`); toast("Tag renamed"); setEditingTag(null); };

  const CF_TYPES = ["Text","Number","Date","Select"];
  const CF_APPLIES = ["Contact","Lead","Project","Task","Invoice"];

  const FieldForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ fieldName:"", appliesTo:"Contact", type:"Text", options:"", active:true, ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Field name"><input style={inputStyle} value={f.fieldName} onChange={set("fieldName")} /></FormField>
          <FormField label="Applies to"><select style={inputStyle} value={f.appliesTo} onChange={set("appliesTo")}>{CF_APPLIES.map(a=><option key={a}>{a}</option>)}</select></FormField>
          <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{CF_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          {f.type==="Select" && <FormField label="Options (comma-separated)"><input style={inputStyle} value={f.options} onChange={set("options")} placeholder="Option1,Option2,Option3" /></FormField>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><input type="checkbox" checked={f.active} onChange={e=>setF(p=>({...p,active:e.target.checked}))} id="cfActive" /><label htmlFor="cfActive" style={{ fontSize:13, color:"var(--text)", cursor:"pointer" }}>Active</label></div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save field</button></div>
      </div>
    );
  };
  const saveField = (f) => {
    if (editingField) { const u=(customFields||[]).map(x=>x.id===editingField.id?{...editingField,...f}:x); setCustomFields(u); saveLS("customFields",u); addAudit("Custom Fields","Update",`Updated field: ${f.fieldName}`); toast("Field updated"); }
    else { const nf={...f,id:genId()}; const u=[nf,...(customFields||[])]; setCustomFields(u); saveLS("customFields",u); addAudit("Custom Fields","Create",`Created field: ${f.fieldName}`); toast("Field added"); }
    setShowFieldForm(false); setEditingField(null);
  };
  const delField = (id) => { const f=(customFields||[]).find(x=>x.id===id); const u=(customFields||[]).filter(x=>x.id!==id); setCustomFields(u); saveLS("customFields",u); addAudit("Custom Fields","Delete",`Deleted field: ${f?.fieldName}`); toast("Deleted","info"); setConfirmDeleteField(null); };

  return (
    <div>
      {confirmDeleteTag && <Confirm msg={`Delete tag "${confirmDeleteTag}"?`} onYes={() => delTag(confirmDeleteTag)} onNo={() => setConfirmDeleteTag(null)} />}
      {confirmDeleteField && <Confirm msg="Delete this custom field?" onYes={() => delField(confirmDeleteField)} onNo={() => setConfirmDeleteField(null)} />}
      {(showFieldForm||editingField) && <Modal title={editingField?"Edit field":"Add custom field"} onClose={() => { setShowFieldForm(false); setEditingField(null); }} width={520}><FieldForm initial={editingField||{}} onSave={saveField} onClose={() => { setShowFieldForm(false); setEditingField(null); }} /></Modal>}
      <div style={{ marginBottom:24 }}><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Tags & Custom Fields</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>Manage your labels and field definitions</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16 }}>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Tags ({(tags||[]).length})</div>
          {role!=="Viewer" && (
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              <input style={{ ...inputStyle, flex:1 }} value={newTag} onChange={e=>setNewTag(e.target.value)} placeholder="New tag name…" onKeyDown={e=>e.key==="Enter"&&addTag()} />
              <button style={btnStyle("primary","sm")} onClick={addTag}>Add</button>
            </div>
          )}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {(tags||[]).map(t => (
              <div key={t} style={{ display:"flex", alignItems:"center", gap:4, background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:20, padding:"4px 10px" }}>
                {editingTag===t ? (
                  <>
                    <input style={{ ...inputStyle, width:100, padding:"2px 6px", fontSize:12 }} value={editTagVal} onChange={e=>setEditTagVal(e.target.value)} autoFocus />
                    <button style={{ background:"none", border:"none", cursor:"pointer", color:"#059669", fontSize:14 }} onClick={() => saveEditTag(t)}>✓</button>
                    <button style={{ background:"none", border:"none", cursor:"pointer", color:"#DC2626", fontSize:14 }} onClick={() => setEditingTag(null)}>×</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:12, color:"var(--text)" }}>{t}</span>
                    {role!=="Viewer"&&<><button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", fontSize:12 }} onClick={() => { setEditingTag(t); setEditTagVal(t); }}>✏️</button><button style={{ background:"none", border:"none", cursor:"pointer", color:"#DC2626", fontSize:14 }} onClick={() => setConfirmDeleteTag(t)}>×</button></>}
                  </>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>Custom Fields ({(customFields||[]).length})</div>
            {role!=="Viewer"&&<button style={btnStyle("primary","sm")} onClick={() => setShowFieldForm(true)}>+ Add field</button>}
          </div>
          {(customFields||[]).length===0 ? <div style={{ fontSize:13, color:"var(--text-muted)" }}>No custom fields yet.</div> : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(customFields||[]).map(cf => (
                <div key={cf.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:"var(--card-bg)", borderRadius:8, border:"1px solid var(--border)" }}>
                  <div><div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{cf.fieldName}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{cf.appliesTo} · {cf.type}{!cf.active&&" · Inactive"}</div></div>
                  {role!=="Viewer"&&<div style={{ display:"flex", gap:6 }}><button style={btnStyle("ghost","sm")} onClick={() => setEditingField(cf)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirmDeleteField(cf.id)}>Del</button>}</div>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: SUPPORT TICKETS
// ══════════════════════════════════════════════════════════════════════════════

const TICKET_STATUSES = ["Open", "In Progress", "Waiting Client", "Fixed", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const TICKET_TYPES = ["Bug", "Change Request", "Question", "Billing", "Access", "Other"];

const SupportTicketsModule = ({ supportTickets, setSupportTickets, addAudit, role, contacts, projects }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (supportTickets||[]).filter(t => {
    const q = search.toLowerCase();
    return (!q || t.title?.toLowerCase().includes(q) || t.client?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      && (filterStatus==="All" || t.status===filterStatus)
      && (filterPriority==="All" || t.priority===filterPriority);
  }), [supportTickets, search, filterStatus, filterPriority]);

  const TicketForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ title:"", client:"", project:"", priority:"Medium", status:"Open", issueType:"Bug", description:"", resolutionNotes:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Client"><input style={inputStyle} value={f.client} onChange={set("client")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Issue type"><select style={inputStyle} value={f.issueType} onChange={set("issueType")}>{TICKET_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
        </div>
        <FormField label="Description"><textarea style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={f.description} onChange={set("description")} /></FormField>
        <FormField label="Resolution notes"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.resolutionNotes} onChange={set("resolutionNotes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save ticket</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(supportTickets||[]).map(t=>t.id===editing.id?{...editing,...f}:t); setSupportTickets(u); saveLS("supportTickets",u); addAudit("Support","Update",`Updated ticket: ${f.title}`); toast("Ticket updated"); }
    else { const nt={...f,id:genId()}; const u=[nt,...(supportTickets||[])]; setSupportTickets(u); saveLS("supportTickets",u); addAudit("Support","Create",`Created ticket: ${f.title}`); toast("Ticket created"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const t=(supportTickets||[]).find(x=>x.id===id); const u=(supportTickets||[]).filter(x=>x.id!==id); setSupportTickets(u); saveLS("supportTickets",u); addAudit("Support","Delete",`Deleted ticket: ${t?.title}`); toast("Deleted","info"); setConfirm(null); };
  const changeStatus = (id, status) => { const u=(supportTickets||[]).map(t=>t.id===id?{...t,status}:t); setSupportTickets(u); saveLS("supportTickets",u); addAudit("Support","Status",`Ticket ${status}`); toast(`Ticket ${status}`); };

  return (
    <div>
      {confirm && <Confirm msg="Delete this ticket?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit ticket":"New ticket"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><TicketForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Support Tickets</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(supportTickets||[]).filter(t=>t.status==="Open").length} open · {(supportTickets||[]).length} total</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{TICKET_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{TICKET_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="🎫" title="No tickets" sub="Support tickets will appear here." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New ticket</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                <div><div style={{ fontWeight:600, fontSize:14, color:"var(--text)", marginBottom:4 }}>{t.title}</div><div style={{ fontSize:12, color:"var(--text-muted)" }}>{t.client}{t.project && ` · ${t.project}`} · {t.issueType} · {fmtDate(t.createdAt)}</div></div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}><Badge label={t.priority} /><Badge label={t.status} /></div>
              </div>
              {t.description && <p style={{ fontSize:13, color:"var(--text-muted)", margin:"0 0 8px", lineHeight:1.5 }}>{t.description}</p>}
              {t.resolutionNotes && <div style={{ fontSize:12, color:"#059669", background:"#D1FAE5", padding:"6px 10px", borderRadius:6, marginBottom:8 }}>✅ {t.resolutionNotes}</div>}
              {role !== "Viewer" && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {t.status!=="Fixed"&&<button style={{ ...btnStyle("ghost","sm"), color:"#059669" }} onClick={() => changeStatus(t.id,"Fixed")}>Mark Fixed</button>}
                  {t.status!=="Closed"&&<button style={{ ...btnStyle("ghost","sm"), color:"#374151" }} onClick={() => changeStatus(t.id,"Closed")}>Close</button>}
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>
                  {(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(t.id)}>Del</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: WHATSAPP TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

const WA_CATEGORIES = ["First Message", "Follow-Up", "Payment Reminder", "Demo Sent", "Proposal Sent", "Meeting Confirmation", "Project Update", "Revision Request", "Delivery Message", "Support Reply"];

const WhatsAppTemplatesModule = ({ whatsappTemplates, setWhatsappTemplates, addAudit, role }) => {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);

  const filtered = useMemo(() => (whatsappTemplates||[]).filter(t => {
    const q = search.toLowerCase();
    return (!q || t.name?.toLowerCase().includes(q) || t.body?.toLowerCase().includes(q))
      && (filterCategory==="All" || t.category===filterCategory);
  }), [whatsappTemplates, search, filterCategory]);

  const WaForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ name:"", category:"First Message", body:"", active:true, createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Template name"><input style={inputStyle} value={f.name} onChange={set("name")} /></FormField>
          <FormField label="Category"><select style={inputStyle} value={f.category} onChange={set("category")}>{WA_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormField>
        </div>
        <FormField label="Message body"><textarea style={{ ...inputStyle, minHeight:120, resize:"vertical", fontFamily:"monospace" }} value={f.body} onChange={set("body")} placeholder="Use {clientName}, {projectName}, {amount}, {date} as variables" /></FormField>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:12 }}>Available variables: <code>{"{clientName}"}</code>, <code>{"{projectName}"}</code>, <code>{"{amount}"}</code>, <code>{"{date}"}</code></div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><input type="checkbox" checked={f.active} onChange={e=>setF(p=>({...p,active:e.target.checked}))} id="waActive" /><label htmlFor="waActive" style={{ fontSize:13, cursor:"pointer", color:"var(--text)" }}>Active</label></div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save template</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(whatsappTemplates||[]).map(t=>t.id===editing.id?{...editing,...f}:t); setWhatsappTemplates(u); saveLS("whatsappTemplates",u); addAudit("WA Templates","Update",`Updated: ${f.name}`); toast("Template updated"); }
    else { const nt={...f,id:genId()}; const u=[nt,...(whatsappTemplates||[])]; setWhatsappTemplates(u); saveLS("whatsappTemplates",u); addAudit("WA Templates","Create",`Created: ${f.name}`); toast("Template added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const t=(whatsappTemplates||[]).find(x=>x.id===id); const u=(whatsappTemplates||[]).filter(x=>x.id!==id); setWhatsappTemplates(u); saveLS("whatsappTemplates",u); addAudit("WA Templates","Delete",`Deleted: ${t?.name}`); toast("Deleted","info"); setConfirm(null); };
  const toggleActive = (id) => { const u=(whatsappTemplates||[]).map(t=>t.id===id?{...t,active:!t.active}:t); setWhatsappTemplates(u); saveLS("whatsappTemplates",u); toast("Toggled"); };
  const copyMsg = (body) => {
    const sample = body.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM").replace(/\{amount\}/g,"₹50,000").replace(/\{date\}/g,"July 30, 2025");
    navigator.clipboard?.writeText(sample).catch(()=>{});
    toast("Message copied to clipboard");
  };

  return (
    <div>
      {confirm && <Confirm msg="Delete this template?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit template":"New template"} onClose={() => { setShowForm(false); setEditing(null); }} width={600}><WaForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      {preview && (
        <Modal title="Message Preview" onClose={() => setPreview(null)} width={500}>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:8 }}>Sample variables applied:</div>
          <div style={{ background:"#DCF8C6", borderRadius:12, padding:"14px 16px", fontSize:14, color:"#0A0A0A", lineHeight:1.6, fontFamily:"sans-serif", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            {preview.body.replace(/\{clientName\}/g,"Rahul Sharma").replace(/\{projectName\}/g,"Personal CRM").replace(/\{amount\}/g,"₹50,000").replace(/\{date\}/g,"July 30, 2025")}
          </div>
          <div style={{ marginTop:14 }}><button style={btnStyle("primary")} onClick={() => { copyMsg(preview.body); setPreview(null); }}>📋 Copy message</button></div>
        </Modal>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>WhatsApp Templates</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(whatsappTemplates||[]).length} templates</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search templates…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}><option value="All">All categories</option>{WA_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="💬" title="No templates" sub="Create your first WhatsApp message template." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ New template</button>} /> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ background:"var(--card-bg)", border:`1px solid ${t.active?"var(--border)":"#FCA5A5"}`, borderRadius:12, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{t.name}</div>
                <span style={{ fontSize:11, color:t.active?"#059669":"#DC2626", fontWeight:600 }}>{t.active?"● Active":"○ Inactive"}</span>
              </div>
              <Badge label={t.category} size="sm" />
              <p style={{ fontSize:12, color:"var(--text-muted)", margin:0, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>{t.body}</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button style={btnStyle("soft","sm")} onClick={() => setPreview(t)}>👁 Preview</button>
                <button style={btnStyle("ghost","sm")} onClick={() => copyMsg(t.body)}>📋 Copy</button>
                {role!=="Viewer"&&<><button style={btnStyle("ghost","sm")} onClick={() => toggleActive(t.id)}>{t.active?"Deactivate":"Activate"}</button><button style={btnStyle("ghost","sm")} onClick={() => setEditing(t)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(t.id)}>Del</button>}</>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: PROMPT HISTORY
// ══════════════════════════════════════════════════════════════════════════════

const PROMPT_STATUSES = ["Planned", "Sent", "Applied", "Failed", "Needs Fix", "Completed"];
const PROMPT_TOOLS = ["Claude", "ChatGPT", "Kiro", "Trae", "Cursor", "Other"];

const PromptHistoryModule = ({ promptHistory, setPromptHistory, addAudit, role, projects }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTool, setFilterTool] = useState("All");
  const [filterProject, setFilterProject] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (promptHistory||[]).filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.promptBody?.toLowerCase().includes(q) || p.outputSummary?.toLowerCase().includes(q))
      && (filterStatus==="All" || p.status===filterStatus)
      && (filterTool==="All" || p.tool===filterTool)
      && (filterProject==="All" || p.project===filterProject);
  }), [promptHistory, search, filterStatus, filterTool, filterProject]);

  const PromptForm = ({ initial={}, onSave, onClose }) => {
    const nextNum = Math.max(0,...(promptHistory||[]).map(p=>Number(p.promptNumber)||0))+1;
    const [f, setF] = useState({ title:"", project:"", moduleFile:"App.jsx", promptNumber:nextNum, tool:"Kiro", promptBody:"", outputSummary:"", status:"Planned", date: new Date().toISOString().slice(0,10), tags:[], createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Prompt #"><input style={inputStyle} type="number" value={f.promptNumber} onChange={set("promptNumber")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Module / File"><input style={inputStyle} value={f.moduleFile} onChange={set("moduleFile")} /></FormField>
          <FormField label="Tool"><select style={inputStyle} value={f.tool} onChange={set("tool")}>{PROMPT_TOOLS.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{PROMPT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
        </div>
        <FormField label="Prompt body"><textarea style={{ ...inputStyle, minHeight:100, resize:"vertical", fontFamily:"monospace", fontSize:12 }} value={f.promptBody} onChange={set("promptBody")} /></FormField>
        <FormField label="Output summary"><textarea style={{ ...inputStyle, minHeight:72, resize:"vertical" }} value={f.outputSummary} onChange={set("outputSummary")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save prompt</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(promptHistory||[]).map(p=>p.id===editing.id?{...editing,...f}:p); setPromptHistory(u); saveLS("promptHistory",u); addAudit("Prompts","Update",`Updated prompt: ${f.title}`); toast("Prompt updated"); }
    else { const np={...f,id:genId()}; const u=[np,...(promptHistory||[])]; setPromptHistory(u); saveLS("promptHistory",u); addAudit("Prompts","Create",`Created prompt: ${f.title}`); toast("Prompt added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const p=(promptHistory||[]).find(x=>x.id===id); const u=(promptHistory||[]).filter(x=>x.id!==id); setPromptHistory(u); saveLS("promptHistory",u); addAudit("Prompts","Delete",`Deleted prompt: ${p?.title}`); toast("Deleted","info"); setConfirm(null); };
  const copyPrompt = (body) => { navigator.clipboard?.writeText(body).catch(()=>{}); toast("Prompt copied"); };

  const allProjects = useMemo(()=>["All",...new Set((promptHistory||[]).map(p=>p.project).filter(Boolean))],[promptHistory]);

  return (
    <div>
      {confirm && <Confirm msg="Delete this prompt?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit prompt":"Add prompt"} onClose={() => { setShowForm(false); setEditing(null); }} width={660}><PromptForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Prompt History</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(promptHistory||[]).length} prompts tracked</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add prompt</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search prompts…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{PROMPT_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterTool} onChange={e=>setFilterTool(e.target.value)}><option value="All">All tools</option>{PROMPT_TOOLS.map(t=><option key={t}>{t}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="🤖" title="No prompts" sub="Track every prompt you send to AI tools." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add prompt</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                <div><div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>#{p.promptNumber} — {p.title}</div><div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{p.tool} · {p.project||"—"} · {p.moduleFile} · {fmtDate(p.date)}</div></div>
                <Badge label={p.status} />
              </div>
              {p.promptBody && <div style={{ background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"var(--text-muted)", fontFamily:"monospace", marginBottom:8, maxHeight:80, overflow:"hidden" }}>{p.promptBody.slice(0,300)}{p.promptBody.length>300&&"…"}</div>}
              {p.outputSummary && <div style={{ fontSize:13, color:"var(--text)", marginBottom:8 }}>📤 {p.outputSummary}</div>}
              {role !== "Viewer" && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {p.promptBody && <button style={btnStyle("soft","sm")} onClick={() => copyPrompt(p.promptBody)}>📋 Copy prompt</button>}
                  <button style={btnStyle("ghost","sm")} onClick={() => setEditing(p)}>Edit</button>
                  {(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(p.id)}>Del</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: PROJECT LOGS
// ══════════════════════════════════════════════════════════════════════════════

const LOG_TYPES = ["Build", "Bug Fix", "UI Change", "Security", "Compliance", "Deployment", "Client Feedback", "Decision", "Other"];
const LOG_STATUSES = ["Info", "Success", "Warning", "Failed"];
const LOG_STATUS_COLORS = { Info:"#1D4ED8", Success:"#059669", Warning:"#D97706", Failed:"#DC2626" };
const LOG_STATUS_BG = { Info:"#DBEAFE", Success:"#D1FAE5", Warning:"#FEF3C7", Failed:"#FEE2E2" };

const ProjectLogsModule = ({ projectLogs, setProjectLogs, addAudit, role, projects }) => {
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => [...(projectLogs||[])].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).filter(l => {
    const q = search.toLowerCase();
    return (!q || l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q))
      && (filterProject==="All" || l.project===filterProject)
      && (filterType==="All" || l.type===filterType)
      && (filterStatus==="All" || l.status===filterStatus);
  }), [projectLogs, search, filterProject, filterType, filterStatus]);

  const LogForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ project:"", title:"", type:"Build", description:"", result:"", date: new Date().toISOString().slice(0,10), status:"Success", relatedPrompt:"", relatedTask:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Title"><input style={inputStyle} value={f.title} onChange={set("title")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}><option value="">— None —</option>{(projects||[]).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></FormField>
          <FormField label="Type"><select style={inputStyle} value={f.type} onChange={set("type")}>{LOG_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{LOG_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Date"><input style={inputStyle} type="date" value={f.date} onChange={set("date")} /></FormField>
          <FormField label="Related prompt"><input style={inputStyle} value={f.relatedPrompt} onChange={set("relatedPrompt")} /></FormField>
          <FormField label="Related task"><input style={inputStyle} value={f.relatedTask} onChange={set("relatedTask")} /></FormField>
        </div>
        <FormField label="Description"><textarea style={{ ...inputStyle, minHeight:72, resize:"vertical" }} value={f.description} onChange={set("description")} /></FormField>
        <FormField label="Result"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.result} onChange={set("result")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save log</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(projectLogs||[]).map(l=>l.id===editing.id?{...editing,...f}:l); setProjectLogs(u); saveLS("projectLogs",u); addAudit("Project Logs","Update",`Updated log: ${f.title}`); toast("Log updated"); }
    else { const nl={...f,id:genId()}; const u=[nl,...(projectLogs||[])]; setProjectLogs(u); saveLS("projectLogs",u); addAudit("Project Logs","Create",`Added log: ${f.title}`); toast("Log added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const l=(projectLogs||[]).find(x=>x.id===id); const u=(projectLogs||[]).filter(x=>x.id!==id); setProjectLogs(u); saveLS("projectLogs",u); addAudit("Project Logs","Delete",`Deleted log: ${l?.title}`); toast("Deleted","info"); setConfirm(null); };

  const allProjects = useMemo(()=>["All",...new Set((projectLogs||[]).map(l=>l.project).filter(Boolean))],[projectLogs]);

  return (
    <div>
      {confirm && <Confirm msg="Delete this log entry?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit log":"Add log entry"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><LogForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Project Logs</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{(projectLogs||[]).length} log entries</p></div>
        {role !== "Viewer" && <button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add log</button>}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>{allProjects.map(p=><option key={p} value={p}>{p==="All"?"All projects":p}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterType} onChange={e=>setFilterType(e.target.value)}><option value="All">All types</option>{LOG_TYPES.map(t=><option key={t}>{t}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{LOG_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
      </div>
      {filtered.length===0 ? <EmptyState icon="📋" title="No log entries" sub="Track every build, fix, and decision." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add log</button>} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {filtered.map((l, idx) => (
            <div key={l.id} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:32, flexShrink:0, paddingTop:2 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:LOG_STATUS_BG[l.status]||"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:LOG_STATUS_COLORS[l.status]||"#374151", flexShrink:0 }}>{l.status==="Success"?"✓":l.status==="Failed"?"✗":l.status==="Warning"?"!":"i"}</div>
                {idx<filtered.length-1&&<div style={{ width:2, flex:1, background:"var(--border)", marginTop:4 }} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:6 }}>
                  <div><span style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{l.title}</span><span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>{l.project||"—"} · {l.type} · {fmtDate(l.date)}</span></div>
                  <div style={{ display:"flex", gap:6 }}>{role!=="Viewer"&&<><button style={btnStyle("ghost","sm")} onClick={() => setEditing(l)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(l.id)}>Del</button>}</>}</div>
                </div>
                {l.description && <p style={{ fontSize:13, color:"var(--text-muted)", margin:"4px 0", lineHeight:1.5 }}>{l.description}</p>}
                {l.result && <div style={{ fontSize:12, color:"#059669", marginTop:4 }}>Result: {l.result}</div>}
                {(l.relatedPrompt||l.relatedTask) && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{l.relatedPrompt&&`📎 ${l.relatedPrompt}`}{l.relatedTask&&` · ✅ ${l.relatedTask}`}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: ROADMAP TRACKER
// ══════════════════════════════════════════════════════════════════════════════

const ROADMAP_STATUSES = ["Backlog", "Planned", "In Progress", "Testing", "Done", "Blocked"];
const ROADMAP_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const ROADMAP_PROJECTS = ["Personal CRM", "Clinic CRM", "Restaurant CRM", "Semi-Cafe CRM", "Automotive CRM", "Multi-Office CRM", "Website Demos", "Other"];

const RoadmapModule = ({ roadmapItems, setRoadmapItems, addAudit, role }) => {
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [groupByProject, setGroupByProject] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => (roadmapItems||[]).filter(item => {
    const q = search.toLowerCase();
    return (!q || item.item?.toLowerCase().includes(q) || item.notes?.toLowerCase().includes(q))
      && (filterProject==="All" || item.project===filterProject)
      && (filterStatus==="All" || item.status===filterStatus)
      && (filterPriority==="All" || item.priority===filterPriority);
  }), [roadmapItems, search, filterProject, filterStatus, filterPriority]);

  const RoadmapForm = ({ initial={}, onSave, onClose }) => {
    const [f, setF] = useState({ item:"", project:"Personal CRM", sector:"", phase:"Phase 1", priority:"Medium", status:"Backlog", progress:0, targetDate:"", notes:"", createdAt: new Date().toISOString().slice(0,10), ...initial });
    const set = k => e => setF(p=>({...p,[k]:e.target.value}));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FormField label="Item / Feature"><input style={inputStyle} value={f.item} onChange={set("item")} /></FormField>
          <FormField label="Project"><select style={inputStyle} value={f.project} onChange={set("project")}>{ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}</select></FormField>
          <FormField label="Sector"><input style={inputStyle} value={f.sector} onChange={set("sector")} /></FormField>
          <FormField label="Phase"><input style={inputStyle} value={f.phase} onChange={set("phase")} placeholder="Phase 1, Phase 2…" /></FormField>
          <FormField label="Priority"><select style={inputStyle} value={f.priority} onChange={set("priority")}>{ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormField>
          <FormField label="Status"><select style={inputStyle} value={f.status} onChange={set("status")}>{ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormField>
          <FormField label="Progress %"><input style={inputStyle} type="number" min="0" max="100" value={f.progress} onChange={set("progress")} /></FormField>
          <FormField label="Target date"><input style={inputStyle} type="date" value={f.targetDate} onChange={set("targetDate")} /></FormField>
        </div>
        <FormField label="Notes"><textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={f.notes} onChange={set("notes")} /></FormField>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}><button style={btnStyle("ghost")} onClick={onClose}>Cancel</button><button style={btnStyle("primary")} onClick={() => onSave(f)}>Save item</button></div>
      </div>
    );
  };

  const save = (f) => {
    if (editing) { const u=(roadmapItems||[]).map(i=>i.id===editing.id?{...editing,...f}:i); setRoadmapItems(u); saveLS("roadmapItems",u); addAudit("Roadmap","Update",`Updated: ${f.item}`); toast("Updated"); }
    else { const ni={...f,id:genId()}; const u=[ni,...(roadmapItems||[])]; setRoadmapItems(u); saveLS("roadmapItems",u); addAudit("Roadmap","Create",`Added: ${f.item}`); toast("Item added"); }
    setShowForm(false); setEditing(null);
  };
  const del = (id) => { const i=(roadmapItems||[]).find(x=>x.id===id); const u=(roadmapItems||[]).filter(x=>x.id!==id); setRoadmapItems(u); saveLS("roadmapItems",u); addAudit("Roadmap","Delete",`Deleted: ${i?.item}`); toast("Deleted","info"); setConfirm(null); };

  const grouped = useMemo(() => {
    if (!groupByProject) return { "All Items": filtered };
    return filtered.reduce((a,item) => { (a[item.project]||(a[item.project]=[])).push(item); return a; }, {});
  }, [filtered, groupByProject]);

  const blocked = (roadmapItems||[]).filter(i=>i.status==="Blocked");
  const doneCount = (roadmapItems||[]).filter(i=>i.status==="Done").length;
  const total = (roadmapItems||[]).length;

  const RoadmapItem = ({ item }) => (
    <div style={{ background:"var(--card-bg)", border:`1px solid ${item.status==="Blocked"?"#FCA5A5":"var(--border)"}`, borderRadius:10, padding:"12px 14px", marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap", marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", marginBottom:2 }}>{item.item}</div>
          <div style={{ fontSize:11, color:"var(--text-muted)" }}>{item.phase}{item.sector&&` · ${item.sector}`}{item.targetDate&&` · Target: ${fmtDate(item.targetDate)}`}</div>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}><Badge label={item.status} /><Badge label={item.priority} /></div>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-muted)", marginBottom:3 }}><span>Progress</span><span style={{ fontWeight:600 }}>{item.progress||0}%</span></div>
        <ProgressBar value={item.progress||0} color={item.status==="Blocked"?"#DC2626":item.status==="Done"?"#059669":"#2563EB"} />
      </div>
      {item.notes && <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:8 }}>{item.notes}</div>}
      {role!=="Viewer"&&<div style={{ display:"flex", gap:6 }}><button style={btnStyle("ghost","sm")} onClick={() => setEditing(item)}>Edit</button>{(role==="Owner"||role==="Admin")&&<button style={{ ...btnStyle("ghost","sm"), color:"#DC2626" }} onClick={() => setConfirm(item.id)}>Del</button>}</div>}
    </div>
  );

  return (
    <div>
      {confirm && <Confirm msg="Delete this roadmap item?" onYes={() => del(confirm)} onNo={() => setConfirm(null)} />}
      {(showForm||editing) && <Modal title={editing?"Edit item":"Add roadmap item"} onClose={() => { setShowForm(false); setEditing(null); }} width={620}><RoadmapForm initial={editing||{}} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} /></Modal>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div><h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Roadmap Tracker</h2><p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>{doneCount}/{total} done · {blocked.length} blocked</p></div>
        {role!=="Viewer"&&<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add item</button>}
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--text-muted)", marginBottom:4 }}><span>Overall completion</span><span style={{ fontWeight:600, color:"var(--text)" }}>{total>0?`${Math.round((doneCount/total)*100)}%`:"0%"}</span></div>
        <ProgressBar value={total>0?(doneCount/total)*100:0} color="#7C3AED" />
      </div>
      {blocked.length>0&&(
        <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#DC2626", marginBottom:8 }}>🚫 Blocked Items ({blocked.length})</div>
          {blocked.map(i=><div key={i.id} style={{ fontSize:13, color:"#991B1B", marginBottom:4 }}>• {i.item} ({i.project})</div>)}
        </div>
      )}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search roadmap…" />
        <select style={{ ...inputStyle, width:"auto" }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="All">All projects</option>{ROADMAP_PROJECTS.map(p=><option key={p}>{p}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="All">All statuses</option>{ROADMAP_STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...inputStyle, width:"auto" }} value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}><option value="All">All priorities</option>{ROADMAP_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
        <button style={btnStyle(groupByProject?"primary":"ghost","sm")} onClick={() => setGroupByProject(p=>!p)}>{groupByProject?"Ungroup":"Group by project"}</button>
      </div>
      {filtered.length===0 ? <EmptyState icon="🗺️" title="No roadmap items" sub="Plan your features and milestones." action={<button style={btnStyle("primary")} onClick={() => setShowForm(true)}>+ Add item</button>} /> : (
        <div>
          {Object.entries(grouped).map(([proj, items]) => (
            <div key={proj} style={{ marginBottom:20 }}>
              {groupByProject&&<div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:10, padding:"6px 12px", background:"var(--card-bg)", borderRadius:8, border:"1px solid var(--border)", display:"flex", justifyContent:"space-between" }}><span>📁 {proj}</span><span style={{ fontSize:12, color:"var(--text-muted)" }}>{items.filter(i=>i.status==="Done").length}/{items.length} done</span></div>}
              {items.map(item => <RoadmapItem key={item.id} item={item} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE: DASHBOARD (Updated)
// ══════════════════════════════════════════════════════════════════════════════

const DashboardModule = ({ contacts, leads, projects, tasks, audit, settings, setTab, followUps, notes, documents, invoices, payments, proposals, communications, calendarEvents, supportTickets, roadmapItems, promptHistory }) => {
  const totalContacts = contacts.length;
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === "Won").length;
  const lostLeads = leads.filter(l => l.stage === "Lost").length;
  const activeProjects = projects.filter(p => !["Completed", "On Hold"].includes(p.status)).length;
  const openTasks = tasks.filter(t => t.status !== "Done").length;
  const overdueTasks = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "Done").length;
  const todayFU = (followUps||[]).filter(f => isToday(f.dueDate) && f.status === "Pending").length;
  const missedFU = (followUps||[]).filter(f => f.status === "Missed").length;
  const totalRevenue = (invoices||[]).filter(i=>i.status==="Paid").reduce((a,i)=>a+(Number(i.total)||0),0);
  const pendingRevenue = (invoices||[]).filter(i=>["Sent","Partially Paid"].includes(i.status)).reduce((a,i)=>a+(Number(i.total)||0),0);
  const unpaidInvoices = (invoices||[]).filter(i=>["Sent","Partially Paid","Overdue"].includes(i.status)).length;
  const openTickets = (supportTickets||[]).filter(t=>t.status==="Open").length;
  const todayEvents = (calendarEvents||[]).filter(e=>isToday(e.date));
  const rmDone = (roadmapItems||[]).filter(i=>i.status==="Done").length;
  const rmTotal = (roadmapItems||[]).length;
  const blockedRM = (roadmapItems||[]).filter(i=>i.status==="Blocked").length;
  const promptApplied = (promptHistory||[]).filter(p=>p.status==="Applied"||p.status==="Completed").length;
  const acceptedProposals = (proposals||[]).filter(p=>p.status==="Accepted").length;

  const hotLeads = leads.filter(l => l.tags?.includes("Hot Lead") && !["Won","Lost"].includes(l.stage));
  const recentActivity = [...(audit||[])].reverse().slice(0, 8);
  const leadsByStage = LEAD_STAGES.reduce((a,s)=>{ a[s]=leads.filter(l=>l.stage===s).length; return a; },{});
  const tasksByStatus = TASK_STATUSES.reduce((a,s)=>{ a[s]=tasks.filter(t=>t.status===s).length; return a; },{});

  const StatCard = ({ label, value, sub, color="#2563EB", onClick, highlight }) => (
    <div onClick={onClick} style={{ background:highlight?"#EFF6FF":"var(--card-bg)", borderRadius:12, padding:"16px 18px", border:highlight?"1px solid #BFDBFE":"1px solid var(--border)", cursor:onClick?"pointer":"default" }}>
      <div style={{ fontSize:11, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub&&<div style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:"var(--text)" }}>Dashboard</h2>
        <p style={{ margin:0, fontSize:13, color:"var(--text-muted)" }}>Welcome back — {settings.businessName} overview</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:28 }}>
        <StatCard label="Contacts" value={totalContacts} color="#1D4ED8" onClick={() => setTab("contacts")} />
        <StatCard label="Leads" value={totalLeads} sub={`${wonLeads} won · ${lostLeads} lost`} color="#7C3AED" onClick={() => setTab("leads")} />
        <StatCard label="Active Projects" value={activeProjects} color="#0369A1" onClick={() => setTab("projects")} />
        <StatCard label="Open Tasks" value={openTasks} color="#374151" onClick={() => setTab("tasks")} />
        <StatCard label="Overdue Tasks" value={overdueTasks} color={overdueTasks>0?"#DC2626":"#374151"} highlight={overdueTasks>0} onClick={() => setTab("tasks")} />
        <StatCard label="Follow-ups Today" value={todayFU} color={todayFU>0?"#D97706":"#374151"} highlight={todayFU>0} onClick={() => setTab("follow-ups")} />
        <StatCard label="Missed Follow-ups" value={missedFU} color={missedFU>0?"#DC2626":"#374151"} highlight={missedFU>0} onClick={() => setTab("follow-ups")} />
        <StatCard label="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(0)}k`} color="#059669" onClick={() => setTab("invoices")} />
        <StatCard label="Pending Revenue" value={`₹${(pendingRevenue/1000).toFixed(0)}k`} color="#D97706" onClick={() => setTab("invoices")} />
        <StatCard label="Unpaid Invoices" value={unpaidInvoices} color={unpaidInvoices>0?"#D97706":"#374151"} highlight={unpaidInvoices>0} onClick={() => setTab("invoices")} />
        <StatCard label="Open Tickets" value={openTickets} color={openTickets>0?"#DC2626":"#374151"} highlight={openTickets>0} onClick={() => setTab("support")} />
        <StatCard label="Roadmap Done" value={rmTotal>0?`${Math.round((rmDone/rmTotal)*100)}%`:"—"} color="#7C3AED" onClick={() => setTab("roadmap")} />
        <StatCard label="Blocked Items" value={blockedRM} color={blockedRM>0?"#DC2626":"#374151"} highlight={blockedRM>0} onClick={() => setTab("roadmap")} />
        <StatCard label="Notes" value={(notes||[]).length} color="#374151" onClick={() => setTab("notes")} />
        <StatCard label="Documents" value={(documents||[]).length} color="#374151" onClick={() => setTab("documents")} />
        <StatCard label="Accepted Proposals" value={acceptedProposals} color="#059669" onClick={() => setTab("proposals")} />
      </div>
      {todayEvents.length>0&&(
        <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#1D4ED8", marginBottom:10 }}>📅 Today's Events ({todayEvents.length})</div>
          {todayEvents.map(e=><div key={e.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"4px 0", borderBottom:"1px solid #DBEAFE" }}><span style={{ fontSize:16 }}>{CAL_TYPE_ICONS[e.type]||"📅"}</span><span style={{ fontSize:13, color:"#1E40AF", fontWeight:500 }}>{e.title}</span>{e.time&&<span style={{ fontSize:11, color:"#3B82F6" }}>{e.time}</span>}</div>)}
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Leads by stage</div>
          {LEAD_STAGES.filter(s=>leadsByStage[s]>0).map(s=>(
            <div key={s} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}><span style={{ color:"var(--text-muted)" }}>{s}</span><span style={{ fontWeight:600, color:"var(--text)" }}>{leadsByStage[s]}</span></div>
              <ProgressBar value={(leadsByStage[s]/Math.max(1,totalLeads))*100} color={STATUS_COLORS[s]?.color||"#2563EB"} />
            </div>
          ))}
        </SectionCard>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:14 }}>Tasks by status</div>
          {TASK_STATUSES.map(s=>(
            <div key={s} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}><span style={{ color:"var(--text-muted)" }}>{s}</span><span style={{ fontWeight:600, color:"var(--text)" }}>{tasksByStatus[s]}</span></div>
              <ProgressBar value={(tasksByStatus[s]/Math.max(1,tasks.length))*100} color={STATUS_COLORS[s]?.color||"#2563EB"} />
            </div>
          ))}
        </SectionCard>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>🔥 Hot leads</div>
          {hotLeads.length===0 ? <div style={{ fontSize:13, color:"var(--text-muted)" }}>No hot leads.</div> : hotLeads.slice(0,5).map(l=>(
            <div key={l.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <div><div style={{ fontWeight:600, fontSize:13, color:"var(--text)" }}>{l.title}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{l.contact} · {l.stage}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>₹{Number(l.value).toLocaleString("en-IN")}</div><Badge label={l.priority} size="sm" /></div>
            </div>
          ))}
        </SectionCard>
        <SectionCard>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Project progress</div>
          {projects.slice(0,5).map(p=>{
            const health=projectHealth(p);
            return (
              <div key={p.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}><span style={{ color:"var(--text)", fontWeight:500 }}>{p.name}</span><span style={{ fontSize:11, background:health.bg, color:health.color, padding:"1px 7px", borderRadius:12, fontWeight:600 }}>{p.progress||0}%</span></div>
                <ProgressBar value={p.progress||0} color={health.color} />
              </div>
            );
          })}
        </SectionCard>
      </div>
      <SectionCard>
        <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:12 }}>Recent activity</div>
        {recentActivity.length===0 ? <div style={{ fontSize:13, color:"var(--text-muted)" }}>No activity yet.</div> : recentActivity.map(a=>(
          <div key={a.id} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#DBEAFE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#1E40AF", flexShrink:0 }}>{a.module.charAt(0)}</div>
            <div><div style={{ fontSize:13, color:"var(--text)", fontWeight:500 }}>{a.desc}</div><div style={{ fontSize:11, color:"var(--text-muted)" }}>{a.module} · {a.action} · {new Date(a.ts).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</div></div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH (Updated)
// ══════════════════════════════════════════════════════════════════════════════

const GlobalSearchModal = ({ contacts, leads, projects, tasks, followUps, notes, documents, invoices, payments, proposals, communications, calendarEvents, supportTickets, whatsappTemplates, promptHistory, projectLogs, roadmapItems, tags, customFields, onClose, setTab }) => {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return null;
    const ql = q.toLowerCase();
    return {
      contacts: contacts.filter(c => c.name?.toLowerCase().includes(ql) || c.company?.toLowerCase().includes(ql) || c.email?.toLowerCase().includes(ql)),
      leads: leads.filter(l => l.title?.toLowerCase().includes(ql) || l.contact?.toLowerCase().includes(ql)),
      projects: projects.filter(p => p.name?.toLowerCase().includes(ql) || p.client?.toLowerCase().includes(ql)),
      tasks: tasks.filter(t => t.title?.toLowerCase().includes(ql) || t.project?.toLowerCase().includes(ql)),
      "follow-ups": (followUps||[]).filter(f => f.person?.toLowerCase().includes(ql) || f.relatedTo?.toLowerCase().includes(ql)),
      notes: (notes||[]).filter(n => n.title?.toLowerCase().includes(ql) || n.body?.toLowerCase().includes(ql)),
      documents: (documents||[]).filter(d => d.name?.toLowerCase().includes(ql) || d.relatedClient?.toLowerCase().includes(ql)),
      invoices: (invoices||[]).filter(i => i.invoiceNumber?.toLowerCase().includes(ql) || i.client?.toLowerCase().includes(ql)),
      payments: (payments||[]).filter(p => p.client?.toLowerCase().includes(ql) || p.reference?.toLowerCase().includes(ql)),
      proposals: (proposals||[]).filter(p => p.title?.toLowerCase().includes(ql) || p.client?.toLowerCase().includes(ql)),
      communications: (communications||[]).filter(c => c.contact?.toLowerCase().includes(ql) || c.summary?.toLowerCase().includes(ql)),
      calendar: (calendarEvents||[]).filter(e => e.title?.toLowerCase().includes(ql) || e.relatedClient?.toLowerCase().includes(ql)),
      support: (supportTickets||[]).filter(t => t.title?.toLowerCase().includes(ql) || t.client?.toLowerCase().includes(ql)),
      "wa-templates": (whatsappTemplates||[]).filter(t => t.name?.toLowerCase().includes(ql) || t.body?.toLowerCase().includes(ql)),
      prompts: (promptHistory||[]).filter(p => p.title?.toLowerCase().includes(ql) || p.promptBody?.toLowerCase().includes(ql)),
      "project-logs": (projectLogs||[]).filter(l => l.title?.toLowerCase().includes(ql) || l.description?.toLowerCase().includes(ql)),
      roadmap: (roadmapItems||[]).filter(i => i.item?.toLowerCase().includes(ql) || i.notes?.toLowerCase().includes(ql)),
      tags: (tags||[]).filter(t => t.toLowerCase().includes(ql)).map(t=>({id:t,name:t})),
    };
  }, [q, contacts, leads, projects, tasks, followUps, notes, documents, invoices, payments, proposals, communications, calendarEvents, supportTickets, whatsappTemplates, promptHistory, projectLogs, roadmapItems, tags]);

  const getLabel = (mod, item) => {
    if (typeof item === "string") return item;
    return item.name || item.title || item.person || item.contact || item.invoiceNumber || item.item || "—";
  };
  const getSub = (mod, item) => {
    if (typeof item === "string") return "";
    return item.company || item.client || item.project || item.category || item.type || item.method || "";
  };
  const modTabMap = { contacts:"contacts", leads:"leads", projects:"projects", tasks:"tasks", "follow-ups":"follow-ups", notes:"notes", documents:"documents", invoices:"invoices", payments:"payments", proposals:"proposals", communications:"communications", calendar:"calendar", support:"support", "wa-templates":"wa-templates", prompts:"prompts", "project-logs":"project-logs", roadmap:"roadmap" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1200, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"80px 16px 16px" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"var(--modal-bg)", borderRadius:16, width:"100%", maxWidth:600, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search across all modules…" style={{ ...inputStyle, fontSize:16, padding:"8px 0", border:"none", background:"transparent", outline:"none" }} />
        </div>
        <div style={{ maxHeight:460, overflowY:"auto", padding:16 }}>
          {!results&&<div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>Start typing to search…</div>}
          {results&&Object.entries(results).map(([mod, items]) => items.length>0&&(
            <div key={mod} style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>{mod}</div>
              {items.slice(0,4).map(item => (
                <div key={item.id||item} onClick={()=>{ if(modTabMap[mod]&&setTab){ setTab(modTabMap[mod]); } onClose(); }} style={{ padding:"8px 10px", borderRadius:8, cursor:"pointer", marginBottom:4, background:"var(--card-bg)" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>{getLabel(mod,item)}</div>
                  <div style={{ fontSize:11, color:"var(--text-muted)" }}>{getSub(mod,item)}</div>
                </div>
              ))}
            </div>
          ))}
          {results&&Object.values(results).every(a=>a.length===0)&&(
            <div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"20px 0" }}>No results for "{q}"</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TABS CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  // Core
  { id: "dashboard", label: "Dashboard", icon: "⊞", group: "Core" },
  { id: "contacts", label: "Contacts", icon: "👥", group: "Core" },
  { id: "leads", label: "Leads", icon: "🎯", group: "Core" },
  // Work
  { id: "projects", label: "Projects", icon: "🗂️", group: "Work" },
  { id: "tasks", label: "Tasks", icon: "✅", group: "Work" },
  { id: "follow-ups", label: "Follow-Ups", icon: "📞", group: "Work" },
  { id: "notes", label: "Notes", icon: "📝", group: "Work" },
  { id: "documents", label: "Documents", icon: "📄", group: "Work" },
  { id: "calendar", label: "Calendar", icon: "📅", group: "Work" },
  { id: "communications", label: "Comm Log", icon: "💬", group: "Work" },
  // Finance
  { id: "invoices", label: "Invoices", icon: "🧾", group: "Finance" },
  { id: "payments", label: "Payments", icon: "💰", group: "Finance" },
  { id: "proposals", label: "Proposals", icon: "📋", group: "Finance" },
  // System
  { id: "support", label: "Support", icon: "🎫", group: "System" },
  { id: "analytics", label: "Analytics", icon: "📊", group: "System" },
  { id: "audit", label: "Audit Logs", icon: "🔍", group: "System" },
  { id: "security", label: "Security", icon: "🔒", group: "System" },
  { id: "settings", label: "Settings", icon: "⚙️", group: "System" },
  { id: "tags", label: "Tags & Fields", icon: "🏷️", group: "System" },
  // Founder OS
  { id: "wa-templates", label: "WA Templates", icon: "📱", group: "Founder OS" },
  { id: "prompts", label: "Prompt History", icon: "🤖", group: "Founder OS" },
  { id: "project-logs", label: "Project Logs", icon: "🔧", group: "Founder OS" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️", group: "Founder OS" },
];

const TAB_GROUPS = ["Core", "Work", "Finance", "System", "Founder OS"];

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [settings, setSettings] = useState(() => loadLS("settings", defaultSettings));
  const [contacts, setContacts] = useState(() => loadLS("contacts", seedContacts));
  const [leads, setLeads] = useState(() => loadLS("leads", seedLeads));
  const [projects, setProjects] = useState(() => loadLS("projects", seedProjects));
  const [tasks, setTasks] = useState(() => loadLS("tasks", seedTasks));
  const [audit, setAudit] = useState(() => loadLS("audit", initAudit()));

  // New module state
  const [followUps, setFollowUps] = useState(() => loadLS("followUps", seedFollowUps));
  const [notes, setNotes] = useState(() => loadLS("notes", seedNotes));
  const [documents, setDocuments] = useState(() => loadLS("documents", seedDocuments));
  const [invoices, setInvoices] = useState(() => loadLS("invoices", seedInvoices));
  const [payments, setPayments] = useState(() => loadLS("payments", seedPayments));
  const [proposals, setProposals] = useState(() => loadLS("proposals", seedProposals));
  const [communications, setCommunications] = useState(() => loadLS("communications", seedCommunications));
  const [calendarEvents, setCalendarEvents] = useState(() => loadLS("calendarEvents", seedCalendarEvents));
  const [supportTickets, setSupportTickets] = useState(() => loadLS("supportTickets", seedSupportTickets));
  const [whatsappTemplates, setWhatsappTemplates] = useState(() => loadLS("whatsappTemplates", seedWhatsappTemplates));
  const [promptHistory, setPromptHistory] = useState(() => loadLS("promptHistory", seedPromptHistory));
  const [projectLogs, setProjectLogs] = useState(() => loadLS("projectLogs", seedProjectLogs));
  const [roadmapItems, setRoadmapItems] = useState(() => loadLS("roadmapItems", seedRoadmapItems));
  const [tags, setTags] = useState(() => loadLS("tags", seedTags));
  const [customFields, setCustomFields] = useState(() => loadLS("customFields", seedCustomFields));

  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const isDark = settings.theme === "dark";

  const addAudit = useCallback((module, action, desc) => {
    const entry = { id: genId(), ts: new Date().toISOString(), user: settings.role, module, action, desc };
    setAudit(p => { const updated = [entry, ...p].slice(0, 200); saveLS("audit", updated); return updated; });
  }, [settings.role]);

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    const ns = { ...settings, theme: next };
    setSettings(ns); saveLS("settings", ns);
  };

  // Reset all data to seeds
  const resetData = () => {
    setContacts(seedContacts); saveLS("contacts", seedContacts);
    setLeads(seedLeads); saveLS("leads", seedLeads);
    setProjects(seedProjects); saveLS("projects", seedProjects);
    setTasks(seedTasks); saveLS("tasks", seedTasks);
    setFollowUps(seedFollowUps); saveLS("followUps", seedFollowUps);
    setNotes(seedNotes); saveLS("notes", seedNotes);
    setDocuments(seedDocuments); saveLS("documents", seedDocuments);
    setInvoices(seedInvoices); saveLS("invoices", seedInvoices);
    setPayments(seedPayments); saveLS("payments", seedPayments);
    setProposals(seedProposals); saveLS("proposals", seedProposals);
    setCommunications(seedCommunications); saveLS("communications", seedCommunications);
    setCalendarEvents(seedCalendarEvents); saveLS("calendarEvents", seedCalendarEvents);
    setSupportTickets(seedSupportTickets); saveLS("supportTickets", seedSupportTickets);
    setWhatsappTemplates(seedWhatsappTemplates); saveLS("whatsappTemplates", seedWhatsappTemplates);
    setPromptHistory(seedPromptHistory); saveLS("promptHistory", seedPromptHistory);
    setProjectLogs(seedProjectLogs); saveLS("projectLogs", seedProjectLogs);
    setRoadmapItems(seedRoadmapItems); saveLS("roadmapItems", seedRoadmapItems);
    setTags(seedTags); saveLS("tags", seedTags);
    setCustomFields(seedCustomFields); saveLS("customFields", seedCustomFields);
    const newAudit = initAudit(); setAudit(newAudit); saveLS("audit", newAudit);
    toast("All demo data reset");
  };

  const cssVars = isDark ? {
    "--bg": "#0F172A", "--sidebar-bg": "#1E293B", "--card-bg": "#1E293B", "--modal-bg": "#1E293B",
    "--input-bg": "#0F172A", "--text": "#F1F5F9", "--text-muted": "#94A3B8", "--border": "#334155", "--stripe": "rgba(255,255,255,0.02)",
  } : {
    "--bg": "#F8FAFC", "--sidebar-bg": "#1E293B", "--card-bg": "#FFFFFF", "--modal-bg": "#FFFFFF",
    "--input-bg": "#FFFFFF", "--text": "#0F172A", "--text-muted": "#64748B", "--border": "#E2E8F0", "--stripe": "rgba(0,0,0,0.015)",
  };

  // Use keyboard shortcut for search
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setGlobalSearch(true); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const role = settings.role;

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#94A3B8;border-radius:10px}
        input:focus,select:focus,textarea:focus{outline:2px solid #2563EB;outline-offset:1px}
        button:active{transform:scale(0.97)}
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)", ...Object.fromEntries(Object.entries(cssVars)) }}>

        {/* Desktop Sidebar */}
        <aside style={{
          width: sidebarOpen ? 220 : 64, flexShrink:0, background:"var(--sidebar-bg)", display:"flex", flexDirection:"column",
          transition:"width .2s", height:"100vh", position:"sticky", top:0, overflowY:"auto", zIndex:100,
        }} className="sidebar-full">
          <div style={{ padding:"20px 14px 12px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>⚡</div>
            {sidebarOpen&&<span style={{ fontWeight:800, color:"#F1F5F9", fontSize:15, whiteSpace:"nowrap" }}>{settings.businessName}</span>}
          </div>
          <nav style={{ flex:1, padding:"8px 8px", overflowY:"auto" }}>
            {TAB_GROUPS.map(group => {
              const groupTabs = TABS.filter(t => t.group === group);
              return (
                <div key={group} style={{ marginBottom:8 }}>
                  {sidebarOpen && <div style={{ fontSize:9, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", padding:"8px 10px 4px" }}>{group}</div>}
                  {groupTabs.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }} style={{
                      display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px",
                      borderRadius:8, border:"none", background:tab===t.id?"rgba(37,99,235,0.85)":"transparent",
                      color:tab===t.id?"#fff":"#94A3B8", cursor:"pointer", marginBottom:1,
                      fontWeight:tab===t.id?600:400, fontSize:13, textAlign:"left", transition:"background .15s",
                    }}>
                      <span style={{ fontSize:16, flexShrink:0, width:20, textAlign:"center" }}>{t.icon}</span>
                      {sidebarOpen&&<span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.label}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
          <div style={{ padding:"12px 8px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            {sidebarOpen&&<div style={{ padding:"4px 10px 8px", fontSize:12 }}><span style={{ color:"#94A3B8" }}>Role: </span><span style={{ color:"#2563EB", fontWeight:600 }}>{role}</span></div>}
            <button onClick={() => setSidebarOpen(p=>!p)} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"8px 10px", borderRadius:8, border:"none", background:"transparent", color:"#64748B", cursor:"pointer", fontSize:13 }}>
              <span>{sidebarOpen?"◀":"▶"}</span>{sidebarOpen&&"Collapse"}
            </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileMenu && (
          <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
            <div style={{ width:240, background:"var(--sidebar-bg)", overflowY:"auto", height:"100vh", display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"20px 14px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontWeight:800, color:"#F1F5F9", fontSize:15 }}>{settings.businessName}</span>
                <button onClick={() => setMobileMenu(false)} style={{ background:"none", border:"none", color:"#94A3B8", fontSize:22, cursor:"pointer" }}>×</button>
              </div>
              <nav style={{ flex:1, padding:"8px 8px", overflowY:"auto" }}>
                {TAB_GROUPS.map(group => {
                  const groupTabs = TABS.filter(t => t.group === group);
                  return (
                    <div key={group} style={{ marginBottom:8 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"1px", padding:"8px 10px 4px" }}>{group}</div>
                      {groupTabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setMobileMenu(false); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 10px", borderRadius:8, border:"none", background:tab===t.id?"rgba(37,99,235,0.85)":"transparent", color:tab===t.id?"#fff":"#94A3B8", cursor:"pointer", marginBottom:1, fontWeight:tab===t.id?600:400, fontSize:13, textAlign:"left" }}>
                          <span style={{ fontSize:16, width:20, textAlign:"center" }}>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </div>
            <div style={{ flex:1, background:"rgba(0,0,0,0.5)" }} onClick={() => setMobileMenu(false)} />
          </div>
        )}

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          {/* Topbar */}
          <header style={{ height:56, background:"var(--card-bg)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 20px", gap:12, position:"sticky", top:0, zIndex:50 }}>
            <button onClick={() => setMobileMenu(p=>!p)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--text)", display:"none" }} className="mobile-menu-btn">☰</button>
            <button onClick={() => setGlobalSearch(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", borderRadius:8, border:"1px solid var(--border)", background:"var(--input-bg)", color:"var(--text-muted)", cursor:"pointer", fontSize:13, flex:1, maxWidth:300 }}>
              🔍 Search everything…<span style={{ marginLeft:"auto", fontSize:11, opacity:.6 }}>⌘K</span>
            </button>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={toggleTheme} style={{ ...btnStyle("ghost","sm"), padding:"6px 10px" }}>{isDark?"☀️":"🌙"}</button>
              <select style={{ ...inputStyle, width:"auto", padding:"5px 10px", fontSize:12 }} value={role} onChange={e => { const ns={...settings,role:e.target.value}; setSettings(ns); saveLS("settings",ns); }}>
                {["Owner","Admin","Staff","Viewer"].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex:1, padding:"24px 28px", overflowX:"hidden" }} className="main-pad">
            {tab==="dashboard"&&<DashboardModule contacts={contacts} leads={leads} projects={projects} tasks={tasks} audit={audit} settings={settings} setTab={setTab} followUps={followUps} notes={notes} documents={documents} invoices={invoices} payments={payments} proposals={proposals} communications={communications} calendarEvents={calendarEvents} supportTickets={supportTickets} roadmapItems={roadmapItems} promptHistory={promptHistory} />}
            {tab==="contacts"&&<ContactsModule contacts={contacts} setContacts={setContacts} addAudit={addAudit} role={role} leads={leads} setLeads={setLeads} />}
            {tab==="leads"&&<LeadsModule leads={leads} setLeads={setLeads} addAudit={addAudit} role={role} projects={projects} setProjects={setProjects} contacts={contacts} />}
            {tab==="projects"&&<ProjectsModule projects={projects} setProjects={setProjects} addAudit={addAudit} role={role} />}
            {tab==="tasks"&&<TasksModule tasks={tasks} setTasks={setTasks} addAudit={addAudit} role={role} projects={projects} />}
            {tab==="follow-ups"&&<FollowUpsModule followUps={followUps} setFollowUps={setFollowUps} addAudit={addAudit} role={role} contacts={contacts} leads={leads} projects={projects} />}
            {tab==="notes"&&<NotesModule notes={notes} setNotes={setNotes} addAudit={addAudit} role={role} tags={tags} />}
            {tab==="documents"&&<DocumentsModule documents={documents} setDocuments={setDocuments} addAudit={addAudit} role={role} contacts={contacts} projects={projects} tags={tags} />}
            {tab==="invoices"&&<InvoicesModule invoices={invoices} setInvoices={setInvoices} addAudit={addAudit} role={role} projects={projects} contacts={contacts} settings={settings} />}
            {tab==="payments"&&<PaymentsModule payments={payments} setPayments={setPayments} addAudit={addAudit} role={role} projects={projects} invoices={invoices} />}
            {tab==="proposals"&&<ProposalsModule proposals={proposals} setProposals={setProposals} addAudit={addAudit} role={role} projects={projects} setProjects={setProjects} contacts={contacts} />}
            {tab==="communications"&&<CommunicationsModule communications={communications} setCommunications={setCommunications} addAudit={addAudit} role={role} contacts={contacts} leads={leads} projects={projects} />}
            {tab==="calendar"&&<CalendarModule calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} addAudit={addAudit} role={role} contacts={contacts} projects={projects} />}
            {tab==="analytics"&&<AnalyticsModule contacts={contacts} leads={leads} projects={projects} tasks={tasks} followUps={followUps} invoices={invoices} payments={payments} proposals={proposals} communications={communications} supportTickets={supportTickets} roadmapItems={roadmapItems} />}
            {tab==="settings"&&<SettingsModule settings={settings} setSettings={setSettings} role={role} onResetData={resetData} />}
            {tab==="security"&&<SecurityModule settings={settings} setSettings={setSettings} />}
            {tab==="audit"&&<AuditLogsModule audit={audit} setAudit={setAudit} role={role} />}
            {tab==="tags"&&<TagsModule tags={tags} setTags={setTags} customFields={customFields} setCustomFields={setCustomFields} addAudit={addAudit} role={role} />}
            {tab==="support"&&<SupportTicketsModule supportTickets={supportTickets} setSupportTickets={setSupportTickets} addAudit={addAudit} role={role} contacts={contacts} projects={projects} />}
            {tab==="wa-templates"&&<WhatsAppTemplatesModule whatsappTemplates={whatsappTemplates} setWhatsappTemplates={setWhatsappTemplates} addAudit={addAudit} role={role} />}
            {tab==="prompts"&&<PromptHistoryModule promptHistory={promptHistory} setPromptHistory={setPromptHistory} addAudit={addAudit} role={role} projects={projects} />}
            {tab==="project-logs"&&<ProjectLogsModule projectLogs={projectLogs} setProjectLogs={setProjectLogs} addAudit={addAudit} role={role} projects={projects} />}
            {tab==="roadmap"&&<RoadmapModule roadmapItems={roadmapItems} setRoadmapItems={setRoadmapItems} addAudit={addAudit} role={role} />}
          </main>
        </div>
      </div>

      {globalSearch && (
        <GlobalSearchModal
          contacts={contacts} leads={leads} projects={projects} tasks={tasks}
          followUps={followUps} notes={notes} documents={documents} invoices={invoices}
          payments={payments} proposals={proposals} communications={communications}
          calendarEvents={calendarEvents} supportTickets={supportTickets}
          whatsappTemplates={whatsappTemplates} promptHistory={promptHistory}
          projectLogs={projectLogs} roadmapItems={roadmapItems} tags={tags} customFields={customFields}
          onClose={() => setGlobalSearch(false)} setTab={setTab}
        />
      )}
      <ToastContainer />

      <style>{`
        @media(max-width:768px){
          .sidebar-full{display:none!important}
          .mobile-menu-btn{display:flex!important}
          .main-pad{padding:12px!important;padding-bottom:20px!important}
        }
      `}</style>
    </>
  );
}
