// ─── Cross-module relationship helpers ────────────────────────────────────────

export const getContactName   = (id, contacts=[])      => contacts.find(x=>x.id===id)?.name || "—";
export const getLeadTitle     = (id, leads=[])          => leads.find(x=>x.id===id)?.title || "—";
export const getProjectName   = (id, projects=[])       => projects.find(x=>x.id===id)?.name || "—";
export const getTaskTitle     = (id, tasks=[])          => tasks.find(x=>x.id===id)?.title || "—";
export const getInvoiceNumber = (id, invoices=[])       => invoices.find(x=>x.id===id)?.invoiceNumber || "—";
export const getProposalTitle = (id, proposals=[])      => proposals.find(x=>x.id===id)?.title || "—";
export const getRoadmapTitle  = (id, items=[])          => items.find(x=>x.id===id)?.item || "—";
export const getPromptTitle   = (id, prompts=[])        => { const p=prompts.find(x=>x.id===id); return p?`#${p.promptNumber} ${p.title}`:"—"; };
export const getSupportTitle  = (id, tickets=[])        => tickets.find(x=>x.id===id)?.title || "—";
export const getLogTitle      = (id, logs=[])           => logs.find(x=>x.id===id)?.title || "—";

export const getRelatedLabel = (type, id, data={}) => {
  const { contacts=[], leads=[], projects=[], tasks=[], invoices=[], proposals=[], roadmapItems=[], promptHistory=[], supportTickets=[], projectLogs=[] } = data;
  switch(type) {
    case "Contact":    return getContactName(id, contacts);
    case "Lead":       return getLeadTitle(id, leads);
    case "Project":    return getProjectName(id, projects);
    case "Task":       return getTaskTitle(id, tasks);
    case "Invoice":    return getInvoiceNumber(id, invoices);
    case "Proposal":   return getProposalTitle(id, proposals);
    case "Roadmap":    return getRoadmapTitle(id, roadmapItems);
    case "Prompt":     return getPromptTitle(id, promptHistory);
    case "Support":    return getSupportTitle(id, supportTickets);
    case "ProjectLog": return getLogTitle(id, projectLogs);
    default:           return id || "—";
  }
};

// All data linked to a project (by ID or legacy name)
export const getProjectLinkedData = (projectId, projectName, data={}) => {
  const { tasks=[], notes=[], documents=[], invoices=[], payments=[], proposals=[], communications=[], supportTickets=[], promptHistory=[], projectLogs=[], roadmapItems=[], calendarEvents=[], followUps=[] } = data;
  const match = x => (projectId && x.projectId===projectId) || x.project===projectName || x.relatedProject===projectName || x.relatedTo===projectName;
  return {
    tasks:          tasks.filter(match),
    notes:          notes.filter(match),
    documents:      documents.filter(match),
    invoices:       invoices.filter(match),
    payments:       payments.filter(match),
    proposals:      proposals.filter(match),
    communications: communications.filter(x=>x.relatedTo===projectName||x.projectId===projectId),
    supportTickets: supportTickets.filter(match),
    promptHistory:  promptHistory.filter(match),
    projectLogs:    projectLogs.filter(match),
    roadmapItems:   roadmapItems.filter(match),
    calendarEvents: calendarEvents.filter(x=>x.relatedProject===projectName||x.projectId===projectId),
    followUps:      followUps.filter(x=>x.relatedTo===projectName||x.projectId===projectId),
  };
};

// Dynamic project health based on linked data
export const calcProjectHealth = (p, linked={}) => {
  const { tasks=[], roadmapItems=[], supportTickets=[], invoices=[] } = linked;
  if (p.status==="Completed") return { label:"Completed", color:"var(--success)", bg:"var(--success-dim)" };
  const blockedTasks   = tasks.filter(t=>t.status==="Blocked").length;
  const blockedRoadmap = roadmapItems.filter(r=>r.status==="Blocked").length;
  const urgentTickets  = supportTickets.filter(t=>t.priority==="Urgent"&&t.status==="Open").length;
  const overdueTasks   = tasks.filter(t=>t.dueDate&&new Date(t.dueDate)<new Date()&&t.status!=="Done").length;
  const overdueInv     = invoices.filter(i=>i.status==="Overdue").length;
  const deadlineNear   = p.deadline && new Date(p.deadline)<new Date(Date.now()+14*86400000);
  const deadlineOver   = p.deadline && new Date(p.deadline)<new Date();
  if (blockedTasks>0||blockedRoadmap>0||urgentTickets>0) return { label:"Blocked",       color:"var(--danger)",  bg:"var(--danger-dim)" };
  if (deadlineOver||overdueInv>0||overdueTasks>=3)        return { label:"At Risk",        color:"var(--danger)",  bg:"var(--danger-dim)" };
  if (overdueTasks>0||deadlineNear)                        return { label:"Needs Attention",color:"var(--warning)", bg:"var(--warning-dim)" };
  return { label:"On Track", color:"var(--success)", bg:"var(--success-dim)" };
};

export const nextPromptNumber = (projectName, prompts=[]) => {
  const nums = prompts.filter(p=>p.project===projectName).map(p=>Number(p.promptNumber)||0);
  return nums.length>0 ? Math.max(...nums)+1 : 1;
};
