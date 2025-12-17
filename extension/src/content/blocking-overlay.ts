/**
 * Content Script: Blocking Overlay
 * Displays a translucent overlay when a user attempts to access a restricted site
 *
 * Requirements:
 * - 3.3: Display a Blocking_Overlay with a message indicating the site is not allowed
 */

interface BlockingMessage {
  type: "SHOW_BLOCKING_OVERLAY";
  url: string;
  session: {
    mode: "allowlist" | "blocklist";
    urls: string[];
  } | null;
}

// Overlay element reference
let overlayElement: HTMLDivElement | null = null;

/**
 * Create and inject the blocking overlay into the page
 */
function createBlockingOverlay(blockedUrl: string): void {
  // Remove existing overlay if present
  removeBlockingOverlay();

  // Create overlay container
  overlayElement = document.createElement("div");
  overlayElement.id = "focusspace-blocking-overlay";
  overlayElement.className = "focusspace-overlay";

  // Create content container
  const contentContainer = document.createElement("div");
  contentContainer.className = "focusspace-overlay-content";

  // Create icon
  const icon = document.createElement("div");
  icon.className = "focusspace-overlay-icon";
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;

  // Create title
  const title = document.createElement("h1");
  title.className = "focusspace-overlay-title";
  title.textContent = "Site Blocked";

  // Create message
  const message = document.createElement("p");
  message.className = "focusspace-overlay-message";
  message.textContent = "This site is not allowed during your focus session.";

  // Create URL display
  const urlDisplay = document.createElement("p");
  urlDisplay.className = "focusspace-overlay-url";
  urlDisplay.textContent = truncateUrl(blockedUrl);

  // Create encouragement message
  const encouragement = document.createElement("p");
  encouragement.className = "focusspace-overlay-encouragement";
  encouragement.textContent = "Stay focused! You can do this. 💪";

  // Assemble content
  contentContainer.appendChild(icon);
  contentContainer.appendChild(title);
  contentContainer.appendChild(message);
  contentContainer.appendChild(urlDisplay);
  contentContainer.appendChild(encouragement);

  overlayElement.appendChild(contentContainer);

  // Inject into page
  if (document.body) {
    document.body.appendChild(overlayElement);
  } else {
    // If body isn't ready, wait for it
    document.addEventListener("DOMContentLoaded", () => {
      if (overlayElement && document.body) {
        document.body.appendChild(overlayElement);
      }
    });
  }
}

/**
 * Remove the blocking overlay from the page
 */
function removeBlockingOverlay(): void {
  if (overlayElement && overlayElement.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement);
  }
  overlayElement = null;

  // Also try to remove by ID in case reference was lost
  const existingOverlay = document.getElementById(
    "focusspace-blocking-overlay"
  );
  if (existingOverlay && existingOverlay.parentNode) {
    existingOverlay.parentNode.removeChild(existingOverlay);
  }
}

/**
 * Truncate long URLs for display
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) {
    return url;
  }
  return url.substring(0, maxLength - 3) + "...";
}

/**
 * Check if extension context is still valid
 */
function isExtensionContextValid(): boolean {
  try {
    // Use optional chaining to avoid throwing
    return !!chrome?.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * Listen for messages from the background service worker
 */
function setupMessageListener(): void {
  if (!isExtensionContextValid()) return;

  try {
    chrome.runtime.onMessage.addListener(
      (
        message: BlockingMessage | { type: "REMOVE_BLOCKING_OVERLAY" },
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: { success: boolean }) => void
      ) => {
        // Wrap in try/catch since context can be invalidated
        try {
          if (!isExtensionContextValid()) return true;

          if (message.type === "SHOW_BLOCKING_OVERLAY") {
            createBlockingOverlay((message as BlockingMessage).url);
            sendResponse({ success: true });
          } else if (message.type === "REMOVE_BLOCKING_OVERLAY") {
            removeBlockingOverlay();
            sendResponse({ success: true });
          }
        } catch {
          // Context invalidated
        }

        return true;
      }
    );
  } catch {
    // Extension context invalidated
  }
}

setupMessageListener();

/**
 * Normalize hostname by removing www. prefix
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

/**
 * Check if a URL has a specific path (not just root)
 */
function hasSpecificPath(url: string, pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, "");
  return normalizedPath.length > 0 || url.includes("?");
}

/**
 * Check if a URL matches any URL in a list (mirrors logic from url-blocker.ts)
 */
