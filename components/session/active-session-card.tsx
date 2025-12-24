"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FocusSession } from "@/lib/types/session";
import {
  stopSession,
  subscribeToSession,
  addUrlToSession,
  removeUrlFromSession,
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  StopCircle,
  Shield,
  ShieldOff,
  Zap,
  Plus,
  AlertTriangle,
  X,
} from "lucide-react";

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
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [urlToRemove, setUrlToRemove] = useState<string | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState("");
  const [isRemovingUrl, setIsRemovingUrl] = useState(false);

  const STOP_CONFIRM_PHRASE = session.endPhrase || "i am giving up my goals";
  const REMOVE_CONFIRM_PHRASE = "confirm";

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
    if (confirmText.toLowerCase() !== STOP_CONFIRM_PHRASE) {
      toast.error(`Please type the phrase exactly to confirm`);
      return;
    }

    setIsStopping(true);
    try {
      await stopSession(session.userId, session.id);
      setShowStopConfirm(false);
      setConfirmText("");
      onSessionEnd?.();
    } catch (error) {
      console.error("Failed to stop session:", error);
      toast.error("Failed to stop session. Please try again.");
      setIsStopping(false);
    }
  };

  const handleRemoveUrl = async () => {
    if (removeConfirmText.toLowerCase() !== REMOVE_CONFIRM_PHRASE) {
      toast.error(`Please type "${REMOVE_CONFIRM_PHRASE}" to confirm`);
      return;
    }

    if (!urlToRemove) return;

    setIsRemovingUrl(true);
    try {
      await removeUrlFromSession(session.userId, session.id, urlToRemove);
      setShowRemoveConfirm(false);
      setUrlToRemove(null);
      setRemoveConfirmText("");
      toast.success(`Removed ${urlToRemove} from the list`);
    } catch (error) {
      console.error("Failed to remove URL:", error);
      toast.error("Failed to remove URL. Please try again.");
    } finally {
      setIsRemovingUrl(false);
    }
  };

  const openRemoveDialog = (url: string) => {
    setUrlToRemove(url);
    setShowRemoveConfirm(true);
  };

  const handleAddUrl = async () => {
    const trimmedUrl = newUrl.trim().toLowerCase();
    if (!trimmedUrl) {
      toast.error("Please enter a URL");
      return;
    }

    setIsAddingUrl(true);
    try {
      await addUrlToSession(session.userId, session.id, trimmedUrl);
      setNewUrl("");
      setShowAddUrl(false);
      toast.success(
        `Added ${trimmedUrl} to ${
          session.mode === "allowlist" ? "allowed" : "blocked"
        } sites`
      );
    } catch (error) {
      console.error("Failed to add URL:", error);
      toast.error("Failed to add URL. Please try again.");
    } finally {
      setIsAddingUrl(false);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-300">
                {session.mode === "allowlist"
                  ? "Allowed Sites"
                  : "Blocked Sites"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddUrl(true)}
              className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
            >
              <Plus className="size-3 mr-1" />
              Add Site
            </Button>
          </div>

          {/* Add URL Input */}
          {showAddUrl && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="e.g., example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                className="flex-1 h-8 text-sm bg-zinc-900/50 border-zinc-700"
              />
              <Button
                size="sm"
                onClick={handleAddUrl}
                disabled={isAddingUrl}
                className="h-8 bg-indigo-600 hover:bg-indigo-500"
              >
                {isAddingUrl ? "Adding..." : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddUrl(false);
                  setNewUrl("");
                }}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {session.urls.length > 0 ? (
              session.urls.map((url, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-400 text-xs pr-1 flex items-center gap-1"
                >
                  {url}
                  <button
                    onClick={() => openRemoveDialog(url)}
                    className="ml-1 p-0.5 rounded hover:bg-zinc-700 hover:text-red-400 transition-colors"
                    aria-label={`Remove ${url}`}
                  >
                    <X className="size-3" />
                  </button>
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
          onClick={() => setShowStopConfirm(true)}
          disabled={isStopping || isExpired}
          className="w-full border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50"
        >
          <StopCircle className="size-4 mr-2" />
          End Session Early
        </Button>
      </CardFooter>

      {/* Stop Confirmation Dialog */}
      <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-400" />
              Are you sure?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              You still have{" "}
              <span className="text-white font-medium">
                {formatRemainingTime(remainingMs)}
              </span>{" "}
              left in your focus session. Ending early means giving up on your
              commitment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-zinc-400">
              To confirm, type{" "}
              <span className="text-red-400 font-mono font-medium">
                {STOP_CONFIRM_PHRASE}
              </span>{" "}
              below:
            </p>
            <Input
              type="text"
              placeholder="Type the phrase to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStopSession()}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStopConfirm(false);
                setConfirmText("");
              }}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              Keep Focusing
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopSession}
              disabled={
                isStopping || confirmText.toLowerCase() !== STOP_CONFIRM_PHRASE
              }
              className="bg-red-600 hover:bg-red-500"
            >
              {isStopping ? "Stopping..." : "End Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove URL Confirmation Dialog */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Site?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to remove{" "}
              <span className="text-white font-medium">{urlToRemove}</span> from
              your {session.mode === "allowlist" ? "allowed" : "blocked"} sites?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-zinc-400">
              Type{" "}
              <span className="text-amber-400 font-mono font-medium">
                {REMOVE_CONFIRM_PHRASE}
              </span>{" "}
              to remove:
            </p>
            <Input
              type="text"
              placeholder={`Type "${REMOVE_CONFIRM_PHRASE}"`}
              value={removeConfirmText}
              onChange={(e) => setRemoveConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRemoveUrl()}
              className="bg-zinc-800 border-zinc-700 text-white"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirm(false);
                setUrlToRemove(null);
                setRemoveConfirmText("");
              }}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUrl}
              disabled={
                isRemovingUrl ||
                removeConfirmText.toLowerCase() !== REMOVE_CONFIRM_PHRASE
              }
              className="bg-red-600 hover:bg-red-500"
            >
              {isRemovingUrl ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
