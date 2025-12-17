/**
 * Background Script for FocusSpace Firefox Extension
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { FocusSession, StoredAuthCredentials } from "../lib/types";
import { shouldBlockUrl } from "../lib/url-blocker";
import { browserAPI } from "../lib/browser-polyfill";

const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

let app: FirebaseApp | null = null;
let currentSession: FocusSession | null = null;
let currentUserId: string | null = null;
let sessionUnsubscribe: Unsubscribe | null = null;

const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

function initializeFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
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

function setupSessionListener(userId: string): void {
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }

  const firebaseApp = initializeFirebaseApp();
  const db = getFirestore(firebaseApp);

  const sessionsRef = collection(db, "users", userId, "sessions");
  const q = query(
    sessionsRef,
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1)
  );

  sessionUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const previousSession = currentSession;

      if (snapshot.empty) {
        currentSession = null;
        console.log("[FocusSpace] No active session");
        notifyAllTabsSessionEnded();
      } else {
        const docData = snapshot.docs[0];
        currentSession = {
          id: docData.id,
          ...docData.data(),
        } as FocusSession;
        console.log("[FocusSpace] Active session loaded:", currentSession.id);

        if (
          !previousSession ||
          previousSession.id !== currentSession.id ||
          JSON.stringify(previousSession.urls) !==
            JSON.stringify(currentSession.urls)
        ) {
          checkAllOpenTabs();
        }
      }
    },
    (error) => {
      console.error("[FocusSpace] Error listening to session:", error);
      currentSession = null;
    }
  );
}

function cleanupSessionListener(): void {
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }
  currentSession = null;
  currentUserId = null;
}

async function initialize(): Promise<void> {
  console.log("[FocusSpace] Initializing Firefox background script");

  const credentials = await getStoredCredentials();

  if (credentials) {
    currentUserId = credentials.uid;
    setupSessionListener(credentials.uid);
    console.log("[FocusSpace] Authenticated as user:", credentials.uid);
  } else {
    console.log("[FocusSpace] No stored credentials - waiting for login");
  }
}

async function checkAllOpenTabs(): Promise<void> {
  if (!currentSession || currentSession.status !== "active") return;

  try {
    const tabs = await browserAPI.tabs.query({});

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      if (shouldBlockUrl(tab.url, currentSession)) {
        console.log("[FocusSpace] Blocking already open tab:", tab.url);

        if (currentUserId) {
          logTabSwitchAttempt(currentUserId, currentSession.id, tab.url);
        }

        browserAPI.tabs
          .sendMessage(tab.id, {
            type: "SHOW_BLOCKING_OVERLAY",
            url: tab.url,
            session: currentSession,
          })
          .catch(() => {
            injectBlockingOverlay(tab.id!, tab.url!);
          });
      }
    }
  } catch (error) {
    console.error("[FocusSpace] Error checking open tabs:", error);
  }
}

async function injectBlockingOverlay(
  tabId: number,
  url: string
): Promise<void> {
  try {
    await browserAPI.tabs.insertCSS(tabId, {
      file: "dist/content/overlay.css",
    });

    await browserAPI.tabs.executeScript(tabId, {
      file: "dist/content/blocking-overlay.js",
    });

    setTimeout(() => {
      browserAPI.tabs
        .sendMessage(tabId, {
          type: "SHOW_BLOCKING_OVERLAY",
          url: url,
          session: currentSession,
        })
        .catch(() => {
          console.log("[FocusSpace] Could not show overlay on tab:", tabId);
        });
    }, 100);
  } catch (error) {
    console.log(
      "[FocusSpace] Could not inject overlay into tab:",
      tabId,
      error
    );
  }
}

async function logTabSwitchAttempt(
  userId: string,
  sessionId: string,
  attemptedUrl: string
): Promise<void> {
  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    const attemptsRef = collection(
      db,
      "users",
      userId,
      "sessions",
      sessionId,
      "attempts"
    );

    await addDoc(attemptsRef, {
      attemptedUrl,
      timestamp: Timestamp.now(),
    });

    await incrementTabSwitchAttempts(userId, sessionId);

    console.log("[FocusSpace] Logged tab switch attempt:", attemptedUrl);
  } catch (error) {
    console.error("[FocusSpace] Error logging tab switch attempt:", error);
  }
}

async function incrementTabSwitchAttempts(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    const sessionRef = doc(db, "users", userId, "sessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const currentAttempts = sessionDoc.data().tabSwitchAttempts || 0;
      await updateDoc(sessionRef, {
        tabSwitchAttempts: currentAttempts + 1,
      });
    }
  } catch (error) {
    console.error(
      "[FocusSpace] Error incrementing tab switch attempts:",
      error
    );
  }
}

function setupAuthListener(): void {
  browserAPI.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[AUTH_STORAGE_KEY]) {
      const newCredentials = changes[AUTH_STORAGE_KEY].newValue as
        | StoredAuthCredentials
        | undefined;

      if (newCredentials && newCredentials.expiresAt > Date.now()) {
        currentUserId = newCredentials.uid;
        setupSessionListener(newCredentials.uid);
        console.log("[FocusSpace] User logged in:", newCredentials.uid);
      } else {
        cleanupSessionListener();
        console.log("[FocusSpace] User logged out");
      }
    }
  });
}

async function notifyAllTabsSessionEnded(): Promise<void> {
  try {
    const tabs = await browserAPI.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      browserAPI.tabs
        .sendMessage(tab.id, { type: "REMOVE_BLOCKING_OVERLAY" })
        .catch(() => {});
    }
  } catch (error) {
    console.error("[FocusSpace] Error notifying tabs:", error);
  }
}

async function handleStoreCredentials(
  credentials: StoredAuthCredentials
): Promise<void> {
  await new Promise<void>((resolve) => {
    browserAPI.storage.local.set({ [AUTH_STORAGE_KEY]: credentials }, () => {
      resolve();
    });
  });

  currentUserId = credentials.uid;
  setupSessionListener(credentials.uid);
  console.log(
    "[FocusSpace] Auth credentials stored for user:",
    credentials.uid
  );
}

async function handleClearCredentials(): Promise<void> {
  if (currentSession && currentUserId && currentSession.status === "active") {
    try {
      await stopActiveSession(currentUserId, currentSession.id);
      console.log("[FocusSpace] Active session stopped on logout");
    } catch (error) {
      console.error("[FocusSpace] Error stopping session on logout:", error);
    }
  }

  await new Promise<void>((resolve) => {
    browserAPI.storage.local.remove([AUTH_STORAGE_KEY], () => {
      resolve();
    });
  });

  cleanupSessionListener();
  console.log("[FocusSpace] Auth credentials cleared");
}

async function stopActiveSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const firebaseApp = initializeFirebaseApp();
  const db = getFirestore(firebaseApp);

  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  await updateDoc(sessionRef, {
    status: "stopped",
    endedAt: Timestamp.now(),
  });
}

function setupMessageListener(): void {
  browserAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "GET_CURRENT_SESSION":
        sendResponse({ session: currentSession, userId: currentUserId });
        break;

      case "GET_AUTH_STATUS":
        sendResponse({
          isAuthenticated: !!currentUserId,
          userId: currentUserId,
        });
        break;

      case "STORE_AUTH_CREDENTIALS":
        handleStoreCredentials(message.credentials)
          .then(() => sendResponse({ success: true }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true;

      case "CLEAR_AUTH_CREDENTIALS":
        handleClearCredentials()
          .then(() => sendResponse({ success: true }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true;

      default:
        sendResponse({ error: "Unknown message type" });
    }
    return true;
  });
}

// Navigation handlers
browserAPI.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    console.log("[FocusSpace] Blocking navigation to:", details.url);

    if (currentSession && currentUserId) {
      logTabSwitchAttempt(currentUserId, currentSession.id, details.url);
    }
  }
});

browserAPI.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    console.log("[FocusSpace] Page committed, showing overlay:", details.url);

    if (currentSession && currentUserId) {
      logTabSwitchAttempt(currentUserId, currentSession.id, details.url);
    }

    browserAPI.tabs
      .sendMessage(details.tabId, {
        type: "SHOW_BLOCKING_OVERLAY",
        url: details.url,
        session: currentSession,
      })
      .catch(() => {
        injectBlockingOverlay(details.tabId, details.url);
      });
  }
});

browserAPI.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    browserAPI.tabs
      .sendMessage(details.tabId, {
        type: "SHOW_BLOCKING_OVERLAY",
        url: details.url,
        session: currentSession,
      })
      .catch(() => {
        injectBlockingOverlay(details.tabId, details.url);
      });
  }
});

browserAPI.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await browserAPI.tabs.get(activeInfo.tabId);
    if (tab.url && shouldBlockUrl(tab.url, currentSession)) {
      browserAPI.tabs
        .sendMessage(activeInfo.tabId, {
          type: "SHOW_BLOCKING_OVERLAY",
          url: tab.url,
          session: currentSession,
        })
        .catch(() => {
          injectBlockingOverlay(activeInfo.tabId, tab.url!);
        });
    }
  } catch (error) {
    // Tab might not exist
  }
});

// Initialize
setupAuthListener();
setupMessageListener();
initialize();
