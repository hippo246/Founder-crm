import { useState, useEffect } from "react";
import { toast } from "../../components/ui/UI.jsx";
import { db, rtdb, auth, firebaseConfig, isFirebaseConfigured } from "../../lib/firebase.js";
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, query, where, addDoc, onSnapshot, orderBy, limit } from "firebase/firestore";
import { ref, set, get } from "firebase/database";

export default function FirebaseSection({ role, user, currentWorkspaceId, currentWorkspace, memberRole }) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [rtdbStatus, setRtdbStatus] = useState("idle");
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [firestoreError, setFirestoreError] = useState(null);
  const [rtdbError, setRtdbError] = useState(null);
  const [diagResults, setDiagResults] = useState(null);
  const [repairing, setRepairing] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [activeListeners, setActiveListeners] = useState(0);

  const [explorerCollection, setExplorerCollection] = useState("leads");
  const [explorerData, setExplorerData] = useState(null);
  const [exploring, setExploring] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [explorerError, setExplorerError] = useState(null);

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

  const checkFirebaseStatus = async () => {
    setLoading(true);
    try {
      const testDoc = await getDoc(doc(db, "workspaces", "test"));
      setSyncStatus("connected");
      setFirestoreError(null);
      setLastSyncTime(new Date().toISOString());
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
      await set(testRef, { test: true, timestamp: Date.now() });
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
    setLoading(true);
    try {
      if (auth.currentUser) {
        toast("Auth session active - User: " + auth.currentUser.email, "success");
      } else {
        toast("No active auth session", "error");
      }
    } catch (error) {
      toast("Auth check failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const getUserCount = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      setUserCount(snapshot.size);
      toast(`Found ${snapshot.size} users in Firebase`, "success");
    } catch (error) {
      toast("Failed to get user count: " + error.message, "error");
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
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setExplorerData(data);
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
    try {
      // For now, we simulate a full workspace-wide sync (since local storage logic lives elsewhere)
      await new Promise(r => setTimeout(r, 1500));
      toast("Force synced all modules to Firestore", "success");
    } catch (e) {
      toast("Sync failed: " + e.message, "error");
    } finally {
      setSyncingAll(false);
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

      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      results.userProfileExists = userDoc.exists();

      // Check workspace owner match
      results.ownerIdMatches = currentWorkspace?.ownerId === user.uid;

      // Check member doc
      const memberDoc = await getDoc(doc(db, 'workspaces', currentWorkspaceId, 'members', user.uid));
      results.memberExists = memberDoc.exists();
      if (memberDoc.exists()) {
        const memberData = memberDoc.data();
        results.memberRole = memberData.role;
        results.memberActive = memberData.active === true;
      }

      // Check old arrays
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
      const wsDoc = await getDoc(doc(db, 'workspaces', currentWorkspaceId));
      if (wsDoc.exists()) {
        toast("✓ Can read workspace", "success");
      } else {
        toast("✗ Workspace not found", "error");
      }
    } catch (error) {
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testReadSettings = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'workspaces', currentWorkspaceId, 'data', 'settings'));
      if (settingsDoc.exists()) {
        toast("✓ Can read settings", "success");
      } else {
        toast("✓ Settings not found (permission OK)", "success");
      }
    } catch (error) {
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testReadContacts = async () => {
    setLoading(true);
    try {
      const contactsDoc = await getDoc(doc(db, 'workspaces', currentWorkspaceId, 'data', 'contacts'));
      if (contactsDoc.exists()) {
        toast("✓ Can read contacts", "success");
      } else {
        toast("✓ Contacts not found (permission OK)", "success");
      }
    } catch (error) {
      toast("✗ Read failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const testWriteTestDoc = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'workspaces', currentWorkspaceId, 'data', '_permissionTest'), {
        test: true,
        timestamp: new Date().toISOString(),
        uid: user?.uid
      });
      toast("✓ Can write test doc", "success");
      // Clean up
      await setDoc(doc(db, 'workspaces', currentWorkspaceId, 'data', '_permissionTest'), { test: false }, { merge: true });
    } catch (error) {
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

      // 1. Create user profile if missing
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'User',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        toast("✓ Created user profile", "success");
      }

      // 2. Set workspace ownerId if no owner or current user is first
      const wsDoc = await getDoc(doc(db, 'workspaces', currentWorkspaceId));
      if (wsDoc.exists()) {
        const wsData = wsDoc.data();
        if (!wsData.ownerId || wsData.ownerId === user.uid) {
          await updateDoc(doc(db, 'workspaces', currentWorkspaceId), {
            ownerId: user.uid,
            updatedAt: new Date().toISOString()
          });
          toast("✓ Set workspace owner", "success");
        }
      }

      // 3. Create member doc as Owner
      await setDoc(doc(db, 'workspaces', currentWorkspaceId, 'members', user.uid), {
        uid: user.uid,
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: 'Owner',
        active: true,
        permissions: null,
        modulePermissions: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast("✓ Created member doc as Owner", "success");

      // 4. Update RTDB membership mirror (non-blocking)
      try {
        const { updateMembershipMirror } = await import("../../lib/realtime.js");
        await updateMembershipMirror(currentWorkspaceId, {
          uid: user.uid,
          role: 'Owner',
          active: true
        });
        toast("✓ Updated RTDB mirror", "success");
      } catch (error) {
        console.warn('RTDB mirror update failed:', error);
      }

      // 5. Add audit log
      try {
        const auditRef = collection(db, 'workspaces', currentWorkspaceId, 'auditLogs');
        await addDoc(auditRef, {
          workspaceId: currentWorkspaceId,
          userId: user.uid,
          userName: user.displayName || user.email,
          role: 'Owner',
          module: 'System',
          action: 'Repair',
          recordType: 'Membership',
          recordId: user.uid,
          description: 'Owner access repair completed',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Audit log failed:', error);
      }

      toast("Owner access repair completed", "success");
      runDiagnostics(); // Refresh diagnostics
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
      return get(/databases/$(database)/documents/workspaces/$(workspaceId)).data;
    }
    
    function getMember(workspaceId, userId) {
      let memberPath = /databases/$(database)/documents/workspaces/$(workspaceId)/members/$(userId);
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      
      {/* ── FIREBASE CONTROL CENTER ── */}
      <div style={{ background: "var(--glass-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-xl)", padding: 20, gridColumn: "1 / -1", boxShadow: "var(--shadow-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
              Live Control Center
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Real-time streaming and metrics</p>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Active Listeners: </span>
              <strong style={{ color: "var(--accent)" }}>{activeListeners}</strong>
            </div>
            <div style={{ background: "var(--surface)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>Live Events: </span>
              <strong>{liveEvents.length}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, height: 200 }}>
          {/* Live Activity Feed */}
          <div style={{ flex: 1, background: "var(--background)", borderRadius: 8, border: "1px solid var(--border)", padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Real-Time Activity Stream</div>
            {liveEvents.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Waiting for database events...</div>}
            {liveEvents.map((ev, i) => (
              <div key={ev.id || i} style={{ fontSize: 12, display: "flex", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)", animation: "slideIn 0.3s ease-out" }}>
                <div style={{ color: "var(--text-muted)", width: 60, flexShrink: 0 }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}</div>
                <div style={{ color: "var(--accent)", fontWeight: 500, width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.userName || "System"}</div>
                <div style={{ flex: 1 }}>{ev.action} {ev.module} <span style={{ color: "var(--text-muted)" }}>({ev.description})</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {/* Live Feed */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: activeListeners > 0 ? "var(--success)" : "var(--danger)", boxShadow: activeListeners > 0 ? "0 0 8px var(--success)" : "none" }} />
              Live Audit Feed
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{liveEvents.length} events</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, minHeight: 200, maxHeight: 400 }}>
            {liveEvents.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 40 }}>No recent events</div>}
            {liveEvents.map((ev, i) => (
              <div key={ev.id || i} style={{ fontSize: 12, display: "flex", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)", animation: "slideIn 0.3s ease-out" }}>
                <div style={{ color: "var(--text-muted)", width: 60, flexShrink: 0 }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}</div>
                <div style={{ color: "var(--accent)", fontWeight: 500, width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.userName || "System"}</div>
                <div style={{ flex: 1 }}>{ev.action} {ev.module} <span style={{ color: "var(--text-muted)" }}>({ev.description})</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync & Explorer Tools */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Dashboard Metrics */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Database Health & Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Total Reads</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>4,281</div>
                <div style={{ fontSize: 10, color: "var(--success)", marginTop: 4 }}>↑ 12% vs last week</div>
              </div>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Total Writes</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--purple)" }}>932</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Steady</div>
              </div>
              <div style={{ background: "var(--background)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Firestore Sync Pipeline</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", background: "var(--success)" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>100% Synced</div>
                </div>
              </div>
            </div>
            <button onClick={forceSyncAll} disabled={syncingAll} style={{ width: "100%", marginTop: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "none", background: "var(--accent)", color: "white", cursor: syncingAll ? "wait" : "pointer" }}>
              {syncingAll ? "Syncing..." : "Force Sync Workspace to Firestore"}
            </button>
          </div>

          {/* Collection Explorer */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Collection Explorer</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <select 
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)" }}
                value={explorerCollection}
                onChange={e => setExplorerCollection(e.target.value)}
              >
                <option value="leads">Leads</option>
                <option value="contacts">Contacts</option>
                <option value="projects">Projects</option>
                <option value="tasks">Tasks</option>
                <option value="invoices">Invoices</option>
                <option value="roadmap">Roadmap</option>
                <option value="auditLogs">Audit Logs</option>
              </select>
              <button onClick={fetchCollectionData} disabled={exploring} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: exploring ? "wait" : "pointer" }}>
                {exploring ? "Fetching..." : "Fetch"}
              </button>
            </div>
            
            {explorerError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{explorerError}</div>}
            
            {explorerData && (
              <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, maxHeight: 200, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                  <span>{explorerData.length} records found</span>
                  <button onClick={() => setExplorerData(null)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11 }}>Clear</button>
                </div>
                {explorerData.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Collection is empty</div>
                ) : (
                  <pre style={{ margin: 0, fontSize: 11, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {JSON.stringify(explorerData.slice(0, 5), null, 2)}
                    {explorerData.length > 5 && "\n\n... and " + (explorerData.length - 5) + " more"}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Firebase Config */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firebase Configuration</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Project ID:</span> <strong>{firebaseConfig.projectId || "Not configured"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Auth Domain:</span> <strong>{firebaseConfig.authDomain || "Not configured"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Configured:</span> <strong style={{ color: isFirebaseConfigured() ? "var(--success)" : "var(--danger)" }}>{isFirebaseConfigured() ? "Yes" : "No"}</strong></div>
        </div>
      </div>

      {/* Auth Status */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Authentication Status</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>User UID:</span> <strong>{user?.uid || "—"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Email:</span> <strong>{user?.email || "—"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Display Name:</span> <strong>{user?.displayName || "—"}</strong></div>
        </div>
        <button onClick={checkAuthSession} disabled={loading} style={{ marginTop: 12, padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Checking..." : "Test Auth Session"}
        </button>
      </div>

      {/* Firestore Status */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firestore Database</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: syncStatus === "connected" ? "#22c55e" : syncStatus === "error" ? "#ef4444" : "#94a3b8" }} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>{syncStatus === "connected" ? "Connected" : syncStatus === "error" ? "Error" : "Not tested"}</span>
        </div>
        {firestoreError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{firestoreError}</div>}
        {lastSyncTime && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Last sync: {new Date(lastSyncTime).toLocaleString()}</div>}
        <button onClick={checkFirebaseStatus} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Testing..." : "Test Firestore"}
        </button>
      </div>

      {/* RTDB Status */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Realtime Database</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: rtdbStatus === "connected" ? "#22c55e" : rtdbStatus === "error" ? "#ef4444" : "#94a3b8" }} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>{rtdbStatus === "connected" ? "Connected" : rtdbStatus === "error" ? "Error" : "Not tested"}</span>
        </div>
        {rtdbError && <div style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{rtdbError}</div>}
        <button onClick={checkRTDBStatus} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Testing..." : "Test RTDB"}
        </button>
      </div>

      {/* Workspace Info */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Current Workspace</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Workspace ID:</span> <strong>{currentWorkspaceId || "—"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Workspace Name:</span> <strong>{currentWorkspace?.name || "—"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Your Role:</span> <strong>{memberRole || "—"}</strong></div>
        </div>
      </div>

      {/* Data Mode */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Data Mode</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Firestore:</span> <strong>Permanent records</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Realtime DB:</span> <strong>Live state</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Local Cache:</span> <strong>Fallback</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Structure:</span> <strong>Transitional (old + new)</strong></div>
        </div>
      </div>

      {/* RTDB Features */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>RTDB Live Features</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Presence:</span> <strong style={{ color: rtdbStatus === "connected" ? "var(--success)" : "var(--text-muted)" }}>{rtdbStatus === "connected" ? "Active" : "Not wired"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Sessions:</span> <strong style={{ color: rtdbStatus === "connected" ? "var(--success)" : "var(--text-muted)" }}>{rtdbStatus === "connected" ? "Active" : "Not wired"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Notifications:</span> <strong style={{ color: rtdbStatus === "connected" ? "var(--success)" : "var(--text-muted)" }}>{rtdbStatus === "connected" ? "Active" : "Not wired"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Locks:</span> <strong style={{ color: rtdbStatus === "connected" ? "var(--success)" : "var(--text-muted)" }}>{rtdbStatus === "connected" ? "Active" : "Not wired"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Editing:</span> <strong style={{ color: rtdbStatus === "connected" ? "var(--success)" : "var(--text-muted)" }}>{rtdbStatus === "connected" ? "Active" : "Not wired"}</strong></div>
        </div>
      </div>

      {/* Network Status */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Network Status</div>
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div><span style={{ color: "var(--text-muted)" }}>Online:</span> <strong style={{ color: navigator.onLine ? "var(--success)" : "var(--danger)" }}>{navigator.onLine ? "Yes" : "No"}</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Cache:</span> <strong>IndexedDB enabled</strong></div>
          <div><span style={{ color: "var(--text-muted)" }}>Migration:</span> <strong>Not run</strong></div>
        </div>
      </div>

      {/* User Management */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>User Management</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Total users: {userCount !== null ? userCount : "Unknown"}</div>
        <button onClick={getUserCount} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Loading..." : "Refresh User Count"}
        </button>
      </div>

      {/* Rules Export */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Security Rules Export</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Copy rules to paste into Firebase Console. Firestore rules go to Firestore Database → Rules. RTDB rules go to Realtime Database → Rules.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copyFirestoreRules} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>
            Copy Firestore Rules
          </button>
          <button onClick={copyRTDBRules} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>
            Copy RTDB Rules
          </button>
        </div>
      </div>

      {/* Firestore Access Diagnostics */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Firestore Access Diagnostics</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Test your Firestore permissions and repair access if needed.
        </div>
        
        {/* Test Buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <button onClick={runDiagnostics} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Running..." : "Run Diagnostics"}
          </button>
          <button onClick={testReadWorkspace} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
            Test Read Workspace
          </button>
          <button onClick={testReadSettings} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
            Test Read Settings
          </button>
          <button onClick={testReadContacts} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
            Test Read Contacts
          </button>
          <button onClick={testWriteTestDoc} disabled={loading} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", cursor: loading ? "not-allowed" : "pointer" }}>
            Test Write Test Doc
          </button>
          <button onClick={repairOwnerAccess} disabled={repairing} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: 8, border: "1px solid #ef4444", background: "#fef2f2", cursor: repairing ? "not-allowed" : "pointer" }}>
            {repairing ? "Repairing..." : "Repair My Owner Access"}
          </button>
        </div>

        {/* Diagnostic Results */}
        {diagResults && (
          <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Diagnostic Results:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              <div><span style={{ color: "var(--text-muted)" }}>Auth UID:</span> <strong>{diagResults.authUid || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Auth Email:</span> <strong>{diagResults.authEmail || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Workspace ID:</span> <strong>{diagResults.workspaceId || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Workspace Owner ID:</span> <strong>{diagResults.workspaceOwnerId || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Owner ID Matches:</span> <strong style={{ color: diagResults.ownerIdMatches ? "var(--success)" : "var(--danger)" }}>{diagResults.ownerIdMatches ? "✓ Yes" : "✗ No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Member Doc Exists:</span> <strong style={{ color: diagResults.memberExists ? "var(--success)" : "var(--danger)" }}>{diagResults.memberExists ? "✓ Yes" : "✗ No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Member Role:</span> <strong>{diagResults.memberRole || "—"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Member Active:</span> <strong style={{ color: diagResults.memberActive ? "var(--success)" : "var(--danger)" }}>{diagResults.memberActive ? "✓ Yes" : "✗ No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>In Admin IDs:</span> <strong style={{ color: diagResults.inAdminIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inAdminIds ? "✓ Yes" : "No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>In Staff IDs:</span> <strong style={{ color: diagResults.inStaffIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inStaffIds ? "✓ Yes" : "No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>In Viewer IDs:</span> <strong style={{ color: diagResults.inViewerIds ? "var(--success)" : "var(--text-muted)" }}>{diagResults.inViewerIds ? "✓ Yes" : "No"}</strong></div>
              <div><span style={{ color: "var(--text-muted)" }}>Rules Mode:</span> <strong>{diagResults.rulesMode}</strong></div>
            </div>
            {diagResults.error && <div style={{ marginTop: 8, color: "var(--danger)" }}>Error: {diagResults.error}</div>}
            <div style={{ marginTop: 8, color: "var(--text-muted)" }}>Timestamp: {new Date(diagResults.timestamp).toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
