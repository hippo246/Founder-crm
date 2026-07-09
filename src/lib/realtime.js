// ─── REALTIME DATABASE HELPERS ─────────────────────────────────────────────────────

import { rtdb } from "./firebase.js";
import { ref, set, onValue, onDisconnect, remove, push, update, get } from "firebase/database";

// ─── PRESENCE ─────────────────────────────────────────────────────────────────────

export const setUserOnline = async (user, workspaceId) => {
  if (!user || !user.uid) return;
  
  try {
    const presenceRef = ref(rtdb, `presence/${user.uid}`);
    const workspacePresenceRef = ref(rtdb, `workspacePresence/${workspaceId}/${user.uid}`);
    
    const presenceData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      workspaceId,
      online: true,
      lastSeen: Date.now(),
      updatedAt: Date.now()
    };
    
    await set(presenceRef, presenceData);
    await set(workspacePresenceRef, presenceData);
    
    // Set offline on disconnect
    onDisconnect(presenceRef).set({
      ...presenceData,
      online: false,
      lastSeen: Date.now()
    });
    
    onDisconnect(workspacePresenceRef).remove();
    
    return true;
  } catch (error) {
    console.error('Error setting user online:', error);
    return false;
  }
};

export const setUserOffline = async (uid) => {
  if (!uid) return;
  
  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    await remove(presenceRef);
    return true;
  } catch (error) {
    console.error('Error setting user offline:', error);
    return false;
  }
};

export const subscribeToUserPresence = (uid, callback) => {
  if (!uid) return () => {};
  
  const presenceRef = ref(rtdb, `presence/${uid}`);
  return onValue(presenceRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || null);
  }, (error) => {
    console.error('Presence subscription error:', error);
    callback(null);
  });
};

export const subscribeToWorkspacePresence = (workspaceId, callback) => {
  if (!workspaceId) return () => {};
  
  const workspacePresenceRef = ref(rtdb, `workspacePresence/${workspaceId}`);
  return onValue(workspacePresenceRef, (snapshot) => {
    const data = snapshot.val();
    const users = data ? Object.values(data) : [];
    callback(users);
  }, (error) => {
    console.error('Workspace presence subscription error:', error);
    callback([]);
  });
};

// ─── WORKSPACE SESSION ─────────────────────────────────────────────────────────────

export const joinWorkspaceSession = async (workspaceId, user) => {
  if (!user || !user.uid || !workspaceId) return;
  
  try {
    const sessionRef = ref(rtdb, `workspaceLive/${workspaceId}/sessions/${user.uid}`);
    
    const sessionData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      workspaceId,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      tab: 'dashboard'
    };
    
    await set(sessionRef, sessionData);
    
    // Remove on disconnect
    onDisconnect(sessionRef).remove();
    
    return true;
  } catch (error) {
    console.error('Error joining workspace session:', error);
    return false;
  }
};

export const leaveWorkspaceSession = async (workspaceId, uid) => {
  if (!uid || !workspaceId) return;
  
  try {
    const sessionRef = ref(rtdb, `workspaceLive/${workspaceId}/sessions/${uid}`);
    await remove(sessionRef);
    return true;
  } catch (error) {
    console.error('Error leaving workspace session:', error);
    return false;
  }
};

export const subscribeToWorkspaceSessions = (workspaceId, callback) => {
  if (!workspaceId) return () => {};
  
  const sessionsRef = ref(rtdb, `workspaceLive/${workspaceId}/sessions`);
  return onValue(sessionsRef, (snapshot) => {
    const data = snapshot.val();
    const sessions = data ? Object.values(data) : [];
    callback(sessions);
  }, (error) => {
    console.error('Workspace sessions subscription error:', error);
    callback([]);
  });
};

// ─── RECORD LOCKS ─────────────────────────────────────────────────────────────────

