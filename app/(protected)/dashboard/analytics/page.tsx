"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/context/auth-context";
import {
  getAllSessions,
  getAllAttempts,
  deleteAllSessions,
} from "@/lib/services/session-service";
import {
  calculateSessionStats,
  sortUrlsByFrequency,
  calculateUrlFrequency,
} from "@/lib/utils/analytics-utils";
import { FocusSession, TabSwitchAttempt } from "@/lib/types/session";
import { StatsCards } from "@/components/analytics/stats-cards";
import { BlockedUrlsTable } from "@/components/analytics/blocked-urls-table";
import { SessionHistory } from "@/components/analytics/session-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, Trash2 } from "lucide-react";

/**
 * Analytics dashboard page
 * Requirements: 4.1 - Display total number of completed sessions
 * Requirements: 4.2 - Display total number of tab switch attempts
 * Requirements: 4.3 - Display breakdown of blocked URLs and their attempt frequencies
 * Requirements: 4.4 - Display session duration statistics
 * Requirements: 4.5 - Display timeline of tab switch attempts during sessions
 */
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [attemptsBySession, setAttemptsBySession] = useState<
    Record<string, TabSwitchAttempt[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const [sessionsData, attemptsData] = await Promise.all([
          getAllSessions(user.uid),
          getAllAttempts(user.uid),
        ]);

        setSessions(sessionsData);
        setAttemptsBySession(attemptsData);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Failed to load analytics data. Please try again.");
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [user]);

  const handleDeleteAll = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete all analytics data? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteAllSessions(user.uid);
      setSessions([]);
      setAttemptsBySession({});
      toast.success("All analytics data deleted");
    } catch (err) {
      console.error("Failed to delete analytics data:", err);
      toast.error("Failed to delete analytics data");
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate stats from sessions
  const stats = calculateSessionStats(sessions);

  // Flatten all attempts for URL frequency calculation
  const allAttempts = Object.values(attemptsBySession).flat();
  const urlFrequency = sortUrlsByFrequency(calculateUrlFrequency(allAttempts));

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500/20 to-violet-500/20">
              <BarChart3 className="size-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Analytics</h1>
              <p className="text-sm text-zinc-500">
                Track your focus session performance
              </p>
            </div>
          </div>
          {sessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
            >
              <Trash2 className="size-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete All"}
            </Button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 bg-zinc-800/50" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64 bg-zinc-800/50" />
              <Skeleton className="h-64 bg-zinc-800/50" />
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <StatsCards
              totalSessions={stats.totalSessions}
              totalFocusMinutes={stats.totalFocusMinutes}
              averageSessionMinutes={stats.averageSessionMinutes}
              totalTabSwitchAttempts={stats.totalTabSwitchAttempts}
            />

            {/* Two Column Layout for Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              <BlockedUrlsTable urlFrequency={urlFrequency} />
              <SessionHistory
                sessions={sessions}
                attemptsBySession={attemptsBySession}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
