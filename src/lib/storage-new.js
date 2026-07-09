// ─── NEW SUBCOLLECTION-BASED STORAGE ─────────────────────────────────────────────

import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { updateMembershipMirror, removeMembershipMirror } from "./realtime.js";

// ─── Workspace helpers (Firestore only) ───────────────────────────────────────

export const createDefaultWorkspace = (ownerId = null) => ({
  id: "workspace-1",
  name: "My Business",
  currency: "INR",
  businessName: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  businessWebsite: "",
  businessId: "",
  invoicePrefix: "INV",
  proposalPrefix: "PROP",
  receiptPrefix: "REC",
  invoiceTax: 18,
  paymentTerms: "Net 30",
  paymentInstructions: "Please pay via UPI or bank transfer",
  invoiceFooter: "Thank you for your business!",
  dateFormat: "DD/MM/YYYY",
  createdAt: new Date().toISOString().slice(0, 10),
  ownerId: ownerId || "default-owner",
  exchangeRates: {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AED: 0.044,
    CAD: 0.016,
    AUD: 0.018,
    SGD: 0.016,
  },
});

export const loadWorkspaces = async (userId = null) => {
  try {
    const workspacesRef = collection(db, 'workspaces');
    const snapshot = await getDocs(workspacesRef);
    
    if (snapshot.empty) {
      const defaultWorkspace = createDefaultWorkspace(userId);
      await setDoc(doc(db, 'workspaces', defaultWorkspace.id), defaultWorkspace);
      return [defaultWorkspace];
    }
    
    const workspaces = snapshot.docs.map(doc => doc.data());
    return Array.isArray(workspaces) && workspaces.length > 0 ? workspaces : [createDefaultWorkspace(userId)];
  } catch (error) {
    console.error('Firestore load workspaces error:', error);
    return [createDefaultWorkspace(userId)];
  }
};

export const saveWorkspaces = async (workspaces) => {
  try {
    for (const workspace of workspaces) {
      await setDoc(doc(db, 'workspaces', workspace.id), workspace);
    }
  } catch (error) {
    console.error('Firestore save workspaces error:', error);
    throw error;
  }
};

// ─── NEW SUBCOLLECTION LOADERS ─────────────────────────────────────────────────

