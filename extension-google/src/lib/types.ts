/**
 * Focus Session types for Chrome extension
 * Mirrors the web app types in lib/types/session.ts
 */

/**
 * Represents a focus session with website access restrictions
 */
export interface FocusSession {
  id: string;
  userId: string;
  mode: "allowlist" | "blocklist";
  urls: string[];
  durationMinutes: number;
  endPhrase: string;
  startedAt: FirestoreTimestamp;
  endedAt: FirestoreTimestamp | null;
  status: "active" | "completed" | "stopped";
  tabSwitchAttempts: number;
}

/**
 * Firestore Timestamp representation for extension context
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

/**
 * Represents an attempt to navigate to a restricted website
 */
export interface TabSwitchAttempt {
  id: string;
  sessionId: string;
  userId: string;
  attemptedUrl: string;
  timestamp: FirestoreTimestamp;
}

/**
 * Represents a todo item associated with a focus session
 */
export interface SessionTodo {
  id: string;
  sessionId: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: FirestoreTimestamp;
  completedAt: FirestoreTimestamp | null;
}

/**
 * Auth credentials stored in chrome.storage for extension use
 */
export interface StoredAuthCredentials {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}
