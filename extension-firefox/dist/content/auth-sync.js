"use strict";
(() => {
  // src/content/auth-sync.ts
  var browserAPI = typeof browser !== "undefined" ? browser : chrome;
  var AUTH_STORAGE_KEY = "focusspace_auth_credentials";
  function isFocusSpaceDomain() {
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("focusspace") || hostname.includes("vercel.app");
  }
  function syncCredentialsFromLocalStorage() {
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
                  "[FocusSpace] Error syncing credentials:",
                  browserAPI.runtime.lastError.message
                );
              } else if (response?.success) {
                console.log("[FocusSpace] Credentials synced from localStorage");
              }
            }
          );
        }
      }
    } catch (error) {
      console.error(
        "[FocusSpace] Error reading credentials from localStorage:",
        error
      );
    }
  }
  function setupAuthEventListeners() {
    window.addEventListener("focusspace-auth-update", (event) => {
      const credentials = event.detail;
      if (credentials) {
        browserAPI.runtime.sendMessage(
          { type: "STORE_AUTH_CREDENTIALS", credentials },
          (response) => {
            if (browserAPI.runtime.lastError) {
              console.warn(
                "[FocusSpace] Error storing credentials:",
                browserAPI.runtime.lastError.message
              );
            } else if (response?.success) {
              console.log("[FocusSpace] Auth credentials updated");
            }
          }
        );
      }
    });
    window.addEventListener("focusspace-auth-clear", () => {
      browserAPI.runtime.sendMessage(
        { type: "CLEAR_AUTH_CREDENTIALS" },
        (response) => {
          if (browserAPI.runtime.lastError) {
            console.warn(
              "[FocusSpace] Error clearing credentials:",
              browserAPI.runtime.lastError.message
            );
          } else if (response?.success) {
            console.log("[FocusSpace] Auth credentials cleared");
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
                  }
                }
              );
            }
          } catch {
          }
        } else {
          browserAPI.runtime.sendMessage(
            { type: "CLEAR_AUTH_CREDENTIALS" },
            () => {
              if (browserAPI.runtime.lastError) {
              }
            }
          );
        }
      }
    });
  }
  if (isFocusSpaceDomain()) {
    console.log("[FocusSpace] Auth sync content script loaded");
    syncCredentialsFromLocalStorage();
    setupAuthEventListeners();
  }
})();
