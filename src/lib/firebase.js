import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const config = {
  apiKey: "AIzaSyA1c-RkFt-rv-PIqAkC_oZHfZWS1izMCS0",
  authDomain: "founder-crm-f5c43.firebaseapp.com",
  projectId: "founder-crm-f5c43",
  storageBucket: "founder-crm-f5c43.firebasestorage.app",
  messagingSenderId: "874103289938",
  appId: "1:874103289938:web:f109c1f8a356c2857b478b",
  databaseURL: "https://founder-crm-f5c43-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(config);

// Initialize Firebase services with offline support
export const auth = getAuth(app);

// Use getFirestore() if it's already initialized, otherwise initialize it
let firestoreDb;
try {
  firestoreDb = getFirestore(app);
} catch (e) {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  });
}
export const db = firestoreDb;

export const storage = getStorage(app);
export const rtdb = getDatabase(app, "https://founder-crm-f5c43-default-rtdb.asia-southeast1.firebasedatabase.app");

// Export config for display purposes
export const firebaseConfig = config;

// Helper to check if Firebase is configured
export const isFirebaseConfigured = () => {
  return !!firebaseConfig.projectId && !!firebaseConfig.apiKey;
};

// Set auth persistence to LOCAL (survives browser restart)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Auth persistence error:', err);
});



export default app;
