import { Eye, Hourglass, Send, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/time";
import type { Report } from "@/lib/types";

type Step = { key: string; label: string; icon: typeof Send; state: "done" | "current" | "upcoming" | "flag"; at?: string };

/** Where a citizen's report is in review: submitted → pending review → viewed (→ marked important). */
export function reportSteps(report: Report): Step[] {
  const log = report.log ?? [];
  const lastOf = (action: string) => [...log].reverse().find((l) => l.action === action)?.at;
  const steps: Step[] = [
    { key: "submitted", label: "Submitted", icon: Send, state: "done", at: report.createdAt },
    { key: "pending", label: "Pending review", icon: Hourglass, state: report.viewed ? "done" : "current" },
    { key: "viewed", label: "Viewed by admin", icon: Eye, state: report.viewed ? "done" : "upcoming", at: report.viewed ? lastOf("viewed") : undefined },
  ];
  if (report.focused) steps.push({ key: "important", label: "Marked important", icon: Star, state: "flag", at: lastOf("focused") });
  return steps;
}

const NODE: Record<Step["state"], string> = {
  done: "bg-blue-600 text-white",
  current: "bg-amber-400 text-white ring-4 ring-amber-100",
  upcoming: "bg-slate-100 text-slate-400",
  flag: "bg-amber-500 text-white ring-4 ring-amber-100",
};

/** Small horizontal status line. Hover a step for its time. */
export function ReportStatusLine({ report, className }: { report: Report; className?: string }) {
  const steps = reportSteps(report);
  return (
    <ol aria-label="Report status" className={cn("flex items-start", className)}>
      {steps.map((s, i) => {
        const reached = s.state !== "upcoming";
        return (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center" title={s.at ? `${s.label} · ${formatDateTime(s.at)}` : s.label}>
            {i > 0 && (
              <span aria-hidden className="absolute top-2.5 right-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-slate-200">
                <span
                  className={cn(
                    "block h-full origin-left rounded-full transition-transform duration-700",
                    s.state === "flag" ? "bg-amber-400" : "bg-blue-600",
                    reached ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            )}
            <span className={cn("relative z-10 flex size-5 items-center justify-center rounded-full transition-colors", NODE[s.state])}>
              {s.state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/50" />}
              <s.icon className={cn("relative size-2.5", s.state === "flag" && "fill-current")} strokeWidth={3} />
            </span>
            <span
              className={cn(
                "w-full truncate px-0.5 text-xs leading-tight font-medium",
                s.state === "upcoming" ? "text-slate-400" : s.state === "current" ? "text-amber-700" : s.state === "flag" ? "text-amber-700" : "text-slate-600",
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
