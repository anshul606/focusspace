"use client";

import { useState, useEffect } from "react";
import { Clock, Shield, ShieldOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { UrlListManager } from "./url-list-manager";
import { isValidDuration } from "@/lib/utils/url-validation";

export interface SessionFormData {
  mode: "allowlist" | "blocklist";
  urls: string[];
  durationMinutes: number;
}

interface SessionFormProps {
  onSubmit: (data: SessionFormData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<SessionFormData>;
}

const DURATION_PRESETS = [
  { label: "25m", value: 25, description: "Pomodoro" },
  { label: "50m", value: 50, description: "Deep work" },
  { label: "90m", value: 90, description: "Flow state" },
];

const STORAGE_KEY = "flow-draft-session";

export function SessionForm({
  onSubmit,
  isSubmitting = false,
  initialData,
}: SessionFormProps) {
  const [mode, setMode] = useState<"allowlist" | "blocklist">("blocklist");
  const [urls, setUrls] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<string>("25");
  const [durationError, setDurationError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage or initialData on mount
  useEffect(() => {
    // First priority: initialData from props (reused session)
    if (initialData && Object.keys(initialData).length > 0) {
      if (initialData.mode) setMode(initialData.mode);
      if (initialData.urls) setUrls(initialData.urls);
      if (initialData.durationMinutes)
        setDurationMinutes(initialData.durationMinutes.toString());
      setIsInitialized(true);
      // Clear any saved draft since we're using a reused config
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // Second priority: saved draft from localStorage
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.mode) setMode(draft.mode);
        if (draft.urls) setUrls(draft.urls);
        if (draft.durationMinutes) setDurationMinutes(draft.durationMinutes);
      } catch (e) {
        console.error("Failed to parse saved draft:", e);
      }
    }
    setIsInitialized(true);
  }, [initialData]);

  // Save to localStorage whenever form changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const draft = { mode, urls, durationMinutes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [mode, urls, durationMinutes, isInitialized]);

  const handleDurationChange = (value: string) => {
    setDurationMinutes(value);
    setDurationError(null);
  };

  const handlePresetClick = (value: number) => {
    setDurationMinutes(value.toString());
    setDurationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const duration = parseInt(durationMinutes, 10);

    if (isNaN(duration) || !isValidDuration(duration)) {
      setDurationError("Duration must be between 1 and 480 minutes");
      return;
    }

    if (urls.length === 0) {
      return;
    }

    onSubmit({
      mode,
      urls,
      durationMinutes: duration,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-white">Session Settings</CardTitle>
          <CardDescription className="text-zinc-400">
            Configure your focus session duration and website restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Duration Input */}
          <div className="space-y-3">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Clock className="size-4 text-indigo-400" />
              Session Duration
            </Label>

            {/* Duration Presets */}
            <div className="flex gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center transition-all ${
                    durationMinutes === preset.value.toString()
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs opacity-70">{preset.description}</div>
                </button>
              ))}
            </div>

            {/* Custom Duration */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">or custom:</span>
              <Input
                type="number"
                min={1}
                max={480}
                value={durationMinutes}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-24 bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50 text-center"
                aria-invalid={!!durationError}
              />
              <span className="text-sm text-zinc-500">minutes</span>
            </div>
            {durationError && (
              <p className="text-sm text-red-400">{durationError}</p>
            )}
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <Label className="text-zinc-300">Restriction Mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) =>
                setMode(value as "allowlist" | "blocklist")
              }
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="blocklist"
                className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                  mode === "blocklist"
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <RadioGroupItem
                  value="blocklist"
                  id="blocklist"
                  className="sr-only"
                />
                <div className="flex items-center gap-2 mb-2">
                  <ShieldOff
                    className={`size-5 ${
                      mode === "blocklist" ? "text-indigo-400" : "text-zinc-500"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      mode === "blocklist" ? "text-indigo-400" : "text-zinc-300"
                    }`}
                  >
                    Blocklist
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Block specific sites, allow everything else
                </p>
              </label>

              <label
                htmlFor="allowlist"
                className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                  mode === "allowlist"
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <RadioGroupItem
                  value="allowlist"
                  id="allowlist"
                  className="sr-only"
                />
                <div className="flex items-center gap-2 mb-2">
                  <Shield
                    className={`size-5 ${
                      mode === "allowlist" ? "text-indigo-400" : "text-zinc-500"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      mode === "allowlist" ? "text-indigo-400" : "text-zinc-300"
                    }`}
                  >
                    Allowlist
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Only allow specific sites, block everything else
                </p>
              </label>
            </RadioGroup>
          </div>

          {/* URL List Manager */}
          <div className="space-y-3">
            <Label className="text-zinc-300">
              {mode === "allowlist" ? "Allowed URLs" : "Blocked URLs"}
            </Label>
            <UrlListManager urls={urls} onUrlsChange={setUrls} mode={mode} />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-5 shadow-lg shadow-indigo-500/20"
            disabled={isSubmitting || urls.length === 0}
          >
            {isSubmitting ? "Starting Session..." : "Start Focus Session"}
          </Button>

          {urls.length === 0 && (
            <p className="text-sm text-center text-zinc-500">
              Add at least one URL to start a session
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
