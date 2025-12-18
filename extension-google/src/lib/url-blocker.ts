/**
 * URL blocking logic for the Chrome extension
 * Implements allowlist and blocklist modes for focus sessions
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
    // Try localhost first (development), then production URLs
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

/**
 * Extracts the hostname from a URL string
 * @param url - The URL to extract hostname from
 * @returns The hostname or null if invalid
 */
export function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Parses a URL and returns its components for matching
 * @param url - The URL to parse
 * @returns Object with hostname, pathname, and full URL, or null if invalid
 */
export function parseUrlForMatching(url: string): {
  hostname: string;
  pathname: string;
  fullUrl: string;
} | null {
  // If URL doesn't have a protocol, add one for parsing
  let urlToParse = url;
  if (!url.includes("://")) {
    urlToParse = `https://${url}`;
  }

  try {
    const parsed = new URL(urlToParse);
    return {
      hostname: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname + parsed.search, // Include query params
      fullUrl: urlToParse.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Normalizes a URL for comparison by extracting and lowercasing the hostname
 * Handles URLs with or without protocol
 * @param url - The URL to normalize
 * @returns Normalized hostname or null if invalid
 */
export function normalizeUrlForComparison(url: string): string | null {
  const parsed = parseUrlForMatching(url);
  return parsed ? parsed.hostname : null;
}

/**
 * Checks if a list URL entry has a specific path (not just root or hostname)
 * A "specific path" means something like /watch?v=xyz, not just / or empty
 * @param url - The URL to check
 * @returns true if the URL has a specific path that should be matched exactly
 */
function hasSpecificPath(url: string): boolean {
  const parsed = parseUrlForMatching(url);
  if (!parsed) return false;

  // Remove trailing slash for comparison
  const pathname = parsed.pathname.replace(/\/$/, "");

  // Has specific path if:
  // - pathname is not empty (after removing trailing slash)
  // - OR has query parameters
  return pathname.length > 0 || parsed.fullUrl.includes("?");
}

/**
 * Normalize hostname by removing www. prefix
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

/**
 * Checks if a URL matches any URL in a list
 * Supports both hostname-only matching and full URL/path matching
 * @param url - The URL to check
 * @param urlList - List of URLs to match against
 * @returns true if the URL matches any in the list
 */
export function urlMatchesAny(url: string, urlList: string[]): boolean {
  const targetParsed = parseUrlForMatching(url);

  if (!targetParsed) {
    return false;
  }

  const targetHostnameNorm = normalizeHostname(targetParsed.hostname);

  return urlList.some((listUrl) => {
    const listParsed = parseUrlForMatching(listUrl);
    if (!listParsed) {
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
    if (hasSpecificPath(listUrl)) {
      // Normalize paths (remove trailing slashes for comparison)
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

      // For specific paths, target must start with or equal the list path
      // e.g., list="/watch?v=abc" matches target="/watch?v=abc&t=10"
      // e.g., list="/videos" matches target="/videos/123"
      return targetPath === listPath || targetPath.startsWith(listPath);
    }

    // No specific path in list entry = hostname-only matching
    // If hostname matches, allow all paths under it
    return true;
  });
}

/**
 * Determines if a URL should be blocked based on the active session's mode and URL list
 *
 * Allowlist mode: Block all URLs EXCEPT those in the list
 * Blocklist mode: Block ONLY URLs in the list
 *
 * @param url - The URL being navigated to
 * @param session - The active focus session (or null if no session)
 * @returns true if the URL should be blocked
 */
export function shouldBlockUrl(
  url: string,
  session: FocusSession | null
): boolean {
  // No active session - don't block anything
  if (!session || session.status !== "active") {
    return false;
  }

  // Skip blocking for browser internal pages
  if (isInternalUrl(url)) {
    return false;
  }

  // Always allow the Flow app so users can manage their sessions
  if (isFlowApp(url)) {
    return false;
  }

  const { mode, urls } = session;

  // Empty URL list edge cases
  if (urls.length === 0) {
    // Allowlist with no URLs: block everything (no sites allowed)
    // Blocklist with no URLs: block nothing (no sites blocked)
    return mode === "allowlist";
  }

  const matchesListedUrl = urlMatchesAny(url, urls);

  if (mode === "allowlist") {
    // Allowlist mode: block if URL is NOT in the allowed list
    return !matchesListedUrl;
  } else {
    // Blocklist mode: block if URL IS in the blocked list
    return matchesListedUrl;
  }
}

/**
 * Checks if a URL is a browser internal page that should never be blocked
 * @param url - The URL to check
 * @returns true if the URL is an internal browser page
 */
export function isInternalUrl(url: string): boolean {
  const internalProtocols = [
    "chrome:",
    "chrome-extension:",
    "about:",
    "edge:",
    "brave:",
    "opera:",
    "vivaldi:",
    "moz-extension:",
    "file:",
  ];

  try {
    const parsed = new URL(url);
    return internalProtocols.some((protocol) =>
      parsed.protocol.startsWith(protocol.replace(":", ""))
    );
  } catch {
    // If we can't parse it, assume it's internal/safe
    return true;
  }
}

/**
 * Checks if a URL is the Flow app which should always be allowed
 * Uses domains fetched from server (cached)
 * @param url - The URL to check
 * @returns true if the URL is the Flow app
 */
export function isFlowApp(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) {
    return false;
  }

  const allowedDomains = getAllowedDomains();
  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Gets a user-friendly message for why a URL was blocked
 * @param url - The blocked URL
 * @param session - The active session
 * @returns A message explaining why the URL was blocked
 */
export function getBlockedMessage(url: string, session: FocusSession): string {
  const hostname = extractHostname(url) || url;

  if (session.mode === "allowlist") {
    return `"${hostname}" is not in your allowed sites list for this focus session.`;
  } else {
    return `"${hostname}" is blocked during this focus session.`;
  }
}