export const lockRecord = async (workspaceId, moduleKey, recordId, user) => {
  if (!user || !user.uid || !workspaceId || !moduleKey || !recordId) return false;
  
  try {
    const lockRef = ref(rtdb, `workspaceLive/${workspaceId}/locks/${moduleKey}/${recordId}`);
    
    const lockData = {
      lockedBy: user.uid,
      lockedByName: user.displayName || user.email,
      lockedAt: Date.now(),
      moduleKey,
      recordId
    };
    
    await set(lockRef, lockData);
    
    // Auto-release after 30 minutes
    setTimeout(async () => {
      try {
        const snapshot = await get(lockRef);
        if (snapshot.exists() && snapshot.val().lockedBy === user.uid) {
          await remove(lockRef);
        }
      } catch (e) {
        console.error('Error auto-releasing lock:', e);
      }
    }, 30 * 60 * 1000);
    
    return true;
  } catch (error) {
    console.error('Error locking record:', error);
    return false;
  }
};

export const unlockRecord = async (workspaceId, moduleKey, recordId, uid) => {
  if (!workspaceId || !moduleKey || !recordId) return false;
  
  try {
    const lockRef = ref(rtdb, `workspaceLive/${workspaceId}/locks/${moduleKey}/${recordId}`);
    const snapshot = await get(lockRef);
    
    if (snapshot.exists()) {
      const lockData = snapshot.val();
      if (lockData.lockedBy === uid) {
        await remove(lockRef);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error unlocking record:', error);
    return false;
  }
};

export const subscribeToRecordLock = (workspaceId, moduleKey, recordId, callback) => {
  if (!workspaceId || !moduleKey || !recordId) return () => {};
  
  const lockRef = ref(rtdb, `workspaceLive/${workspaceId}/locks/${moduleKey}/${recordId}`);
  return onValue(lockRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || null);
  }, (error) => {
    console.error('Record lock subscription error:', error);
    callback(null);
  });
};

// ─── EDITING INDICATORS ───────────────────────────────────────────────────────────

export const startEditingRecord = async (workspaceId, moduleKey, recordId, user) => {
  if (!user || !user.uid || !workspaceId || !moduleKey || !recordId) return false;
  
  try {
    const editingRef = ref(rtdb, `workspaceLive/${workspaceId}/editing/${moduleKey}/${recordId}/${user.uid}`);
    
    const editingData = {
      uid: user.uid,
      displayName: user.displayName || user.email,
      startedAt: Date.now(),
      lastActive: Date.now()
    };
    
    await set(editingRef, editingData);
    
    // Remove on disconnect
    onDisconnect(editingRef).remove();
    
    return true;
  } catch (error) {
    console.error('Error starting edit:', error);
    return false;
  }
};

export const stopEditingRecord = async (workspaceId, moduleKey, recordId, uid) => {
  if (!workspaceId || !moduleKey || !recordId || !uid) return false;
  
  try {
    const editingRef = ref(rtdb, `workspaceLive/${workspaceId}/editing/${moduleKey}/${recordId}/${uid}`);
    await remove(editingRef);
    return true;
  } catch (error) {
    console.error('Error stopping edit:', error);
    return false;
  }
};

export const subscribeToEditingRecord = (workspaceId, moduleKey, recordId, callback) => {
  if (!workspaceId || !moduleKey || !recordId) return () => {};
  
  const editingRef = ref(rtdb, `workspaceLive/${workspaceId}/editing/${moduleKey}/${recordId}`);
  return onValue(editingRef, (snapshot) => {
    const data = snapshot.val();
    const editors = data ? Object.values(data) : [];
    callback(editors);
  }, (error) => {
    console.error('Editing subscription error:', error);
    callback([]);
  });
};

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────────

