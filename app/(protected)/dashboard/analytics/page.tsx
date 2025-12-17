"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
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
import { BarChart3, Trash2, Heart, Sparkles, Cherry } from "lucide-react";

/**
 * Analytics dashboard page
 * Requirements: 4.1 - Display total number of completed sessions
 * Requirements: 4.2 - Display total number of tab switch attempts
 * Requirements: 4.3 - Display breakdown of blocked URLs and their attempt frequencies
 * Requirements: 4.4 - Display session duration statistics
 * Requirements: 4.5 - Display timeline of tab switch attempts during sessions
 */
// Favicon helpers
const defaultFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;
const pinkFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;

function setFavicon(svgString: string) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [attemptsBySession, setAttemptsBySession] = useState<
    Record<string, TabSwitchAttempt[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sakura theme easter egg state
  const [clickCount, setClickCount] = useState(0);
  const [sakuraTheme, setSakuraTheme] = useState(false);
  const [showThemeText, setShowThemeText] = useState(false);
  const [themeTextContent, setThemeTextContent] = useState("");
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for saved theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("sakura-theme");
    if (savedTheme === "true") {
      setSakuraTheme(true);
      document.documentElement.classList.add("sakura-theme");
      // Remove mrinalini theme if active
      document.documentElement.classList.remove("mrinalini-theme");
      setFavicon(pinkFavicon);
    }
  }, []);

  // Handle the secret icon click
  const handleIconClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 2000);

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 6) {
      setClickCount(0);

      if (!sakuraTheme) {
        // Activate Sakura theme
        setSakuraTheme(true);
        document.documentElement.classList.add("sakura-theme");
        document.documentElement.classList.remove("mrinalini-theme");
        localStorage.setItem("sakura-theme", "true");
        localStorage.setItem("mrinalini-theme", "false");
        setFavicon(pinkFavicon);

        // Show big centered text
        setThemeTextContent("Sakura Theme Activated");
        setShowThemeText(true);
        setTimeout(() => setShowThemeText(false), 2500);

        toast.success("🌸 Sakura Theme Activated!", {
          description: "Enjoy the pink vibes 💕",
          duration: 4000,
        });

        // Fire pink confetti!
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ["#ec4899", "#db2777", "#f472b6", "#fbcfe8", "#fce7f3"];

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      } else {
        // Deactivate Sakura theme
        setSakuraTheme(false);
        document.documentElement.classList.remove("sakura-theme");
        localStorage.setItem("sakura-theme", "false");
        setFavicon(defaultFavicon);

        setThemeTextContent("Theme Deactivated");
        setShowThemeText(true);
        setTimeout(() => setShowThemeText(false), 2000);

        toast.info("Sakura Theme Deactivated", {
          description: "Back to the default look",
          duration: 3000,
        });
      }
    }
  };

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
        {/* Big Theme Activation Text Overlay */}
        {showThemeText && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                {sakuraTheme ? (
                  <>
                    <Cherry
                      className="size-10 md:size-14 text-pink-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <Heart
                      className="size-8 md:size-10 text-pink-300 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                  </>
                ) : (
                  <Sparkles className="size-10 md:size-14 text-indigo-400 animate-bounce" />
                )}
                <h1
                  className="text-4xl md:text-6xl font-black tracking-tight text-white animate-in zoom-in-50 duration-500"
                  style={{
                    textShadow: sakuraTheme
                      ? "0 0 40px rgba(236, 72, 153, 0.8), 0 0 80px rgba(236, 72, 153, 0.5), 0 0 120px rgba(236, 72, 153, 0.3)"
                      : "0 0 40px rgba(129, 140, 248, 0.8), 0 0 80px rgba(129, 140, 248, 0.5)",
                  }}
                >
                  {themeTextContent}
                </h1>
                {sakuraTheme ? (
                  <>
                    <Heart
                      className="size-8 md:size-10 text-pink-300 animate-bounce"
                      style={{ animationDelay: "100ms" }}
                    />
                    <Cherry
                      className="size-10 md:size-14 text-pink-400 animate-bounce"
                      style={{ animationDelay: "200ms" }}
                    />
                  </>
                ) : (
                  <Sparkles
                    className="size-10 md:size-14 text-indigo-400 animate-bounce"
                    style={{ animationDelay: "100ms" }}
                  />
                )}
              </div>
              <p className="text-lg text-white/80 font-medium">
                {sakuraTheme ? "Enjoy the pink vibes 🌸" : "Back to default ✨"}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleIconClick}
              className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500/20 to-violet-500/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Theme toggle easter egg"
            >
              <BarChart3 className="size-5 text-indigo-400" />
            </button>
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
