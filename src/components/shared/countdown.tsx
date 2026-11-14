"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { closureClock, formatCountdown, formatWindow } from "@/lib/time";
import type { Roadblock } from "@/lib/types";

/** Just the ticking "hh:mm:ss" text: only this span re-renders every second. */
export function TickingCountdown({ target }: { target: number }) {
  const now = useNow();
  return <>{now ? formatCountdown(target - now) : "--:--:--"}</>;
}

/** Live ticking countdown to the next open/close transition of a roadblock. */
export function ClosureCountdown({ roadblock, className }: { roadblock: Roadblock; className?: string }) {
  const now = useNow();
  const clock = now ? closureClock(roadblock, now) : null;
  const state =
    now === null ? "Checking…" : clock ? (clock.closedNow ? "Closed now" : "Open now") : "No active closure";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-white",
        clock?.closedNow === false
          ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
          : "bg-gradient-to-br from-blue-700 to-blue-900",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wider text-white/80 uppercase">
            <span className={cn("size-2 rounded-full", clock?.closedNow ? "animate-pulse bg-red-400" : "bg-emerald-200")} />
            {state}
          </p>
          <p className="mt-1 text-xs text-white/80">{clock?.label ?? "Countdown"}</p>
        </div>
        <Timer className="size-8 text-white/30" />
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums">
        {now && clock ? formatCountdown(clock.target.getTime() - now) : "--:--:--"}
      </p>
      <p className="mt-1 text-xs text-white/70">Closure hours: {formatWindow(roadblock.dailyWindow)}</p>
    </div>
  );
}
