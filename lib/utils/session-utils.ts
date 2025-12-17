import { Timestamp } from "firebase/firestore";
import type { FocusSession } from "../types/session";

/**
 * Calculates the remaining time in milliseconds for a session
 * @param startedAt - The session start timestamp
 * @param durationMinutes - The session duration in minutes
 * @param currentTime - The current time (defaults to now)
 * @returns Remaining time in milliseconds, clamped to 0 when expired
 */
export function calculateRemainingTime(
  startedAt: Timestamp,
  durationMinutes: number,
  currentTime: Date = new Date()
): number {
  const startMs = startedAt.toMillis();
  const durationMs = durationMinutes * 60 * 1000;
  const endMs = startMs + durationMs;
  const currentMs = currentTime.getTime();

  const remaining = endMs - currentMs;
  return Math.max(0, remaining);
}

/**
 * Checks if a session has expired based on its start time and duration
 * @param startedAt - The session start timestamp
 * @param durationMinutes - The session duration in minutes
 * @param currentTime - The current time (defaults to now)
 * @returns true if the session duration has elapsed
 */
export function isSessionExpired(
  startedAt: Timestamp,
  durationMinutes: number,
  currentTime: Date = new Date()
): boolean {
  return calculateRemainingTime(startedAt, durationMinutes, currentTime) === 0;
}

/**
 * Determines the effective status of a session
 * If the session is marked active but has expired, returns 'completed'
 * @param session - The focus session to check
 * @param currentTime - The current time (defaults to now)
 * @returns The effective session status
 */
export function getSessionStatus(
  session: FocusSession,
  currentTime: Date = new Date()
): FocusSession["status"] {
  // If already stopped or completed, return that status
  if (session.status === "stopped" || session.status === "completed") {
    return session.status;
  }

  // If active but expired, it should be completed
  if (
    isSessionExpired(session.startedAt, session.durationMinutes, currentTime)
  ) {
    return "completed";
  }

  return "active";
}

/**
 * Formats remaining time as a human-readable string (MM:SS or HH:MM:SS)
 * @param remainingMs - Remaining time in milliseconds
 * @returns Formatted time string
 */
export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Calculates the actual duration of a session in minutes
 * @param session - The focus session
 * @returns Duration in minutes (actual if ended, elapsed if active)
 */
export function getActualSessionDuration(
  session: FocusSession,
  currentTime: Date = new Date()
): number {
  const startMs = session.startedAt.toMillis();
  const endMs = session.endedAt
    ? session.endedAt.toMillis()
    : currentTime.getTime();

  return Math.floor((endMs - startMs) / (60 * 1000));
}
