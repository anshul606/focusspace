/**
 * Focus Session types for Firefox extension
 */

export interface FocusSession {
  id: string;
  userId: string;
  mode: "allowlist" | "blocklist";
  urls: string[];
  durationMinutes: number;
  startedAt: FirestoreTimestamp;
  endedAt: FirestoreTimestamp | null;
  status: "active" | "completed" | "stopped";
  tabSwitchAttempts: number;
}

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface TabSwitchAttempt {
  id: string;
  sessionId: string;
  userId: string;
  attemptedUrl: string;
  timestamp: FirestoreTimestamp;
}

export interface SessionTodo {
  id: string;
  sessionId: string;
  userId: string;
  text: string;
  completed: boolean;
  createdAt: FirestoreTimestamp;
  completedAt: FirestoreTimestamp | null;
}

export interface StoredAuthCredentials {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}
