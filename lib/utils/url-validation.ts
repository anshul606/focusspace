/**
 * Validates if a string is a valid URL with http or https protocol
 * @param url - The string to validate
 * @returns true if the string is a valid URL with http/https protocol
 */
export function isValidUrl(url: string): boolean {
  // Handle empty strings and whitespace-only strings
  if (!url || url.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only accept http and https protocols
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    // URL constructor throws for invalid URLs
    return false;
  }
}

/**
 * Validates if a duration in minutes is within acceptable range
 * @param minutes - The duration in minutes
 * @returns true if the duration is valid (1-480 minutes)
 */
export function isValidDuration(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 480;
}

/**
 * Validates if todo text is valid
 * @param text - The todo text to validate
 * @returns true if the text is non-empty and within length limit
 */
export function isValidTodoText(text: string): boolean {
  return text.trim().length > 0 && text.length <= 500;
}
