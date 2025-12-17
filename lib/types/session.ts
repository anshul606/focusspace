import { Timestamp } from "firebase/firestore";

/**
 * Represents a focus session with website access restrictions
 */
export interface FocusSession {
  id: string;
  userId: string;
  mode: "allowlist" | "blocklist";
  urls: string[];
  durationMinutes: number;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: "active" | "completed" | "stopped";
  tabSwitchAttempts: number;
}

/**
 * Represents an attempt to navigate to a restricted website
 */
export interface TabSwitchAttempt {
  id: string;
  sessionId: string;
  userId: string;
  attemptedUrl: string;
  timestamp: Timestamp;
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
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

/**
 * Aggregated analytics data for user sessions
 */
export interface SessionAnalytics {
  totalSessions: number;
  totalFocusMinutes: number;
  totalTabSwitchAttempts: number;
  averageSessionMinutes: number;
  blockedUrlFrequency: Record<string, number>;
}
