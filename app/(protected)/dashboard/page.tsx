"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { FocusSession } from "@/lib/types/session";
import {
  subscribeToActiveSession,
  completeSession,
} from "@/lib/services/session-service";
import { ActiveSessionCard } from "@/components/session/active-session-card";
import { SessionTodoList } from "@/components/session/session-todo-list";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Focus, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-complete session when duration expires
  // Requirements: 2.4 - Automatically end session and update status
  const scheduleAutoComplete = useCallback(
    (session: FocusSession) => {
      if (!user) return;

      // Clear any existing timer
      if (autoCompleteTimerRef.current) {
        clearTimeout(autoCompleteTimerRef.current);
        autoCompleteTimerRef.current = null;
      }

      // Calculate time until session expires
      const startedAtMs = session.startedAt.toMillis();
      const durationMs = session.durationMinutes * 60 * 1000;
      const expiresAtMs = startedAtMs + durationMs;
      const timeUntilExpiry = expiresAtMs - Date.now();

      if (timeUntilExpiry <= 0) {
        // Session already expired, complete it now
        completeSession(user.uid, session.id)
          .then(() => {
            toast.success("Focus session completed! Great work!");
          })
          .catch((error) => {
            console.error("Failed to auto-complete session:", error);
          });
      } else {
        // Schedule auto-complete
        autoCompleteTimerRef.current = setTimeout(async () => {
          try {
            await completeSession(user.uid, session.id);
            toast.success("Focus session completed! Great work!");
          } catch (error) {
            console.error("Failed to auto-complete session:", error);
          }
        }, timeUntilExpiry);
      }
    },
    [user]
  );

  // Subscribe to real-time session updates
  // Requirements: 6.1 - Update web application display within 2 seconds
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const unsubscribe = subscribeToActiveSession(user.uid, (session) => {
        setActiveSession(session);
        setIsLoading(false);
        setError(null);

        if (session && session.status === "active") {
          scheduleAutoComplete(session);
        }
      });

      return () => {
        unsubscribe();
        if (autoCompleteTimerRef.current) {
          clearTimeout(autoCompleteTimerRef.current);
        }
      };
    } catch (err) {
      console.error("Failed to subscribe to session updates:", err);
      setError("Failed to load session data. Please refresh the page.");
      setIsLoading(false);
      toast.error("Failed to load session data");
    }
  }, [user, scheduleAutoComplete]);

  const handleSessionEnd = () => {
    // Clear auto-complete timer when session ends manually
    if (autoCompleteTimerRef.current) {
      clearTimeout(autoCompleteTimerRef.current);
      autoCompleteTimerRef.current = null;
    }
    toast.info("Focus session ended");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles className="size-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            <p className="text-zinc-400 text-sm">
              {activeSession
                ? "You have an active focus session"
                : "Start a focus session to boost your productivity"}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-zinc-900/50 border-rose-500/30 shadow-xl shadow-black/20 max-w-md mx-auto">
          <CardContent className="p-6 text-center space-y-4">
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && isLoading ? (
        // Loading state
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-zinc-900/50 border-zinc-800/60">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-48 bg-zinc-800" />
              <Skeleton className="h-20 w-full bg-zinc-800" />
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800/60">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-32 bg-zinc-800" />
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-6 w-full bg-zinc-800" />
              <Skeleton className="h-6 w-full bg-zinc-800" />
            </CardContent>
          </Card>
        </div>
      ) : !error && activeSession ? (
        // Active session display
        <div className="grid gap-6 lg:grid-cols-2">
          <ActiveSessionCard
            session={activeSession}
            onSessionEnd={handleSessionEnd}
          />
          <SessionTodoList userId={user!.uid} sessionId={activeSession.id} />
        </div>
      ) : !error ? (
        // No active session state
        <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20 max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto size-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Focus className="size-10 text-indigo-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                No Active Session
              </h2>
              <p className="text-zinc-400 text-sm">
                Create a focus session to start blocking distracting websites
                and boost your productivity.
              </p>
            </div>
            <Button
              asChild
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-5 shadow-lg shadow-indigo-500/20"
            >
              <Link href="/dashboard/create">
                <Plus className="size-4 mr-2" />
                Create Focus Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
