/**
 * Content Script: Blocking Overlay - Firefox
 */

declare const browser: typeof chrome | undefined;
const browserAPI: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;

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
  overlayElement.id = "focusspace-blocking-overlay";
  overlayElement.className = "focusspace-overlay";

  const contentContainer = document.createElement("div");
  contentContainer.className = "focusspace-overlay-content";

  const icon = document.createElement("div");
  icon.className = "focusspace-overlay-icon";
  icon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;

  const title = document.createElement("h1");
  title.className = "focusspace-overlay-title";
  title.textContent = "Site Blocked";

  const message = document.createElement("p");
  message.className = "focusspace-overlay-message";
  message.textContent = "This site is not allowed during your focus session.";

  const urlDisplay = document.createElement("p");
  urlDisplay.className = "focusspace-overlay-url";
  urlDisplay.textContent = truncateUrl(blockedUrl);

  const encouragement = document.createElement("p");
  encouragement.className = "focusspace-overlay-encouragement";
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

  const existingOverlay = document.getElementById(
    "focusspace-blocking-overlay"
  );
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

function setupMessageListener(): void {
  if (!isExtensionContextValid()) return;

  try {
    browserAPI.runtime.onMessage.addListener(
      (
        message: BlockingMessage | { type: "REMOVE_BLOCKING_OVERLAY" },
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
