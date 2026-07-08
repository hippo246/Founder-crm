import { genId } from "../lib/helpers.js";

const today = new Date().toISOString().slice(0, 10);

export const seedContacts = [
  { id: genId(), name: "Rahul Sharma", company: "TechNova Pvt Ltd", role: "CEO", phone: "9876543210", whatsapp: "9876543210", email: "rahul@technova.in", location: "Mumbai", source: "LinkedIn", tags: ["Hot Lead", "High Value"], status: "Client", notes: "Very responsive, prefers WhatsApp.", createdAt: today },
  { id: genId(), name: "Priya Mehta", company: "Bloom Clinic", role: "Director", phone: "9123456789", whatsapp: "9123456789", email: "priya@bloomclinic.in", location: "Pune", source: "Friend Referral", tags: ["Clinic", "Needs Follow-Up"], status: "Warm", notes: "Interested in clinic CRM.", createdAt: today },
  { id: genId(), name: "Arjun Patel", company: "Spice Route Restaurant", role: "Owner", phone: "9988776655", whatsapp: "9988776655", email: "arjun@spiceroute.in", location: "Ahmedabad", source: "Instagram", tags: ["Restaurant", "Urgent"], status: "New", notes: "Saw Instagram ad. Follow up ASAP.", createdAt: today },
  { id: genId(), name: "Sneha Rao", company: "AutoEdge Motors", role: "Manager", phone: "9001234567", whatsapp: "9001234567", email: "sneha@autoedge.in", location: "Bangalore", source: "Website", tags: ["Automotive"], status: "Active", notes: "Working on automotive CRM demo.", createdAt: today },
  { id: genId(), name: "Karan Joshi", company: "CaféBlend", role: "Founder", phone: "9112233445", whatsapp: "9112233445", email: "karan@cafeblend.in", location: "Delhi", source: "Cold Outreach", tags: ["Waiting Payment"], status: "Future", notes: "Quoted ₹45k. Said will confirm next month.", createdAt: today },
];

export const seedLeads = [
  { id: genId(), title: "Personal CRM Build", contact: "Rahul Sharma", company: "TechNova Pvt Ltd", service: "Custom CRM Development", source: "LinkedIn", value: 150000, probability: 85, stage: "Proposal Sent", priority: "High", followUpDate: new Date(Date.now() + 86400000).toISOString().slice(0,10), notes: "Sent proposal v2. Waiting for approval.", tags: ["High Value", "Hot Lead"], lostReason: "", createdAt: today },
  { id: genId(), title: "Bloom Clinic CRM", contact: "Priya Mehta", company: "Bloom Clinic", service: "Clinic CRM", source: "Friend Referral", value: 80000, probability: 60, stage: "Demo Sent", priority: "Medium", followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10), notes: "Demo well received.", tags: ["Clinic"], lostReason: "", createdAt: today },
  { id: genId(), title: "Restaurant OS", contact: "Arjun Patel", company: "Spice Route Restaurant", service: "Restaurant CRM", source: "Instagram", value: 60000, probability: 40, stage: "Interested", priority: "Urgent", followUpDate: new Date().toISOString().slice(0,10), notes: "Needs custom KOT module.", tags: ["Restaurant", "Urgent"], lostReason: "", createdAt: today },
  { id: genId(), title: "AutoEdge CRM", contact: "Sneha Rao", company: "AutoEdge Motors", service: "Automotive CRM", source: "Website", value: 120000, probability: 70, stage: "Meeting Done", priority: "High", followUpDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0,10), notes: "Met on Zoom. Very interested.", tags: ["Automotive"], lostReason: "", createdAt: today },
  { id: genId(), title: "Website Redesign", contact: "Karan Joshi", company: "CaféBlend", service: "Website Design", source: "Cold Outreach", value: 45000, probability: 30, stage: "New", priority: "Low", followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10), notes: "Initial contact made.", tags: [], lostReason: "", createdAt: today },
  { id: genId(), title: "Multi-Office CRM", contact: "Rahul Sharma", company: "TechNova Pvt Ltd", service: "Enterprise CRM", source: "LinkedIn", value: 250000, probability: 50, stage: "Negotiation", priority: "High", followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10), notes: "Price negotiation ongoing.", tags: ["High Value"], lostReason: "", createdAt: today },
  { id: genId(), title: "Cafe CRM Lite", contact: "Karan Joshi", company: "CaféBlend", service: "Cafe CRM", source: "Cold Outreach", value: 35000, probability: 20, stage: "Won", priority: "Low", followUpDate: "", notes: "Won! Setup phase starts next week.", tags: [], lostReason: "", createdAt: today },
  { id: genId(), title: "Clinic Analytics Module", contact: "Priya Mehta", company: "Bloom Clinic", service: "Analytics Add-on", source: "Friend Referral", value: 30000, probability: 0, stage: "Lost", priority: "Low", followUpDate: "", notes: "Budget constraint.", tags: [], lostReason: "Budget constraints", createdAt: today },
];