function urlMatchesAny(url: string, urlList: string[]): boolean {
  let targetUrl = url;
  if (!url.includes("://")) {
    targetUrl = `https://${url}`;
  }

  let targetParsed: URL;
  try {
    targetParsed = new URL(targetUrl);
  } catch {
    return false;
  }

  const targetHostnameNorm = normalizeHostname(targetParsed.hostname);

  return urlList.some((listUrl) => {
    let listUrlFull = listUrl;
    if (!listUrl.includes("://")) {
      listUrlFull = `https://${listUrl}`;
    }

    let listParsed: URL;
    try {
      listParsed = new URL(listUrlFull);
    } catch {
      return false;
    }

    const listHostnameNorm = normalizeHostname(listParsed.hostname);

    // First check: hostnames must match (or be subdomains)
    const hostnameMatches =
      targetHostnameNorm === listHostnameNorm ||
      targetHostnameNorm.endsWith(`.${listHostnameNorm}`) ||
      listHostnameNorm.endsWith(`.${targetHostnameNorm}`);

    if (!hostnameMatches) {
      return false;
    }

    // If the list entry has a specific path, check path matching
    if (hasSpecificPath(listUrl, listParsed.pathname)) {
      const targetPath = (targetParsed.pathname + targetParsed.search).replace(
        /\/$/,
        ""
      );
      const listPath = (listParsed.pathname + listParsed.search).replace(
        /\/$/,
        ""
      );

      // Target must start with or equal the list path
      return targetPath === listPath || targetPath.startsWith(listPath);
    }

    // No specific path = hostname-only matching, allow all paths
    return true;
  });
}

/**
 * Check if URL is internal browser page
 */
function isInternalUrl(url: string): boolean {
  const internalProtocols = [
    "chrome:",
    "chrome-extension:",
    "about:",
    "edge:",
    "brave:",
  ];
  try {
    const parsed = new URL(url);
    return internalProtocols.some((p) =>
      parsed.protocol.startsWith(p.replace(":", ""))
    );
  } catch {
    return true;
  }
}

/**
 * Safely send a message to the background script
 * Handles cases where extension context is invalidated
 */
function safeSendMessage<T>(
  message: object,
  callback: (response: T) => void
): void {
  try {
    // Check context validity right before the call
    if (!chrome?.runtime?.id) return;

    const runtime = chrome.runtime;
    runtime.sendMessage(message, (response: T) => {
      // Wrap entire callback in try/catch since context can be invalidated
      // between when message was sent and when callback runs
      try {
        // Re-check validity in callback
        if (!chrome?.runtime?.id) return;
        // Access lastError to clear it (required by Chrome)
        const _err = runtime.lastError;
        if (_err) return;
        callback(response);
      } catch {
        // Context invalidated during callback
      }
    });
  } catch {
    // Extension context invalidated, ignore
  }
}

/**
 * Check current URL against session rules and show/hide overlay accordingly
 */
function checkCurrentUrl(): void {
  safeSendMessage<{
    session: BlockingMessage["session"];
    userId: string | null;
  }>({ type: "GET_CURRENT_SESSION" }, (response) => {
    const currentUrl = window.location.href;

    // No session - remove overlay if present
    if (!response || !response.session) {
      removeBlockingOverlay();
      return;
    }

    const session = response.session;

    // Skip internal URLs
    if (isInternalUrl(currentUrl)) {
      removeBlockingOverlay();
      return;
    }

    let shouldBlock = false;

    if (session.mode === "allowlist") {
      shouldBlock = !urlMatchesAny(currentUrl, session.urls);
    } else if (session.mode === "blocklist") {
      shouldBlock = urlMatchesAny(currentUrl, session.urls);
    }

    if (shouldBlock) {
      createBlockingOverlay(currentUrl);
    } else {
      removeBlockingOverlay();
    }
  });
}

// Track the last URL to detect SPA navigation
let lastUrl = window.location.href;

/**
 * Handle URL change - debounced to avoid duplicate checks
 */
let urlCheckTimeout: ReturnType<typeof setTimeout> | null = null;
function handleUrlChange(): void {
  // Skip if extension context is gone
  if (!isExtensionContextValid()) return;

  try {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // Debounce to avoid multiple rapid checks
      if (urlCheckTimeout) clearTimeout(urlCheckTimeout);
      urlCheckTimeout = setTimeout(() => {
        if (isExtensionContextValid()) {
          checkCurrentUrl();
        }
      }, 50);
    }
  } catch {
    // Context invalidated
  }
}

/**
 * Monitor for URL changes (handles SPA navigation like YouTube, React apps, etc.)
 * Uses event-based detection instead of polling for better performance
 */
function setupUrlChangeDetection(): void {
  // Listen for popstate (back/forward navigation)
  window.addEventListener("popstate", handleUrlChange);

  // Intercept pushState and replaceState for immediate detection
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };

  // Some SPAs use hashchange for routing
  window.addEventListener("hashchange", handleUrlChange);

  // YouTube specifically uses yt-navigate-finish event
  document.addEventListener("yt-navigate-finish", handleUrlChange);
}

/**
 * Initialize the content script
 */
function initialize(): void {
  if (!isExtensionContextValid()) return;

  // Initial check on page load
  checkCurrentUrl();

  // Set up URL change detection for SPAs
  setupUrlChangeDetection();
}

initialize();

// Export for potential testing
export { createBlockingOverlay, removeBlockingOverlay, truncateUrl };
