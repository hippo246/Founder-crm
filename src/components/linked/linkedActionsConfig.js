// Configuration for linked record actions per entity type
// Defines what related records can be created from each entity

export const LINKED_ACTIONS = {
  // Contact can create: Lead, Project, Task, Follow-Up, Note, Document, Invoice, Payment, Proposal, Communication, Calendar Event, Support Ticket
  contact: [
    { target: 'lead', label: 'Add Lead', icon: '🎯' },
    { target: 'project', label: 'Add Project', icon: '🗂️' },
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'document', label: 'Add Document', icon: '📄' },
    { target: 'invoice', label: 'Add Invoice', icon: '💰' },
    { target: 'payment', label: 'Add Payment', icon: '💳' },
    { target: 'proposal', label: 'Add Proposal', icon: '📋' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'supportTicket', label: 'Add Support Ticket', icon: '🎫' },
  ],
  
  // Lead can create: Follow-Up, Task, Note, Proposal, Communication, Calendar Event, Convert to Project
  lead: [
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'proposal', label: 'Add Proposal', icon: '📋' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'project', label: 'Convert to Project', icon: '🗂️', special: 'convert' },
  ],
  
  // Project can create: Task, Roadmap Item, Prompt, Project Log, Note, Document, Invoice, Payment, Proposal, Communication, Calendar Event, Support Ticket
  project: [
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'roadmapItem', label: 'Add Roadmap Item', icon: '🗺️' },
    { target: 'prompt', label: 'Add Prompt', icon: '🤖' },
    { target: 'projectLog', label: 'Add Project Log', icon: '📊' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'document', label: 'Add Document', icon: '📄' },
    { target: 'invoice', label: 'Add Invoice', icon: '💰' },
    { target: 'payment', label: 'Add Payment', icon: '💳' },
    { target: 'proposal', label: 'Add Proposal', icon: '📋' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'supportTicket', label: 'Add Support Ticket', icon: '🎫' },
  ],
  
  // Task can create: Note, Calendar Event, Project Log, Prompt, Support Ticket, Roadmap Link
  task: [
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'projectLog', label: 'Add Project Log', icon: '📊' },
    { target: 'prompt', label: 'Add Prompt', icon: '🤖' },
    { target: 'supportTicket', label: 'Add Support Ticket', icon: '🎫' },
    { target: 'roadmapItem', label: 'Link to Roadmap', icon: '🗺️', special: 'link' },
  ],
  
  // Roadmap Item can create: Task, Prompt, Project Log, Note, Calendar Event, Support Ticket
  roadmapItem: [
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'prompt', label: 'Add Prompt', icon: '🤖' },
    { target: 'projectLog', label: 'Add Project Log', icon: '📊' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'supportTicket', label: 'Add Support Ticket', icon: '🎫' },
  ],
  
  // Invoice can create: Payment, Note, Communication, Calendar Event, Document
  invoice: [
    { target: 'payment', label: 'Add Payment', icon: '💳' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'document', label: 'Add Document', icon: '📄' },
  ],
  
  // Payment can create: Receipt Note, Communication, Document
  payment: [
    { target: 'note', label: 'Add Receipt Note', icon: '📝' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'document', label: 'Add Document', icon: '📄' },
  ],
  
  // Proposal can create: Convert to Project, Create Invoice, Note, Communication, Follow-Up, Calendar Event, Document
  proposal: [
    { target: 'project', label: 'Convert to Project', icon: '🗂️', special: 'convert' },
    { target: 'invoice', label: 'Create Invoice', icon: '💰', special: 'create' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'document', label: 'Add Document', icon: '📄' },
  ],
  
  // Support Ticket can create: Task, Project Log, Note, Communication, Calendar Event
  supportTicket: [
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'projectLog', label: 'Add Project Log', icon: '📊' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
  ],
  
  // Prompt History can create: Task, Project Log, Roadmap Item, Note
  prompt: [
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'projectLog', label: 'Add Project Log', icon: '📊' },
    { target: 'roadmapItem', label: 'Add Roadmap Item', icon: '🗺️' },
    { target: 'note', label: 'Add Note', icon: '📝' },
  ],
  
  // Project Log can create: Task, Prompt, Roadmap Item, Note
  projectLog: [
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'prompt', label: 'Add Prompt', icon: '🤖' },
    { target: 'roadmapItem', label: 'Add Roadmap Item', icon: '🗺️' },
    { target: 'note', label: 'Add Note', icon: '📝' },
  ],
  
  // Communication can create: Follow-Up, Task, Note, Calendar Event
  communication: [
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
  ],
  
  // Note can create: Convert to Task, Add Follow-Up, Calendar Event, Document
  note: [
    { target: 'task', label: 'Convert to Task', icon: '✅', special: 'convert' },
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'calendarEvent', label: 'Add Calendar Event', icon: '📅' },
    { target: 'document', label: 'Add Document', icon: '📄' },
  ],
  
  // Document can create: Note, Communication, Task
  document: [
    { target: 'note', label: 'Add Note', icon: '📝' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'task', label: 'Add Task', icon: '✅' },
  ],
  
  // Calendar Event can create: Follow-Up, Task, Communication, Note
  calendarEvent: [
    { target: 'followUp', label: 'Add Follow-Up', icon: '📞' },
    { target: 'task', label: 'Add Task', icon: '✅' },
    { target: 'communication', label: 'Add Communication', icon: '💬' },
    { target: 'note', label: 'Add Note', icon: '📝' },
  ],
};

// Get available linked actions for a source entity type
export function getAvailableLinkedActions(sourceEntityType) {
  return LINKED_ACTIONS[sourceEntityType] || [];
}