export const seedProjects = [
  { id: genId(), name: "Personal Founder CRM", client: "Internal", industry: "SaaS", status: "Development", budget: 0, paid: 0, pending: 0, deadline: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), progress: 62, techStack: "React, Vite, localStorage", priority: "Urgent", description: "Full Founder OS with 23+ modules.", tags: ["CRM", "High Value"], createdAt: today },
  { id: genId(), name: "Bloom Clinic CRM", client: "Priya Mehta", industry: "Healthcare", status: "Design", budget: 80000, paid: 20000, pending: 60000, deadline: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), progress: 25, techStack: "React, Node.js, MongoDB", priority: "High", description: "Patient management + billing + appointments.", tags: ["Clinic"], createdAt: today },
  { id: genId(), name: "Spice Route Restaurant OS", client: "Arjun Patel", industry: "F&B", status: "Planning", budget: 60000, paid: 0, pending: 60000, deadline: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10), progress: 8, techStack: "React, Supabase", priority: "Medium", description: "KOT, menu management, staff & billing.", tags: ["Restaurant"], createdAt: today },
  { id: genId(), name: "AutoEdge Motors CRM", client: "Sneha Rao", industry: "Automotive", status: "Development", budget: 120000, paid: 60000, pending: 60000, deadline: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10), progress: 40, techStack: "React, Firebase", priority: "High", description: "Vehicle inventory, service tracking, leads.", tags: ["Automotive"], createdAt: today },
];

export const seedTasks = [
  { id: genId(), title: "Build Contacts module", description: "Full CRUD, search, filter, profile modal.", project: "Personal Founder CRM", contact: "Internal", status: "Done", priority: "Urgent", dueDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10), checklist: [{id:genId(),text:"Add/Edit form",done:true},{id:genId(),text:"Search & filter",done:true}], tags: ["CRM"], createdAt: today },
  { id: genId(), title: "Design Clinic patient form", description: "Patient intake form with validation.", project: "Bloom Clinic CRM", contact: "Priya Mehta", status: "Doing", priority: "High", dueDate: new Date(Date.now() + 86400000).toISOString().slice(0,10), checklist: [{id:genId(),text:"Fields spec",done:true},{id:genId(),text:"UI mockup",done:false}], tags: ["Clinic"], createdAt: today },
  { id: genId(), title: "Setup Supabase schema", description: "Tables: orders, menu, staff.", project: "Spice Route Restaurant OS", contact: "Arjun Patel", status: "Todo", priority: "Medium", dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0,10), checklist: [], tags: ["Restaurant"], createdAt: today },
  { id: genId(), title: "Fix vehicle inventory search bug", description: "Search returns duplicates on filter change.", project: "AutoEdge Motors CRM", contact: "Sneha Rao", status: "Blocked", priority: "High", dueDate: new Date(Date.now() - 86400000).toISOString().slice(0,10), checklist: [{id:genId(),text:"Reproduce bug",done:true},{id:genId(),text:"Write fix",done:false}], tags: ["Automotive"], createdAt: today },
  { id: genId(), title: "Leads kanban board", description: "Drag-and-drop stage columns with badges.", project: "Personal Founder CRM", contact: "Internal", status: "Doing", priority: "High", dueDate: new Date().toISOString().slice(0,10), checklist: [{id:genId(),text:"Kanban layout",done:true},{id:genId(),text:"Move between stages",done:false}], tags: ["CRM"], createdAt: today },
];

