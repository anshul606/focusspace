/**
 * Background Service Worker for FocusSpace Chrome Extension
 * Handles session monitoring, URL blocking, and tab switch attempt logging
 *
 * Requirements:
 * - 3.1: Block navigation to URLs not in allowlist during allowlist mode
 * - 3.2: Block navigation to URLs in blocklist during blocklist mode
 * - 6.3: Fetch current active session state from Firebase on extension start
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

// Firebase configuration - should match web app
const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

// State
let app: FirebaseApp | null = null;
let currentSession: FocusSession | null = null;
let currentUserId: string | null = null;
let sessionUnsubscribe: Unsubscribe | null = null;

// Storage key for auth credentials
const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

/**
 * Initialize Firebase app
 */
function initializeFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Get stored auth credentials from chrome.storage.local
 */
async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
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
 * Set up Firebase listener for active session
 * Requirements: 6.3 - Fetch current active session state from Firebase
 */
function setupSessionListener(userId: string): void {
  // Clean up existing listener
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
        // Notify all tabs to remove overlay when session ends
        notifyAllTabsSessionEnded();
      } else {
        const docData = snapshot.docs[0];
        currentSession = {
          id: docData.id,
          ...docData.data(),
        } as FocusSession;
        console.log("[FocusSpace] Active session loaded:", currentSession.id);

        // Check all open tabs when session starts or changes
        // Only do this if session just became active or URLs changed
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

/**
 * Clean up session listener
 */
function cleanupSessionListener(): void {
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }
  currentSession = null;
  currentUserId = null;
}

/**
 * Initialize the extension - check for auth and set up listeners
 */
async function initialize(): Promise<void> {
  console.log("[FocusSpace] Initializing background service worker");

  const credentials = await getStoredCredentials();

  if (credentials) {
    currentUserId = credentials.uid;
    setupSessionListener(credentials.uid);
    console.log("[FocusSpace] Authenticated as user:", credentials.uid);
  } else {
    console.log("[FocusSpace] No stored credentials - waiting for login");
  }
}

/**
 * Handle navigation events - block restricted URLs
 * Requirements: 3.1, 3.2 - Block URLs based on session mode
 */
function handleNavigation(
  details: chrome.webNavigation.WebNavigationBaseCallbackDetails
): void {
  // Only handle main frame navigations
  if (details.frameId !== 0) {
    return;
  }

  const url = details.url;

  // Check if URL should be blocked
  if (shouldBlockUrl(url, currentSession)) {
    console.log("[FocusSpace] Blocking navigation to:", url);

    // Log the attempt
    if (currentSession && currentUserId) {
      logTabSwitchAttempt(currentUserId, currentSession.id, url);
    }

    // Instead of redirecting to about:blank, we'll let the page load
    // and show the overlay via content script. The overlay will cover the page.
    // This is handled by onCommitted listener below.
  }
}

/**
 * Check all open tabs and apply blocking overlay if needed
 * Called when session starts or changes
 */
async function checkAllOpenTabs(): Promise<void> {
  if (!currentSession || currentSession.status !== "active") {
    return;
  }

  try {
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      if (shouldBlockUrl(tab.url, currentSession)) {
        console.log("[FocusSpace] Blocking already open tab:", tab.url);

        // Log the attempt
        if (currentUserId) {
          logTabSwitchAttempt(currentUserId, currentSession.id, tab.url);
        }

        // Send message to show overlay
        chrome.tabs
          .sendMessage(tab.id, {
            type: "SHOW_BLOCKING_OVERLAY",
            url: tab.url,
            session: currentSession,
          })
          .catch(() => {
            // Content script might not be loaded, try injecting it
            injectBlockingOverlay(tab.id!, tab.url!);
          });
      }
    }
  } catch (error) {
    console.error("[FocusSpace] Error checking open tabs:", error);
  }
}

/**
 * Inject blocking overlay into a tab that doesn't have the content script
 */
async function injectBlockingOverlay(
  tabId: number,
  url: string
): Promise<void> {
  try {
    // First inject the CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["dist/content/overlay.css"],
    });

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content/blocking-overlay.js"],
    });

    // Now send the message to show overlay
    setTimeout(() => {
      chrome.tabs
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

/**
 * Log a tab switch attempt to Firebase
 * Requirements: 3.4, 3.5 - Log attempts with timestamp and URL, increment counter
 */
async function logTabSwitchAttempt(
  userId: string,
  sessionId: string,
  attemptedUrl: string
): Promise<void> {
  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    // Add attempt record to subcollection
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

    // Increment the session's tabSwitchAttempts counter
    await incrementTabSwitchAttempts(userId, sessionId);

    console.log("[FocusSpace] Logged tab switch attempt:", attemptedUrl);
  } catch (error) {
    console.error("[FocusSpace] Error logging tab switch attempt:", error);
  }
}

/**
 * Increment the tab switch attempts counter for a session
 * Requirements: 3.5 - Increment tab switch attempt counter
 */
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

/**
 * Listen for auth credential changes from the web app
 */
function setupAuthListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[AUTH_STORAGE_KEY]) {
      const newCredentials = changes[AUTH_STORAGE_KEY].newValue as
        | StoredAuthCredentials
        | undefined;

      if (newCredentials && newCredentials.expiresAt > Date.now()) {
        // User logged in
        currentUserId = newCredentials.uid;
        setupSessionListener(newCredentials.uid);
        console.log("[FocusSpace] User logged in:", newCredentials.uid);
      } else {
        // User logged out
        cleanupSessionListener();
        console.log("[FocusSpace] User logged out");
      }
    }
  });
}