// Build default payload for creating a linked record
export function buildDefaultLinkedPayload(sourceEntity, targetModule, relatedData = {}) {
  const today = new Date().toISOString().slice(0, 10);
  
  const basePayload = {
    createdAt: today,
  };
  
  // Add source entity references based on target module
  switch (targetModule) {
    case 'lead':
      return {
        ...basePayload,
        contactId: sourceEntity.id,
        clientName: sourceEntity.name || sourceEntity.title,
        clientCompany: sourceEntity.company || '',
        contact: sourceEntity.name || sourceEntity.title,
      };
      
    case 'project':
      return {
        ...basePayload,
        contactId: sourceEntity.contactId,
        client: sourceEntity.name || sourceEntity.contact || sourceEntity.clientName || '',
        ...(sourceEntity.special === 'convert' && {
          name: sourceEntity.title || sourceEntity.name || 'New Project',
          budget: sourceEntity.value || 0,
          status: 'Planning',
        }),
      };
      
    case 'task':
      return {
        ...basePayload,
        projectId: sourceEntity.projectId,
        project: sourceEntity.project || sourceEntity.projectName || '',
        contactId: sourceEntity.contactId,
        contact: sourceEntity.contact || sourceEntity.person || sourceEntity.clientName || '',
        ...(sourceEntity.special === 'convert' && {
          title: sourceEntity.title || sourceEntity.body || 'New Task',
          description: sourceEntity.description || sourceEntity.body || '',
        }),
        roadmapItemId: sourceEntity.roadmapItemId,
        promptId: sourceEntity.promptId,
        supportTicketId: sourceEntity.supportTicketId,
      };
      
    case 'followUp':
      return {
        ...basePayload,
        person: sourceEntity.name || sourceEntity.contact || sourceEntity.person || '',
        relatedTo: sourceEntity.title || sourceEntity.name || sourceEntity.summary || '',
        relatedType: sourceEntity.type || 'Contact',
        dueDate: today,
      };
      
    case 'note':
      return {
        ...basePayload,
        relatedTo: sourceEntity.title || sourceEntity.name || sourceEntity.item || '',
        relatedType: sourceEntity.type || 'General',
        ...(sourceEntity.special === 'convert' && {
          title: sourceEntity.title || sourceEntity.body || 'Task from Note',
          body: sourceEntity.body || sourceEntity.description || '',
        }),
      };
      
    case 'invoice':
      return {
        ...basePayload,
        contactId: sourceEntity.contactId,
        clientName: sourceEntity.name || sourceEntity.clientName || '',
        clientCompany: sourceEntity.company || sourceEntity.clientCompany || '',
        projectId: sourceEntity.projectId,
        projectName: sourceEntity.project || sourceEntity.projectName || '',
        ...(sourceEntity.special === 'create' && {
          invoiceTitle: sourceEntity.title || 'Invoice',
          lineItems: sourceEntity.deliverables ? sourceEntity.deliverables.map(d => ({
            description: d,
            quantity: 1,
            price: (sourceEntity.price || 0) / (sourceEntity.deliverables?.length || 1),
          })) : [{
            description: sourceEntity.scope || sourceEntity.service || 'Services',
            quantity: 1,
            price: sourceEntity.price || 0,
          }],
        }),
      };
      
    case 'payment':
      return {
        ...basePayload,
        invoiceId: sourceEntity.id,
        invoiceNumber: sourceEntity.invoiceNumber || '',
        projectId: sourceEntity.projectId,
        projectName: sourceEntity.projectName || '',
        contactId: sourceEntity.contactId,
        clientName: sourceEntity.clientName || '',
        amount: sourceEntity.grandTotal || 0,
      };
      
    case 'proposal':
      return {
        ...basePayload,
        contactId: sourceEntity.contactId,
        clientName: sourceEntity.name || sourceEntity.clientName || '',
        clientCompany: sourceEntity.company || sourceEntity.clientCompany || '',
        projectId: sourceEntity.projectId,
        projectName: sourceEntity.project || sourceEntity.projectName || '',
      };
      
    case 'communication':
      return {
        ...basePayload,
        contact: sourceEntity.name || sourceEntity.contact || sourceEntity.person || '',
        relatedTo: sourceEntity.title || sourceEntity.name || sourceEntity.invoiceNumber || '',
        date: today,
      };
      
    case 'calendarEvent':
      return {
        ...basePayload,
        title: sourceEntity.title || sourceEntity.name || 'Event',
        relatedTo: sourceEntity.title || sourceEntity.name || '',
        date: today,
      };
      
    case 'supportTicket':
      return {
        ...basePayload,
        projectId: sourceEntity.projectId,
        projectName: sourceEntity.project || sourceEntity.projectName || '',
        contactId: sourceEntity.contactId,
        clientName: sourceEntity.name || sourceEntity.clientName || '',
        title: sourceEntity.title || sourceEntity.summary || 'New Ticket',
      };
      
    case 'roadmapItem':
      return {
        ...basePayload,
        project: sourceEntity.project || sourceEntity.projectName || '',
        ...(sourceEntity.special === 'link' && {
          item: sourceEntity.title || sourceEntity.name || 'New Item',
        }),
      };
      
    case 'prompt':
      return {
        ...basePayload,
        project: sourceEntity.project || sourceEntity.projectName || '',
        ...(sourceEntity.special === 'convert' && {
          title: sourceEntity.title || sourceEntity.body || 'New Prompt',
        }),
      };
      
    case 'projectLog':
      return {
        ...basePayload,
        project: sourceEntity.project || sourceEntity.projectName || '',
      };
      
    case 'document':
      return {
        ...basePayload,
        relatedTo: sourceEntity.title || sourceEntity.name || '',
      };
      
    default:
      return basePayload;
  }
}