export const seedFollowUps = [
  { id: genId(), person: "Rahul Sharma", relatedTo: "Personal CRM Build", relatedType: "Lead", type: "WhatsApp", dueDate: new Date().toISOString().slice(0,10), status: "Pending", notes: "Check if proposal was reviewed.", outcome: "", createdAt: today },
  { id: genId(), person: "Priya Mehta", relatedTo: "Bloom Clinic CRM", relatedType: "Lead", type: "Call", dueDate: new Date(Date.now() - 86400000).toISOString().slice(0,10), status: "Missed", notes: "She was unavailable. Call again.", outcome: "", createdAt: today },
  { id: genId(), person: "Sneha Rao", relatedTo: "AutoEdge Motors CRM", relatedType: "Project", type: "Meeting", dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10), status: "Pending", notes: "Phase 2 planning meeting.", outcome: "", createdAt: today },
];

export const seedNotes = [
  { id: genId(), title: "Personal CRM Architecture", body: "Using React + Vite + localStorage. Plan to migrate to Firebase once MVP is done. Keep components modular.", relatedTo: "Personal Founder CRM", relatedType: "Project", type: "Technical", tags: ["CRM"], pinned: true, createdAt: today },
  { id: genId(), title: "Priya Mehta call notes", body: "She wants patient portal with SMS reminders. Budget is ₹80k. Decision in 2 weeks.", relatedTo: "Priya Mehta", relatedType: "Contact", type: "Call", tags: ["Clinic"], pinned: false, createdAt: today },
  { id: genId(), title: "Restaurant OS key decision", body: "Decided to use Supabase for real-time KOT updates. Arjun approved the tech choice.", relatedTo: "Spice Route Restaurant OS", relatedType: "Project", type: "Decision", tags: ["Restaurant"], pinned: false, createdAt: today },
];

export const seedDocuments = [
  { id: genId(), name: "TechNova Proposal v2", type: "Proposal", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", url: "https://docs.google.com", status: "Sent", notes: "Sent on June 1.", tags: ["High Value"], createdAt: today },
  { id: genId(), name: "AutoEdge NDA", type: "NDA", relatedClient: "Sneha Rao", relatedProject: "AutoEdge Motors CRM", url: "https://drive.google.com", status: "Signed", notes: "Signed copy received.", tags: [], createdAt: today },
  { id: genId(), name: "Bloom Clinic Contract", type: "Contract", relatedClient: "Priya Mehta", relatedProject: "Bloom Clinic CRM", url: "https://drive.google.com", status: "Draft", notes: "Pending legal review.", tags: ["Clinic"], createdAt: today },
];

export const seedInvoices = [
  { 
    id: genId(), 
    invoiceNumber: "INV-001", 
    invoiceTitle: "Phase 1 Payment",
    contactId: "",
    clientName: "Sneha Rao", 
    clientCompany: "AutoEdge Motors",
    clientEmail: "sneha@autoedge.in",
    clientPhone: "9001234567",
    clientAddress: "",
    projectId: "",
    projectName: "AutoEdge Motors CRM",
    issueDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), 
    dueDate: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10), 
    status: "Paid", 
    currency: "INR",
    lineItems: [
      { description: "Phase 1 Development", quantity: 1, unitPrice: 60000, discount: 0, taxRate: 18, total: 70800 }
    ],
    subtotal: 60000,
    discountTotal: 0,
    taxTotal: 10800,
    extraCharges: 0,
    grandTotal: 70800,
    paymentTerms: "Net 15",
    paymentInstructions: "Please pay via bank transfer",
    notes: "First installment paid.",
    internalNotes: "",
    footerText: "Thank you for your business!",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) 
  },
  { 
    id: genId(), 
    invoiceNumber: "INV-002", 
    invoiceTitle: "Advance Payment",
    contactId: "",
    clientName: "Priya Mehta", 
    clientCompany: "Bloom Clinic",
    clientEmail: "priya@bloomclinic.in",
    clientPhone: "9123456789",
    clientAddress: "",
    projectId: "",
    projectName: "Bloom Clinic CRM",
    issueDate: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10), 
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), 
    status: "Partially Paid", 
    currency: "INR",
    lineItems: [
      { description: "Advance for Clinic CRM", quantity: 1, unitPrice: 20000, discount: 0, taxRate: 18, total: 23600 }
    ],
    subtotal: 20000,
    discountTotal: 0,
    taxTotal: 3600,
    extraCharges: 0,
    grandTotal: 23600,
    paymentTerms: "Net 30",
    paymentInstructions: "Please pay via UPI or bank transfer",
    notes: "Partial advance received.",
    internalNotes: "",
    footerText: "Thank you for your business!",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10) 
  },
  { 
    id: genId(), 
    invoiceNumber: "INV-003", 
    invoiceTitle: "Phase 2 Development",
    contactId: "",
    clientName: "Rahul Sharma", 
    clientCompany: "TechNova Pvt Ltd",
    clientEmail: "rahul@technova.in",
    clientPhone: "9876543210",
    clientAddress: "",
    projectId: "",
    projectName: "Personal Founder CRM",
    issueDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), 
    dueDate: new Date(Date.now() + 23 * 86400000).toISOString().slice(0, 10), 
    status: "Sent", 
    currency: "INR",
    lineItems: [
      { description: "Phase 2 Development", quantity: 1, unitPrice: 50000, discount: 5000, taxRate: 18, total: 54000 }
    ],
    subtotal: 50000,
    discountTotal: 5000,
    taxTotal: 9000,
    extraCharges: 0,
    grandTotal: 54000,
    paymentTerms: "Net 30",
    paymentInstructions: "Please pay via UPI or bank transfer",
    notes: "Awaiting payment.",
    internalNotes: "",
    footerText: "Thank you for your business!",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) 
  },
  { 
    id: genId(), 
    invoiceNumber: "INV-004", 
    invoiceTitle: "KOT Module Development",
    contactId: "",
    clientName: "Arjun Patel", 
    clientCompany: "Spice Route Restaurant",
    clientEmail: "arjun@spiceroute.in",
    clientPhone: "9988776655",
    clientAddress: "",
    projectId: "",
    projectName: "Spice Route Restaurant OS",
    issueDate: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10), 
    dueDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), 
    status: "Overdue", 
    currency: "INR",
    lineItems: [
      { description: "KOT Module Development", quantity: 1, unitPrice: 30000, discount: 0, taxRate: 18, total: 35400 }
    ],
    subtotal: 30000,
    discountTotal: 0,
    taxTotal: 5400,
    extraCharges: 0,
    grandTotal: 35400,
    paymentTerms: "Net 15",
    paymentInstructions: "Please pay via UPI or bank transfer",
    notes: "Follow up urgently.",
    internalNotes: "",
    footerText: "Thank you for your business!",
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10) 
  },
];