/**
 * Handle messages from popup or content scripts
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
        // Handle credentials from content script
        handleStoreCredentials(message.credentials)
          .then(() => sendResponse({ success: true }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true; // Async response

      case "CLEAR_AUTH_CREDENTIALS":
        // Handle logout from content script
        handleClearCredentials()
          .then(() => sendResponse({ success: true }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true; // Async response

      default:
        sendResponse({ error: "Unknown message type" });
    }

    // Return true to indicate async response
    return true;
  });
}

/**
 * Handle external messages from the web app
 * Requirements: 7.2, 7.3 - Receive and use authentication credentials from web app
 */
function setupExternalMessageListener(): void {
  chrome.runtime.onMessageExternal.addListener(
    (message, _sender, sendResponse) => {
      switch (message.type) {
        case "STORE_AUTH_CREDENTIALS":
          handleStoreCredentials(message.credentials)
            .then(() => sendResponse({ success: true }))
            .catch((error) =>
              sendResponse({ success: false, error: error.message })
            );
          return true; // Async response

        case "CLEAR_AUTH_CREDENTIALS":
          handleClearCredentials()
            .then(() => sendResponse({ success: true }))
            .catch((error) =>
              sendResponse({ success: false, error: error.message })
            );
          return true; // Async response

        default:
          sendResponse({ error: "Unknown message type" });
      }
      return true;
    }
  );
}

/**
 * Store auth credentials and set up session listener
 * Requirements: 7.2, 7.3 - Use credentials for Firebase operations
 */
async function handleStoreCredentials(
  credentials: StoredAuthCredentials
): Promise<void> {
  // Store credentials in chrome.storage.local
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [AUTH_STORAGE_KEY]: credentials }, () => {
      resolve();
    });
  });

  // Update current user and set up session listener
  currentUserId = credentials.uid;
  setupSessionListener(credentials.uid);
  console.log(
    "[FocusSpace] Auth credentials stored for user:",
    credentials.uid
  );
}

/**
 * Clear auth credentials and clean up session listener
 * Requirements: 7.4 - Clear extension authentication on logout
 */
async function handleClearCredentials(): Promise<void> {
  // Stop any active session before clearing credentials
  if (currentSession && currentUserId && currentSession.status === "active") {
    try {
      await stopActiveSession(currentUserId, currentSession.id);
      console.log("[FocusSpace] Active session stopped on logout");
    } catch (error) {
      console.error("[FocusSpace] Error stopping session on logout:", error);
    }
  }

  // Clear credentials from chrome.storage.local
  await new Promise<void>((resolve) => {
    chrome.storage.local.remove([AUTH_STORAGE_KEY], () => {
      resolve();
    });
  });

  // Clean up session listener
  cleanupSessionListener();
  console.log("[FocusSpace] Auth credentials cleared");
}

/**
 * Stop an active session
 * Requirements: 7.4 - Terminate active session on logout
 */
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

/**
 * Notify all tabs to remove blocking overlay when session ends
 */
async function notifyAllTabsSessionEnded(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs
        .sendMessage(tab.id, { type: "REMOVE_BLOCKING_OVERLAY" })
        .catch(() => {
          // Content script might not be loaded
        });
    }
  } catch (error) {
    console.error("[FocusSpace] Error notifying tabs:", error);
  }
}

// Set up navigation interception
// Requirements: 3.1, 3.2 - Intercept navigation and block restricted URLs
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);

// Set up committed navigation handler for blocking
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    console.log("[FocusSpace] Page committed, showing overlay:", details.url);

    // Log the attempt if not already logged
    if (currentSession && currentUserId) {
      logTabSwitchAttempt(currentUserId, currentSession.id, details.url);
    }

    // Send message to show overlay
    chrome.tabs
      .sendMessage(details.tabId, {
        type: "SHOW_BLOCKING_OVERLAY",
        url: details.url,
        session: currentSession,
      })
      .catch(() => {
        // Content script might not be ready, try injecting
        injectBlockingOverlay(details.tabId, details.url);
      });
  }
});

// Also check on page load complete for already-open tabs
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;

  if (shouldBlockUrl(details.url, currentSession)) {
    chrome.tabs
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

// Check tabs when they become active (user switches to them)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && shouldBlockUrl(tab.url, currentSession)) {
      chrome.tabs
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

// Initialize on service worker start
setupAuthListener();
setupMessageListener();
setupExternalMessageListener();
initialize();

// Export for testing purposes
export {
  logTabSwitchAttempt,
  incrementTabSwitchAttempts,
  shouldBlockUrl,
  currentSession,
  currentUserId,
};
