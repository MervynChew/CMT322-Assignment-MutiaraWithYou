import { Ban, CalendarClock, CircleCheck, CircleDot, Clock3, Moon, Sun, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLOSURE_TYPES, closureTypeOf, type ClosureTypeId } from "@/lib/closure-type";
import type { Roadblock, RoadblockStatus } from "@/lib/types";

const TYPE_ICON: Record<ClosureTypeId, typeof Ban> = { full: Ban, partial: CircleDot, day: Sun, night: Moon, scheduled: CalendarClock };

/** The closure type in words, coloured like its pin on the map (full, lane, daytime, night or upcoming). */
export function ClosureBadge({
  roadblock,
  className,
}: {
  roadblock: Pick<Roadblock, "status" | "closure" | "segments" | "dailyWindow"> | null | undefined;
  className?: string;
}) {
  if (!roadblock) return null;
  const type = closureTypeOf(roadblock);
  const { label, color } = CLOSURE_TYPES[type];
  const Icon = TYPE_ICON[type];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold", className)}
      style={{ color, boxShadow: `inset 0 0 0 1.5px ${color}40` }}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export function StatusBadge({
  status,
  overdue,
  className,
}: {
  status: RoadblockStatus;
  overdue?: boolean;
  className?: string;
}) {
  const conf = overdue
    ? { label: "Overdue", cls: "bg-rose-600 text-white", Icon: TriangleAlert }
    : status === "active"
      ? { label: "Active", cls: "bg-blue-100 text-blue-800", Icon: CircleDot }
      : status === "scheduled"
        ? { label: "Scheduled", cls: "bg-slate-200 text-slate-700", Icon: Clock3 }
        : { label: "Completed", cls: "bg-emerald-100 text-emerald-700", Icon: CircleCheck };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", conf.cls, className)}>
      <conf.Icon className="size-3" />
      {conf.label}
    </span>
  );
}
