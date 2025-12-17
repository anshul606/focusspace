/**
 * URL blocking logic for the Firefox extension
 */

import { FocusSession } from "./types";

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
  if (isFocusSpaceApp(url)) return false;

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

const FOCUSSPACE_DOMAINS = ["localhost", "127.0.0.1", "vercel.app"];

export function isFocusSpaceApp(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;

  return FOCUSSPACE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}
