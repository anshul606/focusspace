import {
  FocusSession,
  TabSwitchAttempt,
  SessionAnalytics,
} from "@/lib/types/session";

/**
 * Calculates session statistics from a list of sessions
 * Requirements: 4.1 - Total number of completed sessions
 * Requirements: 4.2 - Total number of tab switch attempts
 * Requirements: 4.4 - Session duration statistics
 */
export function calculateSessionStats(sessions: FocusSession[]): {
  totalSessions: number;
  totalFocusMinutes: number;
  averageSessionMinutes: number;
  totalTabSwitchAttempts: number;
} {
  // Filter to only completed or stopped sessions (not active)
  const finishedSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "stopped"
  );

  const totalSessions = finishedSessions.length;

  // Calculate total focus minutes from finished sessions
  const totalFocusMinutes = finishedSessions.reduce((sum, session) => {
    // Use actual duration if session ended early, otherwise use planned duration
    if (session.endedAt && session.startedAt) {
      const actualMinutes =
        (session.endedAt.toMillis() - session.startedAt.toMillis()) /
        (1000 * 60);
      return sum + Math.min(actualMinutes, session.durationMinutes);
    }
    return sum + session.durationMinutes;
  }, 0);

  // Calculate average session duration
  const averageSessionMinutes =
    totalSessions > 0 ? totalFocusMinutes / totalSessions : 0;

  // Sum all tab switch attempts across all sessions
  const totalTabSwitchAttempts = sessions.reduce(
    (sum, session) => sum + session.tabSwitchAttempts,
    0
  );

  return {
    totalSessions,
    totalFocusMinutes: Math.round(totalFocusMinutes),
    averageSessionMinutes: Math.round(averageSessionMinutes * 10) / 10,
    totalTabSwitchAttempts,
  };
}

/**
 * Calculates the frequency of blocked URLs from tab switch attempts
 * Requirements: 4.3 - Breakdown of blocked URLs and their attempt frequencies
 */
export function calculateUrlFrequency(
  attempts: TabSwitchAttempt[]
): Record<string, number> {
  const frequency: Record<string, number> = {};

  for (const attempt of attempts) {
    const url = attempt.attemptedUrl;
    frequency[url] = (frequency[url] || 0) + 1;
  }

  return frequency;
}

/**
 * Calculates total tab switch attempts from a list of sessions
 * Requirements: 4.2 - Total number of tab switch attempts
 */
export function calculateTotalAttempts(sessions: FocusSession[]): number {
  return sessions.reduce((sum, session) => sum + session.tabSwitchAttempts, 0);
}

/**
 * Builds complete analytics data from sessions and attempts
 */
export function buildSessionAnalytics(
  sessions: FocusSession[],
  attempts: TabSwitchAttempt[]
): SessionAnalytics {
  const stats = calculateSessionStats(sessions);
  const blockedUrlFrequency = calculateUrlFrequency(attempts);

  return {
    totalSessions: stats.totalSessions,
    totalFocusMinutes: stats.totalFocusMinutes,
    totalTabSwitchAttempts: stats.totalTabSwitchAttempts,
    averageSessionMinutes: stats.averageSessionMinutes,
    blockedUrlFrequency,
  };
}

/**
 * Sorts URL frequency map by count (descending)
 */
export function sortUrlsByFrequency(
  frequency: Record<string, number>
): Array<{ url: string; count: number }> {
  return Object.entries(frequency)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Formats minutes into a human-readable string
 */
export function formatFocusTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
