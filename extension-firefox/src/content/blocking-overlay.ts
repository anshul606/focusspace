/**
 * Content Script: Blocking Overlay - Firefox
 */

declare const browser: typeof chrome | undefined;
const browserAPI: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;

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

let overlayElement: HTMLDivElement | null = null;

function createBlockingOverlay(blockedUrl: string): void {
  removeBlockingOverlay();

  overlayElement = document.createElement("div");
  overlayElement.id = OVERLAY_ID;
  overlayElement.className = "flow-overlay";

  const contentContainer = document.createElement("div");
  contentContainer.className = "flow-overlay-content";

  const icon = document.createElement("div");
  icon.className = "flow-overlay-icon";
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;

  const title = document.createElement("h1");
  title.className = "flow-overlay-title";
  title.textContent = "Site Blocked";

  const message = document.createElement("p");
  message.className = "flow-overlay-message";
  message.textContent = "This site is not allowed during your focus session.";

  const urlDisplay = document.createElement("p");
  urlDisplay.className = "flow-overlay-url";
  urlDisplay.textContent = truncateUrl(blockedUrl);

  const encouragement = document.createElement("p");
  encouragement.className = "flow-overlay-encouragement";
  encouragement.textContent = "Stay focused! You can do this. 💪";

  contentContainer.appendChild(icon);
  contentContainer.appendChild(title);
  contentContainer.appendChild(message);
  contentContainer.appendChild(urlDisplay);
  contentContainer.appendChild(encouragement);

  overlayElement.appendChild(contentContainer);

  if (document.body) {
    document.body.appendChild(overlayElement);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (overlayElement && document.body) {
        document.body.appendChild(overlayElement);
      }
    });
  }
}

function removeBlockingOverlay(): void {
  if (overlayElement && overlayElement.parentNode) {
    overlayElement.parentNode.removeChild(overlayElement);
  }
  overlayElement = null;

  const existingOverlay = document.getElementById(OVERLAY_ID);
  if (existingOverlay && existingOverlay.parentNode) {
    existingOverlay.parentNode.removeChild(existingOverlay);
  }
}

function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + "...";
}

function isExtensionContextValid(): boolean {
  try {
    return !!browserAPI?.runtime?.id;
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
  removeBlockingOverlay();
  removeCongratulationsOverlay();

  const congratsOverlay = document.createElement("div");
  congratsOverlay.id = "flow-congrats-overlay";
  congratsOverlay.className = "flow-overlay flow-congrats";

  const contentContainer = document.createElement("div");
  contentContainer.className = "flow-overlay-content";

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

  setTimeout(() => {
    removeCongratulationsOverlay();
  }, 3000);
}

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

function setupMessageListener(): void {
  if (!isExtensionContextValid()) return;

  try {
    browserAPI.runtime.onMessage.addListener(
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

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

function hasSpecificPath(url: string, pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, "");
  return normalizedPath.length > 0 || url.includes("?");
}

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

    const hostnameMatches =
      targetHostnameNorm === listHostnameNorm ||
      targetHostnameNorm.endsWith(`.${listHostnameNorm}`) ||
      listHostnameNorm.endsWith(`.${targetHostnameNorm}`);

    if (!hostnameMatches) return false;

    if (hasSpecificPath(listUrl, listParsed.pathname)) {
      const targetPath = (targetParsed.pathname + targetParsed.search).replace(
        /\/$/,
        ""
      );
      const listPath = (listParsed.pathname + listParsed.search).replace(
        /\/$/,
        ""
      );
      return targetPath === listPath || targetPath.startsWith(listPath);
    }

    return true;
  });
}

function isInternalUrl(url: string): boolean {
  const internalProtocols = [
    "chrome:",
    "chrome-extension:",
    "about:",
    "moz-extension:",
    "file:",
    "resource:",
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

function safeSendMessage<T>(
  message: object,
  callback: (response: T) => void
): void {
  try {
    if (!browserAPI?.runtime?.id) return;

    const runtime = browserAPI.runtime;
    runtime.sendMessage(message, (response: T) => {
      try {
        if (!browserAPI?.runtime?.id) return;
        const _err = runtime.lastError;
        if (_err) return;
        callback(response);
      } catch {
        // Context invalidated during callback
      }
    });
  } catch {
    // Extension context invalidated
  }
}

function checkCurrentUrl(): void {
  safeSendMessage<{
    session: BlockingMessage["session"];
    userId: string | null;
  }>({ type: "GET_CURRENT_SESSION" }, (response) => {
    const currentUrl = window.location.href;

    if (!response || !response.session) {
      removeBlockingOverlay();
      return;
    }

    const session = response.session;

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

let lastUrl = window.location.href;
let urlCheckTimeout: ReturnType<typeof setTimeout> | null = null;

function handleUrlChange(): void {
  if (!isExtensionContextValid()) return;

  try {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
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

function setupUrlChangeDetection(): void {
  window.addEventListener("popstate", handleUrlChange);

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

  window.addEventListener("hashchange", handleUrlChange);
  document.addEventListener("yt-navigate-finish", handleUrlChange);
}

function initialize(): void {
  if (!isExtensionContextValid()) return;
  checkCurrentUrl();
  setupUrlChangeDetection();
}

initialize();

export { createBlockingOverlay, removeBlockingOverlay, truncateUrl };
