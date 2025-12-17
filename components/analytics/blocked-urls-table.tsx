"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, AlertTriangle } from "lucide-react";

interface BlockedUrlsTableProps {
  urlFrequency: Array<{ url: string; count: number }>;
}

/**
 * Displays a table of blocked URLs with their attempt frequencies
 * Requirements: 4.3 - Display breakdown of blocked URLs and their attempt frequencies
 */
export function BlockedUrlsTable({ urlFrequency }: BlockedUrlsTableProps) {
  if (urlFrequency.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-lg shadow-black/10">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Globe className="size-5 text-zinc-400" />
            Blocked URLs
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Sites you tried to access during focus sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-800/50 mb-3">
              <AlertTriangle className="size-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">
              No blocked attempts recorded
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Great focus! Keep it up.
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
          <Globe className="size-5 text-zinc-400" />
          Blocked URLs
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Sites you tried to access during focus sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">
                  URL
                </th>
                <th className="text-right text-xs font-medium text-zinc-400 px-4 py-3">
                  Attempts
                </th>
              </tr>
            </thead>
            <tbody>
              {urlFrequency.map((item, index) => (
                <tr
                  key={item.url}
                  className={`border-b border-zinc-800/50 last:border-0 ${
                    index % 2 === 0 ? "bg-zinc-900/20" : "bg-zinc-900/40"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-300 truncate block max-w-[300px]">
                      {item.url}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant="outline"
                      className={`${
                        item.count >= 10
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : item.count >= 5
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {item.count}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
