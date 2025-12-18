/**
 * Background Script for Flow Firefox Extension
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
import { shouldBlockUrl, fetchAllowedDomains } from "../lib/url-blocker";
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

const AUTH_STORAGE_KEY = "flow_auth_credentials";

// Track URLs that were already open when session started (don't log these as attempts)
const preOpenedUrls = new Set<string>();

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
        // Check if previous session was completed (not just stopped/cancelled)
        if (previousSession && previousSession.status === "active") {
          checkIfSessionCompleted(userId, previousSession.id, previousSession);
        }

        currentSession = null;
        console.log("[Flow] No active session");
        preOpenedUrls.clear();
        notifyAllTabsSessionEnded();
      } else {
        const docData = snapshot.docs[0];
        currentSession = {
          id: docData.id,
          ...docData.data(),
        } as FocusSession;
        console.log("[Flow] Active session loaded:", currentSession.id);

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
      console.error("[Flow] Error listening to session:", error);
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
  console.log("[Flow] Initializing Firefox background script");

  // Fetch allowed domains from server on startup
  fetchAllowedDomains().catch((err) => {
    console.warn("[Flow] Failed to fetch allowed domains on init:", err);
  });

  const credentials = await getStoredCredentials();

  if (credentials) {
    currentUserId = credentials.uid;
    setupSessionListener(credentials.uid);
    console.log("[Flow] Authenticated as user:", credentials.uid);
  } else {
    console.log("[Flow] No stored credentials - waiting for login");
  }
}

async function checkAllOpenTabs(): Promise<void> {
  if (!currentSession || currentSession.status !== "active") return;

  try {
    const tabs = await browserAPI.tabs.query({});

    // Clear and rebuild the pre-opened URLs set
    preOpenedUrls.clear();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      if (shouldBlockUrl(tab.url, currentSession)) {
        console.log("[Flow] Blocking already open tab:", tab.url);

        // Mark this URL as pre-opened (don't log as attempt)
        preOpenedUrls.add(tab.url);

        // Send message to show overlay (but don't log the attempt)
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
    console.error("[Flow] Error checking open tabs:", error);
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
          console.log("[Flow] Could not show overlay on tab:", tabId);
        });
    }, 100);
  } catch (error) {
    console.log("[Flow] Could not inject overlay into tab:", tabId, error);
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

    console.log("[Flow] Logged tab switch attempt:", attemptedUrl);
  } catch (error) {
    console.error("[Flow] Error logging tab switch attempt:", error);
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
    console.error("[Flow] Error incrementing tab switch attempts:", error);
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
        console.log("[Flow] User logged in:", newCredentials.uid);
      } else {
        cleanupSessionListener();
        console.log("[Flow] User logged out");
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
    console.error("[Flow] Error notifying tabs:", error);
  }
}

/**
 * Check if a session was completed (not stopped early) and show congratulations
 */
async function checkIfSessionCompleted(
  userId: string,
  sessionId: string,
  previousSession: FocusSession
): Promise<void> {
  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    const sessionRef = doc(db, "users", userId, "sessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      if (sessionData.status === "completed") {
        console.log("[Flow] Session completed! Showing congratulations.");
        notifyAllTabsSessionComplete(
          previousSession.durationMinutes,
          sessionData.tabSwitchAttempts || 0
        );
      }
    }
  } catch (error) {
    console.error("[Flow] Error checking session completion:", error);
  }
}

/**
 * Notify all tabs to show the session complete congratulations overlay
 */
async function notifyAllTabsSessionComplete(
  durationMinutes: number,
  blockedAttempts: number
): Promise<void> {
  try {
    const tabs = await browserAPI.tabs.query({
      active: true,
      currentWindow: true,
    });
    for (const tab of tabs) {
      if (!tab.id) continue;
      browserAPI.tabs
        .sendMessage(tab.id, {
          type: "SHOW_SESSION_COMPLETE",
          durationMinutes,
          blockedAttempts,
        })
        .catch(() => {
          injectAndShowCongratulations(
            tab.id!,
            durationMinutes,
            blockedAttempts
          );
        });
    }
  } catch (error) {
    console.error("[Flow] Error showing session complete:", error);
  }
}

/**
 * Inject content script and show congratulations overlay
 */
async function injectAndShowCongratulations(
  tabId: number,
  durationMinutes: number,
  blockedAttempts: number
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
          type: "SHOW_SESSION_COMPLETE",
          durationMinutes,
          blockedAttempts,
        })
        .catch(() => {
          console.log("[Flow] Could not show congratulations on tab:", tabId);
        });
    }, 100);
  } catch (error) {
    console.log(
      "[Flow] Could not inject congratulations into tab:",
      tabId,
      error
    );
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
  console.log("[Flow] Auth credentials stored for user:", credentials.uid);
}

async function handleClearCredentials(): Promise<void> {
  if (currentSession && currentUserId && currentSession.status === "active") {
    try {
      await stopActiveSession(currentUserId, currentSession.id);
      console.log("[Flow] Active session stopped on logout");
    } catch (error) {
      console.error("[Flow] Error stopping session on logout:", error);
    }
  }

  await new Promise<void>((resolve) => {
    browserAPI.storage.local.remove([AUTH_STORAGE_KEY], () => {
      resolve();
    });
  });

  cleanupSessionListener();
  console.log("[Flow] Auth credentials cleared");
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
    console.log("[Flow] Blocking navigation to:", details.url);

    // Only log the attempt if this is a NEW navigation (not a pre-opened tab)
    if (currentSession && currentUserId && !preOpenedUrls.has(details.url)) {
      logTabSwitchAttempt(currentUserId, currentSession.id, details.url);
    }
  }
});

browserAPI.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    console.log("[Flow] Page committed, showing overlay:", details.url);

    // Only log the attempt if this is a NEW navigation (not a pre-opened tab)
    if (currentSession && currentUserId && !preOpenedUrls.has(details.url)) {
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
