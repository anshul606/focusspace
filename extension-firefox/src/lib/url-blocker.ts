/**
 * URL blocking logic for the Firefox extension
 */

import { FocusSession } from "./types";

// Cache for allowed domains fetched from server
let cachedAllowedDomains: string[] = [
  "localhost",
  "127.0.0.1",
  "vercel.app",
  "anshul.space",
];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch allowed domains from the server
 * Falls back to cached/default values if fetch fails
 */
export async function fetchAllowedDomains(): Promise<string[]> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION && cachedAllowedDomains.length > 0) {
    return cachedAllowedDomains;
  }

  try {
    const urls = [
      "http://localhost:3001/api/config/allowed-domains",
      "http://localhost:3000/api/config/allowed-domains",
      "https://flow.anshul.space/api/config/allowed-domains",
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: "GET" });
        if (response.ok) {
          const data = await response.json();
          if (data.domains && Array.isArray(data.domains)) {
            cachedAllowedDomains = data.domains;
            lastFetchTime = now;
            console.log(
              "[Flow] Fetched allowed domains:",
              cachedAllowedDomains
            );
            return cachedAllowedDomains;
          }
        }
      } catch {
        // Try next URL
      }
    }
  } catch (error) {
    console.warn(
      "[Flow] Failed to fetch allowed domains, using cached:",
      error
    );
  }

  return cachedAllowedDomains;
}

/**
 * Get the current allowed domains (sync version using cache)
 */
export function getAllowedDomains(): string[] {
  return cachedAllowedDomains;
}

export function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function parseUrlForMatching(url: string): {
  hostname: string;
  pathname: string;
  fullUrl: string;
} | null {
  let urlToParse = url;
  if (!url.includes("://")) {
    urlToParse = `https://${url}`;
  }

  try {
    const parsed = new URL(urlToParse);
    return {
      hostname: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname + parsed.search,
      fullUrl: urlToParse.toLowerCase(),
    };
  } catch {
    return null;
  }
}

function hasSpecificPath(url: string): boolean {
  const parsed = parseUrlForMatching(url);
  if (!parsed) return false;
  const pathname = parsed.pathname.replace(/\/$/, "");
  return pathname.length > 0 || parsed.fullUrl.includes("?");
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function urlMatchesAny(url: string, urlList: string[]): boolean {
  const targetParsed = parseUrlForMatching(url);
  if (!targetParsed) return false;

  const targetHostnameNorm = normalizeHostname(targetParsed.hostname);

  return urlList.some((listUrl) => {
    const listParsed = parseUrlForMatching(listUrl);
    if (!listParsed) return false;

    const listHostnameNorm = normalizeHostname(listParsed.hostname);

    const hostnameMatches =
      targetHostnameNorm === listHostnameNorm ||
      targetHostnameNorm.endsWith(`.${listHostnameNorm}`) ||
      listHostnameNorm.endsWith(`.${targetHostnameNorm}`);

    if (!hostnameMatches) return false;

    if (hasSpecificPath(listUrl)) {
      const targetPath = (
        targetParsed.pathname +
        (targetParsed.fullUrl.includes("?")
          ? targetParsed.fullUrl.split("?")[1] || ""
          : "")
      ).replace(/\/$/, "");
      const listPath = (
        listParsed.pathname +
        (listParsed.fullUrl.includes("?")
          ? listParsed.fullUrl.split("?")[1] || ""
          : "")
      ).replace(/\/$/, "");

      return targetPath === listPath || targetPath.startsWith(listPath);
    }

    return true;
  });
}

export function shouldBlockUrl(
  url: string,
  session: FocusSession | null
): boolean {
  if (!session || session.status !== "active") return false;
  if (isInternalUrl(url)) return false;
  if (isFlowApp(url)) return false;

  const { mode, urls } = session;

  if (urls.length === 0) {
    return mode === "allowlist";
  }

  const matchesListedUrl = urlMatchesAny(url, urls);

  if (mode === "allowlist") {
    return !matchesListedUrl;
  } else {
    return matchesListedUrl;
  }
}

export function isInternalUrl(url: string): boolean {
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
    return internalProtocols.some((protocol) =>
      parsed.protocol.startsWith(protocol.replace(":", ""))
    );
  } catch {
    return true;
  }
}

/**
 * Checks if a URL is the Flow app which should always be allowed
 * Uses domains fetched from server (cached)
 */
export function isFlowApp(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;

  const allowedDomains = getAllowedDomains();
  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}
