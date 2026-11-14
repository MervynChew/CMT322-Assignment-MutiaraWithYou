import type { DailyWindow, Roadblock } from "./types";

/**
 * The five kinds of closure an admin can pick. Each has its own colour (and a
 * small symbol for timed and upcoming works), used for the pin on every map so
 * the public can tell them apart at a glance.
 */
export type ClosureTypeId = "full" | "partial" | "day" | "night" | "scheduled";

export const CLOSURE_TYPES: Record<ClosureTypeId, { label: string; color: string; glow: string; meaning: string }> = {
  full: { label: "Full closure", color: "#dc2626", glow: "rgba(220,38,38,.35)", meaning: "Road fully closed" },
  partial: { label: "Lane closure", color: "#f59e0b", glow: "rgba(245,158,11,.38)", meaning: "Some lanes closed" },
  day: { label: "Daytime works", color: "#f97316", glow: "rgba(249,115,22,.36)", meaning: "Lanes closed during the day" },
  night: { label: "Night works", color: "#4f46e5", glow: "rgba(79,70,229,.35)", meaning: "Lanes closed overnight" },
  scheduled: { label: "Upcoming closure", color: "#64748b", glow: "rgba(100,116,139,.3)", meaning: "Not started yet" },
};

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Overnight windows cross midnight or start in the evening (e.g. 22:00 – 06:00). */
export function isNightWindow(w: DailyWindow) {
  const start = toMin(w.start);
  const end = toMin(w.end);
  return end <= start || start >= 18 * 60 || start < 5 * 60;
}

/** Full or partial, letting drawn stretches decide when there are any (any full stretch makes it full). */
export function effectiveClosure(rb: Pick<Roadblock, "closure" | "segments">) {
  if (!rb.segments?.length) return rb.closure;
  return rb.segments.some((s) => s.kind === "full") ? "full" : "partial";
}

type ClosureFields = Pick<Roadblock, "closure" | "segments" | "dailyWindow">;

const sameWindow = (a?: DailyWindow, b?: DailyWindow) => a?.start === b?.start && a?.end === b?.end;

/**
 * Keeps a roadblock's extent, drawn stretches and daily hours agreeing with
 * each other, so its type always matches what the admin changed last:
 * - Daily hours mean lanes close only during those hours: daytime or night
 *   works, decided by the opening time. Adding or changing the hours turns a
 *   full closure (and any full stretches) into a partial one.
 * - A full closure is closed all day, so making it full (the extent, or a
 *   full stretch) removes the daily hours.
 */
export function syncClosure<T extends ClosureFields>(prev: ClosureFields, next: T): T {
  if (!next.dailyWindow || effectiveClosure(next) !== "full") return next;
  if (!sameWindow(prev.dailyWindow, next.dailyWindow)) {
    return {
      ...next,
      closure: "partial",
      segments: next.segments?.map((s) => (s.kind === "full" ? { ...s, kind: "partial" as const } : s)),
    } as T;
  }
  return { ...next, dailyWindow: undefined } as T;
}

/** Which of the five closure types a roadblock is. */
export function closureTypeOf(rb: Pick<Roadblock, "status" | "closure" | "segments" | "dailyWindow">): ClosureTypeId {
  if (rb.status === "scheduled") return "scheduled";
  if (effectiveClosure(rb) === "full") return "full";
  if (!rb.dailyWindow) return "partial";
  return isNightWindow(rb.dailyWindow) ? "night" : "day";
}
