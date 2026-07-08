// ─── Global search ────────────────────────────────────────────────────────────

const matchQ = (ql, ...fields) =>
  fields.some(f => f && String(f).toLowerCase().includes(ql));

export const runGlobalSearch = (q, data = {}) => {
  if (!q || !q.trim()) return null;
  const ql = q.toLowerCase();
  const {
    contacts=[], leads=[], projects=[], tasks=[],
    followUps=[], notes=[], documents=[], invoices=[],
    payments=[], proposals=[], communications=[],
    calendarEvents=[], supportTickets=[], whatsappTemplates=[],
    promptHistory=[], projectLogs=[], roadmapItems=[], tags=[],
  } = data;

  return {
    contacts:      contacts.filter(c  => matchQ(ql, c.name, c.company, c.email, c.phone, c.location)),
    leads:         leads.filter(l     => matchQ(ql, l.title, l.contact, l.company, l.service)),
    projects:      projects.filter(p  => matchQ(ql, p.name, p.client, p.industry, p.description)),
    tasks:         tasks.filter(t     => matchQ(ql, t.title, t.project, t.description, t.blockers)),
    "follow-ups":  followUps.filter(f => matchQ(ql, f.person, f.relatedTo, f.notes, f.outcome)),
    notes:         notes.filter(n     => matchQ(ql, n.title, n.body, n.relatedTo)),
    documents:     documents.filter(d => matchQ(ql, d.name, d.relatedClient, d.relatedProject)),
    invoices:      invoices.filter(i  => matchQ(ql, i.invoiceNumber, i.client, i.project, i.notes)),
    payments:      payments.filter(p  => matchQ(ql, p.client, p.reference, p.invoiceNumber, p.project)),
    proposals:     proposals.filter(p => matchQ(ql, p.title, p.client, p.service, p.scope)),
    communications:communications.filter(c => matchQ(ql, c.contact, c.summary, c.outcome, c.nextStep)),
    calendar:      calendarEvents.filter(e => matchQ(ql, e.title, e.relatedClient, e.relatedProject, e.notes)),
    support:       supportTickets.filter(t => matchQ(ql, t.title, t.client, t.description, t.project, t.resolutionNotes)),
    "wa-templates":whatsappTemplates.filter(t => matchQ(ql, t.name, t.body, t.category)),
    prompts:       promptHistory.filter(p => matchQ(ql, p.title, p.promptBody, p.outputSummary, p.project, p.moduleFile)),
    "project-logs":projectLogs.filter(l => matchQ(ql, l.title, l.description, l.result, l.project, l.nextAction)),
    roadmap:       roadmapItems.filter(i => matchQ(ql, i.item, i.notes, i.sector, i.phase, i.project, i.blockers)),
    tags:          tags.filter(t => String(t).toLowerCase().includes(ql)).map(t => ({ id: t, name: t })),
  };
};

export const getSearchDisplayLabel = item =>
  item.name || item.title || item.person || item.contact ||
  item.invoiceNumber || item.item || "—";

export const getSearchDisplaySub = item =>
  item.company || item.client || item.project ||
  item.category || item.type || item.method || item.stage || item.status || "";
