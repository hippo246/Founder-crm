// ─── Firestore Sync Bridge ─────────────────────────────────────────────────────
// All Firestore interaction goes through this file.
// localStorage is always written first (instant UI), Firestore follows async.

import { db, isFirebaseConfigured } from "./firebase.js";
import {
  collection, doc, setDoc, getDocs, getDoc, deleteDoc, addDoc,
  onSnapshot, query, orderBy, writeBatch
} from "firebase/firestore";

// ─── Key → Firestore collection name mapping ─────────────────────────────────

const COLLECTION_MAP = {
  contacts:          "contacts",
  leads:             "leads",
  projects:          "projects",
  tasks:             "tasks",
  followUps:         "followUps",
  notes:             "notes",
  documents:         "documents",
  invoices:          "invoices",
  payments:          "payments",
  proposals:         "proposals",
  communications:    "communications",
  calendarEvents:    "calendarEvents",
  supportTickets:    "supportTickets",
  whatsappTemplates: "templates",
  emailTemplates:    "emailTemplates",
  promptHistory:     "promptHistory",
  projectLogs:       "projectLogs",
  roadmapItems:      "roadmapItems",
  tags:              "tags",
  customFields:      "customFields",
  audit:             "auditLogs",
};

export const getCollectionName = (key) => COLLECTION_MAP[key] || null;

// ─── Offline Sync Queue ───────────────────────────────────────────────────────

const OFFLINE_QUEUE_KEY = "offline_sync_queue";

const loadOfflineQueue = () => {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue) => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

const addToOfflineQueue = (operation) => {
  const queue = loadOfflineQueue();
  queue.push({
    ...operation,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  });
  saveOfflineQueue(queue);
};

const removeFromOfflineQueue = (operationId) => {
  const queue = loadOfflineQueue();
  const filtered = queue.filter(op => op.id !== operationId);
  saveOfflineQueue(filtered);
};

// ─── Process Offline Queue ─────────────────────────────────────────────────────

