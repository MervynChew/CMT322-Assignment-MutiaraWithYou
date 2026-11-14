"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarRange, Clock, FileText, MapPin, Navigation } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteImage } from "@/components/shared/site-image";
import { ClosureBadge, StatusBadge } from "@/components/shared/status-badges";
import { PhaseStepper } from "@/components/shared/phase-stepper";
import { AREAS, CONSTRUCTION_PHASES } from "@/lib/mock-data";
import { formatPeriod, formatWindow, isOverdue, relativeTime } from "@/lib/time";
import { useMinuteNow } from "@/hooks/use-now";
import { useCurrentUser, useStore } from "@/store/useStore";
import { effectiveModes, ModeChips, ModeFilter, useModeFilteredRoadblocks } from "@/components/shared/travel-modes";

type Filter = "all" | "active" | "scheduled" | "mine";

export function RoadblockFeed() {
  const allRoadblocks = useStore((s) => s.roadblocks);
  const roadblocks = useModeFilteredRoadblocks(allRoadblocks);
  const reports = useStore((s) => s.reports);
  const role = useStore((s) => s.role);
  const user = useCurrentUser();
  const now = useMinuteNow();
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(() => {
    const list = roadblocks.filter((r) => r.status !== "completed");
    const filtered =
      filter === "active"
        ? list.filter((r) => r.status === "active")
        : filter === "scheduled"
          ? list.filter((r) => r.status === "scheduled")
          : filter === "mine"
            ? list.filter((r) => user.subscriptions.includes(r.areaId))
            : list;
    return [...filtered].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
  }, [roadblocks, filter, user.subscriptions]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">Roadblock feed</p>
          <h2 className="text-2xl font-bold tracking-tight">Live roadblocks</h2>
          <p className="mt-0.5 text-sm text-slate-500">Closures on the roads around Mutiara Line work sites.</p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-9 rounded-full bg-slate-200/60">
            <TabsTrigger value="all" className="rounded-full px-3">All</TabsTrigger>
            <TabsTrigger value="active" className="rounded-full px-3">Active</TabsTrigger>
            <TabsTrigger value="scheduled" className="rounded-full px-3">Upcoming</TabsTrigger>
            {role !== "guest" && <TabsTrigger value="mine" className="rounded-full px-3">My areas</TabsTrigger>}
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200/70">
        <span className="text-sm font-medium text-slate-600">Show roadblocks for</span>
        <ModeFilter />
      </div>

      {items.length === 0 && (
        <p className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No roadblocks match these filters.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((rb) => {
          const area = AREAS.find((a) => a.id === rb.areaId);
          const reportCount = reports.filter((r) => r.roadblockId === rb.id).length;
          const overdue = now !== null && isOverdue(rb, now);
          return (
            <article
              key={rb.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/10"
            >
              <div className="relative">
                <SiteImage src={rb.image} alt={`Construction site at ${rb.road}`} className="h-40 w-full" />
                <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
                  <StatusBadge status={rb.status} overdue={overdue} className="shadow-sm" />
                  <ClosureBadge roadblock={rb} className="shadow-sm" />
                </div>
                <ModeChips modes={effectiveModes(rb)} tone="glass" className="absolute bottom-3 left-3" />
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  <FileText className="size-3" /> {reportCount} report{reportCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="leading-snug font-semibold">{rb.road}</h3>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="size-3" /> {area?.name}
                    {now && <span className="ml-auto">Updated {relativeTime(rb.lastUpdated, now)}</span>}
                  </p>
                </div>
                <p className="line-clamp-2 text-sm text-slate-600">{rb.description}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <dt className="flex items-center gap-1 text-slate-500"><CalendarRange className="size-3" /> Period</dt>
                    <dd className="mt-0.5 font-medium">{formatPeriod(rb.startDate, rb.endDate)}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <dt className="flex items-center gap-1 text-slate-500"><Clock className="size-3" /> Hours</dt>
                    <dd className="mt-0.5 font-medium">{formatWindow(rb.dailyWindow)}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1.5 text-xs text-slate-500">
                    Phase: <span className="font-medium text-blue-800">{CONSTRUCTION_PHASES[rb.phaseIndex]}</span>
                  </p>
                  <PhaseStepper current={rb.phaseIndex} compact />
                </div>
                <Link
                  href={`/map?roadblock=${rb.id}`}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-50 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-100"
                >
                  <Navigation className="size-3.5" /> View on map
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
