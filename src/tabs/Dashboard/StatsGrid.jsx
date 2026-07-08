import { SectionCard } from "../../components/ui/UI.jsx";
import { formatCurrency } from "../../lib/storage.js";

export default function StatsGrid({ contacts, leads, projects, tasks, invoices, payments, exchangeRates, currency, onNavigate }) {
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const outstandingAmt = invoices.filter(i => i.status !== "Paid").reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
  const overdueInvoiceCount = invoices.filter(i => i.status !== "Paid" && i.dueDate && new Date(i.dueDate) < new Date()).length;
  const overdueTaskCount = tasks.filter(t => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < new Date()).length;

  const totalBilled = invoices.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : null;
  const inProgressProjects = projects.filter(p => p.status === "In Progress").length;
  const completedProjects = projects.filter(p => p.status === "Completed").length;

  const stats = [
    {
      label: "Revenue Collected",
      value: formatCurrency(totalRevenue, currency, exchangeRates, currency),
      color: "#10b981",
      sub: collectionRate !== null ? `${collectionRate}% collection rate` : `${payments.length} payments`,
      subColor: collectionRate !== null && collectionRate < 70 ? "#ef4444" : "#10b981",
      tab: "payments",
    },
    {
      label: "Active Projects",
      value: inProgressProjects,
      color: "#6366f1",
      sub: `${completedProjects} completed`,
      tab: "projects",
    },
    {
      label: "Open Leads",
      value: leads.filter(l => l.status !== "Closed").length,
      color: "#f59e0b",
      sub: `${leads.filter(l => l.status === "Closed").length} closed`,
      tab: "leads",
    },
    {
      label: "Pending Tasks",
      value: tasks.filter(t => t.status === "Todo" || t.status === "In Progress").length,
      color: overdueTaskCount > 0 ? "#ef4444" : "#6366f1",
      sub: overdueTaskCount > 0 ? `${overdueTaskCount} overdue` : "on track",
      subColor: overdueTaskCount > 0 ? "#ef4444" : "#10b981",
      tab: "tasks",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstandingAmt, currency, exchangeRates, currency),
      color: overdueInvoiceCount > 0 ? "#ef4444" : "var(--text)",
      sub: overdueInvoiceCount > 0 ? `${overdueInvoiceCount} overdue` : "all current",
      subColor: overdueInvoiceCount > 0 ? "#ef4444" : "#10b981",
      tab: "invoices",
    },
    {
      label: "Contacts",
      value: contacts.length,
      color: "#8b5cf6",
      sub: `${leads.length} leads total`,
      tab: "contacts",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
      {stats.map((stat, idx) => (
        <SectionCard
          key={idx}
          onClick={() => onNavigate?.(stat.tab)}
          style={{
            padding: "14px 16px",
            cursor: onNavigate ? "pointer" : "default",
            transition: "box-shadow 0.15s, transform 0.1s",
            userSelect: "none",
          }}
          onMouseEnter={e => { if (onNavigate) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
            {stat.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 4 }}>
            {stat.value}
          </div>
          <div style={{ fontSize: 10, color: stat.subColor || "var(--text-muted)", fontWeight: 500 }}>
            {stat.sub}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
