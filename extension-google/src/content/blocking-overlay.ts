/**
 * Content Script: Blocking Overlay
 * Displays a translucent overlay when a user attempts to access a restricted site
 *
 * Requirements:
 * - 3.3: Display a Blocking_Overlay with a message indicating the site is not allowed
 */

// Overlay element ID prefix
const OVERLAY_ID = "flow-blocking-overlay";

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
  overlayElement.id = OVERLAY_ID;
  overlayElement.className = "flow-overlay";

  // Create content container
  const contentContainer = document.createElement("div");
  contentContainer.className = "flow-overlay-content";

  // Create icon
  const icon = document.createElement("div");
  icon.className = "flow-overlay-icon";
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;

  // Create title
  const title = document.createElement("h1");
  title.className = "flow-overlay-title";
  title.textContent = "Site Blocked";

  // Create message
  const message = document.createElement("p");
  message.className = "flow-overlay-message";
  message.textContent = "This site is not allowed during your focus session.";

  // Create URL display
  const urlDisplay = document.createElement("p");
  urlDisplay.className = "flow-overlay-url";
  urlDisplay.textContent = truncateUrl(blockedUrl);

  // Create encouragement message
  const encouragement = document.createElement("p");
  encouragement.className = "flow-overlay-encouragement";
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
  const existingOverlay = document.getElementById(OVERLAY_ID);
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
 * Create and show the congratulations overlay when session completes
 */
function createCongratulationsOverlay(
  durationMinutes: number,
  blockedAttempts: number
): void {
  // Remove any existing overlays
  removeBlockingOverlay();
  removeCongratulationsOverlay();

  const congratsOverlay = document.createElement("div");
  congratsOverlay.id = "flow-congrats-overlay";
  congratsOverlay.className = "flow-overlay flow-congrats";

  const contentContainer = document.createElement("div");
  contentContainer.className = "flow-overlay-content";

  // Trophy/celebration icon
  const icon = document.createElement("div");
  icon.className = "flow-overlay-icon flow-congrats-icon";
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16"></path>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>
  `;

  const title = document.createElement("h1");
  title.className = "flow-overlay-title";
  title.textContent = "🎉 Session Complete!";

  const message = document.createElement("p");
  message.className = "flow-overlay-message";
  message.textContent =
    "Congratulations! You stayed focused and finished your session.";

  const stats = document.createElement("div");
  stats.className = "flow-congrats-stats";
  stats.innerHTML = `
    <div class="flow-stat">
      <span class="flow-stat-value">${durationMinutes}</span>
      <span class="flow-stat-label">minutes focused</span>
    </div>
    <div class="flow-stat">
      <span class="flow-stat-value">${blockedAttempts}</span>
      <span class="flow-stat-label">distractions blocked</span>
    </div>
  `;

  const encouragement = document.createElement("p");
  encouragement.className = "flow-overlay-encouragement";
  encouragement.textContent = "Great work! Keep up the momentum! 🚀";

  contentContainer.appendChild(icon);
  contentContainer.appendChild(title);
  contentContainer.appendChild(message);
  contentContainer.appendChild(stats);
  contentContainer.appendChild(encouragement);
  congratsOverlay.appendChild(contentContainer);

  if (document.body) {
    document.body.appendChild(congratsOverlay);
  }

  // Auto-remove after 3 seconds
  setTimeout(() => {
    removeCongratulationsOverlay();
  }, 3000);
}

/**
 * Remove the congratulations overlay
 */
function removeCongratulationsOverlay(): void {
  const congratsOverlay = document.getElementById("flow-congrats-overlay");
  if (congratsOverlay && congratsOverlay.parentNode) {
    congratsOverlay.classList.add("flow-fade-out");
    setTimeout(() => {
      if (congratsOverlay.parentNode) {
        congratsOverlay.parentNode.removeChild(congratsOverlay);
      }
    }, 300);
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
        message:
          | BlockingMessage
          | { type: "REMOVE_BLOCKING_OVERLAY" }
          | {
              type: "SHOW_SESSION_COMPLETE";
              durationMinutes: number;
              blockedAttempts: number;
            },
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
          } else if (message.type === "SHOW_SESSION_COMPLETE") {
            const completeMsg = message as {
              type: "SHOW_SESSION_COMPLETE";
              durationMinutes: number;
              blockedAttempts: number;
            };
            createCongratulationsOverlay(
              completeMsg.durationMinutes,
              completeMsg.blockedAttempts
            );
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
 * Check if URL is the Flow app (should never be blocked)
 */
function isFlowApp(url: string): boolean {
  const allowedDomains = [
    "localhost",
    "127.0.0.1",
    "vercel.app",
    "anshul.space",
  ];
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
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

    // Always allow the Flow app
    if (isFlowApp(currentUrl)) {
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