export const loadWorkspaceSubcollection = async (workspaceId, collectionName) => {
  try {
    const collectionRef = collection(db, 'workspaces', workspaceId, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Firestore load ${collectionName} error:`, error);
    return [];
  }
};

export const saveWorkspaceSubcollectionItem = async (workspaceId, collectionName, item, userId) => {
  try {
    const itemWithMeta = {
      ...item,
      workspaceId,
      createdBy: userId,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    };
    
    if (item.id) {
      await setDoc(doc(db, 'workspaces', workspaceId, collectionName, item.id), itemWithMeta, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, 'workspaces', workspaceId, collectionName), {
        ...itemWithMeta,
        createdAt: new Date().toISOString(),
      });
      return { ...itemWithMeta, id: docRef.id };
    }
    return itemWithMeta;
  } catch (error) {
    console.error(`Firestore save ${collectionName} error:`, error);
    throw error;
  }
};

export const deleteWorkspaceSubcollectionItem = async (workspaceId, collectionName, itemId) => {
  try {
    await deleteDoc(doc(db, 'workspaces', workspaceId, collectionName, itemId));
  } catch (error) {
    console.error(`Firestore delete ${collectionName} error:`, error);
    throw error;
  }
};

// ─── COMPATIBILITY WRAPPERS ─────────────────────────────────────────────────────

export const loadWorkspaceData = async (key, fallback, workspaceId) => {
  // Try new subcollection first
  try {
    const collectionName = getCollectionNameForKey(key);
    if (collectionName) {
      const items = await loadWorkspaceSubcollection(workspaceId, collectionName);
      if (items.length > 0) {
        return items;
      }
    }
  } catch (error) {
    console.log('Subcollection load failed, trying old structure:', error);
  }

  // Fallback to old structure
  try {
    const docRef = doc(db, 'workspaces', workspaceId, 'data', key);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().value;
    }
    return fallback;
  } catch (error) {
    if (error.code === 'unavailable' || error.code === 'failed-precondition') {
      console.log('Firestore offline - using fallback for', key);
    } else {
      console.error('Firestore load error for', key, ':', error);
    }
    return fallback;
  }
};

export const saveWorkspaceData = async (key, val, workspaceId, userId) => {
  // Try new subcollection first
  try {
    const collectionName = getCollectionNameForKey(key);
    if (collectionName && Array.isArray(val)) {
      // Save each item as a separate document
      for (const item of val) {
        await saveWorkspaceSubcollectionItem(workspaceId, collectionName, item, userId);
      }
      return true;
    }
  } catch (error) {
    console.log('Subcollection save failed, using old structure:', error);
  }

  // Fallback to old structure
  try {
    const docRef = doc(db, 'workspaces', workspaceId, 'data', key);
    await setDoc(docRef, {
      value: val,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Firestore save error for', key, ':', error);
    throw error;
  }
};

// ─── MIGRATION HELPERS ─────────────────────────────────────────────────────────

export const getCollectionNameForKey = (key) => {
  const mapping = {
    'contacts': 'contacts',
    'leads': 'leads',
    'projects': 'projects',
    'tasks': 'tasks',
    'audit': 'auditLogs',
    'followUps': 'followUps',
    'notes': 'notes',
    'documents': 'documents',
    'invoices': 'invoices',
    'payments': 'payments',
    'proposals': 'proposals',
    'communications': 'communications',
    'calendarEvents': 'calendarEvents',
    'supportTickets': 'supportTickets',
    'whatsappTemplates': 'templates',
    'promptHistory': 'promptHistory',
    'projectLogs': 'projectLogs',
    'roadmapItems': 'roadmapItems',
    'tags': 'tags',
    'customFields': 'customFields',
    'settings': 'settings',
  };
  return mapping[key] || null;
};

export const migrateWorkspaceData = async (workspaceId, userId) => {
  console.log('Starting migration for workspace:', workspaceId);
  
  const keysToMigrate = [
    'contacts', 'leads', 'projects', 'tasks', 'audit', 'followUps',
    'notes', 'documents', 'invoices', 'payments', 'proposals',
    'communications', 'calendarEvents', 'supportTickets',
    'whatsappTemplates', 'promptHistory', 'projectLogs', 'roadmapItems',
    'tags', 'customFields'
  ];

  const migrationResults = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const key of keysToMigrate) {
    try {
      // Load from old structure
      const docRef = doc(db, 'workspaces', workspaceId, 'data', key);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        migrationResults.skipped.push(key);
        continue;
      }

      const oldData = docSnap.data().value;
      const collectionName = getCollectionNameForKey(key);
      
      if (!collectionName) {
        migrationResults.skipped.push(key);
        continue;
      }

      // Save to new subcollection
      if (Array.isArray(oldData)) {
        for (const item of oldData) {
          await saveWorkspaceSubcollectionItem(workspaceId, collectionName, item, userId);
        }
      } else {
        await saveWorkspaceSubcollectionItem(workspaceId, collectionName, oldData, userId);
      }

      migrationResults.success.push(key);
      console.log(`Migrated ${key}: ${Array.isArray(oldData) ? oldData.length : 1} items`);
    } catch (error) {
      console.error(`Failed to migrate ${key}:`, error);
      migrationResults.failed.push({ key, error: error.message });
    }
  }

  console.log('Migration complete:', migrationResults);
  return migrationResults;
};

// ─── MEMBERSHIP HELPERS ───────────────────────────────────────────────────────

export const getWorkspaceMember = async (workspaceId, userId) => {
  try {
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
    const memberSnap = await getDoc(memberRef);
    
    if (memberSnap.exists()) {
      return memberSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting workspace member:', error);
    return null;
  }
};

export const addWorkspaceMember = async (workspaceId, userId, memberData) => {
  try {
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
    const memberDoc = {
      userId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...memberData
    };
    
    await setDoc(memberRef, memberDoc);
    
    // Update RTDB membership mirror (non-blocking)
    updateMembershipMirror(workspaceId, memberDoc).catch(err => {
      console.warn('Failed to update RTDB membership mirror:', err);
    });
    
    return true;
  } catch (error) {
    console.error('Error adding workspace member:', error);
    throw error;
  }
};

export const updateWorkspaceMember = async (workspaceId, userId, updates) => {
  try {
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
    await updateDoc(memberRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Update RTDB membership mirror (non-blocking)
    const member = await getWorkspaceMember(workspaceId, userId);
    if (member) {
      updateMembershipMirror(workspaceId, { ...member, ...updates }).catch(err => {
        console.warn('Failed to update RTDB membership mirror:', err);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating workspace member:', error);
    throw error;
  }
};

export const removeWorkspaceMember = async (workspaceId, userId) => {
  try {
    await deleteDoc(doc(db, 'workspaces', workspaceId, 'members', userId));
    
    // Remove from RTDB membership mirror (non-blocking)
    removeMembershipMirror(workspaceId, userId).catch(err => {
      console.warn('Failed to remove RTDB membership mirror:', err);
    });
    
    return true;
  } catch (error) {
    console.error('Error removing workspace member:', error);
    throw error;
  }
};

export const getWorkspaceMembers = async (workspaceId) => {
  try {
    const membersRef = collection(db, 'workspaces', workspaceId, 'members');
    const snapshot = await getDocs(membersRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting workspace members:', error);
    return [];
  }
};

// ─── AUDIT LOG HELPERS ───────────────────────────────────────────────────────

export const addAuditLog = async (workspaceId, userId, userName, role, module, action, recordType, recordId, description, before = null, after = null) => {
  try {
    const auditRef = collection(db, 'workspaces', workspaceId, 'auditLogs');
    await addDoc(auditRef, {
      workspaceId,
      userId,
      userName,
      role,
      module,
      action,
      recordType,
      recordId,
      description,
      before,
      after,
      severity: 'info',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error adding audit log:', error);
  }
};

export const getAuditLogs = async (workspaceId, limit = 100) => {
  try {
    const auditRef = collection(db, 'workspaces', workspaceId, 'auditLogs');
    const snapshot = await getDocs(auditRef);
    const logs = snapshot.docs.map(doc => doc.data());
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
};
