/**
 * Content Script for Auth Sync
 * Listens for auth events from the web app and relays them to the background service worker
 *
 * Requirements:
 * - 7.2: Receive authentication credentials from web app
 * - 7.4: Handle logout and clear extension authentication
 */

const AUTH_STORAGE_KEY = "flow_auth_credentials";

/**
 * Check if we're on the Flow web app domain
 */
function isFlowDomain(): boolean {
  const hostname = window.location.hostname;
  // Match localhost for development and production domain (flow.anshul.space)
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("anshul.space") ||
    hostname.includes("vercel.app")
  );
}

/**
 * Read credentials from localStorage and sync to extension
 */
function syncCredentialsFromLocalStorage(): void {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const credentials = JSON.parse(stored);
      if (credentials && credentials.expiresAt > Date.now()) {
        chrome.runtime.sendMessage(
          { type: "STORE_AUTH_CREDENTIALS", credentials },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "[Flow] Error syncing credentials:",
                chrome.runtime.lastError.message
              );
            } else if (response?.success) {
              console.log("[Flow] Credentials synced from localStorage");
            }
          }
        );
      }
    }
  } catch (error) {
    console.error("[Flow] Error reading credentials from localStorage:", error);
  }
}

/**
 * Set up event listeners for auth updates from the web app
 */
function setupAuthEventListeners(): void {
  // Listen for auth update events
  window.addEventListener("flow-auth-update", ((event: CustomEvent) => {
    const credentials = event.detail;
    if (credentials) {
      chrome.runtime.sendMessage(
        { type: "STORE_AUTH_CREDENTIALS", credentials },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Flow] Error storing credentials:",
              chrome.runtime.lastError.message
            );
          } else if (response?.success) {
            console.log("[Flow] Auth credentials updated");
          }
        }
      );
    }
  }) as EventListener);

  // Listen for auth clear events (logout)
  window.addEventListener("flow-auth-clear", () => {
    chrome.runtime.sendMessage(
      { type: "CLEAR_AUTH_CREDENTIALS" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[Flow] Error clearing credentials:",
            chrome.runtime.lastError.message
          );
        } else if (response?.success) {
          console.log("[Flow] Auth credentials cleared");
        }
      }
    );
  });

  // Listen for storage changes (in case credentials are updated in another tab)
  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      if (event.newValue) {
        try {
          const credentials = JSON.parse(event.newValue);
          if (credentials && credentials.expiresAt > Date.now()) {
            chrome.runtime.sendMessage(
              { type: "STORE_AUTH_CREDENTIALS", credentials },
              () => {
                if (chrome.runtime.lastError) {
                  // Ignore errors
                }
              }
            );
          }
        } catch {
          // Ignore parse errors
        }
      } else {
        // Credentials were removed
        chrome.runtime.sendMessage({ type: "CLEAR_AUTH_CREDENTIALS" }, () => {
          if (chrome.runtime.lastError) {
            // Ignore errors
          }
        });
      }
    }
  });
}

// Only run on Flow domains
if (isFlowDomain()) {
  console.log("[Flow] Auth sync content script loaded");

  // Sync any existing credentials on page load
  syncCredentialsFromLocalStorage();

  // Set up event listeners for future auth changes
  setupAuthEventListeners();
}
