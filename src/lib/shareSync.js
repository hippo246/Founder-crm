// ─── shareSync.js ─────────────────────────────────────────────────────────────
// Public-safe Firestore helpers for share tokens and client uploads.
// No authentication required — the token itself is the secret.
//
// Firestore paths:
//   workspaces/{wsId}/shareTokens/{token}   → { docId, docName, allowUpload, content, createdAt }
//   workspaces/{wsId}/clientUploads/{token}/files/{fileId} → { name, size, url, uploadedAt }
//
// firestore.rules you need to add:
//   match /workspaces/{wsId}/shareTokens/{token} {
//     allow read: if true;
//   }
//   match /workspaces/{wsId}/clientUploads/{token}/files/{fileId} {
//     allow read, write: if true;
//   }
// ──────────────────────────────────────────────────────────────────────────────

import { db, isFirebaseConfigured } from "./firebase.js";
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, addDoc, getDocs, serverTimestamp
} from "firebase/firestore";

// ─── Write a share token to Firestore ────────────────────────────────────────
// Call this when the user clicks "Generate link" in ShareLinkModal.
// docSnapshot should be the full doc object so the share page can render it.

export async function createShareToken(workspaceId, token, docSnapshot, allowUpload) {
  if (!isFirebaseConfigured() || !workspaceId) return;
  const ref = doc(db, "workspaces", workspaceId, "shareTokens", token);
  await setDoc(ref, {
    docId:       docSnapshot.id,
    docName:     docSnapshot.name,
    docType:     docSnapshot.type    || "Document",
    docStatus:   docSnapshot.status  || "Draft",
    content:     docSnapshot.editorContent || "",
    relatedClient: docSnapshot.relatedClient || null,
    allowUpload: !!allowUpload,
    createdAt:   serverTimestamp(),
  });
}

// ─── Delete a share token (revoke) ───────────────────────────────────────────

export async function revokeShareToken(workspaceId, token) {
  if (!isFirebaseConfigured() || !workspaceId || !token) return;
  await deleteDoc(doc(db, "workspaces", workspaceId, "shareTokens", token));
}

// ─── Read a share token (called by SharePage — no auth) ──────────────────────
// Returns the token data object, or null if not found / invalid.

export async function getShareToken(workspaceId, token) {
  if (!isFirebaseConfigured() || !workspaceId || !token) return null;
  try {
    const snap = await getDoc(doc(db, "workspaces", workspaceId, "shareTokens", token));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn("[shareSync] getShareToken failed:", err.message);
    return null;
  }
}

// ─── Upload a client file record (called by SharePage — no auth) ─────────────
// Stores { name, size, dataUrl, uploadedAt } under the token's files subcollection.
// Note: dataUrl storage works for small files (<800KB after base64 expansion).
// For larger files you'd swap this for Firebase Storage — see comment below.

export async function addClientUpload(workspaceId, token, file) {
  if (!isFirebaseConfigured() || !workspaceId || !token) return null;
  const filesRef = collection(db, "workspaces", workspaceId, "clientUploads", token, "files");
  const docRef = await addDoc(filesRef, {
    name:       file.name,
    size:       file.size,
    dataUrl:    file.dataUrl,   // base64 data URL — swap for Storage download URL if files are large
    uploadedAt: new Date().toISOString(),
  });
  return { id: docRef.id, ...file };
}

// ─── List client uploads for a token (called by ShareLinkModal to refresh) ───

export async function getClientUploads(workspaceId, token) {
  if (!isFirebaseConfigured() || !workspaceId || !token) return [];
  try {
    const filesRef = collection(db, "workspaces", workspaceId, "clientUploads", token, "files");
    const snap = await getDocs(filesRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[shareSync] getClientUploads failed:", err.message);
    return [];
  }
}