const processOfflineQueue = async () => {
  if (!isFirebaseConfigured()) return;
  
  const queue = loadOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[sync] Processing ${queue.length} offline operations`);

  for (const operation of queue) {
    try {
      switch (operation.type) {
        case "saveCollection":
          await syncSaveCollectionInternal(
            operation.workspaceId,
            operation.key,
            operation.items
          );
          break;
        case "deleteItem":
          await syncDeleteItemInternal(
            operation.workspaceId,
            operation.key,
            operation.itemId
          );
          break;
        case "addAuditLog":
          await syncAddAuditLogInternal(
            operation.workspaceId,
            operation.entry
          );
          break;
      }
      removeFromOfflineQueue(operation.id);
    } catch (err) {
      console.warn(`[sync] Failed to process operation ${operation.id}:`, err);
      break; // Stop processing on failure
    }
  }
};

// ─── Network Status Listeners ──────────────────────────────────────────────────

let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

const initNetworkListeners = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    console.log("[sync] Back online - processing queue");
    isOnline = true;
    processOfflineQueue();
  });

  window.addEventListener("offline", () => {
    console.log("[sync] Offline - operations will be queued");
    isOnline = false;
  });
};

initNetworkListeners();

// ─── Helper to sanitize data for Firestore ─────────────────────────────────────

const sanitizeForFirestore = (data) => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore);
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue; // Skip undefined fields
      sanitized[key] = sanitizeForFirestore(value);
    }
    return sanitized;
  }
  return data;
};

// ─── Internal Sync Functions (don't use queue) ─────────────────────────────────

const syncSaveCollectionInternal = async (workspaceId, key, items) => {
  if (!isFirebaseConfigured() || !workspaceId || !Array.isArray(items)) return;
  const colName = getCollectionName(key);
  if (!colName) return;

  const colRef = collection(db, "workspaces", workspaceId, colName);

  // Batch writes — Firestore allows max 500 per batch
  const BATCH_SIZE = 400;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + BATCH_SIZE);
    for (const item of chunk) {
      if (!item || !item.id) continue;
      const ref = doc(colRef, item.id);
      const sanitizedItem = sanitizeForFirestore(item);
      batch.set(ref, { ...sanitizedItem, _synced: true, _syncedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
  }
};

const syncDeleteItemInternal = async (workspaceId, key, itemId) => {
  if (!isFirebaseConfigured() || !workspaceId || !itemId) return;
  const colName = getCollectionName(key);
  if (!colName) return;

  await deleteDoc(doc(db, "workspaces", workspaceId, colName, itemId));
};

const syncAddAuditLogInternal = async (workspaceId, entry) => {
  if (!isFirebaseConfigured() || !workspaceId) return;
  const auditRef = collection(db, "workspaces", workspaceId, "auditLogs");
  const sanitizedEntry = sanitizeForFirestore(entry);
  await addDoc(auditRef, {
    ...sanitizedEntry,
    _synced: true,
    timestamp: entry.ts || new Date().toISOString(),
  });
};

// ─── Write array → Firestore subcollection (batch) ───────────────────────────

export const syncSaveCollection = async (workspaceId, key, items) => {
  if (!isFirebaseConfigured() || !workspaceId || !Array.isArray(items)) return;
  const colName = getCollectionName(key);
  if (!colName) return;

  try {
    if (isOnline) {
      await syncSaveCollectionInternal(workspaceId, key, items);
    } else {
      addToOfflineQueue({
        type: "saveCollection",
        workspaceId,
        key,
        items
      });
    }
  } catch (err) {
    console.warn(`[sync] Failed to save ${key} to Firestore, queuing for later:`, err.message);
    addToOfflineQueue({
      type: "saveCollection",
      workspaceId,
      key,
      items
    });
  }
};

// ─── Read all items from Firestore subcollection ─────────────────────────────

export const syncLoadCollection = async (workspaceId, key) => {
  if (!isFirebaseConfigured() || !workspaceId) return null;
  const colName = getCollectionName(key);
  if (!colName) return null;

  try {
    const colRef = collection(db, "workspaces", workspaceId, colName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (err) {
    console.warn(`[sync] Failed to load ${key} from Firestore:`, err.message);
    return null;
  }
};

// ─── Delete a single item from Firestore subcollection ───────────────────────

export const syncDeleteItem = async (workspaceId, key, itemId) => {
  if (!isFirebaseConfigured() || !workspaceId || !itemId) return;
  const colName = getCollectionName(key);
  if (!colName) return;

  try {
    if (isOnline) {
      await syncDeleteItemInternal(workspaceId, key, itemId);
    } else {
      addToOfflineQueue({
        type: "deleteItem",
        workspaceId,
        key,
        itemId
      });
    }
  } catch (err) {
    console.warn(`[sync] Failed to delete ${key}/${itemId}, queuing for later:`, err.message);
    addToOfflineQueue({
      type: "deleteItem",
      workspaceId,
      key,
      itemId
    });
  }
};

// ─── Real-time listener for a collection ─────────────────────────────────────
// Returns unsubscribe function. Call it in useEffect cleanup.

export const subscribeToCollection = (workspaceId, key, setter) => {
  if (!isFirebaseConfigured() || !workspaceId) return () => {};
  const colName = getCollectionName(key);
  if (!colName) return () => {};

  try {
    const colRef = collection(db, "workspaces", workspaceId, colName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setter(items);
    }, (err) => {
      console.warn(`[sync] onSnapshot error for ${key}:`, err.message);
    });
    return unsubscribe;
  } catch (err) {
    console.warn(`[sync] Failed to subscribe to ${key}:`, err.message);
    return () => {};
  }
};

// ─── Add a single audit log entry to Firestore ───────────────────────────────

export const syncAddAuditLog = async (workspaceId, entry) => {
  if (!isFirebaseConfigured() || !workspaceId) return;
  try {
    if (isOnline) {
      await syncAddAuditLogInternal(workspaceId, entry);
    } else {
      addToOfflineQueue({
        type: "addAuditLog",
        workspaceId,
        entry
      });
    }
  } catch (err) {
    console.warn("[sync] Failed to write audit log to Firestore, queuing for later:", err.message);
    addToOfflineQueue({
      type: "addAuditLog",
      workspaceId,
      entry
    });
  }
};

// ─── Hydrate all app state from Firestore on login/startup ───────────────────
// Returns a map of { key: items[] } for all collections found in Firestore.

export const hydrateFromFirestore = async (workspaceId) => {
  if (!isFirebaseConfigured() || !workspaceId) return {};

  const keys = Object.keys(COLLECTION_MAP).filter(k => k !== "audit");
  const results = {};

  await Promise.allSettled(keys.map(async (key) => {
    const items = await syncLoadCollection(workspaceId, key);
    if (items !== null) {
      results[key] = items;
    }
  }));

  // After hydrating, process any offline operations
  if (isOnline) {
    processOfflineQueue();
  }

  return results;
};
