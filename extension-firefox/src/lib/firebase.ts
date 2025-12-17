/**
 * Firebase configuration for Firefox extension
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { browserAPI } from "./browser-polyfill";
import { StoredAuthCredentials } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function initializeFirebase(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return app;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db!;
}

const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

export async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([AUTH_STORAGE_KEY], (result) => {
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

export async function storeCredentials(
  credentials: StoredAuthCredentials
): Promise<void> {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [AUTH_STORAGE_KEY]: credentials }, () => {
      resolve();
    });
  });
}

export async function clearCredentials(): Promise<void> {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove([AUTH_STORAGE_KEY], () => {
      resolve();
    });
  });
}
