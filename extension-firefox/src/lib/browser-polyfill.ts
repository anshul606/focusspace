/**
 * Browser API polyfill for Firefox
 * Firefox supports both 'browser' and 'chrome' APIs
 * This ensures we use the correct one
 */

declare const browser: typeof chrome | undefined;

export const browserAPI: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;
