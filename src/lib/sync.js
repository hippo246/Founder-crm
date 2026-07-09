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

// ─── Write array → Firestore subcollection (batch) ───────────────────────────

export const syncSaveCollection = async (workspaceId, key, items) => {
  if (!isFirebaseConfigured() || !workspaceId || !Array.isArray(items)) return;
  const colName = getCollectionName(key);
  if (!colName) return;

  try {
    const colRef = collection(db, "workspaces", workspaceId, colName);

    // Batch writes — Firestore allows max 500 per batch
    const BATCH_SIZE = 400;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + BATCH_SIZE);
      for (const item of chunk) {
        if (!item || !item.id) continue;
        const ref = doc(colRef, item.id);
        batch.set(ref, { ...item, _synced: true, _syncedAt: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn(`[sync] Failed to save ${key} to Firestore:`, err.message);
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
    if (snapshot.empty) return null;
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
    await deleteDoc(doc(db, "workspaces", workspaceId, colName, itemId));
  } catch (err) {
    console.warn(`[sync] Failed to delete ${key}/${itemId}:`, err.message);
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
      if (!snapshot.empty) {
        const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        setter(items);
      }
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
    const auditRef = collection(db, "workspaces", workspaceId, "auditLogs");
    await addDoc(auditRef, {
      ...entry,
      _synced: true,
      timestamp: entry.ts || new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[sync] Failed to write audit log to Firestore:", err.message);
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
    if (items && items.length > 0) {
      results[key] = items;
    }
  }));

  return results;
};
