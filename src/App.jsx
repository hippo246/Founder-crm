import { useState, useEffect, useCallback } from "react";
import { ToastContainer, toast, btnStyle } from "./components/ui/UI.jsx";
import LoginScreen from "./components/auth/LoginScreen.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";
import MobileNav from "./components/layout/MobileNav.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import SearchModal from "./components/shared/SearchModal.jsx";
import CommandPalette from "./components/shared/CommandPalette.jsx";
import { loadLS, saveLS, loadWorkspaces, saveWorkspaces, loadCurrentWorkspaceId, saveCurrentWorkspaceId, loadWorkspaceData, saveWorkspaceData, deleteWorkspaceData } from "./lib/storage.js";
import { makeAddAudit } from "./lib/audit.js";
import { setGlobalDateFormat } from "./lib/helpers.js";
import { initSessionLock, unlockSession } from "./lib/sessionLock.js";
import { restoreSession, logout, saveActiveTab, getActiveTab, getCurrentUser } from "./lib/auth.js";
import { defaultSettings } from "./config/crmConfig.js";
import { hydrateFromFirestore, subscribeToCollection } from "./lib/sync.js";
import SharePage from "./tabs/SharePage.jsx";


// ─── Tab components ───────────────────────────────────────────────────────────
import DashboardTab        from "./tabs/Dashboard/index.jsx";
import ContactsTab         from "./tabs/Contacts/index.jsx";
import LeadsTab            from "./tabs/LeadsTab.jsx";
import ProjectsTab         from "./tabs/Projects/index.jsx";
import TasksTab            from "./tabs/Tasks/index.jsx";
import FollowUpsTab        from "./tabs/FollowUpsTab.jsx";
import NotesTab            from "./tabs/NotesTab.jsx";
import DocumentsTab        from "./tabs/DocumentsTab.jsx";
import CalendarTab         from "./tabs/CalendarTab.jsx";
import CommunicationLogTab from "./tabs/CommunicationLogTab.jsx";
import InvoicesTab         from "./tabs/InvoicesTab.jsx";
import PaymentsTab         from "./tabs/PaymentsTab.jsx";
import ProposalsTab        from "./tabs/ProposalsTab.jsx";
import SupportTicketsTab   from "./tabs/SupportTicketsTab.jsx";
import AnalyticsTab        from "./tabs/AnalyticsTab.jsx";
import AuditLogsTab        from "./tabs/AuditLogsTab.jsx";
import SecurityTab         from "./tabs/SecurityTab.jsx";
import SettingsTab         from "./tabs/Settings/index.jsx";
import WhatsAppTemplatesTab from "./tabs/WhatsAppTemplatesTab.jsx";
import PromptHistoryTab    from "./tabs/PromptHistoryTab.jsx";
import ProjectLogsTab      from "./tabs/ProjectLogsTab.jsx";
import RoadmapTrackerTab   from "./tabs/RoadmapTrackerTab.jsx";
import DemoUnitsTab        from "./tabs/DemoUnitsTab.jsx";

