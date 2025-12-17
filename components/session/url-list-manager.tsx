"use client";

import { useState } from "react";
import { X, Plus, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isValidUrl } from "@/lib/utils/url-validation";

interface UrlListManagerProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  mode: "allowlist" | "blocklist";
}

export function UrlListManager({
  urls,
  onUrlsChange,
  mode,
}: UrlListManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddUrl = () => {
    const trimmedUrl = inputValue.trim();

    if (!trimmedUrl) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    if (urls.includes(trimmedUrl)) {
      setError("This URL is already in the list");
      return;
    }

    onUrlsChange([...urls, trimmedUrl]);
    setInputValue("");
    setError(null);
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    onUrlsChange(urls.filter((url) => url !== urlToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const placeholder =
    mode === "allowlist" ? "https://docs.google.com" : "https://twitter.com";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-indigo-500/50 focus:ring-indigo-500/20"
            aria-invalid={!!error}
          />
        </div>
        <Button
          type="button"
          onClick={handleAddUrl}
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <Badge
              key={url}
              variant="secondary"
              className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300"
            >
              <Globe className="size-3 text-zinc-500" />
              <span className="max-w-48 truncate text-xs">{url}</span>
              <button
                type="button"
                onClick={() => handleRemoveUrl(url)}
                className="ml-1 rounded-full hover:bg-zinc-700 p-0.5 transition-colors"
                aria-label={`Remove ${url}`}
              >
                <X className="size-3 text-zinc-400 hover:text-white" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {urls.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-4 text-center">
          <Globe className="mx-auto size-8 text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-500">
            {mode === "allowlist"
              ? "Add URLs that will be accessible during your session"
              : "Add URLs that will be blocked during your session"}
          </p>
        </div>
      )}
    </div>
  );
}
