"use strict";
(() => {
  // src/content/auth-sync.ts
  var AUTH_STORAGE_KEY = "flow_auth_credentials";
  function isFlowDomain() {
    const hostname = window.location.hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("anshul.space") || hostname.includes("vercel.app");
  }
  function syncCredentialsFromLocalStorage() {
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
  function setupAuthEventListeners() {
    window.addEventListener("flow-auth-update", (event) => {
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
    });
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
                  }
                }
              );
            }
          } catch {
          }
        } else {
          chrome.runtime.sendMessage({ type: "CLEAR_AUTH_CREDENTIALS" }, () => {
            if (chrome.runtime.lastError) {
            }
          });
        }
      }
    });
  }
  if (isFlowDomain()) {
    console.log("[Flow] Auth sync content script loaded");
    syncCredentialsFromLocalStorage();
    setupAuthEventListeners();
  }
})();