export default function App() {
  // ── Workspace state ───────────────────────────────────────────────────────────
  const [workspaces, setWorkspaces] = useState(() => loadWorkspaces());
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() => loadCurrentWorkspaceId());
  
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0];

  // ── Login workspace pre-selection ────────────────────────────────────────────
  const [loginWorkspaceId, setLoginWorkspaceId] = useState(() => loadCurrentWorkspaceId() || workspaces[0]?.id || null);

  // ── Set global date format from workspace ─────────────────────────────────────
  useEffect(() => {
    if (currentWorkspace?.dateFormat) {
      setGlobalDateFormat(currentWorkspace.dateFormat);
    }
  }, [currentWorkspaceId, currentWorkspace]);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [settings, setSettings]             = useState(() => loadLS("settings", defaultSettings));
  const [contacts, setContacts]             = useState(() => loadWorkspaceData("contacts", [], currentWorkspaceId));
  const [leads, setLeads]                   = useState(() => loadWorkspaceData("leads", [], currentWorkspaceId));
  const [projects, setProjects]             = useState(() => loadWorkspaceData("projects", [], currentWorkspaceId));
  const [tasks, setTasks]                   = useState(() => loadWorkspaceData("tasks", [], currentWorkspaceId));
  const [audit, setAudit]                   = useState(() => loadWorkspaceData("audit", [], currentWorkspaceId));

  // ── Module state ────────────────────────────────────────────────────────────
  const [followUps, setFollowUps]           = useState(() => loadWorkspaceData("followUps", [], currentWorkspaceId));
  const [notes, setNotes]                   = useState(() => loadWorkspaceData("notes", [], currentWorkspaceId));
  const [documents, setDocuments]           = useState(() => loadWorkspaceData("documents", [], currentWorkspaceId));
  const [invoices, setInvoices]             = useState(() => loadWorkspaceData("invoices", [], currentWorkspaceId));
  const [payments, setPayments]             = useState(() => loadWorkspaceData("payments", [], currentWorkspaceId));
  const [proposals, setProposals]           = useState(() => loadWorkspaceData("proposals", [], currentWorkspaceId));
  const [communications, setCommunications] = useState(() => loadWorkspaceData("communications", [], currentWorkspaceId));
  const [calendarEvents, setCalendarEvents] = useState(() => loadWorkspaceData("calendarEvents", [], currentWorkspaceId));
  const [supportTickets, setSupportTickets] = useState(() => loadWorkspaceData("supportTickets", [], currentWorkspaceId));
  const [whatsappTemplates, setWhatsappTemplates] = useState(() => loadWorkspaceData("whatsappTemplates", [], currentWorkspaceId));
  const [emailTemplates, setEmailTemplates]       = useState(() => loadWorkspaceData("emailTemplates", [], currentWorkspaceId));
  const [promptHistory, setPromptHistory]   = useState(() => loadWorkspaceData("promptHistory", [], currentWorkspaceId));
  const [projectLogs, setProjectLogs]       = useState(() => loadWorkspaceData("projectLogs", [], currentWorkspaceId));
  const [roadmapItems, setRoadmapItems]     = useState(() => loadWorkspaceData("roadmapItems", [], currentWorkspaceId));
  const [demoUnits, setDemoUnits]           = useState(() => loadWorkspaceData("demoUnits", [], currentWorkspaceId));
  const [tags, setTags]                     = useState(() => loadWorkspaceData("tags", [], currentWorkspaceId));
  const [customFields, setCustomFields]     = useState(() => loadWorkspaceData("customFields", [], currentWorkspaceId));

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState(() => getActiveTab().tab);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { const v = localStorage.getItem("ui_sidebarOpen"); return v === null ? true : v === "true"; } catch { return true; }
  });
  const [globalSearch, setGlobalSearch] = useState(false);
  const [mobileMenu, setMobileMenu]   = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const session = restoreSession();
    return session !== null;
  });
  const [user, setUser] = useState(() => getCurrentUser());

  const isDark = settings.theme === "dark";
  const role   = settings.role;



  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    saveSettings({ ...settings, theme: newTheme });
  };

  // ── Session lock initialization ─────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = initSessionLock(settings.sessionTimeout || 30, () => {
      setSessionLocked(true);
    });
    return cleanup;
  }, [settings.sessionTimeout]);

  // ── Firebase Hydration: load all data from Firestore on login or workspace switch ──
  useEffect(() => {
    if (!isAuthenticated || !currentWorkspaceId) return;

    hydrateFromFirestore(currentWorkspaceId).then(data => {
      if (data.contacts?.length)      setContacts(data.contacts);
      if (data.leads?.length)         setLeads(data.leads);
      if (data.projects?.length)      setProjects(data.projects);
      if (data.tasks?.length)         setTasks(data.tasks);
      if (data.followUps?.length)     setFollowUps(data.followUps);
      if (data.notes?.length)         setNotes(data.notes);
      if (data.documents?.length)     setDocuments(data.documents);
      if (data.invoices?.length)      setInvoices(data.invoices);
      if (data.payments?.length)      setPayments(data.payments);
      if (data.proposals?.length)     setProposals(data.proposals);
      if (data.communications?.length) setCommunications(data.communications);
      if (data.calendarEvents?.length) setCalendarEvents(data.calendarEvents);
      if (data.supportTickets?.length) setSupportTickets(data.supportTickets);
      if (data.whatsappTemplates?.length) setWhatsappTemplates(data.whatsappTemplates);
      if (data.emailTemplates?.length) setEmailTemplates(data.emailTemplates);
      if (data.promptHistory?.length) setPromptHistory(data.promptHistory);
      if (data.projectLogs?.length)   setProjectLogs(data.projectLogs);
      if (data.roadmapItems?.length)  setRoadmapItems(data.roadmapItems);
      if (data.demoUnits?.length)     setDemoUnits(data.demoUnits);
      if (data.tags?.length)          setTags(data.tags);
      if (data.customFields?.length)  setCustomFields(data.customFields);
    }).catch(err => console.warn('[App] Firestore hydration error:', err));
  }, [isAuthenticated, currentWorkspaceId]);

  // ── Real-time Firestore listeners: keep state in sync across tabs/devices ────
  useEffect(() => {
    if (!isAuthenticated || !currentWorkspaceId) return;

    const unsubs = [
      subscribeToCollection(currentWorkspaceId, "contacts",       setContacts),
      subscribeToCollection(currentWorkspaceId, "leads",          setLeads),
      subscribeToCollection(currentWorkspaceId, "projects",       setProjects),
      subscribeToCollection(currentWorkspaceId, "tasks",          setTasks),
      subscribeToCollection(currentWorkspaceId, "followUps",      setFollowUps),
      subscribeToCollection(currentWorkspaceId, "notes",          setNotes),
      subscribeToCollection(currentWorkspaceId, "invoices",       setInvoices),
      subscribeToCollection(currentWorkspaceId, "payments",       setPayments),
      subscribeToCollection(currentWorkspaceId, "proposals",      setProposals),
      subscribeToCollection(currentWorkspaceId, "calendarEvents", setCalendarEvents),
      subscribeToCollection(currentWorkspaceId, "supportTickets", setSupportTickets),
    ];

    return () => unsubs.forEach(u => u());
  }, [isAuthenticated, currentWorkspaceId]);

  // ── Keyboard shortcuts (unified — avoids duplicate ⌘K listeners) ─────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setGlobalSearch(false);
        setMobileMenu(false);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Audit helper (defined early so handleLogin can call it) ──────────────────
  const addAudit = useCallback(makeAddAudit(role, setAudit, currentWorkspaceId), [role, setAudit, currentWorkspaceId]);

  // ── Login handler ─────────────────────────────────────────────────────────────
  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData.user);
    toast(`Welcome back, ${userData.user?.ownerName || userData.email || "User"}!`);
    addAudit("Auth", "Login", `User logged in via ${userData.method}`);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUser(null);
    addAudit("Auth", "Logout", "User logged out");
    toast("Logged out successfully");
  };

  // ── Tab change handler with persistence ───────────────────────────────────────
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    saveActiveTab(newTab);
  }, []);

  // ── Dashboard quick-create handlers ──────────────────────────────────────────
  const handleDashboardNavigate = useCallback((newTab) => handleTabChange(newTab), [handleTabChange]);
  const handleNewLead = () => { handleTabChange("leads"); toast("Opening Leads — add a new lead there."); };
  const handleNewTask = () => { handleTabChange("tasks"); toast("Opening Tasks — add a new task there."); };
  const handleNewInvoice = () => { handleTabChange("invoices"); toast("Opening Invoices — add a new invoice there."); };

  // ── Command palette commands ───────────────────────────────────────────────────
  const commands = [
    { id: "dashboard", label: "Go to Dashboard", icon: "📊", action: () => handleTabChange("dashboard"), keywords: ["home", "overview"] },
    { id: "contacts", label: "Go to Contacts", icon: "👥", action: () => handleTabChange("contacts"), keywords: ["people", "clients"] },
    { id: "leads", label: "Go to Leads", icon: "🎯", action: () => handleTabChange("leads"), keywords: ["prospects"] },
    { id: "projects", label: "Go to Projects", icon: "🗂️", action: () => handleTabChange("projects"), keywords: ["work"] },
    { id: "tasks", label: "Go to Tasks", icon: "✅", action: () => handleTabChange("tasks"), keywords: ["todo"] },
    { id: "invoices", label: "Go to Invoices", icon: "📄", action: () => handleTabChange("invoices"), keywords: ["billing"] },
    { id: "calendar", label: "Go to Calendar", icon: "📅", action: () => handleTabChange("calendar"), keywords: ["events", "schedule"] },
    { id: "security", label: "Go to Security", icon: "🔒", action: () => handleTabChange("security"), keywords: ["auth", "settings"] },
    { id: "settings", label: "Go to Settings", icon: "⚙️", action: () => handleTabChange("settings"), keywords: ["config", "preferences"] },
    { id: "search", label: "Global Search", icon: "🔍", action: () => setGlobalSearch(true), shortcut: "⌘K" },
    { id: "theme", label: "Toggle Dark Mode", icon: "🌙", action: toggleTheme, keywords: ["dark", "light", "theme"] },
    { id: "sidebar", label: "Toggle Sidebar", icon: "📱", action: () => { setSidebarOpen(v => { const next = !v; localStorage.setItem("ui_sidebarOpen", next); return next; }); }, keywords: ["menu", "navigation"] },
    { id: "logout", label: "Logout", icon: "🚪", action: handleLogout, keywords: ["sign out", "exit"] },
    ...workspaces.map(w => ({
      id: `workspace-${w.id}`,
      label: `Switch to ${w.name}`,
      icon: w.icon || "📁",
      action: () => switchWorkspace(w.id),
      keywords: ["workspace", "switch"]
    }))
  ];

  const handleUnlockSession = () => {
    unlockSession();
    setSessionLocked(false);
  };

  // ── Save settings ─────────────────────────────────────────────────────────────
  const saveSettings = (ns) => { setSettings(ns); saveLS("settings", ns); };

  // ── Workspace switching ───────────────────────────────────────────────────────
  const switchWorkspace = (workspaceId) => {
    setCurrentWorkspaceId(workspaceId);
    saveCurrentWorkspaceId(workspaceId);
    
    // Reload data for new workspace
    setContacts(loadWorkspaceData("contacts", [], workspaceId));
    setLeads(loadWorkspaceData("leads", [], workspaceId));
    setProjects(loadWorkspaceData("projects", [], workspaceId));
    setTasks(loadWorkspaceData("tasks", [], workspaceId));
    setFollowUps(loadWorkspaceData("followUps", [], workspaceId));
    setNotes(loadWorkspaceData("notes", [], workspaceId));
    setDocuments(loadWorkspaceData("documents", [], workspaceId));
    setInvoices(loadWorkspaceData("invoices", [], workspaceId));
    setPayments(loadWorkspaceData("payments", [], workspaceId));
    setProposals(loadWorkspaceData("proposals", [], workspaceId));
    setCommunications(loadWorkspaceData("communications", [], workspaceId));
    setCalendarEvents(loadWorkspaceData("calendarEvents", [], workspaceId));
    setSupportTickets(loadWorkspaceData("supportTickets", [], workspaceId));
    setWhatsappTemplates(loadWorkspaceData("whatsappTemplates", [], workspaceId));
    setEmailTemplates(loadWorkspaceData("emailTemplates", [], workspaceId));
    setPromptHistory(loadWorkspaceData("promptHistory", [], workspaceId));
    setProjectLogs(loadWorkspaceData("projectLogs", [], workspaceId));
    setRoadmapItems(loadWorkspaceData("roadmapItems", [], workspaceId));
    setDemoUnits(loadWorkspaceData("demoUnits", [], workspaceId));
    setTags(loadWorkspaceData("tags", [], workspaceId));
    setCustomFields(loadWorkspaceData("customFields", [], workspaceId));
    setAudit(loadWorkspaceData("audit", [], workspaceId));
    
    addAudit("Workspace", "Switch", `Switched to workspace: ${workspaces.find(w => w.id === workspaceId)?.name || 'workspace'}`);
    toast(`Switched to ${workspaces.find(w => w.id === workspaceId)?.name || 'workspace'}`);
  };

  // ── Workspace management ─────────────────────────────────────────────────────
  const addWorkspace = (workspace) => {
    const newWorkspace = { ...workspace, id: `workspace-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    const updated = [...workspaces, newWorkspace];
    setWorkspaces(updated);
    saveWorkspaces(updated);
    addAudit("Workspace", "Create", `Created workspace: ${newWorkspace.name}`);
    toast("Workspace created");
  };

  const updateWorkspace = (workspace) => {
    const updated = workspaces.map(w => w.id === workspace.id ? workspace : w);
    setWorkspaces(updated);
    saveWorkspaces(updated);
    addAudit("Workspace", "Update", `Updated workspace: ${workspace.name}`);
    toast("Workspace updated");
  };

  const deleteWorkspace = (workspaceId) => {
    if (workspaces.length <= 1) {
      toast("Cannot delete the last workspace", "error");
      return;
    }
    
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    // Delete workspace data
    deleteWorkspaceData(workspaceId);
    
    // Remove from list
    const updated = workspaces.filter(w => w.id !== workspaceId);
    setWorkspaces(updated);
    saveWorkspaces(updated);
    
    // Switch to first available workspace
    const newWorkspaceId = updated[0].id;
    setCurrentWorkspaceId(newWorkspaceId);
    saveCurrentWorkspaceId(newWorkspaceId);
    
    // Reload data
    switchWorkspace(newWorkspaceId);
    
    addAudit("Workspace", "Delete", `Deleted workspace: ${workspace.name}`);
    toast("Workspace deleted");
  };

  // ── Reset all workspace data ───────────────────────────────────────────────────
  const resetData = () => {
    setContacts([]);          saveWorkspaceData("contacts", [], currentWorkspaceId);
    setLeads([]);                saveWorkspaceData("leads", [], currentWorkspaceId);
    setProjects([]);          saveWorkspaceData("projects", [], currentWorkspaceId);
    setTasks([]);                saveWorkspaceData("tasks", [], currentWorkspaceId);
    setFollowUps([]);        saveWorkspaceData("followUps", [], currentWorkspaceId);
    setNotes([]);                saveWorkspaceData("notes", [], currentWorkspaceId);
    setDocuments([]);        saveWorkspaceData("documents", [], currentWorkspaceId);
    setInvoices([]);          saveWorkspaceData("invoices", [], currentWorkspaceId);
    setPayments([]);          saveWorkspaceData("payments", [], currentWorkspaceId);
    setProposals([]);        saveWorkspaceData("proposals", [], currentWorkspaceId);
    setCommunications([]); saveWorkspaceData("communications", [], currentWorkspaceId);
    setCalendarEvents([]); saveWorkspaceData("calendarEvents", [], currentWorkspaceId);
    setSupportTickets([]); saveWorkspaceData("supportTickets", [], currentWorkspaceId);
    setWhatsappTemplates([]); saveWorkspaceData("whatsappTemplates", [], currentWorkspaceId);
    setEmailTemplates([]);    saveWorkspaceData("emailTemplates", [], currentWorkspaceId);
    setPromptHistory([]);     saveWorkspaceData("promptHistory", [], currentWorkspaceId);
    setProjectLogs([]);      saveWorkspaceData("projectLogs", [], currentWorkspaceId);
    setRoadmapItems([]);    saveWorkspaceData("roadmapItems", [], currentWorkspaceId);
    setDemoUnits([]);        saveWorkspaceData("demoUnits", [], currentWorkspaceId);
    setTags([]);                    saveWorkspaceData("tags", [], currentWorkspaceId);
    setCustomFields([]);    saveWorkspaceData("customFields", [], currentWorkspaceId);
    setAudit([]);                saveWorkspaceData("audit", [], currentWorkspaceId);
    toast("Workspace data reset to starter records");
  };

  // ── Linked record save handler (Phase 7) ─────────────────────────────────────
  // Called by LinkedActionsButton / LinkedRecordModal when a linked record is saved
  const handleLinkedRecordSave = useCallback((targetModule, record) => {
    const ws = currentWorkspaceId;
    const r = { ...record, id: record.id || genId(), workspaceId: ws, createdAt: record.createdAt || new Date().toISOString().slice(0, 10) };
    const save = (key, setter, prev) => {
      const updated = [r, ...prev];
      setter(updated);
      saveWorkspaceData(key, updated, ws);
    };
    switch (targetModule) {
      case "lead":          save("leads", setLeads, leads); addAudit("Leads", "Create", `Linked lead: ${r.title || r.name}`); break;
      case "project":       save("projects", setProjects, projects); addAudit("Projects", "Create", `Linked project: ${r.name}`); break;
      case "task":          save("tasks", setTasks, tasks); addAudit("Tasks", "Create", `Linked task: ${r.title}`); break;
      case "followUp":      save("followUps", setFollowUps, followUps); addAudit("Follow-Ups", "Create", `Linked follow-up: ${r.person}`); break;
      case "note":          save("notes", setNotes, notes); addAudit("Notes", "Create", `Linked note: ${r.title}`); break;
      case "document":      save("documents", setDocuments, documents); addAudit("Documents", "Create", `Linked document: ${r.title || r.name}`); break;
      case "invoice":       save("invoices", setInvoices, invoices); addAudit("Invoices", "Create", `Linked invoice: ${r.invoiceTitle || r.invoiceNumber}`); break;
      case "payment":       save("payments", setPayments, payments); addAudit("Payments", "Create", `Linked payment: ${r.amount}`); break;
      case "proposal":      save("proposals", setProposals, proposals); addAudit("Proposals", "Create", `Linked proposal: ${r.title}`); break;
      case "communication": save("communications", setCommunications, communications); addAudit("Communications", "Create", `Linked communication: ${r.contact}`); break;
      case "calendarEvent": save("calendarEvents", setCalendarEvents, calendarEvents); addAudit("Calendar", "Create", `Linked event: ${r.title}`); break;
      case "supportTicket": save("supportTickets", setSupportTickets, supportTickets); addAudit("Support", "Create", `Linked ticket: ${r.title}`); break;
      case "roadmapItem":   save("roadmapItems", setRoadmapItems, roadmapItems); addAudit("Roadmap", "Create", `Linked roadmap item: ${r.item}`); break;
      case "prompt":        save("promptHistory", setPromptHistory, promptHistory); addAudit("Prompts", "Create", `Linked prompt: ${r.title}`); break;
      case "projectLog":    save("projectLogs", setProjectLogs, projectLogs); addAudit("Project Logs", "Create", `Linked log: ${r.title || r.summary}`); break;
      default: toast("Unknown linked record type", "error"); return;
    }
    toast(`${targetModule.charAt(0).toUpperCase() + targetModule.slice(1)} created and linked`);
  }, [currentWorkspaceId, leads, projects, tasks, followUps, notes, documents, invoices, payments, proposals, communications, calendarEvents, supportTickets, roadmapItems, promptHistory, projectLogs, addAudit]);



  // ── Apply theme attribute on <html> ──────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-glass", settings.glassUI !== false ? "true" : "false");
  }, [isDark, settings.glassUI]);

  // ── Search data bundle ────────────────────────────────────────────────────────
  const searchData = {
    contacts, leads, projects, tasks, followUps, notes, documents, invoices,
    payments, proposals, communications, calendarEvents, supportTickets,
    whatsappTemplates, emailTemplates, promptHistory, projectLogs, roadmapItems, tags, customFields,
  };

  // ── Public share route — no auth required ────────────────────────────────
  if (window.location.hash.startsWith("#/share/")) {
    return <SharePage />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        workspaces={workspaces}
        selectedWorkspaceId={loginWorkspaceId}
        onWorkspaceSelect={(id) => {
          setLoginWorkspaceId(id);
          setCurrentWorkspaceId(id);
          saveCurrentWorkspaceId(id);
        }}
      />
    );
  }

  return (
    <div className="app-shell" style={{ minHeight: "100vh" }}>
      <>
        {/* Session Lock Overlay */}
          {sessionLocked && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(12px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{
                background: "var(--surface)",
                padding: "clamp(20px, 5vw, 40px)",
                borderRadius: "clamp(12px, 3vw, 20px)",
                maxWidth: "400px",
                width: "clamp(280px, 90vw, 400px)",
                textAlign: "center",
                border: "1px solid var(--border)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Session Locked</h2>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)" }}>
                  Your session has been locked due to inactivity. Click below to unlock.
                </p>
                <button
                  style={btnStyle("primary")}
                  onClick={handleUnlockSession}
                >
                  Unlock Session
                </button>
              </div>
            </div>
          )}

      {/* Desktop Sidebar */}
      <Sidebar
        tab={tab} setTab={handleTabChange} setMobileMenu={setMobileMenu}
        sidebarOpen={sidebarOpen} setSidebarOpen={(v) => { setSidebarOpen(v); localStorage.setItem("ui_sidebarOpen", v); }}
        businessName={settings.businessName} role={role}
      />

      {/* Mobile drawer */}
      <MobileNav
        tab={tab} setTab={handleTabChange}
        mobileMenu={mobileMenu} setMobileMenu={setMobileMenu}
        businessName={settings.businessName}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        switchWorkspace={switchWorkspace}
      />

      {/* Mobile Bottom Nav */}
      <BottomNav
        tab={tab} setTab={handleTabChange}
        setMobileMenu={setMobileMenu}
      />

      {/* Main column */}
      <div className="main-content">
        <Topbar
          onSearchOpen={() => setGlobalSearch(true)}
          onMobileMenu={() => setMobileMenu(p => !p)}
          isDark={isDark} toggleTheme={toggleTheme}
          role={role} setRole={r => saveSettings({ ...settings, role: r })}
          settings={settings} saveSettings={saveSettings}
          workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} switchWorkspace={switchWorkspace}
          user={user} onLogout={handleLogout}
        />

        <main className="page-content">
          {tab === "dashboard" && (
            <DashboardTab
              contacts={contacts} leads={leads} projects={projects} tasks={tasks} setTasks={setTasks}
              audit={audit} settings={settings} setTab={setTab} addAudit={addAudit} user={user}
              followUps={followUps} notes={notes} documents={documents}
              invoices={invoices} payments={payments} proposals={proposals}
              communications={communications} calendarEvents={calendarEvents}
              supportTickets={supportTickets} roadmapItems={roadmapItems}
              promptHistory={promptHistory} projectLogs={projectLogs}
              currentWorkspace={currentWorkspace}
              exchangeRates={settings.exchangeRates || {}} currency={settings.currency || "USD"}
              onNavigate={handleDashboardNavigate}
              onNewLead={handleNewLead}
              onNewTask={handleNewTask}
              onNewInvoice={handleNewInvoice}
            />
          )}
          {tab === "contacts" && (
            <ContactsTab contacts={contacts} setContacts={setContacts} addAudit={addAudit} role={role}
              leads={leads} setLeads={setLeads}
              followUps={followUps} setFollowUps={setFollowUps}
              notes={notes} setNotes={setNotes}
              tags={tags}
              projects={projects}
              tasks={tasks}
              invoices={invoices}
              proposals={proposals}
              communications={communications}
              documents={documents}
              supportTickets={supportTickets}
              calendarEvents={calendarEvents}
              workspaceId={currentWorkspaceId}
              onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "leads" && (
            <LeadsTab leads={leads} setLeads={setLeads} addAudit={addAudit} role={role}
              projects={projects} setProjects={setProjects} contacts={contacts}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "projects" && (
            <ProjectsTab projects={projects} setProjects={setProjects} addAudit={addAudit} role={role}
              tasks={tasks} setTasks={setTasks}
              notes={notes} setNotes={setNotes}
              invoices={invoices} setInvoices={setInvoices} payments={payments}
              proposals={proposals} setProposals={setProposals}
              documents={documents} setDocuments={setDocuments}
              leads={leads} setLeads={setLeads}
              contacts={contacts}
              communications={communications} setCommunications={setCommunications}
              followUps={followUps} setFollowUps={setFollowUps}
              supportTickets={supportTickets} setSupportTickets={setSupportTickets}
              promptHistory={promptHistory} projectLogs={projectLogs} setProjectLogs={setProjectLogs}
              roadmapItems={roadmapItems} setRoadmapItems={setRoadmapItems}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              setTab={setTab}
              workspaceId={currentWorkspaceId}
              onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "tasks" && (
            <TasksTab tasks={tasks} setTasks={setTasks} addAudit={addAudit} role={role}
              projects={projects} roadmapItems={roadmapItems} contacts={contacts}
              supportTickets={supportTickets} promptHistory={promptHistory}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "follow-ups" && (
            <FollowUpsTab followUps={followUps} setFollowUps={setFollowUps} addAudit={addAudit} role={role}
              contacts={contacts} leads={leads} projects={projects}
              tasks={tasks} setTasks={setTasks}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "notes" && (
            <NotesTab notes={notes} setNotes={setNotes} addAudit={addAudit} role={role} tags={tags}
              projects={projects} contacts={contacts} leads={leads} tasks={tasks}
              invoices={invoices} proposals={proposals} roadmapItems={roadmapItems} supportTickets={supportTickets}
              followUps={followUps} setFollowUps={setFollowUps}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              documents={documents} setDocuments={setDocuments}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "documents" && (
            <DocumentsTab documents={documents} setDocuments={setDocuments} addAudit={addAudit} role={role}
              contacts={contacts} projects={projects} tags={tags}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "calendar" && (
            <CalendarTab calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} addAudit={addAudit} role={role}
              contacts={contacts} projects={projects}
              tasks={tasks} followUps={followUps} invoices={invoices} proposals={proposals}
              roadmapItems={roadmapItems}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "communications" && (
            <CommunicationLogTab communications={communications} setCommunications={setCommunications}
              addAudit={addAudit} role={role} contacts={contacts} leads={leads} projects={projects}
              notes={notes} setNotes={setNotes}
              followUps={followUps} setFollowUps={setFollowUps}
              tasks={tasks} setTasks={setTasks}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "invoices" && (
            <InvoicesTab invoices={invoices} setInvoices={setInvoices} addAudit={addAudit} role={role}
              projects={projects} contacts={contacts} settings={settings}
              payments={payments} setPayments={setPayments}
              notes={notes} setNotes={setNotes}
              communications={communications} setCommunications={setCommunications}
              documents={documents} setDocuments={setDocuments}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              setTab={setTab}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "payments" && (
            <PaymentsTab payments={payments} setPayments={setPayments} addAudit={addAudit} role={role}
              projects={projects} invoices={invoices} setInvoices={setInvoices}
              contacts={contacts}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "proposals" && (
            <ProposalsTab proposals={proposals} setProposals={setProposals} addAudit={addAudit} role={role}
              projects={projects} setProjects={setProjects} contacts={contacts}
              invoices={invoices} setInvoices={setInvoices} settings={settings}
              notes={notes} setNotes={setNotes}
              communications={communications} setCommunications={setCommunications}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              followUps={followUps} setFollowUps={setFollowUps}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave} />
          )}
          {tab === "support" && (
            <SupportTicketsTab supportTickets={supportTickets} setSupportTickets={setSupportTickets} addAudit={addAudit} role={role}
              contacts={contacts} projects={projects}
              tasks={tasks} setTasks={setTasks}
              projectLogs={projectLogs} setProjectLogs={setProjectLogs}
              notes={notes} setNotes={setNotes}
              communications={communications} setCommunications={setCommunications}
              calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "analytics" && (
            <AnalyticsTab contacts={contacts} leads={leads} projects={projects} tasks={tasks}
              followUps={followUps} invoices={invoices} payments={payments} proposals={proposals}
              communications={communications} supportTickets={supportTickets} roadmapItems={roadmapItems}
              promptHistory={promptHistory} projectLogs={projectLogs}
              settings={settings} role={role} addAudit={addAudit} workspaceId={currentWorkspaceId}
            />
          )}
          {tab === "audit" && (
            <AuditLogsTab audit={audit} setAudit={setAudit} role={role} workspaceId={currentWorkspaceId} />
          )}
          {tab === "security" && (
            <SecurityTab
              settings={settings} setSettings={saveSettings} role={role}
              audit={audit} setAudit={setAudit} workspaceId={currentWorkspaceId}
              contacts={contacts} leads={leads} projects={projects} tasks={tasks}
              followUps={followUps} notes={notes} documents={documents}
              invoices={invoices} payments={payments} proposals={proposals}
              communications={communications} calendarEvents={calendarEvents}
              supportTickets={supportTickets} whatsappTemplates={whatsappTemplates} emailTemplates={emailTemplates}
              promptHistory={promptHistory} projectLogs={projectLogs} roadmapItems={roadmapItems}
              tags={tags} customFields={customFields}
              user={user} addAudit={addAudit}
            />
          )}
          {tab === "settings" && (
            <SettingsTab
              settings={settings} setSettings={saveSettings} role={role} onResetData={resetData}
              workspaces={workspaces} setWorkspaces={setWorkspaces}
              currentWorkspaceId={currentWorkspaceId} switchWorkspace={switchWorkspace}
              addWorkspace={addWorkspace} updateWorkspace={updateWorkspace} deleteWorkspace={deleteWorkspace}
              tags={tags} setTags={setTags} customFields={customFields} setCustomFields={setCustomFields}
              workspaceId={currentWorkspaceId} user={user}
            />
          )}
          {tab === "wa-templates" && (
            <WhatsAppTemplatesTab
              whatsappTemplates={whatsappTemplates} setWhatsappTemplates={setWhatsappTemplates}
              emailTemplates={emailTemplates} setEmailTemplates={setEmailTemplates}
              addAudit={addAudit} role={role} workspaceId={currentWorkspaceId} />
          )}
          {tab === "prompts" && (
            <PromptHistoryTab promptHistory={promptHistory} setPromptHistory={setPromptHistory} addAudit={addAudit} role={role}
              projects={projects} tasks={tasks} setTasks={setTasks}
              roadmapItems={roadmapItems} projectLogs={projectLogs} setProjectLogs={setProjectLogs}
              notes={notes} setNotes={setNotes}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "project-logs" && (
            <ProjectLogsTab projectLogs={projectLogs} setProjectLogs={setProjectLogs} addAudit={addAudit} role={role}
              projects={projects} tasks={tasks} setTasks={setTasks}
              promptHistory={promptHistory} roadmapItems={roadmapItems} supportTickets={supportTickets}
              notes={notes} setNotes={setNotes}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "roadmap" && (
            <RoadmapTrackerTab roadmapItems={roadmapItems} setRoadmapItems={setRoadmapItems} addAudit={addAudit} role={role}
              tasks={tasks} setTasks={setTasks}
              promptHistory={promptHistory} projectLogs={projectLogs} supportTickets={supportTickets}
              notes={notes} setNotes={setNotes}
              projects={projects}
              workspaceId={currentWorkspaceId} onLinkedSave={handleLinkedRecordSave}
            />
          )}
          {tab === "demo-units" && (
            <DemoUnitsTab
              demoUnits={demoUnits}
              setDemoUnits={setDemoUnits}
              addAudit={addAudit}
              role={role}
              workspaceId={currentWorkspaceId}
            />
          )}
        </main>
      </div>

      {/* Global search */}
      {globalSearch && (
        <SearchModal data={searchData} onClose={() => setGlobalSearch(false)} setTab={setTab} />
      )}

      {/* Command palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      <ToastContainer />
      </>
    </div>
  );

}
