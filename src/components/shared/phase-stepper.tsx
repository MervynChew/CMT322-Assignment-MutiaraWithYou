import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CONSTRUCTION_PHASES } from "@/lib/mock-data";

type StepState = "done" | "active" | "upcoming";

function stepStates(current: number): StepState[] {
  const finished = current >= CONSTRUCTION_PHASES.length - 1;
  return CONSTRUCTION_PHASES.map((_, i) => (i < current || finished ? "done" : i === current ? "active" : "upcoming"));
}

const STATE_LABEL: Record<StepState, string> = { done: "Completed", active: "In progress", upcoming: "Upcoming" };

/**
 * Construction progress.
 * - `compact`: a row of numbered dots; hover or focus a dot to see its phase.
 * - default: a vertical timeline with every phase named (labels never overlap).
 */
export function PhaseStepper({ current, compact }: { current: number; compact?: boolean }) {
  const states = stepStates(current);
  const total = CONSTRUCTION_PHASES.length;

  if (compact) {
    return (
      <ol className="flex w-full items-center" aria-label={`Construction phase ${current + 1} of ${total}: ${CONSTRUCTION_PHASES[current]}`}>
        {CONSTRUCTION_PHASES.map((phase, i) => {
          const state = states[i];
          return (
            <li key={phase} className="relative flex flex-1 justify-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn("absolute top-1/2 right-1/2 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-blue-600" : "bg-slate-200")}
                />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    aria-label={`Phase ${i + 1}: ${phase} (${STATE_LABEL[state]})`}
                    className={cn(
                      "relative z-10 flex size-7 cursor-help items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all duration-200 outline-none",
                      "hover:scale-115 hover:shadow-md focus-visible:scale-115 focus-visible:ring-4 focus-visible:ring-blue-200",
                      state === "done" && "border-blue-600 bg-blue-600 text-white hover:ring-4 hover:ring-blue-100",
                      state === "active" && "border-blue-600 bg-white text-blue-700 ring-4 ring-blue-100 hover:ring-blue-200",
                      state === "upcoming" && "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600",
                    )}
                  >
                    {state === "done" ? <Check className="size-3.5" /> : i + 1}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-center">
                  <span className="block text-xs tracking-wider uppercase opacity-70">
                    Phase {i + 1} of {total} · {STATE_LABEL[state]}
                  </span>
                  <span className="font-semibold">{phase}</span>
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="space-y-0">
      {CONSTRUCTION_PHASES.map((phase, i) => {
        const state = states[i];
        const last = i === total - 1;
        return (
          <li key={phase} className="relative flex items-center gap-3 py-1">
            {!last && (
              <span
                aria-hidden
                className={cn("absolute top-1/2 left-[13px] h-full w-0.5", i < current ? "bg-blue-600" : "bg-slate-200")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                state === "done" && "border-blue-600 bg-blue-600 text-white",
                state === "active" && "border-blue-600 bg-white text-blue-700 ring-4 ring-blue-100",
                state === "upcoming" && "border-slate-200 bg-white text-slate-400",
              )}
            >
              {state === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                state === "active" ? "font-semibold text-blue-800" : state === "done" ? "text-slate-700" : "text-slate-400",
              )}
            >
              {phase}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                state === "active" ? "bg-blue-100 text-blue-800" : state === "done" ? "text-emerald-700" : "text-slate-400",
              )}
            >
              {STATE_LABEL[state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
