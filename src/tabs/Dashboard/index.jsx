import { useMemo } from "react";
import DashboardHeader from "./DashboardHeader.jsx";
import PulseBanner from "./PulseBanner.jsx";
import StatsGrid from "./StatsGrid.jsx";
import LeadsPipeline from "./LeadsPipeline.jsx";
import MyDaySection from "./MyDaySection.jsx";
import UpcomingEvents from "./UpcomingEvents.jsx";
import RecentActivity from "./RecentActivity.jsx";
import { isOverdue } from "../../lib/helpers.js";
import { calcProjectHealth } from "../../lib/relations.js";

export default function DashboardTab({
  contacts, leads, projects, tasks, setTasks, invoices, payments,
  calendarEvents, exchangeRates, currency,
  notes, communications, followUps,
  onNavigate, onNewLead, onNewTask, onNewInvoice,
}) {
  const atRiskItems = useMemo(() => {
    return projects.filter(p => {
      const health = calcProjectHealth(p, tasks, invoices);
      return health === "At Risk" || health === "Critical";
    });
  }, [projects, tasks, invoices]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => t.status !== "Done" && t.dueDate && isOverdue(t.dueDate));
  }, [tasks]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter(i => i.status !== "Paid" && i.dueDate && isOverdue(i.dueDate));
  }, [invoices]);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", minHeight: "100vh", color: "var(--text)", paddingBottom: 48 }}>
      <DashboardHeader
        onNewLead={onNewLead}
        onNewTask={onNewTask}
        onNewInvoice={onNewInvoice}
      />

      <PulseBanner
        atRiskItems={atRiskItems}
        overdueTasks={overdueTasks}
        overdueInvoices={overdueInvoices}
        onNavigate={onNavigate}
      />

      <StatsGrid
        contacts={contacts}
        leads={leads}
        projects={projects}
        tasks={tasks}
        invoices={invoices}
        payments={payments}
        exchangeRates={exchangeRates}
        currency={currency}
        onNavigate={onNavigate}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        <LeadsPipeline leads={leads} onNavigate={onNavigate} />
        <MyDaySection tasks={tasks} setTasks={setTasks ?? (() => {})} projects={projects} onNavigate={onNavigate} />
        <UpcomingEvents calendarEvents={calendarEvents} onNavigate={onNavigate} />
      </div>

      <RecentActivity
        notes={notes ?? []}
        communications={communications ?? []}
        followUps={followUps ?? []}
        contacts={contacts}
        leads={leads}
        projects={projects}
        onNavigate={onNavigate}
      />
    </div>
  );
}