export const pushLiveNotification = async (workspaceId, notification) => {
  if (!workspaceId) return null;
  
  try {
    const notificationsRef = ref(rtdb, `workspaceLive/${workspaceId}/notifications`);
    const newNotificationRef = push(notificationsRef);
    
    const notificationData = {
      id: newNotificationRef.key,
      ...notification,
      createdAt: Date.now(),
      readBy: []
    };
    
    await set(newNotificationRef, notificationData);
    return notificationData.id;
  } catch (error) {
    console.error('Error pushing notification:', error);
    return null;
  }
};

export const subscribeToLiveNotifications = (workspaceId, callback) => {
  if (!workspaceId) return () => {};
  
  const notificationsRef = ref(rtdb, `workspaceLive/${workspaceId}/notifications`);
  return onValue(notificationsRef, (snapshot) => {
    const data = snapshot.val();
    const notifications = data ? Object.values(data).sort((a, b) => b.createdAt - a.createdAt) : [];
    callback(notifications);
  }, (error) => {
    console.error('Notifications subscription error:', error);
    callback([]);
  });
};

export const markLiveNotificationRead = async (workspaceId, notificationId, uid) => {
  if (!workspaceId || !notificationId || !uid) return false;
  
  try {
    const notificationRef = ref(rtdb, `workspaceLive/${workspaceId}/notifications/${notificationId}`);
    await update(notificationRef, {
      [`readBy/${uid}`]: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification read:', error);
    return false;
  }
};

// ─── ACTIVITY ─────────────────────────────────────────────────────────────────────

export const pushLiveActivity = async (workspaceId, activity) => {
  if (!workspaceId) return null;
  
  try {
    const activityRef = ref(rtdb, `workspaceLive/${workspaceId}/activity`);
    const newActivityRef = push(activityRef);
    
    const activityData = {
      id: newActivityRef.key,
      ...activity,
      timestamp: Date.now()
    };
    
    await set(newActivityRef, activityData);
    return activityData.id;
  } catch (error) {
    console.error('Error pushing activity:', error);
    return null;
  }
};

export const subscribeToLiveActivity = (workspaceId, callback) => {
  if (!workspaceId) return () => {};
  
  const activityRef = ref(rtdb, `workspaceLive/${workspaceId}/activity`);
  return onValue(activityRef, (snapshot) => {
    const data = snapshot.val();
    const activities = data ? Object.values(data).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50) : [];
    callback(activities);
  }, (error) => {
    console.error('Activity subscription error:', error);
    callback([]);
  });
};

// ─── MEMBERSHIP MIRROR ─────────────────────────────────────────────────────────────

export const updateMembershipMirror = async (workspaceId, member) => {
  if (!workspaceId || !member || !member.uid) return false;
  
  try {
    const mirrorRef = ref(rtdb, `workspaceMembersMirror/${workspaceId}/${member.uid}`);
    
    const mirrorData = {
      uid: member.uid,
      email: member.email,
      displayName: member.displayName,
      role: member.role,
      active: member.active !== false,
      modulePermissions: member.permissions || null,
      updatedAt: Date.now()
    };
    
    await set(mirrorRef, mirrorData);
    return true;
  } catch (error) {
    console.error('Error updating membership mirror:', error);
    return false;
  }
};

export const removeMembershipMirror = async (workspaceId, uid) => {
  if (!workspaceId || !uid) return false;
  
  try {
    const mirrorRef = ref(rtdb, `workspaceMembersMirror/${workspaceId}/${uid}`);
    await remove(mirrorRef);
    return true;
  } catch (error) {
    console.error('Error removing membership mirror:', error);
    return false;
  }
};

// ─── SYNC STATUS ─────────────────────────────────────────────────────────────────

export const updateSyncStatus = async (workspaceId, uid, status) => {
  if (!workspaceId || !uid) return false;
  
  try {
    const syncRef = ref(rtdb, `workspaceLive/${workspaceId}/syncStatus/${uid}`);
    await set(syncRef, {
      uid,
      status, // 'syncing', 'synced', 'error', 'offline'
      lastUpdated: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error updating sync status:', error);
    return false;
  }
};
