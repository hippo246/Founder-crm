import { useState, useEffect } from "react";
import { toast } from "../../components/ui/UI.jsx";
import { db, rtdb, auth, firebaseConfig, isFirebaseConfigured } from "../../lib/firebase.js";
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, query, where, addDoc, onSnapshot, orderBy, limit, getCountFromServer, writeBatch } from "firebase/firestore";
import { ref, set as firebaseSet, get } from "firebase/database";

// Collection options for explorer
const COLLECTIONS = [
  { key: "contacts", label: "Contacts" },
  { key: "leads", label: "Leads" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "followUps", label: "Follow-Ups" },
  { key: "notes", label: "Notes" },
  { key: "documents", label: "Documents" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "proposals", label: "Proposals" },
  { key: "communications", label: "Communications" },
  { key: "calendarEvents", label: "Calendar Events" },
  { key: "supportTickets", label: "Support Tickets" },
  { key: "templates", label: "WhatsApp Templates" },
  { key: "emailTemplates", label: "Email Templates" },
  { key: "promptHistory", label: "Prompt History" },
  { key: "projectLogs", label: "Project Logs" },
  { key: "roadmapItems", label: "Roadmap Items" },
  { key: "tags", label: "Tags" },
  { key: "customFields", label: "Custom Fields" },
  { key: "auditLogs", label: "Audit Logs" },
];

// Tabs for the interface
const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "explorer", label: "Explorer", icon: "🔍" },
  { id: "diagnostics", label: "Diagnostics", icon: "🔧" },
  { id: "rules", label: "Security Rules", icon: "🔒" },
  { id: "backup", label: "Backup & Sync", icon: "💾" },
];

