"use client";

import { useState } from "react";
import { FocusSession, TabSwitchAttempt } from "@/lib/types/session";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  History,
  ChevronDown,
  ChevronRight,
  Shield,
  ShieldOff,
  Clock,
  AlertTriangle,
  CheckCircle,
  StopCircle,
} from "lucide-react";

interface SessionHistoryProps {
  sessions: FocusSession[];
  attemptsBySession: Record<string, TabSwitchAttempt[]>;
}

/**
 * Displays a list of past sessions with expandable details
 * Requirements: 4.5 - Display timeline of tab switch attempts during sessions
 */
export function SessionHistory({
  sessions,
  attemptsBySession,
}: SessionHistoryProps) {
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set());

  const toggleSession = (sessionId: string) => {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  // Filter to only show completed or stopped sessions
  const finishedSessions = sessions.filter(
    (s) => s.status === "completed" || s.status === "stopped"
  );

  if (finishedSessions.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-lg shadow-black/10">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <History className="size-5 text-zinc-400" />
            Session History
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Your past focus sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800/50 mb-3">
              <Clock className="size-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No sessions yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Start a focus session to see your history here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-lg shadow-black/10">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <History className="size-5 text-zinc-400" />
          Session History
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Your past focus sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {finishedSessions.map((session) => {
          const isOpen = openSessions.has(session.id);
          const attempts = attemptsBySession[session.id] || [];
          const startDate = session.startedAt.toDate();
          const endDate = session.endedAt?.toDate();

          // Calculate actual duration
          let actualMinutes = session.durationMinutes;
          if (endDate) {
            actualMinutes = Math.round(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60)
            );
          }

          return (
            <Collapsible
              key={session.id}
              open={isOpen}
              onOpenChange={() => toggleSession(session.id)}
            >
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="size-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="size-4 text-zinc-500" />
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">
                            {startDate.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {startDate.toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
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
                            {session.mode}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {actualMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.tabSwitchAttempts > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-rose-500/10 text-rose-400 border-rose-500/30"
                        >
                          <AlertTriangle className="size-3 mr-1" />
                          {session.tabSwitchAttempts}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`${
                          session.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {session.status === "completed" ? (
                          <CheckCircle className="size-3 mr-1" />
                        ) : (
                          <StopCircle className="size-3 mr-1" />
                        )}
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
                    {/* URLs */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-zinc-400 mb-2">
                        {session.mode === "allowlist"
                          ? "Allowed Sites"
                          : "Blocked Sites"}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {session.urls.length > 0 ? (
                          session.urls.map((url, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs"
                            >
                              {url}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-600">
                            No URLs specified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tab Switch Attempts Timeline */}
                    {attempts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-2">
                          Blocked Attempts ({attempts.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {attempts.map((attempt) => (
                            <div
                              key={attempt.id}
                              className="flex items-center justify-between text-xs bg-zinc-900/50 rounded px-3 py-2"
                            >
                              <span className="text-zinc-400 truncate max-w-[200px]">
                                {attempt.attemptedUrl}
                              </span>
                              <span className="text-zinc-600">
                                {attempt.timestamp
                                  .toDate()
                                  .toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {attempts.length === 0 && (
                      <div className="text-center py-2">
                        <p className="text-xs text-zinc-600">
                          No blocked attempts during this session
                        </p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
