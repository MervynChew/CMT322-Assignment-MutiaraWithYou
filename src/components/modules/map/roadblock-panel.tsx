"use client";

import { useRouter } from "next/navigation";
import { CalendarRange, Clock, FileWarning, Info, MapPin, Signpost, TrafficCone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlideOver } from "@/components/shared/slide-over";
import { SiteImage } from "@/components/shared/site-image";
import { ClosureBadge, StatusBadge } from "@/components/shared/status-badges";
import { PhaseStepper } from "@/components/shared/phase-stepper";
import { ClosureCountdown } from "@/components/shared/countdown";
import { AREAS, CONSTRUCTION_PHASES } from "@/lib/mock-data";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { formatDate, formatWindow, isOverdue, relativeTime } from "@/lib/time";
import type { Roadblock } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { effectiveModes, MODE_ICON, ModeChips, segmentModes } from "@/components/shared/travel-modes";
import { TRAVEL_MODES } from "@/lib/mock-data";

export function RoadblockPanel({
  roadblock,
  open,
  now,
  onClose,
}: {
  roadblock: Roadblock | null;
  open: boolean;
  now: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const reports = useStore((s) => s.reports);
  const area = AREAS.find((a) => a.id === roadblock?.areaId);
  const reportCount = roadblock ? reports.filter((r) => r.roadblockId === roadblock.id).length : 0;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={roadblock?.road ?? ""}
      subtitle={
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {area?.name}
        </span>
      }
      icon={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <TrafficCone className="size-5" />
        </span>
      }
    >
      {roadblock && (
        <div className="space-y-5 p-5">
          <div className="group relative">
            <SiteImage src={roadblock.image} alt={`Site at ${roadblock.road}`} className="h-40 w-full rounded-2xl" />
            <div className="absolute top-3 left-3 flex gap-1.5">
              <StatusBadge status={roadblock.status} overdue={now !== null && isOverdue(roadblock, now)} className="shadow" />
              <ClosureBadge roadblock={roadblock} className="shadow" />
            </div>
          </div>

          <section aria-label="Who is blocked">
            <h3 className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold">
              Who is blocked
              <span className="text-xs font-normal text-slate-500">
                {roadblock.segments?.length ? "Across the closed stretches below" : `Within ${formatDistance(roadblock.radiusM)} of the site`}
              </span>
            </h3>
            <ul className="grid grid-cols-3 gap-2">
              {TRAVEL_MODES.map((m) => {
                const Icon = MODE_ICON[m.value];
                const blocked = effectiveModes(roadblock).includes(m.value);
                return (
                  <li
                    key={m.value}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-medium",
                      blocked ? "bg-red-50 text-red-800 ring-1 ring-red-100" : "bg-emerald-50 text-emerald-800",
                    )}
                  >
                    <Icon className="size-4" />
                    {m.short}
                    <span className={cn("text-xs font-normal", blocked ? "text-red-700/80" : "text-emerald-700/80")}>
                      {blocked ? "Blocked" : "Can pass"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="flex items-center gap-1 text-xs text-slate-500"><CalendarRange className="size-3.5" /> Period</dt>
              <dd className="mt-1 font-medium">{formatDate(roadblock.startDate)}</dd>
              <dd className="text-xs text-slate-500">to {formatDate(roadblock.endDate)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="flex items-center gap-1 text-xs text-slate-500"><Clock className="size-3.5" /> Closure hours</dt>
              <dd className="mt-1 font-medium">{formatWindow(roadblock.dailyWindow)}</dd>
              {now && <dd className="text-xs text-slate-500">Updated {relativeTime(roadblock.lastUpdated, now)}</dd>}
            </div>
          </dl>

          {roadblock.status !== "completed" && <ClosureCountdown roadblock={roadblock} />}

          {(roadblock.segments?.length ?? 0) > 0 && (
            <section>
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                Closed stretches
                <span className="text-xs font-normal text-slate-500">
                  {formatDistance(roadblock.segments!.reduce((n, x) => n + x.lengthM, 0))} in total
                </span>
              </h3>
              <ul className="space-y-1.5">
                {roadblock.segments!.map((seg) => (
                  <li key={seg.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-7 shrink-0 rounded-full",
                        seg.kind === "full" ? "bg-red-600" : "bg-[repeating-linear-gradient(90deg,#f59e0b_0_6px,transparent_6px_9px)]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{seg.road}</span>
                      <span className="text-xs text-slate-500">
                        {seg.kind === "full" ? "Fully closed" : "Partially closed (lane open)"} · {formatDistance(seg.lengthM)}
                      </span>
                    </span>
                    <ModeChips modes={segmentModes(roadblock, seg)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
              Construction progress
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                Phase {roadblock.phaseIndex + 1} of {CONSTRUCTION_PHASES.length}
              </span>
            </h3>
            <PhaseStepper current={roadblock.phaseIndex} />
          </section>

          <Separator />

          <section className="space-y-3 text-sm">
            <p className="flex gap-2 text-slate-600">
              <Info className="mt-0.5 size-4 shrink-0 text-blue-700" /> {roadblock.description}
            </p>
            <p className="flex gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-900">
              <Signpost className="mt-0.5 size-4 shrink-0" /> <span><b>Detour:</b> {roadblock.detour}</span>
            </p>
          </section>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 p-3">
            <div>
              <p className="text-sm font-medium">Something looks wrong?</p>
              <p className="text-xs text-slate-500">{reportCount} citizen report{reportCount === 1 ? "" : "s"} filed</p>
            </div>
            <Button
              className="rounded-full bg-blue-700 hover:bg-blue-800"
              // Opens a new report with this roadblock and the time of the tap already filled in.
              onClick={() =>
                router.push(`/reports?tab=new&roadblock=${roadblock.id}&at=${encodeURIComponent(new Date().toISOString())}`)
              }
            >
              <FileWarning /> Report inaccuracy
            </Button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
