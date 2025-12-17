"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatFocusTime } from "@/lib/utils/analytics-utils";
import { Clock, Target, TrendingUp, ShieldAlert } from "lucide-react";

interface StatsCardsProps {
  totalSessions: number;
  totalFocusMinutes: number;
  averageSessionMinutes: number;
  totalTabSwitchAttempts: number;
}

/**
 * Displays analytics stats in card format
 * Requirements: 4.1 - Display total number of completed sessions
 * Requirements: 4.2 - Display total number of tab switch attempts
 * Requirements: 4.4 - Display session duration statistics
 */
export function StatsCards({
  totalSessions,
  totalFocusMinutes,
  averageSessionMinutes,
  totalTabSwitchAttempts,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Sessions",
      value: totalSessions.toString(),
      description: "Completed focus sessions",
      icon: Target,
      iconColor: "text-indigo-400",
      bgColor: "from-indigo-500/20 to-violet-500/20",
    },
    {
      title: "Focus Time",
      value: formatFocusTime(totalFocusMinutes),
      description: "Total time focused",
      icon: Clock,
      iconColor: "text-emerald-400",
      bgColor: "from-emerald-500/20 to-teal-500/20",
    },
    {
      title: "Avg Duration",
      value: `${averageSessionMinutes} min`,
      description: "Average session length",
      icon: TrendingUp,
      iconColor: "text-amber-400",
      bgColor: "from-amber-500/20 to-orange-500/20",
    },
    {
      title: "Blocked Attempts",
      value: totalTabSwitchAttempts.toString(),
      description: "Distraction attempts blocked",
      icon: ShieldAlert,
      iconColor: "text-rose-400",
      bgColor: "from-rose-500/20 to-pink-500/20",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="bg-zinc-900/50 border-zinc-800/60 shadow-lg shadow-black/10"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              {stat.title}
            </CardTitle>
            <div
              className={`flex size-8 items-center justify-center rounded-lg bg-linear-to-br ${stat.bgColor}`}
            >
              <stat.icon className={`size-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-zinc-500 mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
