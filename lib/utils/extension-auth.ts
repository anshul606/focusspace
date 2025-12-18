/**
 * Extension Auth Sync Utilities
 * Handles sharing authentication credentials between the web app and Flow extension
 *
 * Requirements:
 * - 7.2: Provide authentication credentials to the extension
 * - 7.3: Extension uses credentials for all Firebase operations
 */

import { User } from "firebase/auth";

/**
 * Storage key for auth credentials - must match extension's key
 */
const AUTH_STORAGE_KEY = "flow_auth_credentials";

/**
 * Extension ID for the Flow Chrome extension
 * In production, this would be the actual extension ID from Chrome Web Store
 */
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || "";

/**
 * Auth credentials structure stored for extension use
 */
export interface StoredAuthCredentials {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Check if the Chrome extension API is available
 * This will be true when running in a context where the extension is installed
 */
function isExtensionAvailable(): boolean {
  return typeof chrome !== "undefined" && chrome.runtime && !!EXTENSION_ID;
}

/**
 * Store auth credentials for the Chrome extension
 * Uses chrome.runtime.sendMessage to communicate with the extension
 *
 * Requirements: 7.2 - Provide authentication credentials to the Chrome extension
 */
export async function syncAuthToExtension(user: User): Promise<boolean> {
  try {
    // Get the ID token from the user
    const idToken = await user.getIdToken();
    const idTokenResult = await user.getIdTokenResult();

    const credentials: StoredAuthCredentials = {
      uid: user.uid,
      email: user.email,
      idToken: idToken,
      refreshToken: user.refreshToken,
      // Token expires in 1 hour, but we'll refresh before that
      expiresAt: new Date(idTokenResult.expirationTime).getTime(),
    };

    // Try to communicate with extension via external messaging
    if (isExtensionAvailable()) {
      return await sendCredentialsToExtension(credentials);
    }

    // Fallback: Store in localStorage for extension to read via content script
    // This is a backup mechanism when direct messaging isn't available
    storeCredentialsLocally(credentials);
    return true;
  } catch (error) {
    console.error("[Flow] Error syncing auth to extension:", error);
    return false;
  }
}

/**
 * Send credentials directly to extension via chrome.runtime.sendMessage
 */
async function sendCredentialsToExtension(
  credentials: StoredAuthCredentials
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: "STORE_AUTH_CREDENTIALS", credentials },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Flow] Extension messaging error:",
              chrome.runtime.lastError.message
            );
            // Fallback to local storage
            storeCredentialsLocally(credentials);
            resolve(true);
          } else {
            resolve(response?.success ?? false);
          }
        }
      );
    } catch {
      // Extension not available, use fallback
      storeCredentialsLocally(credentials);
      resolve(true);
    }
  });
}

/**
 * Store credentials in localStorage as a fallback mechanism
 * The extension's content script can read this and sync to chrome.storage
 */
function storeCredentialsLocally(credentials: StoredAuthCredentials): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
    // Dispatch a custom event that the extension's content script can listen for
    window.dispatchEvent(
      new CustomEvent("flow-auth-update", { detail: credentials })
    );
  } catch (error) {
    console.error("[Flow] Error storing credentials locally:", error);
  }
}

/**
 * Clear auth credentials from extension
 * Called when user logs out
 *
 * Requirements: 7.4 - Clear extension authentication on logout
 */
export async function clearExtensionAuth(): Promise<boolean> {
  try {
    // Try to communicate with extension
    if (isExtensionAvailable()) {
      return await sendClearAuthToExtension();
    }

    // Fallback: Clear from localStorage
    clearCredentialsLocally();
    return true;
  } catch (error) {
    console.error("[Flow] Error clearing extension auth:", error);
    return false;
  }
}

/**
 * Send clear auth message to extension
 */
async function sendClearAuthToExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: "CLEAR_AUTH_CREDENTIALS" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Flow] Extension messaging error:",
              chrome.runtime.lastError.message
            );
            clearCredentialsLocally();
            resolve(true);
          } else {
            resolve(response?.success ?? false);
          }
        }
      );
    } catch {
      clearCredentialsLocally();
      resolve(true);
    }
  });
}

/**
 * Clear credentials from localStorage
 */
function clearCredentialsLocally(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Dispatch event for extension content script
    window.dispatchEvent(new CustomEvent("flow-auth-clear"));
  } catch (error) {
    console.error("[Flow] Error clearing local credentials:", error);
  }
}

/**
 * Refresh the auth token and sync to extension
 * Should be called periodically to keep the extension authenticated
 */
export async function refreshExtensionAuth(user: User): Promise<boolean> {
  try {
    // Force token refresh
    const idToken = await user.getIdToken(true);
    const idTokenResult = await user.getIdTokenResult();

    const credentials: StoredAuthCredentials = {
      uid: user.uid,
      email: user.email,
      idToken: idToken,
      refreshToken: user.refreshToken,
      expiresAt: new Date(idTokenResult.expirationTime).getTime(),
    };

    if (isExtensionAvailable()) {
      return await sendCredentialsToExtension(credentials);
    }

    storeCredentialsLocally(credentials);
    return true;
  } catch (error) {
    console.error("[Flow] Error refreshing extension auth:", error);
    return false;
  }
}