export const seedPayments = [
  { id: genId(), client: "Sneha Rao", project: "AutoEdge Motors CRM", invoiceNumber: "INV-001", amount: 70800, method: "Bank Transfer", date: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10), reference: "TXN-987654", notes: "Full payment received.", createdAt: new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), client: "Priya Mehta", project: "Bloom Clinic CRM", invoiceNumber: "INV-002", amount: 10000, method: "UPI", date: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10), reference: "UPI-123456", notes: "Advance payment.", createdAt: new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10) },
];

export const seedProposals = [
  { id: genId(), title: "Personal CRM — Phase 2", client: "Rahul Sharma", service: "Enterprise CRM Development", scope: "Add analytics, reporting, multi-user support, and mobile app.", deliverables: "Web app, Admin panel, Mobile app", timeline: "3 months", price: 250000, terms: "40% advance, 40% mid, 20% delivery", status: "Sent", date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), createdAt: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), title: "Bloom Clinic Patient Portal", client: "Priya Mehta", service: "Clinic CRM + Patient Portal", scope: "Patient registration, appointments, billing, SMS reminders.", deliverables: "Web app, Patient portal", timeline: "2 months", price: 80000, terms: "50% advance, 50% delivery", status: "Draft", date: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10), createdAt: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), title: "Restaurant OS Full Build", client: "Arjun Patel", service: "Restaurant Management System", scope: "KOT, menu, staff, billing, analytics.", deliverables: "Web app + Android", timeline: "4 months", price: 60000, terms: "30% advance, 40% mid, 30% delivery", status: "Accepted", date: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10), createdAt: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10) },
];

