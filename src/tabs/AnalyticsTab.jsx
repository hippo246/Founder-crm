import { useState, useMemo } from "react";
import { ProgressBar, SectionCard, StatMini, FormField, SearchInput, btnStyle, inputStyle, toast, Modal } from "../components/ui/UI.jsx";
import { exportToCSV, openPrintView } from "../lib/exports.js";
import { genId, fmtDate, isOverdue, isToday, calculateDaysBetween } from "../lib/helpers.js";
import { LEAD_STAGES, PROJECT_STATUSES, TASK_STATUSES, INVOICE_STATUSES, PROPOSAL_STATUSES, COMM_METHODS, PAYMENT_METHODS, ROADMAP_STATUSES, TICKET_STATUSES, TICKET_PRIORITIES, PROMPT_STATUSES, STATUS_COLORS } from "../config/crmConfig.js";

const Bar = ({ label, value, total, color="var(--accent)" }) => (
  <div style={{marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
      <span style={{color:"var(--text-muted)"}}>{label}</span>
      <span style={{fontWeight:600,color:"var(--text)"}}>{value}<span style={{color:"var(--text-muted)",fontWeight:400}}> / {total}</span></span>
    </div>
    <ProgressBar value={total>0?(value/total)*100:0} color={color} />
  </div>
);

const REPORT_TYPES = [
  { id: "owner_summary", label: "Owner Summary Report", icon: "📊" },
  { id: "project", label: "Project Report", icon: "📁" },
  { id: "finance", label: "Finance Report", icon: "💰" },
  { id: "invoice", label: "Invoice Report", icon: "🧾" },
  { id: "payment", label: "Payment Report", icon: "💳" },
  { id: "lead_pipeline", label: "Lead Pipeline Report", icon: "🎯" },
  { id: "task_productivity", label: "Task Productivity Report", icon: "✅" },
  { id: "roadmap_progress", label: "Roadmap Progress Report", icon: "🗺️" },
  { id: "support_ticket", label: "Support Ticket Report", icon: "🆘" },
  { id: "prompt_history", label: "Prompt History Report", icon: "🤖" },
  { id: "project_logs", label: "Project Logs Report", icon: "📝" },
  { id: "follow_up", label: "Follow-Up Report", icon: "⏰" },
  { id: "client_contact", label: "Client/Contact Report", icon: "👥" }
];

export default function AnalyticsTab({ 
  contacts, leads, projects, tasks, followUps, invoices, payments, proposals, 
  communications, supportTickets, roadmapItems, promptHistory, projectLogs, 
  settings, role, addAudit 
}) {
  const [selectedReport, setSelectedReport] = useState("owner_summary");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filterProject, setFilterProject] = useState("All");
  const [filterClient, setFilterClient] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [currentReportData, setCurrentReportData] = useState(null);

  // Data collections
  const allContacts = contacts || [];
  const allLeads = leads || [];
  const allProjects = projects || [];
  const allTasks = tasks || [];
  const allInvoices = invoices || [];
  const allPayments = payments || [];
  const allProposals = proposals || [];
  const allCommunications = communications || [];
  const allSupportTickets = supportTickets || [];
  const allRoadmapItems = roadmapItems || [];
  const allPromptHistory = promptHistory || [];
  const allProjectLogs = projectLogs || [];
  const allFollowUps = followUps || [];

  // Apply date filter
  const applyDateFilter = (items, dateField = "createdAt") => {
    if (!dateRange.start && !dateRange.end) return items;
    
    return items.filter(item => {
      const itemDate = item[dateField];
      if (!itemDate) return true;
      
      const itemDateObj = new Date(itemDate);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;
      
      if (startDate && itemDateObj < startDate) return false;
      if (endDate && itemDateObj > endDate) return false;
      return true;
    });
  };

  // Calculate invoice paid amount
  const getInvoicePaid = useMemo(() => {
    const paidMap = {};
    allPayments.forEach(payment => {
      if (payment.invoiceId) {
        paidMap[payment.invoiceId] = (paidMap[payment.invoiceId] || 0) + (Number(payment.amount) || 0);
      }
    });
    return paidMap;
  }, [allPayments]);

  // Calculate invoice pending amount
  const getInvoicePending = (invoice) => {
    const paid = getInvoicePaid[invoice.id] || 0;
    const grandTotal = Number(invoice.grandTotal) || 0;
    return Math.max(0, grandTotal - paid);
  };

  // 1. Owner Summary Report
  const ownerSummaryReport = useMemo(() => {
    const filteredInvoices = applyDateFilter(allInvoices, "issueDate");
    const filteredPayments = applyDateFilter(allPayments, "date");
    const filteredProjects = applyDateFilter(allProjects, "createdAt");
    const filteredLeads = applyDateFilter(allLeads, "createdAt");
    
    // Revenue calculations
    const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPending = totalInvoiced - totalPaid;
    
    // Overdue invoices
    const overdueInvoices = filteredInvoices.filter(inv => inv.status === "Overdue");
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + getInvoicePending(inv), 0);
    
    // Project health
    const activeProjects = filteredProjects.filter(p => p.status === "Active").length;
    const completedProjects = filteredProjects.filter(p => p.status === "Completed").length;
    const blockedProjects = filteredProjects.filter(p => p.status === "Blocked").length;
    
    // Lead conversion
    const wonLeads = filteredLeads.filter(l => l.stage === "Won").length;
    const lostLeads = filteredLeads.filter(l => l.stage === "Lost").length;
    const conversionRate = filteredLeads.length > 0 ? Math.round((wonLeads / filteredLeads.length) * 100) : 0;
    
    // Task productivity
    const completedTasks = allTasks.filter(t => t.status === "Done").length;
    const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !["Done", "Cancelled"].includes(t.status)).length;
    
    // Support tickets
    const openTickets = allSupportTickets.filter(t => t.status === "Open").length;
    const urgentTickets = allSupportTickets.filter(t => t.priority === "Urgent" && t.status === "Open").length;
    
    // Follow-ups
    const missedFollowUps = allFollowUps.filter(f => f.status === "Missed").length;
    const pendingFollowUps = allFollowUps.filter(f => f.status === "Pending").length;
    
    // Prompt execution
    const failedPrompts = allPromptHistory.filter(p => p.status === "Failed" || p.status === "Needs Fix").length;
    
    return {
      title: "Owner Summary Report",
      summary: [
        { label: "Total Invoiced", value: `₹${totalInvoiced.toLocaleString("en-IN")}`, color: "var(--accent)" },
        { label: "Total Collected", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "var(--success)" },
        { label: "Pending Revenue", value: `₹${totalPending.toLocaleString("en-IN")}`, color: totalPending > 0 ? "var(--warning)" : "var(--success)" },
        { label: "Overdue Amount", value: `₹${totalOverdue.toLocaleString("en-IN")}`, color: totalOverdue > 0 ? "#DC2626" : "#374151" },
        { label: "Active Projects", value: activeProjects, color: "var(--accent)" },
        { label: "Won Leads", value: wonLeads, color: "var(--success)" },
        { label: "Conversion Rate", value: `${conversionRate}%`, color: conversionRate >= 50 ? "var(--success)" : "var(--warning)" }
      ],
      insights: [
        totalOverdue > 0 ? `⚠️ Attention: ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s are" : " is"} overdue with a total of ₹${totalOverdue.toLocaleString("en-IN")} pending.` : null,
        totalPending > 0 ? `📊 Pending Revenue: You have ₹${totalPending.toLocaleString("en-IN")} awaiting payment across ${filteredInvoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").length} unpaid invoices.` : null,
        blockedProjects > 0 ? `🚫 Blocked Projects: ${blockedProjects} project${blockedProjects > 1 ? "s are" : " is"} currently blocked and needs attention.` : null,
        overdueTasks > 0 ? `⏰ Task Overdue: ${overdueTasks} task${overdueTasks > 1 ? "s are" : " is"} overdue and requires immediate action.` : null,
        urgentTickets > 0 ? `🆘 Urgent Support: ${urgentTickets} urgent support ticket${urgentTickets > 1 ? "s are" : " is"} open and needs resolution.` : null,
        missedFollowUps > 0 ? `⏰ Follow-ups Missed: ${missedFollowUps} follow-up${missedFollowUps > 1 ? "s have" : " has"} been missed.` : null,
        failedPrompts > 0 ? `🤖 Prompt Issues: ${failedPrompts} prompt${failedPrompts > 1 ? "s have" : " has"} failed and needs fixes.` : null
      ].filter(Boolean),
      detailedData: {
        projects: filteredProjects,
        invoices: filteredInvoices,
        payments: filteredPayments,
        leads: filteredLeads,
        tasks: allTasks,
        supportTickets: allSupportTickets,
        followUps: allFollowUps,
        promptHistory: allPromptHistory
      }
    };
  }, [allInvoices, allPayments, allProjects, allLeads, allTasks, allSupportTickets, allFollowUps, allPromptHistory, dateRange, getInvoicePaid]);

  // 2. Project Report
  const projectReport = useMemo(() => {
    const filteredProjects = applyDateFilter(allProjects, "createdAt");
    const projectId = filterProject !== "All" ? filterProject : null;
    
    const projectsToAnalyze = projectId 
      ? filteredProjects.filter(p => p.id === projectId)
      : filteredProjects;
    
    const projectStats = projectsToAnalyze.map(project => {
      const projectInvoices = allInvoices.filter(inv => inv.projectId === project.id);
      const projectPayments = allPayments.filter(p => p.projectId === project.id);
      const projectTasks = allTasks.filter(t => t.projectId === project.id);
      const projectProposals = allProposals.filter(prop => prop.projectId === project.id);
      
      const totalBilled = projectInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const totalPaid = projectPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingAmount = totalBilled - totalPaid;
      
      const completedTasks = projectTasks.filter(t => t.status === "Done").length;
      const totalTasks = projectTasks.length;
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const acceptedProposals = projectProposals.filter(p => p.status === "Accepted").length;
      
      return {
        project: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        totalBilled,
        totalPaid,
        pendingAmount,
        taskCompletionRate,
        acceptedProposals,
        invoiceCount: projectInvoices.length,
        paymentCount: projectPayments.length
      };
    });
    
    const totalBilled = projectStats.reduce((sum, p) => sum + p.totalBilled, 0);
    const totalPaid = projectStats.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalPending = totalBilled - totalPaid;
    
    return {
      title: "Project Report",
      summary: [
        { label: "Projects Analyzed", value: projectsToAnalyze.length, color: "var(--accent)" },
        { label: "Total Billed", value: `₹${totalBilled.toLocaleString("en-IN")}`, color: "var(--accent)" },
        { label: "Total Collected", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "var(--success)" },
        { label: "Pending", value: `₹${totalPending.toLocaleString("en-IN")}`, color: totalPending > 0 ? "var(--warning)" : "var(--success)" },
        { label: "Active Projects", value: projectsToAnalyze.filter(p => p.status === "Active").length, color: "var(--info)" },
        { label: "Completed Projects", value: projectsToAnalyze.filter(p => p.status === "Completed").length, color: "var(--success)" },
        { label: "Blocked Projects", value: projectsToAnalyze.filter(p => p.status === "Blocked").length, color: "var(--danger)" }
      ],
      insights: [
        projectId ? `📁 Focused on project: ${allProjects.find(p => p.id === projectId)?.name || "Unknown"}` : `📁 Analyzing all ${filteredProjects.length} projects`,
        totalPending > 0 ? `💰 Pending Revenue: ₹${totalPending.toLocaleString("en-IN")} across ${projectsToAnalyze.filter(p => p.pendingAmount > 0).length} project${projectsToAnalyze.filter(p => p.pendingAmount > 0).length > 1 ? "s" : ""}` : null,
        projectsToAnalyze.filter(p => p.status === "Blocked").length > 0 ? `🚫 Blocked Projects: ${projectsToAnalyze.filter(p => p.status === "Blocked").length} project${projectsToAnalyze.filter(p => p.status === "Blocked").length > 1 ? "s are" : " is"} blocked` : null,
        projectsToAnalyze.filter(p => p.taskCompletionRate < 50).length > 0 ? `✅ Low Task Completion: ${projectsToAnalyze.filter(p => p.taskCompletionRate < 50).length} project${projectsToAnalyze.filter(p => p.taskCompletionRate < 50).length > 1 ? "s have" : " has"} less than 50% task completion` : null
      ].filter(Boolean),
      detailedData: projectStats
    };
  }, [allProjects, allInvoices, allPayments, allTasks, allProposals, dateRange, filterProject]);

  // 3. Finance Report
  const financeReport = useMemo(() => {
    const filteredInvoices = applyDateFilter(allInvoices, "issueDate");
    const filteredPayments = applyDateFilter(allPayments, "date");
    
    const totalInvoiced = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPending = totalInvoiced - totalPaid;
    
    const overdueInvoices = filteredInvoices.filter(inv => inv.status === "Overdue");
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + getInvoicePending(inv), 0);
    
    const paidInvoices = filteredInvoices.filter(inv => inv.status === "Paid");
    const partiallyPaidInvoices = filteredInvoices.filter(inv => inv.status === "Partially Paid");
    const draftInvoices = filteredInvoices.filter(inv => inv.status === "Draft");
    
    const revenueByMonth = {};
    filteredPayments.forEach(payment => {
      const month = payment.date ? payment.date.slice(0, 7) : "Unknown";
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (Number(payment.amount) || 0);
    });
    
    const paymentMethods = {};
    filteredPayments.forEach(payment => {
      const method = payment.method || "Unknown";
      paymentMethods[method] = (paymentMethods[method] || 0) + (Number(payment.amount) || 0);
    });
    
    return {
      title: "Finance Report",
      summary: [
        { label: "Total Invoiced", value: `₹${totalInvoiced.toLocaleString("en-IN")}`, color: "var(--accent)" },
        { label: "Total Collected", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "var(--success)" },
        { label: "Pending Revenue", value: `₹${totalPending.toLocaleString("en-IN")}`, color: totalPending > 0 ? "var(--warning)" : "var(--success)" },
        { label: "Overdue Amount", value: `₹${totalOverdue.toLocaleString("en-IN")}`, color: totalOverdue > 0 ? "#DC2626" : "#374151" },
        { label: "Paid Invoices", value: paidInvoices.length, color: "var(--success)" },
        { label: "Partially Paid", value: partiallyPaidInvoices.length, color: "var(--warning)" },
        { label: "Draft Invoices", value: draftInvoices.length, color: "var(--text-muted)" }
      ],
      insights: [
        totalOverdue > 0 ? `⚠️ Overdue Alert: ₹${totalOverdue.toLocaleString("en-IN")} across ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} is overdue.` : null,
        totalPending > 0 ? `📊 Cash Flow: ₹${totalPending.toLocaleString("en-IN")} pending collection from ${filteredInvoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").length} active invoices.` : null,
        draftInvoices.length > 0 ? `📝 Draft Invoices: ${draftInvoices.length} invoice${draftInvoices.length > 1 ? "s are" : " is"} in draft status and need finalization.` : null,
        Object.keys(revenueByMonth).length > 0 ? `📈 Monthly Revenue: ${Object.entries(revenueByMonth).map(([month, amt]) => `${month}: ₹${amt.toLocaleString("en-IN")}`).join(", ")}` : null
      ].filter(Boolean),
      detailedData: {
        invoices: filteredInvoices,
        payments: filteredPayments,
        revenueByMonth,
        paymentMethods,
        overdueInvoices,
        paidInvoices,
        partiallyPaidInvoices,
        draftInvoices
      }
    };
  }, [allInvoices, allPayments, dateRange, getInvoicePaid]);

  // 4. Invoice Report
  const invoiceReport = useMemo(() => {
    const filteredInvoices = applyDateFilter(allInvoices, "issueDate");
    const statusFilter = filterStatus !== "All" ? filterStatus : null;
    
    const invoicesToAnalyze = statusFilter
      ? filteredInvoices.filter(inv => inv.status === statusFilter)
      : filteredInvoices;
    
    const invoiceStats = invoicesToAnalyze.map(invoice => {
      const paid = getInvoicePaid[invoice.id] || 0;
      const pending = getInvoicePending(invoice);
      
      return {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        projectName: invoice.projectName,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        grandTotal: Number(invoice.grandTotal) || 0,
        paid,
        pending,
        currency: invoice.currency || "INR",
        daysOverdue: invoice.dueDate && invoice.status === "Overdue" 
          ? calculateDaysBetween(new Date(invoice.dueDate), new Date())
          : 0
      };
    });
    
    const totalInvoiced = invoiceStats.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = invoiceStats.reduce((sum, inv) => sum + inv.paid, 0);
    const totalPending = invoiceStats.reduce((sum, inv) => sum + inv.pending, 0);
    
    const overdueInvoices = invoiceStats.filter(inv => inv.status === "Overdue");
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.pending, 0);
    
    return {
      title: "Invoice Report",
      summary: [
        { label: "Total Invoices", value: invoicesToAnalyze.length, color: "var(--accent)" },
        { label: "Total Amount", value: `₹${totalInvoiced.toLocaleString("en-IN")}`, color: "var(--accent)" },
        { label: "Collected", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "var(--success)" },
        { label: "Pending", value: `₹${totalPending.toLocaleString("en-IN")}`, color: totalPending > 0 ? "var(--warning)" : "var(--success)" },
        { label: "Overdue", value: overdueInvoices.length, color: totalOverdue > 0 ? "#DC2626" : "#374151" },
        { label: "Avg. Collection", value: `₹${invoicesToAnalyze.length > 0 ? Math.round(totalPaid / invoicesToAnalyze.length) : 0}`, color: "var(--info)" },
        { label: "Collection Rate", value: `${totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%`, color: totalPaid / totalInvoiced >= 0.8 ? "var(--success)" : "var(--warning)" }
      ],
      insights: [
        statusFilter ? `🧾 Filtered by status: ${statusFilter}` : `🧾 Analyzing all ${filteredInvoices.length} invoices`,
        totalOverdue > 0 ? `⏰ Overdue Alert: ₹${totalOverdue.toLocaleString("en-IN")} across ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? "s" : ""} is overdue.` : null,
        invoiceStats.filter(inv => inv.pending > 0).length > 0 ? `💰 Pending Collection: ₹${totalPending.toLocaleString("en-IN")} pending from ${invoiceStats.filter(inv => inv.pending > 0).length} invoice${invoiceStats.filter(inv => inv.pending > 0).length > 1 ? "s" : ""}` : null,
        invoiceStats.filter(inv => inv.status === "Draft").length > 0 ? `📝 Draft Invoices: ${invoiceStats.filter(inv => inv.status === "Draft").length} invoice${invoiceStats.filter(inv => inv.status === "Draft").length > 1 ? "s are" : " is"} in draft status` : null
      ].filter(Boolean),
      detailedData: invoiceStats
    };
  }, [allInvoices, dateRange, filterStatus, getInvoicePaid, getInvoicePending]);

  // 5. Payment Report
  const paymentReport = useMemo(() => {
    const filteredPayments = applyDateFilter(allPayments, "date");
    
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const paymentsByMethod = {};
    filteredPayments.forEach(payment => {
      const method = payment.method || "Unknown";
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + (Number(payment.amount) || 0);
    });
    
    const paymentsByMonth = {};
    filteredPayments.forEach(payment => {
      const month = payment.date ? payment.date.slice(0, 7) : "Unknown";
      paymentsByMonth[month] = (paymentsByMonth[month] || 0) + (Number(payment.amount) || 0);
    });
    
    const recentPayments = filteredPayments
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    
    return {
      title: "Payment Report",
      summary: [
        { label: "Total Payments", value: filteredPayments.length, color: "var(--accent)" },
        { label: "Total Amount", value: `₹${totalAmount.toLocaleString("en-IN")}`, color: "var(--success)" },
        { label: "Avg. Payment", value: `₹${filteredPayments.length > 0 ? Math.round(totalAmount / filteredPayments.length) : 0}`, color: "var(--accent)" },
        { label: "This Month", value: `₹${Object.entries(paymentsByMonth).slice(-1)[0]?.[1]?.toLocaleString("en-IN") || "0"}`, color: "var(--info)" },
        { label: "Payment Methods", value: Object.keys(paymentsByMethod).length, color: "var(--purple)" },
        { label: "Top Method", value: Object.entries(paymentsByMethod).sort((a, b) => b[1] - a[1])[0]?.[0] || "—", color: "var(--warning)" },
        { label: "Recent Activity", value: recentPayments.length, color: "var(--text)" }
      ],
      insights: [
        `💳 Payment Analysis: Collected ₹${totalAmount.toLocaleString("en-IN")} across ${filteredPayments.length} payment${filteredPayments.length > 1 ? "s" : ""}`,
        Object.keys(paymentsByMethod).length > 0 ? `📊 Payment Methods: ${Object.entries(paymentsByMethod).map(([method, amt]) => `${method}: ₹${amt.toLocaleString("en-IN")}`).join(", ")}` : null,
        Object.keys(paymentsByMonth).length > 0 ? `📈 Monthly Trends: ${Object.entries(paymentsByMonth).map(([month, amt]) => `${month}: ₹${amt.toLocaleString("en-IN")}`).join(", ")}` : null,
        recentPayments.length > 0 ? `🔄 Recent Activity: ${recentPayments.length} payment${recentPayments.length > 1 ? "s" : ""} recorded in the last period` : null
      ].filter(Boolean),
      detailedData: {
        payments: filteredPayments,
        paymentsByMethod,
        paymentsByMonth,
        recentPayments
      }
    };
  }, [allPayments, dateRange]);

  // 6. Lead Pipeline Report
  const leadPipelineReport = useMemo(() => {
    const filteredLeads = applyDateFilter(allLeads, "createdAt");
    
    const leadsByStage = {};
    LEAD_STAGES.forEach(stage => {
      leadsByStage[stage] = filteredLeads.filter(l => l.stage === stage).length;
    });
    
    const wonLeads = leadsByStage["Won"] || 0;
    const lostLeads = leadsByStage["Lost"] || 0;
    const activeLeads = filteredLeads.length - wonLeads - lostLeads;
    const conversionRate = filteredLeads.length > 0 ? Math.round((wonLeads / filteredLeads.length) * 100) : 0;
    
    const pipelineValue = filteredLeads
      .filter(l => !["Won", "Lost"].includes(l.stage))
      .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    
    const recentLeads = filteredLeads
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);
    
    return {
      title: "Lead Pipeline Report",
      summary: [
        { label: "Total Leads", value: filteredLeads.length, color: "var(--accent)" },
        { label: "Active Leads", value: activeLeads, color: "var(--accent)" },
        { label: "Won Leads", value: wonLeads, color: "var(--success)" },
        { label: "Lost Leads", value: lostLeads, color: "var(--danger)" },
        { label: "Conversion Rate", value: `${conversionRate}%`, color: conversionRate >= 30 ? "var(--success)" : "var(--warning)" },
        { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString("en-IN")}`, color: "var(--info)" },
        { label: "Avg. Lead Value", value: `₹${filteredLeads.length > 0 ? Math.round(pipelineValue / filteredLeads.length) : 0}`, color: "var(--purple)" }
      ],
      insights: [
        `🎯 Lead Pipeline: ${filteredLeads.length} lead${filteredLeads.length > 1 ? "s" : ""} in the system with ₹${pipelineValue.toLocaleString("en-IN")} potential value`,
        conversionRate > 0 ? `✅ Conversion Performance: ${conversionRate}% win rate with ${wonLeads} lead${wonLeads > 1 ? "s" : ""} won` : null,
        activeLeads > 0 ? `📊 Active Pipeline: ${activeLeads} active lead${activeLeads > 1 ? "s" : ""} requiring follow-up` : null,
        recentLeads.length > 0 ? `🔄 Recent Leads: ${recentLeads.length} new lead${recentLeads.length > 1 ? "s" : ""} added in the last period` : null
      ].filter(Boolean),
      detailedData: {
        leads: filteredLeads,
        leadsByStage,
        recentLeads,
        pipelineValue
      }
    };
  }, [allLeads, dateRange]);

  // 7. Task Productivity Report
  const taskProductivityReport = useMemo(() => {
    const filteredTasks = applyDateFilter(allTasks, "createdAt");
    
    const tasksByStatus = {};
    TASK_STATUSES.forEach(status => {
      tasksByStatus[status] = filteredTasks.filter(t => t.status === status).length;
    });
    
    const completedTasks = tasksByStatus["Done"] || 0;
    const totalTasks = filteredTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const overdueTasks = filteredTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && !["Done", "Cancelled"].includes(t.status)
    ).length;
    
    const blockedTasks = tasksByStatus["Blocked"] || 0;
    
    const tasksByProject = {};
    filteredTasks.forEach(task => {
      const project = task.projectId || "Unassigned";
      tasksByProject[project] = (tasksByProject[project] || 0) + 1;
    });
    
    return {
      title: "Task Productivity Report",
      summary: [
        { label: "Total Tasks", value: totalTasks, color: "var(--accent)" },
        { label: "Completed", value: completedTasks, color: "var(--success)" },
        { label: "Completion Rate", value: `${completionRate}%`, color: completionRate >= 70 ? "var(--success)" : "var(--warning)" },
        { label: "Overdue", value: overdueTasks, color: overdueTasks > 0 ? "#DC2626" : "#374151" },
        { label: "Blocked", value: blockedTasks, color: blockedTasks > 0 ? "var(--danger)" : "#374151" },
        { label: "Active", value: tasksByStatus["Active"] || 0, color: "var(--accent)" },
        { label: "Projects", value: Object.keys(tasksByProject).length, color: "var(--info)" }
      ],
      insights: [
        `✅ Task Productivity: ${completedTasks} of ${totalTasks} tasks completed (${completionRate}% completion rate)`,
        overdueTasks > 0 ? `⏰ Overdue Alert: ${overdueTasks} task${overdueTasks > 1 ? "s are" : " is"} overdue and requires immediate action` : null,
        blockedTasks > 0 ? `🚫 Blocked Tasks: ${blockedTasks} task${blockedTasks > 1 ? "s are" : " is"} blocked and needs resolution` : null,
        Object.keys(tasksByProject).length > 0 ? `📁 Task Distribution: ${Object.entries(tasksByProject).map(([project, count]) => `${project}: ${count}`).join(", ")}` : null
      ].filter(Boolean),
      detailedData: {
        tasks: filteredTasks,
        tasksByStatus,
        tasksByProject,
        overdueTasks,
        blockedTasks
      }
    };
  }, [allTasks, dateRange]);

  // 8. Roadmap Progress Report
  const roadmapProgressReport = useMemo(() => {
    const filteredRoadmap = applyDateFilter(allRoadmapItems, "createdAt");
    
    const roadmapByStatus = {};
    ROADMAP_STATUSES.forEach(status => {
      roadmapByStatus[status] = filteredRoadmap.filter(i => i.status === status).length;
    });
    
    const completedItems = roadmapByStatus["Done"] || 0;
    const totalItems = filteredRoadmap.length;
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    const blockedItems = roadmapByStatus["Blocked"] || 0;
    
    const roadmapByProject = {};
    filteredRoadmap.forEach(item => {
      const project = item.project || "Unassigned";
      roadmapByProject[project] = (roadmapByProject[project] || 0) + 1;
    });
    
    const projectProgress = Object.entries(roadmapByProject).map(([project, total]) => {
      const completed = filteredRoadmap.filter(i => i.project === project && i.status === "Done").length;
      const blocked = filteredRoadmap.filter(i => i.project === project && i.status === "Blocked").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        project,
        total,
        completed,
        blocked,
        completionRate
      };
    });
    
    return {
      title: "Roadmap Progress Report",
      summary: [
        { label: "Total Items", value: totalItems, color: "var(--accent)" },
        { label: "Completed", value: completedItems, color: "var(--success)" },
        { label: "Completion Rate", value: `${completionRate}%`, color: completionRate >= 70 ? "var(--success)" : "var(--warning)" },
        { label: "Blocked", value: blockedItems, color: blockedItems > 0 ? "var(--danger)" : "#374151" },
        { label: "In Progress", value: roadmapByStatus["In Progress"] || 0, color: "var(--accent)" },
        { label: "Planned", value: roadmapByStatus["Planned"] || 0, color: "var(--info)" },
        { label: "Projects", value: Object.keys(roadmapByProject).length, color: "#8B5CF6" }
      ],
      insights: [
        `✅ Roadmap Progress: ${completedItems} of ${totalItems} items completed (${completionRate}% completion rate)`,
        blockedItems > 0 ? `🚫 Blocked Items: ${blockedItems} roadmap item${blockedItems > 1 ? "s are" : " is"} blocked and requires attention` : null,
        Object.keys(roadmapByProject).length > 0 ? `📁 Project Distribution: ${Object.entries(roadmapByProject).map(([project, count]) => `${project}: ${count}`).join(", ")}` : null,
        projectProgress.length > 0 ? `📊 Project Progress: ${projectProgress.map(p => `${p.project}: ${p.completionRate}%`).join(", ")}` : null
      ].filter(Boolean),
      detailedData: {
        roadmapItems: filteredRoadmap,
        roadmapByStatus,
        roadmapByProject,
        projectProgress,
        blockedItems
      }
    };
  }, [allRoadmapItems, dateRange]);

  // 9. Support Ticket Report
  const supportTicketReport = useMemo(() => {
    const filteredTickets = applyDateFilter(allSupportTickets, "createdAt");
    
    const ticketsByStatus = {};
    TICKET_STATUSES.forEach(status => {
      ticketsByStatus[status] = filteredTickets.filter(t => t.status === status).length;
    });
    
    const ticketsByPriority = {};
    TICKET_PRIORITIES.forEach(priority => {
      ticketsByPriority[priority] = filteredTickets.filter(t => t.priority === priority).length;
    });
    
    const openTickets = ticketsByStatus["Open"] || 0;
    const closedTickets = ticketsByStatus["Closed"] || 0;
    const totalTickets = filteredTickets.length;
    const resolutionRate = totalTickets > 0 ? Math.round((closedTickets / totalTickets) * 100) : 0;
    
    const highPriorityTickets = ticketsByPriority["High"] || 0;
    const avgResponseTime = filteredTickets.length > 0 
      ? Math.round(filteredTickets.reduce((sum, t) => sum + (t.responseTime || 0), 0) / filteredTickets.length)
      : 0;
    
    return {
      title: "Support Ticket Report",
      summary: [
        { label: "Total Tickets", value: totalTickets, color: "var(--accent)" },
        { label: "Open", value: openTickets, color: "var(--warning)" },
        { label: "Closed", value: closedTickets, color: "var(--success)" },
        { label: "Resolution Rate", value: `${resolutionRate}%`, color: resolutionRate >= 80 ? "var(--success)" : "var(--warning)" },
        { label: "High Priority", value: highPriorityTickets, color: highPriorityTickets > 0 ? "#DC2626" : "#374151" },
        { label: "Avg Response Time", value: `${avgResponseTime}h`, color: avgResponseTime > 24 ? "var(--danger)" : "var(--info)" },
        { label: "Medium Priority", value: ticketsByPriority["Medium"] || 0, color: "var(--accent)" }
      ],
      insights: [
        `🆘 Support Performance: ${closedTickets} of ${totalTickets} tickets resolved (${resolutionRate}% resolution rate)`,
        openTickets > 0 ? `⚠️ Open Tickets: ${openTickets} ticket${openTickets > 1 ? "s are" : " is"} currently open and requires attention` : null,
        highPriorityTickets > 0 ? `🚨 High Priority Alert: ${highPriorityTickets} high-priority ticket${highPriorityTickets > 1 ? "s require" : " requires"} immediate action` : null,
        avgResponseTime > 24 ? `⏱️ Response Time: Average response time of ${avgResponseTime}h exceeds target (aim for <24h)` : null
      ].filter(Boolean),
      detailedData: {
        tickets: filteredTickets,
        ticketsByStatus,
        ticketsByPriority,
        openTickets,
        highPriorityTickets,
        avgResponseTime
      }
    };
  }, [allSupportTickets, dateRange]);

  // 10. Prompt History Report
  const promptHistoryReport = useMemo(() => {
    const filteredPrompts = applyDateFilter(allPromptHistory, "timestamp");
    
    const promptsByStatus = {};
    PROMPT_STATUSES.forEach(status => {
      promptsByStatus[status] = filteredPrompts.filter(p => p.status === status).length;
    });
    
    const successfulPrompts = promptsByStatus["Success"] || 0;
    const failedPrompts = promptsByStatus["Failed"] || 0;
    const totalPrompts = filteredPrompts.length;
    const successRate = totalPrompts > 0 ? Math.round((successfulPrompts / totalPrompts) * 100) : 0;
    
    const avgTokens = filteredPrompts.length > 0
      ? Math.round(filteredPrompts.reduce((sum, p) => sum + (p.tokensUsed || 0), 0) / filteredPrompts.length)
      : 0;
    
    const promptsByModule = {};
    filteredPrompts.forEach(prompt => {
      const module = prompt.module || "General";
      promptsByModule[module] = (promptsByModule[module] || 0) + 1;
    });
    
    return {
      title: "Prompt History Report",
      summary: [
        { label: "Total Prompts", value: totalPrompts, color: "var(--accent)" },
        { label: "Successful", value: successfulPrompts, color: "var(--success)" },
        { label: "Success Rate", value: `${successRate}%`, color: successRate >= 90 ? "var(--success)" : "var(--warning)" },
        { label: "Failed", value: failedPrompts, color: failedPrompts > 0 ? "var(--danger)" : "#374151" },
        { label: "Avg Tokens", value: avgTokens, color: avgTokens > 1000 ? "var(--warning)" : "var(--info)" },
        { label: "Modules", value: Object.keys(promptsByModule).length, color: "var(--accent)" },
        { label: "Pending", value: promptsByStatus["Pending"] || 0, color: "var(--warning)" }
      ],
      insights: [
        `🤖 AI Usage: ${successfulPrompts} of ${totalPrompts} prompts successful (${successRate}% success rate)`,
        failedPrompts > 0 ? `❌ Failed Prompts: ${failedPrompts} prompt${failedPrompts > 1 ? "s have" : " has"} failed and may need review` : null,
        avgTokens > 1000 ? `💰 Token Usage: Average ${avgTokens} tokens per prompt (consider optimizing for cost efficiency)` : null,
        Object.keys(promptsByModule).length > 0 ? `📦 Module Distribution: ${Object.entries(promptsByModule).map(([module, count]) => `${module}: ${count}`).join(", ")}` : null
      ].filter(Boolean),
      detailedData: {
        prompts: filteredPrompts,
        promptsByStatus,
        promptsByModule,
        successRate,
        avgTokens
      }
    };
  }, [allPromptHistory, dateRange]);

  // 11. Project Logs Report
  const projectLogsReport = useMemo(() => {
    const filteredLogs = applyDateFilter(allProjectLogs, "timestamp");
    
    const logsByProject = {};
    filteredLogs.forEach(log => {
      const project = log.projectId || "Unassigned";
      logsByProject[project] = (logsByProject[project] || 0) + 1;
    });
    
    const logsByType = {};
    filteredLogs.forEach(log => {
      const type = log.type || "General";
      logsByType[type] = (logsByType[type] || 0) + 1;
    });
    
    const totalLogs = filteredLogs.length;
    const avgLogsPerProject = Object.keys(logsByProject).length > 0
      ? Math.round(totalLogs / Object.keys(logsByProject).length)
      : 0;
    
    const recentActivity = filteredLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    return {
      title: "Project Logs Report",
      summary: [
        { label: "Total Logs", value: totalLogs, color: "var(--accent)" },
        { label: "Projects", value: Object.keys(logsByProject).length, color: "var(--info)" },
        { label: "Avg Logs/Project", value: avgLogsPerProject, color: avgLogsPerProject > 10 ? "var(--accent)" : "var(--success)" },
        { label: "Activity Types", value: Object.keys(logsByType).length, color: "#8B5CF6" },
        { label: "Recent Activity", value: recentActivity.length, color: "var(--warning)" },
        { label: "General Logs", value: logsByType["General"] || 0, color: "#6B7280" },
        { label: "Update Logs", value: logsByType["Update"] || 0, color: "var(--accent)" }
      ],
      insights: [
        `📝 Activity Tracking: ${totalLogs} project logs recorded across ${Object.keys(logsByProject).length} projects`,
        avgLogsPerProject > 10 ? `📊 High Activity: Average ${avgLogsPerProject} logs per project indicates active project management` : null,
        Object.keys(logsByType).length > 0 ? `🔍 Activity Types: ${Object.entries(logsByType).map(([type, count]) => `${type}: ${count}`).join(", ")}` : null,
        recentActivity.length > 0 ? `🕒 Recent Updates: ${recentActivity.length} recent activities logged in the selected period` : null
      ].filter(Boolean),
      detailedData: {
        logs: filteredLogs,
        logsByProject,
        logsByType,
        recentActivity,
        avgLogsPerProject
      }
    };
  }, [allProjectLogs, dateRange]);

  // 12. Follow-Up Report
  const followUpReport = useMemo(() => {
    const filteredFollowUps = applyDateFilter(allFollowUps, "createdAt");
    
    const followUpsByStatus = {};
    filteredFollowUps.forEach(fu => {
      const status = fu.status || "Pending";
      followUpsByStatus[status] = (followUpsByStatus[status] || 0) + 1;
    });
    
    const pendingFollowUps = followUpsByStatus["Pending"] || 0;
    const completedFollowUps = followUpsByStatus["Completed"] || 0;
    const totalFollowUps = filteredFollowUps.length;
    const completionRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;
    
    const overdueFollowUps = filteredFollowUps.filter(fu => 
      fu.dueDate && new Date(fu.dueDate) < new Date() && fu.status !== "Completed"
    ).length;
    
    const followUpsByContact = {};
    filteredFollowUps.forEach(fu => {
      const contact = fu.contactName || "Unknown";
      followUpsByContact[contact] = (followUpsByContact[contact] || 0) + 1;
    });
    
    const upcomingFollowUps = filteredFollowUps.filter(fu => 
      fu.dueDate && new Date(fu.dueDate) > new Date() && fu.status === "Pending"
    ).length;
    
    return {
      title: "Follow-Up Report",
      summary: [
        { label: "Total Follow-Ups", value: totalFollowUps, color: "var(--accent)" },
        { label: "Pending", value: pendingFollowUps, color: "var(--warning)" },
        { label: "Completed", value: completedFollowUps, color: "var(--success)" },
        { label: "Completion Rate", value: `${completionRate}%`, color: completionRate >= 80 ? "var(--success)" : "var(--warning)" },
        { label: "Overdue", value: overdueFollowUps, color: overdueFollowUps > 0 ? "#DC2626" : "#374151" },
        { label: "Upcoming", value: upcomingFollowUps, color: "var(--info)" },
        { label: "Contacts", value: Object.keys(followUpsByContact).length, color: "var(--accent)" }
      ],
      insights: [
        `⏰ Follow-Up Management: ${completedFollowUps} of ${totalFollowUps} follow-ups completed (${completionRate}% completion rate)`,
        pendingFollowUps > 0 ? `📋 Pending Actions: ${pendingFollowUps} follow-up${pendingFollowUps > 1 ? "s are" : " is"} pending and requires attention` : null,
        overdueFollowUps > 0 ? `🚨 Overdue Alert: ${overdueFollowUps} follow-up${overdueFollowUps > 1 ? "s are" : " is"} overdue and needs immediate action` : null,
        upcomingFollowUps > 0 ? `📅 Upcoming: ${upcomingFollowUps} follow-up${upcomingFollowUps > 1 ? "s are" : " is"} scheduled for the future` : null
      ].filter(Boolean),
      detailedData: {
        followUps: filteredFollowUps,
        followUpsByStatus,
        followUpsByContact,
        pendingFollowUps,
        overdueFollowUps,
        upcomingFollowUps
      }
    };
  }, [allFollowUps, dateRange]);

  // 13. Client/Contact Report
  const clientContactReport = useMemo(() => {
    const filteredContacts = applyDateFilter(allContacts, "createdAt");
    
    const contactsByType = {};
    filteredContacts.forEach(contact => {
      const type = contact.type || "Client";
      contactsByType[type] = (contactsByType[type] || 0) + 1;
    });
    
    const totalContacts = filteredContacts.length;
    const activeClients = filteredContacts.filter(c => c.status === "Active").length;
    const inactiveClients = filteredContacts.filter(c => c.status === "Inactive").length;
    
    const contactsBySource = {};
    filteredContacts.forEach(contact => {
      const source = contact.source || "Direct";
      contactsBySource[source] = (contactsBySource[source] || 0) + 1;
    });
    
    const avgProjectsPerClient = activeClients > 0
      ? Math.round(allProjects.filter(p => p.clientId).length / activeClients)
      : 0;
    
    const topClients = filteredContacts
      .map(contact => {
        const clientProjects = allProjects.filter(p => p.clientId === contact.id);
        const clientInvoices = allInvoices.filter(i => i.contactId === contact.id);
        const totalRevenue = clientInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
        
        return {
          ...contact,
          projectCount: clientProjects.length,
          invoiceCount: clientInvoices.length,
          totalRevenue
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
    
    return {
      title: "Client/Contact Report",
      summary: [
        { label: "Total Contacts", value: totalContacts, color: "var(--accent)" },
        { label: "Active Clients", value: activeClients, color: "var(--success)" },
        { label: "Inactive Clients", value: inactiveClients, color: "#6B7280" },
        { label: "Client Types", value: Object.keys(contactsByType).length, color: "var(--info)" },
        { label: "Avg Projects/Client", value: avgProjectsPerClient, color: avgProjectsPerClient > 2 ? "var(--accent)" : "var(--warning)" },
        { label: "Lead Sources", value: Object.keys(contactsBySource).length, color: "#8B5CF6" },
        { label: "Top Clients", value: topClients.length, color: "var(--warning)" }
      ],
      insights: [
        `👥 Client Portfolio: ${totalContacts} total contacts with ${activeClients} active clients (${Math.round((activeClients/totalContacts)*100)}% active rate)`,
        avgProjectsPerClient > 2 ? `📈 Client Engagement: Average ${avgProjectsPerClient} projects per active client indicates strong relationships` : null,
        Object.keys(contactsBySource).length > 0 ? `📊 Lead Sources: ${Object.entries(contactsBySource).map(([source, count]) => `${source}: ${count}`).join(", ")}` : null,
        topClients.length > 0 ? `🏆 Top Clients: ${topClients.slice(0, 3).map(c => `${c.name}: $${c.totalRevenue}`).join(", ")}` : null
      ].filter(Boolean),
      detailedData: {
        contacts: filteredContacts,
        contactsByType,
        contactsBySource,
        activeClients,
        topClients,
        avgProjectsPerClient
      }
    };
  }, [allContacts, allProjects, allInvoices, dateRange]);

  // Get current report based on selection
  const currentReport = useMemo(() => {
    switch (selectedReport) {
      case "owner_summary": return ownerSummaryReport;
      case "project": return projectReport;
      case "finance": return financeReport;
      case "invoice": return invoiceReport;
      case "payment": return paymentReport;
      case "lead_pipeline": return leadPipelineReport;
      case "task_productivity": return taskProductivityReport;
      case "roadmap_progress": return roadmapProgressReport;
      case "support_ticket": return supportTicketReport;
      case "prompt_history": return promptHistoryReport;
      case "project_logs": return projectLogsReport;
      case "follow_up": return followUpReport;
      case "client_contact": return clientContactReport;
      default: return ownerSummaryReport;
    }
  }, [selectedReport, ownerSummaryReport, projectReport, financeReport, invoiceReport, 
      paymentReport, leadPipelineReport, taskProductivityReport, roadmapProgressReport,
      supportTicketReport, promptHistoryReport, projectLogsReport, followUpReport, 
      clientContactReport]);

  // Export report to CSV
  const exportReportCSV = () => {
    if (!currentReport) return;
    
    const data = currentReport.detailedData?.data || currentReport.detailedData;
    const filename = `${currentReport.title.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.csv`;
    
    exportToCSV(data, filename);
    addAudit(`Exported ${currentReport.title} to CSV`, "export");
    toast("Report exported to CSV", "success");
  };

  // Print report
  const printReport = () => {
    if (!currentReport) return;
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          ${currentReport.title}
        </h1>
        
        <div style="margin: 20px 0; color: #666; font-size: 14px;">
          Generated: ${new Date().toLocaleDateString()} | 
          Date Range: ${dateRange.start ? fmtDate(dateRange.start) : "All"} - ${dateRange.end ? fmtDate(dateRange.end) : "All"}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 25px 0;">
          ${currentReport.summary.map(stat => `
            <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 12px; color: #6B7280; margin-bottom: 5px;">${stat.label}</div>
              <div style="font-size: 24px; font-weight: bold; color: ${stat.color};">${stat.value}</div>
            </div>
          `).join('')}
        </div>
        
        ${currentReport.insights && currentReport.insights.length > 0 ? `
          <div style="margin: 30px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Key Insights</h3>
            <ul style="color: #4B5563; line-height: 1.6;">
              ${currentReport.insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px;">
          Founder OS CRM | Professional Business Intelligence
        </div>
      </div>
    `;
    
    openPrintView("generic", printContent, { title: currentReport.title });
    addAudit(`Printed ${currentReport.title}`, "print");
  };

  // Handle report selection
  const handleReportSelect = (reportId) => {
    setSelectedReport(reportId);
    addAudit(`Selected ${REPORT_TYPES.find(r => r.id === reportId)?.label || reportId}`, "view");
  };

  // Render UI
  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>Business Intelligence Reports</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={exportReportCSV} style={{ ...btnStyle, backgroundColor: "var(--success)" }}>
            📊 Export CSV
          </button>
          <button onClick={printReport} style={{ ...btnStyle, backgroundColor: "var(--accent)" }}>
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <SectionCard title="Select Report Type" style={{ marginBottom: 25 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {REPORT_TYPES.map(report => (
            <button
              key={report.id}
              onClick={() => handleReportSelect(report.id)}
              style={{
                ...btnStyle,
                backgroundColor: selectedReport === report.id ? "var(--accent)" : "var(--bg-secondary)",
                color: selectedReport === report.id ? "white" : "var(--text)",
                border: selectedReport === report.id ? "none" : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                fontSize: 14
              }}
            >
              <span style={{ fontSize: 16 }}>{report.icon}</span>
              {report.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Filters */}
      <SectionCard title="Report Filters" style={{ marginBottom: 25 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 15 }}>
          <FormField label="Date Range Start">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Date Range End">
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              style={inputStyle}
            />
          </FormField>
          <FormField label="Filter by Project">
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={inputStyle}>
              <option value="All">All Projects</option>
              {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Filter by Client">
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={inputStyle}>
              <option value="All">All Clients</option>
              {allContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
        </div>
      </SectionCard>

      {/* Report Summary */}
      {currentReport && (
        <SectionCard title={currentReport.title} style={{ marginBottom: 25 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15, marginBottom: 25 }}>
            {currentReport.summary.map((stat, idx) => (
              <StatMini
                key={idx}
                label={stat.label}
                value={stat.value}
                color={stat.color}
                style={{ textAlign: "center" }}
              />
            ))}
          </div>

          {/* Insights */}
          {currentReport.insights && currentReport.insights.length > 0 && (
            <div style={{ backgroundColor: "var(--bg-secondary)", borderRadius: 8, padding: 20, marginBottom: 25 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 15 }}>Key Insights</h3>
              <ul style={{ color: "var(--text-muted)", lineHeight: 1.6, paddingLeft: 20 }}>
                {currentReport.insights.map((insight, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Data Preview */}
          {currentReport.detailedData && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 15 }}>Detailed Data</h3>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {Object.keys(currentReport.detailedData).length} data points available
                {currentReport.detailedData.data && ` (${currentReport.detailedData.data.length} records)`}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && currentReportData && (
        <Modal
          title="Print Preview"
          onClose={() => setShowPrintPreview(false)}
          size="lg"
        >
          <div style={{ padding: 20 }}>
            <div dangerouslySetInnerHTML={{ __html: currentReportData }} />
          </div>
        </Modal>
      )}
    </div>
  );
}