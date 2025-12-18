/**
 * Content Script for Auth Sync - Firefox
 */

declare const browser: typeof chrome | undefined;
const browserAPI: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;

const AUTH_STORAGE_KEY = "flow_auth_credentials";

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

function syncCredentialsFromLocalStorage(): void {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const credentials = JSON.parse(stored);
      if (credentials && credentials.expiresAt > Date.now()) {
        browserAPI.runtime.sendMessage(
          { type: "STORE_AUTH_CREDENTIALS", credentials },
          (response) => {
            if (browserAPI.runtime.lastError) {
              console.warn(
                "[Flow] Error syncing credentials:",
                browserAPI.runtime.lastError.message
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

function setupAuthEventListeners(): void {
  window.addEventListener("flow-auth-update", ((event: CustomEvent) => {
    const credentials = event.detail;
    if (credentials) {
      browserAPI.runtime.sendMessage(
        { type: "STORE_AUTH_CREDENTIALS", credentials },
        (response) => {
          if (browserAPI.runtime.lastError) {
            console.warn(
              "[Flow] Error storing credentials:",
              browserAPI.runtime.lastError.message
            );
          } else if (response?.success) {
            console.log("[Flow] Auth credentials updated");
          }
        }
      );
    }
  }) as EventListener);

  window.addEventListener("flow-auth-clear", () => {
    browserAPI.runtime.sendMessage(
      { type: "CLEAR_AUTH_CREDENTIALS" },
      (response) => {
        if (browserAPI.runtime.lastError) {
          console.warn(
            "[Flow] Error clearing credentials:",
            browserAPI.runtime.lastError.message
          );
        } else if (response?.success) {
          console.log("[Flow] Auth credentials cleared");
        }
      }
    );
  });

  window.addEventListener("storage", (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      if (event.newValue) {
        try {
          const credentials = JSON.parse(event.newValue);
          if (credentials && credentials.expiresAt > Date.now()) {
            browserAPI.runtime.sendMessage(
              { type: "STORE_AUTH_CREDENTIALS", credentials },
              () => {
                if (browserAPI.runtime.lastError) {
                  // Ignore errors
                }
              }
            );
          }
        } catch {
          // Ignore parse errors
        }
      } else {
        browserAPI.runtime.sendMessage(
          { type: "CLEAR_AUTH_CREDENTIALS" },
          () => {
            if (browserAPI.runtime.lastError) {
              // Ignore errors
            }
          }
        );
      }
    }
  });
}

if (isFlowDomain()) {
  console.log("[Flow] Auth sync content script loaded");
  syncCredentialsFromLocalStorage();
  setupAuthEventListeners();
}