export const seedCommunications = [
  { id: genId(), contact: "Rahul Sharma", method: "WhatsApp", summary: "Discussed proposal v2. He liked the new pricing.", outcome: "Positive", relatedTo: "Personal CRM Build", relatedType: "Lead", date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), nextStep: "Follow up after 3 days if no response.", createdAt: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), contact: "Priya Mehta", method: "Call", summary: "30-min call about clinic requirements. She wants SMS feature.", outcome: "Interested", relatedTo: "Bloom Clinic CRM", relatedType: "Project", date: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10), nextStep: "Send updated proposal.", createdAt: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), contact: "Sneha Rao", method: "Meeting", summary: "Zoom meeting for phase 2 planning. Approved Figma designs.", outcome: "Approved", relatedTo: "AutoEdge Motors CRM", relatedType: "Project", date: new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10), nextStep: "Start development sprint 3.", createdAt: new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10) },
];

export const seedCalendarEvents = [
  { id: genId(), title: "Follow-up call — Rahul Sharma", type: "Call", date: new Date().toISOString().slice(0,10), time: "11:00", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", notes: "Discuss proposal approval.", createdAt: today },
  { id: genId(), title: "Payment deadline — INV-003", type: "Payment", date: new Date(Date.now() + 23 * 86400000).toISOString().slice(0,10), time: "", relatedClient: "Rahul Sharma", relatedProject: "Personal Founder CRM", notes: "Invoice INV-003 due.", createdAt: today },
  { id: genId(), title: "AutoEdge Sprint 3 Kickoff", type: "Meeting", date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10), time: "10:00", relatedClient: "Sneha Rao", relatedProject: "AutoEdge Motors CRM", notes: "Zoom call with Sneha and team.", createdAt: today },
  { id: genId(), title: "Restaurant OS Deployment", type: "Deployment", date: new Date(Date.now() + 120 * 86400000).toISOString().slice(0,10), time: "09:00", relatedClient: "Arjun Patel", relatedProject: "Spice Route Restaurant OS", notes: "Production deployment day.", createdAt: today },
];

export const seedSupportTickets = [
  { id: genId(), title: "Login page not loading on mobile", client: "Sneha Rao", project: "AutoEdge Motors CRM", priority: "High", status: "Open", issueType: "Bug", description: "Login page shows blank screen on iOS Safari.", resolutionNotes: "", createdAt: today },
  { id: genId(), title: "Add export to CSV feature", client: "Priya Mehta", project: "Bloom Clinic CRM", priority: "Medium", status: "In Progress", issueType: "Change Request", description: "Client needs export for patient data.", resolutionNotes: "Working on it.", createdAt: today },
  { id: genId(), title: "Invoice calculation wrong", client: "Arjun Patel", project: "Spice Route Restaurant OS", priority: "Urgent", status: "Fixed", issueType: "Bug", description: "Tax not applied correctly on split bills.", resolutionNotes: "Fixed in v1.2.3 build.", createdAt: today },
];

export const seedWhatsappTemplates = [
  { id: genId(), name: "First Outreach", category: "First Message", body: "Hi {clientName}! I'm Rahil, a software developer. I build custom CRM and business management apps. Would love to show you how I can help {projectName}. Are you free for a quick call?", active: true, createdAt: today },
  { id: genId(), name: "Follow-up After Demo", category: "Follow-Up", body: "Hi {clientName}, just checking in after our demo session. Did you get a chance to review it? Happy to answer any questions or customize the demo for {projectName}.", active: true, createdAt: today },
  { id: genId(), name: "Payment Reminder", category: "Payment Reminder", body: "Hi {clientName}, this is a gentle reminder that ₹{amount} is due for {projectName} by {date}. Please let me know if you have any questions. Thank you!", active: true, createdAt: today },
  { id: genId(), name: "Proposal Sent", category: "Proposal Sent", body: "Hi {clientName}! I've just sent over the proposal for {projectName}. Please have a look when you get a chance and let me know your thoughts. Looking forward to working with you!", active: true, createdAt: today },
];

