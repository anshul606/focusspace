/**
 * Firebase configuration for Chrome extension context
 * Uses chrome.storage for credential persistence and syncs with web app auth
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { StoredAuthCredentials } from "./types";

// Firebase configuration - these values should match the web app
const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Initialize Firebase app for extension context
 */
export function initializeFirebase(
  config?: typeof firebaseConfig
): FirebaseApp {
  const finalConfig = config || firebaseConfig;

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(finalConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
}

/**
 * Get Firestore instance
 */
export function getFirebaseDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db!;
}

/**
 * Storage key for auth credentials
 */
const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

/**
 * Get stored auth credentials from chrome.storage.local
 */
export async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_STORAGE_KEY], (result) => {
      const credentials = result[AUTH_STORAGE_KEY] as
        | StoredAuthCredentials
        | undefined;

      if (credentials && credentials.expiresAt > Date.now()) {
        resolve(credentials);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Store auth credentials in chrome.storage.local
 */
export async function storeCredentials(
  credentials: StoredAuthCredentials
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTH_STORAGE_KEY]: credentials }, () => {
      resolve();
    });
  });
}

/**
 * Clear stored auth credentials
 */
export async function clearCredentials(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([AUTH_STORAGE_KEY], () => {
      resolve();
    });
  });
}

/**
 * Listen for auth credential changes from the web app
 * The web app stores credentials in chrome.storage when user logs in
 */
export function setupAuthListener(
  onAuthChange: (user: User | null) => void
): () => void {
  const authInstance = getFirebaseAuth();

  // Listen for Firebase auth state changes
  const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
    onAuthChange(user);
  });

  // Listen for storage changes (credentials from web app)
  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "local" && changes[AUTH_STORAGE_KEY]) {
      const newCredentials = changes[AUTH_STORAGE_KEY].newValue as
        | StoredAuthCredentials
        | undefined;

      if (newCredentials) {
        // Credentials updated - could trigger re-auth if needed
        console.log("Auth credentials updated from web app");
      } else {
        // Credentials cleared - user logged out
        console.log("Auth credentials cleared - user logged out");
        onAuthChange(null);
      }
    }
  };

  chrome.storage.onChanged.addListener(storageListener);

  // Return cleanup function
  return () => {
    unsubscribeAuth();
    chrome.storage.onChanged.removeListener(storageListener);
  };
}

/**
 * Get current user ID from stored credentials or Firebase auth
 */
export async function getCurrentUserId(): Promise<string | null> {
  const authInstance = getFirebaseAuth();

  // First check Firebase auth
  if (authInstance.currentUser) {
    return authInstance.currentUser.uid;
  }

  // Fall back to stored credentials
  const credentials = await getStoredCredentials();
  return credentials?.uid || null;
}