export default function FirebaseSection({ role, user, currentWorkspaceId, currentWorkspace, memberRole }) {
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");
  
  // Existing state
  const [syncStatus, setSyncStatus] = useState("idle");
  const [rtdbStatus, setRtdbStatus] = useState("idle");
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [firestoreError, setFirestoreError] = useState(null);
  const [rtdbError, setRtdbError] = useState(null);
  const [diagResults, setDiagResults] = useState(null);
  const [repairing, setRepairing] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [activeListeners, setActiveListeners] = useState(0);
  const [explorerCollection, setExplorerCollection] = useState("contacts");
  const [explorerData, setExplorerData] = useState(null);
  const [exploring, setExploring] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [explorerError, setExplorerError] = useState(null);
  const [metrics, setMetrics] = useState({ reads: 0, writes: 0, syncPercent: 0, syncedAt: null });
  const [networkOnline, setNetworkOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [testResults, setTestResults] = useState({});
  const [collectionCounts, setCollectionCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId || !rtdb || !user?.uid) return;
    const syncRef = ref(rtdb, `workspaceLive/${currentWorkspaceId}/syncStatus/${user.uid}`);
    get(syncRef).then(snap => {
      if (snap.exists()) {
        const d = snap.val();
        setMetrics(prev => ({ ...prev, syncedAt: d.lastSync, syncPercent: d.totalRecords > 0 ? 100 : 0 }));
      }
    }).catch(() => {});
  }, [currentWorkspaceId, user?.uid]);

  useEffect(() => {
    if (!currentWorkspaceId || !isFirebaseConfigured() || role !== "Owner") return;

    setActiveListeners(prev => prev + 1);
    const q = query(
      collection(db, "workspaces", currentWorkspaceId, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveEvents(events);
      setLastSyncTime(new Date().toISOString());
    }, (error) => {
      console.error("Live feed error:", error);
    });

    return () => {
      unsubscribe();
      setActiveListeners(prev => Math.max(0, prev - 1));
    };
  }, [currentWorkspaceId, role]);

  const loadAllCollectionCounts = async () => {
    if (!currentWorkspaceId) return;
    setLoadingCounts(true);
    const counts = {};
    for (const coll of COLLECTIONS) {
      try {
        const colRef = collection(db, "workspaces", currentWorkspaceId, coll.key);
        const snapshot = await getCountFromServer(colRef);
        counts[coll.key] = snapshot.data().count;
      } catch {
        try {
          const snapshot = await getDocs(colRef);
          counts[coll.key] = snapshot.size;
        } catch {
          counts[coll.key] = "—";
        }
      }
    }
    setCollectionCounts(counts);
    setLoadingCounts(false);
  };

  const checkFirebaseStatus = async () => {
    setLoading(true);
    try {
      const testDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId || "test"));
      setSyncStatus("connected");
      setFirestoreError(null);
      setLastSyncTime(new Date().toISOString());
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      toast("Firestore connection successful", "success");
    } catch (error) {
      setSyncStatus("error");
      setFirestoreError(error.message);
      toast("Firestore connection failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const checkRTDBStatus = async () => {
    setLoading(true);
    try {
      const testRef = ref(rtdb, "test");
      await firebaseSet(testRef, { test: true, timestamp: Date.now() });
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        setRtdbStatus("connected");
        setRtdbError(null);
        toast("Realtime Database connection successful", "success");
      } else {
        throw new Error("Test write failed");
      }
    } catch (error) {
      setRtdbStatus("error");
      setRtdbError(error.message);
      toast("Realtime Database connection failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const checkAuthSession = async () => {
    setAuthLoading(true);
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        const tokenPayload = JSON.parse(atob(token.split(".")[1]));
        const expiresAt = new Date(tokenPayload.exp * 1000).toLocaleTimeString();
        toast(`Auth session active — ${auth.currentUser.email} — token expires ${expiresAt}`, "success");
        setTestResults(prev => ({ ...prev, authSession: "pass" }));
      } else {
        setTestResults(prev => ({ ...prev, authSession: "fail" }));
        toast("No active auth session", "error");
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, authSession: "fail" }));
      toast("Auth check failed: " + error.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const getUserCount = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getCountFromServer(usersRef);
      const count = snapshot.data().count;
      setUserCount(count);
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      toast(`Found ${count} users in Firebase`, "success");
    } catch (error) {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        setUserCount(snapshot.size);
        setMetrics(prev => ({ ...prev, reads: prev.reads + snapshot.size }));
        toast(`Found ${snapshot.size} users in Firebase`, "success");
      } catch (fallbackError) {
        toast("Failed to get user count: " + fallbackError.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionData = async () => {
    if (!currentWorkspaceId) return;
    setExploring(true);
    setExplorerError(null);
    try {
      const colRef = collection(db, "workspaces", currentWorkspaceId, explorerCollection);
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExplorerData(data);
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      toast(`Fetched ${data.length} records from ${explorerCollection}`, "success");
    } catch (e) {
      setExplorerError(e.message);
      toast("Failed to fetch collection: " + e.message, "error");
    } finally {
      setExploring(false);
    }
  };

  const forceSyncAll = async () => {
    if (!currentWorkspaceId) return;
    setSyncingAll(true);
    let totalSynced = 0;
    let errors = [];
    try {
      for (const coll of COLLECTIONS) {
        try {
          const snap = await getDocs(collection(db, "workspaces", currentWorkspaceId, coll.key));
          totalSynced += snap.size;
        } catch (colErr) {
          errors.push(`${coll.key}: ${colErr.message}`);
        }
      }
      if (rtdb) {
        try {
          await firebaseSet(ref(rtdb, `workspaceLive/${currentWorkspaceId}/syncStatus/${user?.uid}`), {
            lastSync: Date.now(),
            totalRecords: totalSynced,
          });
        } catch (rtdbErr) {
          console.warn("RTDB sync status write failed:", rtdbErr);
        }
      }
      try {
        await addDoc(collection(db, "workspaces", currentWorkspaceId, "auditLogs"), {
          workspaceId: currentWorkspaceId,
          userId: user?.uid,
          userName: user?.displayName || user?.email,
          role: memberRole,
          module: "System",
          action: "ForceSyncAll",
          recordType: "Workspace",
          recordId: currentWorkspaceId,
          description: `Synced ${totalSynced} records across ${COLLECTIONS.length} collections${errors.length ? ` (${errors.length} errors)` : ""}`,
          timestamp: new Date().toISOString(),
        });
      } catch (_) {}
      setLastSyncTime(new Date().toISOString());
      if (errors.length) {
        toast(`Synced ${totalSynced} records. ${errors.length} collection(s) had errors.`, "error");
      } else {
        toast(`Force synced ${totalSynced} records across ${COLLECTIONS.length} collections`, "success");
      }
    } catch (e) {
      toast("Sync failed: " + e.message, "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const exportAllWorkspaceData = async () => {
    if (!currentWorkspaceId) return;
    setExportingAll(true);
    try {
      const data = {};
      for (const coll of COLLECTIONS) {
        const snap = await getDocs(collection(db, "workspaces", currentWorkspaceId, coll.key));
        data[coll.key] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workspace-${currentWorkspaceId}-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Workspace backup successful!", "success");
    } catch (e) {
      toast("Backup failed: " + e.message, "error");
    } finally {
      setExportingAll(false);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagResults(null);
    
    const results = {
      authUid: user?.uid || null,
      authEmail: user?.email || null,
      workspaceId: currentWorkspaceId || null,
      workspaceOwnerId: currentWorkspace?.ownerId || null,
      ownerIdMatches: false,
      memberExists: false,
      memberRole: null,
      memberActive: false,
      inAdminIds: false,
      inStaffIds: false,
      inViewerIds: false,
      rulesMode: "transitional (old arrays + new members)",
      timestamp: new Date().toISOString()
    };

    try {
      if (!user?.uid || !currentWorkspaceId) {
        results.error = "Not authenticated or no workspace selected";
        setDiagResults(results);
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      results.userProfileExists = userDoc.exists();

      results.ownerIdMatches = currentWorkspace?.ownerId === user.uid;

      const memberDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId, "members", user.uid));
      results.memberExists = memberDoc.exists();
      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        results.memberRole = memberData.role;
        results.memberActive = memberData.active === true;
      }

      if (currentWorkspace?.adminIds?.includes(user.uid)) results.inAdminIds = true;
      if (currentWorkspace?.staffIds?.includes(user.uid)) results.inStaffIds = true;
      if (currentWorkspace?.viewerIds?.includes(user.uid)) results.inViewerIds = true;

      setDiagResults(results);
      toast("Diagnostics completed", "success");
    } catch (error) {
      results.error = error.message;
      setDiagResults(results);
      toast("Diagnostics failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testReadWorkspace = async () => {
    setLoading(true);
    try {
      const wsDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId));
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      if (wsDoc.exists()) {
        setTestResults(prev => ({ ...prev, readWorkspace: "pass" }));
        toast("✓ Can read workspace", "success");
      } else {
        setTestResults(prev => ({ ...prev, readWorkspace: "warn" }));
        toast("✗ Workspace not found", "error");
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, readWorkspace: "fail" }));
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testReadSettings = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId, "data", "settings"));
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      setTestResults(prev => ({ ...prev, readSettings: "pass" }));
      if (settingsDoc.exists()) {
        toast("✓ Can read settings", "success");
      } else {
        toast("✓ Settings not found (permission OK)", "success");
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, readSettings: "fail" }));
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testReadContacts = async () => {
    setLoading(true);
    try {
      const contactsDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId, "data", "contacts"));
      setMetrics(prev => ({ ...prev, reads: prev.reads + 1 }));
      setTestResults(prev => ({ ...prev, readContacts: "pass" }));
      if (contactsDoc.exists()) {
        toast("✓ Can read contacts", "success");
      } else {
        toast("✓ Contacts not found (permission OK)", "success");
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, readContacts: "fail" }));
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testWriteTestDoc = async () => {
    if (!user?.uid || !currentWorkspaceId) {
      toast("Not authenticated or no workspace", "error");
      return;
    }
    setLoading(true);
    setTestResults(prev => ({ ...prev, writeTestDoc: null }));
    try {
      await setDoc(doc(db, "workspaces", currentWorkspaceId, "data", "_permissionTest"), {
        test: true,
        timestamp: new Date().toISOString(),
        uid: user.uid
      });
      setMetrics(prev => ({ ...prev, writes: prev.writes + 1 }));
      setTestResults(prev => ({ ...prev, writeTestDoc: "pass" }));
      toast("✓ Can write test doc", "success");
      await setDoc(doc(db, "workspaces", currentWorkspaceId, "data", "_permissionTest"), { test: false }, { merge: true });
      setMetrics(prev => ({ ...prev, writes: prev.writes + 1 }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, writeTestDoc: "fail" }));
      toast("✗ Write failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const repairOwnerAccess = async () => {
    setRepairing(true);
    try {
      if (!user?.uid || !currentWorkspaceId) {
        toast("Not authenticated or no workspace", "error");
        setRepairing(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          role: "User",
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        toast("✓ Created user profile", "success");
      }

      const wsDoc = await getDoc(doc(db, "workspaces", currentWorkspaceId));
      if (wsDoc.exists()) {
        const wsData = wsDoc.data();
        if (!wsData.ownerId || wsData.ownerId === user.uid) {
          await updateDoc(doc(db, "workspaces", currentWorkspaceId), {
            ownerId: user.uid,
            updatedAt: new Date().toISOString()
          });
          toast("✓ Set workspace owner", "success");
        }
      }

      await setDoc(doc(db, "workspaces", currentWorkspaceId, "members", user.uid), {
        uid: user.uid,
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        role: "Owner",
        active: true,
        permissions: null,
        modulePermissions: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast("✓ Created member doc as Owner", "success");

      try {
        const { updateMembershipMirror } = await import("../../lib/realtime.js");
        await updateMembershipMirror(currentWorkspaceId, {
          uid: user.uid,
          role: "Owner",
          active: true
        });
        toast("✓ Updated RTDB mirror", "success");
      } catch (error) {
        console.warn("RTDB mirror update failed:", error);
      }

      try {
        const auditRef = collection(db, "workspaces", currentWorkspaceId, "auditLogs");
        await addDoc(auditRef, {
          workspaceId: currentWorkspaceId,
          userId: user.uid,
          userName: user.displayName || user.email,
          role: "Owner",
          module: "System",
          action: "Repair",
          recordType: "Membership",
          recordId: user.uid,
          description: "Owner access repair completed",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn("Audit log failed:", error);
      }

      toast("Owner access repair completed", "success");
      runDiagnostics();
    } catch (error) {
      toast("Repair failed: " + error.message, "error");
    } finally {
      setRepairing(false);
    }
  };

  const copyFirestoreRules = () => {
    const rulesText = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getWorkspace(workspaceId) {
      return get(/databases/${database}/documents/workspaces/${workspaceId}).data;
    }
    
    function getMember(workspaceId, userId) {
      let memberPath = /databases/${database}/documents/workspaces/${workspaceId}/members/${userId};
      let member = exists(memberPath) ? get(memberPath).data : null;
      return member;
    }
    
    function isOwner(workspaceId) {
      let workspace = getWorkspace(workspaceId);
      return isAuthenticated() && workspace.ownerId == request.auth.uid;
    }
    
    function isAdmin(workspaceId) {
      let workspace = getWorkspace(workspaceId);
      let member = getMember(workspaceId, request.auth.uid);
      return isAuthenticated() && 
             (request.auth.uid in workspace.adminIds || 
              (member != null && member.role == 'Admin'));
    }
    
    function isStaff(workspaceId) {
      let workspace = getWorkspace(workspaceId);
      let member = getMember(workspaceId, request.auth.uid);
      return isAuthenticated() && 
             (request.auth.uid in workspace.staffIds || 
              (member != null && member.role == 'Staff'));
    }
    
    function isViewer(workspaceId) {
      let workspace = getWorkspace(workspaceId);
      let member = getMember(workspaceId, request.auth.uid);
      return isAuthenticated() && 
             (request.auth.uid in workspace.viewerIds || 
              (member != null && member.role == 'Viewer'));
    }
    
    function isMember(workspaceId) {
      let member = getMember(workspaceId, request.auth.uid);
      return isAuthenticated() && member != null && member.active == true;
    }
    
    function getMemberRole(workspaceId) {
      let member = getMember(workspaceId, request.auth.uid);
      if (member != null && member.active == true) {
        return member.role;
      }
      return null;
    }
    
    function hasWorkspaceAccess(workspaceId) {
      let workspace = getWorkspace(workspaceId);
      let member = getMember(workspaceId, request.auth.uid);
      return isAuthenticated() && 
             (workspace.ownerId == request.auth.uid ||
              request.auth.uid in workspace.adminIds ||
              request.auth.uid in workspace.staffIds ||
              request.auth.uid in workspace.viewerIds ||
              (member != null && member.active == true));
    }
    
    function canWrite(workspaceId) {
      let role = getMemberRole(workspaceId);
      let workspace = getWorkspace(workspaceId);
      return isAuthenticated() && 
             (workspace.ownerId == request.auth.uid ||
              request.auth.uid in workspace.adminIds ||
              request.auth.uid in workspace.staffIds ||
              role == 'Owner' || role == 'Admin' || role == 'Staff');
    }
    
    function canDelete(workspaceId) {
      let role = getMemberRole(workspaceId);
      let workspace = getWorkspace(workspaceId);
      return isAuthenticated() && 
             (workspace.ownerId == request.auth.uid ||
              request.auth.uid in workspace.adminIds ||
              role == 'Owner' || role == 'Admin');
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId;
    }
    
    match /workspaces/{workspaceId} {
      allow read: if hasWorkspaceAccess(workspaceId);
      allow create: if isAuthenticated();
      allow update: if isOwner(workspaceId);
      allow delete: if isOwner(workspaceId);
      
      match /members/{userId} {
        allow read: if hasWorkspaceAccess(workspaceId);
        allow create: if isOwner(workspaceId) || request.auth.uid == userId;
        allow update: if isOwner(workspaceId) || request.auth.uid == userId;
        allow delete: if isOwner(workspaceId);
      }
      
      match /invites/{inviteId} {
        allow read: if hasWorkspaceAccess(workspaceId);
        allow create: if isOwner(workspaceId);
        allow update: if isOwner(workspaceId);
        allow delete: if isOwner(workspaceId);
      }
      
      match /data/{document} {
        allow read: if hasWorkspaceAccess(workspaceId);
        allow write: if canWrite(workspaceId);
        allow delete: if canDelete(workspaceId);
      }
      
      match /auditLogs/{auditId} {
        allow read: if isOwner(workspaceId) || isAdmin(workspaceId);
        allow create: if hasWorkspaceAccess(workspaceId);
        allow update: if false;
        allow delete: if isOwner(workspaceId);
      }
    }
  }
}`;
    navigator.clipboard.writeText(rulesText);
    toast("Firestore rules copied to clipboard", "success");
  };

  const copyRTDBRules = () => {
    const rulesText = `{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    
    "presence": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    
    "workspacePresence": {
      "$workspaceId": {
        "$uid": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && auth.uid == $uid"
        }
      }
    },
    
    "workspaceLive": {
      "$workspaceId": {
        ".read": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true",
        
        "sessions": {
          "$uid": {
            ".read": "auth != null && auth.uid == $uid",
            ".write": "auth != null && auth.uid == $uid"
          }
        },
        
        "notifications": {
          ".read": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true",
          "$notificationId": {
            ".write": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true"
          }
        },
        
        "locks": {
          "$moduleKey": {
            "$recordId": {
              ".read": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true",
              ".write": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true"
            }
          }
        },
        
        "editing": {
          "$moduleKey": {
            "$recordId": {
              ".read": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true",
              "$uid": {
                ".write": "auth != null && auth.uid == $uid"
              }
            }
          }
        },
        
        "activity": {
          ".read": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true",
          "$activityId": {
            ".write": "root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('active').val() == true"
          }
        },
        
        "syncStatus": {
          "$uid": {
            ".read": "auth != null && auth.uid == $uid",
            ".write": "auth != null && auth.uid == $uid"
          }
        }
      }
    },
    
    "workspaceMembersMirror": {
      "$workspaceId": {
        "$uid": {
          ".read": "auth != null && auth.uid == $uid || root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('role').val() == 'Owner' || root.child('workspaceMembersMirror').child($workspaceId).child(auth.uid).child('role').val() == 'Admin'",
          ".write": "false"
        }
      }
    }
  }
}`;
    navigator.clipboard.writeText(rulesText);
    toast("Realtime Database rules copied to clipboard", "success");
  };

  if (role !== "Owner") {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24 }}>
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Access Restricted</div>
          <div style={{ fontSize: 13 }}>Only the Owner can access Firebase settings</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, background: "var(--surface)", borderRadius: "var(--r-lg)", padding: 6, border: "1px solid var(--border)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "0 0 auto",
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "white" : "var(--text)",
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Live Control Center (always visible) */}
      <div style={{ background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)", padding: 20, boxShadow: "var(--shadow-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
              Live Control Center
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Real-time streaming and metrics</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Active Listeners: </span>
              <strong style={{ color: "var(--accent)" }}>{activeListeners}</strong>
            </div>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Live Events: </span>
              <strong>{liveEvents.length}</strong>
            </div>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Reads: </span>
              <strong style={{ color: "var(--accent)" }}>{metrics.reads}</strong>
            </div>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Writes: </span>
              <strong style={{ color: "var(--purple)" }}>{metrics.writes}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto", background: "var(--background)", borderRadius: 8, border: "1px solid var(--border)", padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Real-time Activity Stream</div>
          {liveEvents.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Waiting for database events...</div>}
          {liveEvents.map((ev, i) => (
              <div key={`stream-${i}-${ev.id || i}`} style={{ fontSize: 12, display: "flex", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
              <div style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}</div>
              <div style={{ color: "var(--accent)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.userName || "System"}</div>
              <div style={{ flex: 1 }}>{ev.action} {ev.module} <span style={{ color: "var(--text-muted)" }}>({ev.description})</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firebase Configuration</div>
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Project ID: </span><strong>{firebaseConfig.projectId || "Not configured"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Auth Domain: </span><strong>{firebaseConfig.authDomain || "Not configured"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Configured: </span><strong style={{ color: isFirebaseConfigured() ? "var(--success)" : "var(--danger)" }}>{isFirebaseConfigured() ? "Yes" : "No"}</strong></div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Authentication Status</div>
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>User UID: </span><strong>{user?.uid || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Email: </span><strong>{user?.email || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Display Name: </span><strong>{user?.displayName || "—"}</strong></div>
            </div>
            <button
              onClick={checkAuthSession}
              disabled={authLoading}
              style={{
                marginTop: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8,
                border: `1px solid ${testResults.authSession === "pass" ? "var(--success)" : testResults.authSession === "fail" ? "var(--danger)" : "var(--border)"}`,
                background: testResults.authSession === "pass" ? "rgba(34,197,94,0.08)" : testResults.authSession === "fail" ? "rgba(239,68,68,0.08)" : "var(--surface)",
                cursor: authLoading ? "not-allowed" : "pointer",
                color: testResults.authSession === "pass" ? "var(--success)" : testResults.authSession === "fail" ? "var(--danger)" : "var(--text)",
                width: "100%"
              }}
            >
              {authLoading ? "Checking..." : testResults.authSession === "pass" ? "✓ Auth Session Valid" : testResults.authSession === "fail" ? "✗ Auth Failed" : "Test Auth Session"}
            </button>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firestore Database</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: syncStatus === "connected" ? "#22c55e" : syncStatus === "error" ? "#ef4444" : "#94a3b8" }} />
              <span style={{ fontSize: 13, color: "var(--text)" }}>{syncStatus === "connected" ? "Connected" : syncStatus === "error" ? "Error" : "Not tested"}</span>
            </div>
            {firestoreError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{firestoreError}</div>}
            {lastSyncTime && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Last sync: {new Date(lastSyncTime).toLocaleString()}</div>}
            <button onClick={checkFirebaseStatus} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer", width: "100%" }}>
              {loading ? "Testing..." : "Test Firestore"}
            </button>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Realtime Database</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: rtdbStatus === "connected" ? "#22c55e" : rtdbStatus === "error" ? "#ef4444" : "#94a3b8" }} />
              <span style={{ fontSize: 13, color: "var(--text)" }}>{rtdbStatus === "connected" ? "Connected" : rtdbStatus === "error" ? "Error" : "Not tested"}</span>
            </div>
            {rtdbError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{rtdbError}</div>}
            <button onClick={checkRTDBStatus} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer", width: "100%" }}>
              {loading ? "Testing..." : "Test RTDB"}
            </button>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Current Workspace</div>
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Workspace ID: </span><strong>{currentWorkspaceId || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Workspace Name: </span><strong>{currentWorkspace?.name || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Your Role: </span><strong>{memberRole || "—"}</strong></div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Network Status</div>
            <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Online: </span><strong style={{ color: networkOnline ? "var(--success)" : "var(--danger)" }}>{networkOnline ? "Yes" : "No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Cache: </span><strong>IndexedDB enabled</strong></div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Database Health & Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Reads (this session)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{metrics.reads}</div>
              </div>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Writes (this session)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--purple)" }}>{metrics.writes}</div>
              </div>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  Firestore Sync Pipeline
                  {metrics.syncedAt && <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>— Last: {new Date(metrics.syncedAt).toLocaleString()}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${metrics.syncPercent}%`, height: "100%", background: metrics.syncPercent === 100 ? "var(--success)" : metrics.syncPercent > 0 ? "var(--accent)" : "var(--border)", transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: metrics.syncPercent === 100 ? "var(--success)" : "var(--text-muted)" }}>
                    {metrics.syncPercent === 0 ? "Not synced yet" : `${metrics.syncPercent}% Synced`}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={forceSyncAll} disabled={syncingAll} style={{ width: "100%", marginTop: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "var(--accent)", color: "white", cursor: syncingAll ? "wait" : "pointer" }}>
              {syncingAll ? "Syncing..." : "Force Sync Workspace to Firestore"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "explorer" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Collection Explorer</div>
              <button onClick={loadAllCollectionCounts} disabled={loadingCounts} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: loadingCounts ? "not-allowed" : "pointer" }}>
                {loadingCounts ? "Loading Counts..." : "Refresh All Counts"}
              </button>
            </div>

            {/* Collection list with counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginBottom: 16 }}>
              {COLLECTIONS.map(coll => (
                <button
                  key={coll.key}
                  onClick={() => { setExplorerCollection(coll.key); fetchCollectionData(); }}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${explorerCollection === coll.key ? "var(--accent)" : "var(--border)"}`,
                    background: explorerCollection === coll.key ? "rgba(79,70,229,0.08)" : "var(--background)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span style={{ color: explorerCollection === coll.key ? "var(--accent)" : "var(--text)" }}>{coll.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                    {collectionCounts[coll.key] ?? "—"}
                  </span>
                </button>
              ))}
            </div>

            {/* Explorer content */}
            {explorerError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{explorerError}</div>}
            
            {explorerData && (
              <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, maxHeight: "60vh", overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{explorerData.length} records found</span>
                  <button onClick={() => setExplorerData(null)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11 }}>Clear</button>
                </div>
                {explorerData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Collection is empty</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {explorerData.slice(0, 20).map((item, idx) => (
                      <div key={`explorer-${idx}-${item.id || idx}`} style={{ padding: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, overflow: "hidden" }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>ID: {item.id}</div>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--text-muted)" }}>{JSON.stringify(item, null, 2)}</pre>
                      </div>
                    ))}
                    {explorerData.length > 20 && <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>... and {explorerData.length - 20} more records</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "diagnostics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firestore Access Diagnostics</div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {[
                { key: null, label: loading ? "Running..." : "Run Diagnostics", onClick: runDiagnostics, disabled: loading },
                { key: "readWorkspace", label: "Read Workspace", onClick: testReadWorkspace, disabled: loading },
                { key: "readSettings", label: "Read Settings", onClick: testReadSettings, disabled: loading },
                { key: "readContacts", label: "Read Contacts", onClick: testReadContacts, disabled: loading },
                { key: "writeTestDoc", label: "Write Test Doc", onClick: testWriteTestDoc, disabled: loading },
              ].map(({ key, label, onClick, disabled }) => {
                const result = key ? testResults[key] : null;
                const statusColor = result === "pass" ? "var(--success)" : result === "fail" ? "var(--danger)" : result === "warn" ? "#f59e0b" : "var(--border)";
                const statusIcon = result === "pass" ? " ✓" : result === "fail" ? " ✗" : result === "warn" ? " ⚠" : "";
                return (
                  <button
                    key={key || "diag"}
                    onClick={onClick}
                    disabled={disabled}
                    style={{
                      padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8,
                      border: `1px solid ${result ? statusColor : "var(--border)"}`,
                      background: result === "pass" ? "rgba(34,197,94,0.08)" : result === "fail" ? "rgba(239,68,68,0.08)" : "var(--surface)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      color: result ? statusColor : "var(--text)",
                      display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    {label}{statusIcon}
                  </button>
                );
              })}
              <button onClick={repairOwnerAccess} disabled={repairing} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #ef4444", background: "#fef2f2", cursor: repairing ? "not-allowed" : "pointer" }}>
                {repairing ? "Repairing..." : "Repair My Owner Access"}
              </button>
            </div>

            {diagResults && (
              <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Diagnostic Results:</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                  <div><span style={{ color: "var(--text-muted)" }}>Auth UID: </span><strong>{diagResults.authUid || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Auth Email: </span><strong>{diagResults.authEmail || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Workspace ID: </span><strong>{diagResults.workspaceId || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Workspace Owner ID: </span><strong>{diagResults.workspaceOwnerId || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Owner ID Matches: </span><strong style={{ color: diagResults.ownerIdMatches ? "var(--success)" : "var(--danger)" }}>{diagResults.ownerIdMatches ? "✓ Yes" : "✗ No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Member Doc Exists: </span><strong style={{ color: diagResults.memberExists ? "var(--success)" : "var(--danger)" }}>{diagResults.memberExists ? "✓ Yes" : "✗ No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Member Role: </span><strong>{diagResults.memberRole || "—"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Member Active: </span><strong style={{ color: diagResults.memberActive ? "var(--success)" : "var(--danger)" }}>{diagResults.memberActive ? "✓ Yes" : "✗ No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>In Admin IDs: </span><strong style={{ color: diagResults.inAdminIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inAdminIds ? "✓ Yes" : "No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>In Staff IDs: </span><strong style={{ color: diagResults.inStaffIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inStaffIds ? "✓ Yes" : "No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>In Viewer IDs: </span><strong style={{ color: diagResults.inViewerIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inViewerIds ? "✓ Yes" : "No"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)" }}>Rules Mode: </span><strong>{diagResults.rulesMode}</strong></div>
                </div>
                {diagResults.error && <div style={{ marginTop: 8, color: "var(--danger)" }}>Error: {diagResults.error}</div>}
                <div style={{ marginTop: 8, color: "var(--text-muted)" }}>Timestamp: {new Date(diagResults.timestamp).toLocaleString()}</div>
              </div>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>User Management</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Total users: {userCount !== null ? userCount : "Unknown"}</div>
            <button onClick={getUserCount} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Loading..." : "Refresh User Count"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Security Rules Export</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Copy rules to paste into Firebase Console. Firestore rules go to Firestore Database → Rules. RTDB rules go to Realtime Database → Rules.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button onClick={copyFirestoreRules} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>
                Copy Firestore Rules
              </button>
              <button onClick={copyRTDBRules} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>
                Copy RTDB Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Backup & Sync</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Export your entire workspace data as a JSON file for backup purposes.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button onClick={exportAllWorkspaceData} disabled={exportingAll} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "var(--success)", color: "white", cursor: exportingAll ? "not-allowed" : "pointer" }}>
                {exportingAll ? "Exporting..." : "📥 Export All Workspace Data"}
              </button>
              <button onClick={forceSyncAll} disabled={syncingAll} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: syncingAll ? "not-allowed" : "pointer" }}>
                {syncingAll ? "Syncing..." : "🔄 Force Sync Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