export const seedPromptHistory = [
  { id: genId(), title: "Build Contacts Module", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 1, tool: "Kiro", promptBody: "Build a full Contacts module with CRUD, search, filter by status/source, profile modal, tag system, and convert to lead feature.", outputSummary: "Full ContactsModule component with ContactForm, ContactProfile, search, filters, table view.", status: "Applied", date: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), tags: ["CRM", "Contacts"], createdAt: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), title: "Add Leads Kanban + List", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 2, tool: "Kiro", promptBody: "Add LeadsModule with kanban board and list view, mark won/lost, auto-create project on won.", outputSummary: "LeadsModule with kanban stages, LeadCard, won/lost logic, project auto-creation.", status: "Applied", date: new Date(Date.now() - 85 * 86400000).toISOString().slice(0, 10), tags: ["CRM", "Leads"], createdAt: new Date(Date.now() - 85 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), title: "Full 18-Module Founder OS", project: "Personal Founder CRM", moduleFile: "App.jsx", promptNumber: 3, tool: "Kiro", promptBody: "Add 18 new modules to the CRM.", outputSummary: "All 18 modules added with seed data, CRUD, filters, audit integration.", status: "Applied", date: today, tags: ["CRM", "FounderOS"], createdAt: today },
  { id: genId(), title: "Refactor + Premium UI", project: "Personal Founder CRM", moduleFile: "src/**", promptNumber: 4, tool: "Kiro", promptBody: "Refactor monolithic App.jsx into modular file structure with premium dark-first UI.", outputSummary: "Full file split: lib/, config/, components/, tabs/. Premium dark theme applied.", status: "Applied", date: today, tags: ["CRM", "Refactor"], createdAt: today },
];

export const seedProjectLogs = [
  { id: genId(), project: "Personal Founder CRM", title: "Initial project scaffolded", type: "Build", description: "React + Vite setup with localStorage. First 5 modules built.", result: "Running successfully on localhost.", date: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), status: "Success", relatedPrompt: "Prompt #1", relatedTask: "Build Contacts module", createdAt: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), project: "AutoEdge Motors CRM", title: "Fixed duplicate search bug", type: "Bug Fix", description: "Vehicle inventory search was returning duplicate results on filter change.", result: "Bug fixed. Search now deduplicates correctly.", date: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10), status: "Success", relatedPrompt: "", relatedTask: "Fix vehicle inventory search bug", createdAt: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), project: "Bloom Clinic CRM", title: "UI redesign for patient form", type: "UI Change", description: "Redesigned patient intake form with better validation and UX.", result: "Client approved the new design.", date: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10), status: "Success", relatedPrompt: "", relatedTask: "", createdAt: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10) },
];

export const seedRoadmapItems = [
  { id: genId(), item: "Build 18-module Founder OS", project: "Personal CRM", sector: "SaaS", phase: "Phase 1", priority: "Urgent", status: "In Progress", progress: 65, targetDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), notes: "Core modules done. Finance, System, Founder OS modules pending.", createdAt: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), item: "Launch Bloom Clinic CRM MVP", project: "Clinic CRM", sector: "Healthcare", phase: "Phase 1", priority: "High", status: "In Progress", progress: 30, targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), notes: "Design phase done. Development in progress.", createdAt: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), item: "Restaurant OS — KOT Module", project: "Restaurant CRM", sector: "F&B", phase: "Phase 1", priority: "Medium", status: "Planned", progress: 10, targetDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10), notes: "Schema designed. UI pending.", createdAt: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), item: "AutoEdge Phase 2 — Mobile App", project: "Automotive CRM", sector: "Automotive", phase: "Phase 2", priority: "High", status: "Backlog", progress: 0, targetDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10), notes: "React Native app for service technicians.", createdAt: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) },
  { id: genId(), item: "Firebase Auth + Firestore Migration", project: "Personal CRM", sector: "SaaS", phase: "Phase 2", priority: "High", status: "Backlog", progress: 0, targetDate: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10), notes: "Migrate from localStorage to Firebase. Enable multi-user.", createdAt: today },
];

export const seedTags = ["Hot Lead", "Waiting Payment", "Website", "CRM", "Clinic", "Restaurant", "Urgent", "Friend Referral", "Needs Follow-Up", "High Value", "Automotive", "Decision", "Technical"];

export const seedCustomFields = [
  { id: genId(), fieldName: "GST Number", appliesTo: "Contact", type: "Text", options: "", active: true },
  { id: genId(), fieldName: "Contract Value", appliesTo: "Lead", type: "Number", options: "", active: true },
  { id: genId(), fieldName: "Industry Sector", appliesTo: "Project", type: "Select", options: "Healthcare,F&B,Automotive,SaaS,Education,Real Estate,Other", active: true },
];

export const initAudit = () => [
  { id: genId(), ts: new Date().toISOString(), user: "Owner", module: "System", action: "Init", desc: "Founder OS initialized." },
];
