"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FocusSession } from "@/lib/types/session";
import {
  stopSession,
  subscribeToSession,
} from "@/lib/services/session-service";
import {
  calculateRemainingTime,
  formatRemainingTime,
  isSessionExpired,
} from "@/lib/utils/session-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Globe, StopCircle, Shield, ShieldOff, Zap } from "lucide-react";

interface ActiveSessionCardProps {
  session: FocusSession;
  onSessionEnd?: () => void;
}

/**
 * Displays an active focus session with timer countdown, mode, URLs, and stop button
 * Requirements: 2.1 - Display remaining session time
 * Requirements: 2.2 - Allow stopping session from web application
 * Requirements: 6.1 - Real-time sync of session data
 */
export function ActiveSessionCard({
  session: initialSession,
  onSessionEnd,
}: ActiveSessionCardProps) {
  const [session, setSession] = useState(initialSession);
  const [remainingMs, setRemainingMs] = useState(() =>
    calculateRemainingTime(
      initialSession.startedAt,
      initialSession.durationMinutes
    )
  );
  const [isStopping, setIsStopping] = useState(false);

  const totalDurationMs = session.durationMinutes * 60 * 1000;
  const progressPercent = Math.max(
    0,
    ((totalDurationMs - remainingMs) / totalDurationMs) * 100
  );

  // Subscribe to real-time session updates (e.g., tabSwitchAttempts counter)
  useEffect(() => {
    const unsubscribe = subscribeToSession(
      initialSession.userId,
      initialSession.id,
      (updatedSession) => {
        if (updatedSession) {
          setSession(updatedSession);
          // If session was completed/stopped externally, notify parent
          if (updatedSession.status !== "active") {
            onSessionEnd?.();
          }
        }
      }
    );

    return () => unsubscribe();
  }, [initialSession.userId, initialSession.id, onSessionEnd]);

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const newRemaining = calculateRemainingTime(
        session.startedAt,
        session.durationMinutes
      );
      setRemainingMs(newRemaining);

      if (newRemaining === 0) {
        clearInterval(interval);
        // Auto-complete is handled by the parent dashboard component
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.startedAt, session.durationMinutes]);

  const handleStopSession = async () => {
    setIsStopping(true);
    try {
      await stopSession(session.userId, session.id);
      onSessionEnd?.();
    } catch (error) {
      console.error("Failed to stop session:", error);
      toast.error("Failed to stop session. Please try again.");
      setIsStopping(false);
    }
  };

  const isExpired = isSessionExpired(
    session.startedAt,
    session.durationMinutes
  );

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
              <Zap className="size-4 text-indigo-400" />
            </div>
            Active Session
          </CardTitle>
          <Badge
            className={`${
              session.mode === "allowlist"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {session.mode === "allowlist" ? (
              <Shield className="size-3 mr-1" />
            ) : (
              <ShieldOff className="size-3 mr-1" />
            )}
            {session.mode === "allowlist" ? "Allowlist" : "Blocklist"}
          </Badge>
        </div>
        <CardDescription className="text-zinc-400">
          {session.mode === "allowlist"
            ? "Only the listed sites are accessible"
            : "All sites except the listed ones are accessible"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center py-4">
          <div className="text-5xl font-mono font-bold text-white tracking-wider">
            {isExpired ? "00:00" : formatRemainingTime(remainingMs)}
          </div>
          <p className="text-sm text-zinc-500 mt-2">
            {isExpired ? "Session completed" : "Time remaining"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2 bg-zinc-800" />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{Math.round(progressPercent)}% complete</span>
            <span>{session.durationMinutes} min total</span>
          </div>
        </div>

        {/* URL List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300">
              {session.mode === "allowlist" ? "Allowed Sites" : "Blocked Sites"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.urls.length > 0 ? (
              session.urls.map((url, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-400 text-xs"
                >
                  {url}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-zinc-600">No URLs specified</span>
            )}
          </div>
        </div>

        {/* Tab Switch Attempts */}
        {session.tabSwitchAttempts > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Blocked attempts</span>
              <span className="text-sm font-medium text-amber-400">
                {session.tabSwitchAttempts}
              </span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          variant="outline"
          onClick={handleStopSession}
          disabled={isStopping || isExpired}
          className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50"
        >
          <StopCircle className="size-4 mr-2" />
          {isStopping ? "Stopping..." : "End Session Early"}
        </Button>
      </CardFooter>
    </Card>
  );
}
