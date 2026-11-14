"use client";

import Link from "next/link";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Construction,
  Eye,
  FileWarning,
  Gauge,
  MapPinned,
  Megaphone,
  Radio,
  Table2,
  Tags,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AREAS, CONSTRUCTION_PHASES, REPORT_CATEGORIES, SUBSCRIBER_COUNTS } from "@/lib/mock-data";
import { closureClock, formatShortDate, isOverdue, relativeTime } from "@/lib/time";
import { TickingCountdown } from "@/components/shared/countdown";
import type { ActivityItem } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { useStore } from "@/store/useStore";
import { AdminPageHeader, Panel } from "./admin-shell";
import { KpiCards } from "./kpi-cards";
import { HBarList, rampBlue } from "./mini-charts";

const DAY = 86_400_000;

const ACTIVITY_STYLE: Record<ActivityItem["kind"], { icon: typeof Activity; cls: string }> = {
  post: { icon: MapPinned, cls: "bg-blue-100 text-blue-700" },
  announcement: { icon: Megaphone, cls: "bg-indigo-100 text-indigo-700" },
  review: { icon: Eye, cls: "bg-sky-100 text-sky-700" },
  report: { icon: FileWarning, cls: "bg-amber-100 text-amber-700" },
};

function greeting(now: number | null) {
  if (now === null) return "Welcome back";
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function AdminDashboard() {
  const now = useMinuteNow();
  const roadblocks = useStore((s) => s.roadblocks);
  const reports = useStore((s) => s.reports);
  const activity = useStore((s) => s.activity);
  const pendingCount = useStore((s) => s.pendingChanges.length + s.pendingAnnouncements.length);

  const unviewed = reports.filter((r) => !r.viewed).length;
  const live = roadblocks.filter((r) => r.status !== "completed");

  // Closure status breakdown (status palette, always labelled)
  const overdueList = now ? live.filter((r) => isOverdue(r, now)) : [];
  const breakdown = [
    { label: "Full closure", value: live.filter((r) => r.status === "active" && r.closure === "full" && !overdueList.includes(r)).length, cls: "bg-red-500" },
    { label: "Partial closure", value: live.filter((r) => r.status === "active" && r.closure === "partial" && !overdueList.includes(r)).length, cls: "bg-amber-400" },
    { label: "Overdue", value: overdueList.length, cls: "bg-rose-700" },
    { label: "Scheduled", value: live.filter((r) => r.status === "scheduled").length, cls: "bg-slate-400" },
    { label: "Completed", value: roadblocks.filter((r) => r.status === "completed").length, cls: "bg-emerald-500" },
  ];
  const breakdownTotal = Math.max(1, breakdown.reduce((s, b) => s + b.value, 0));

  const byCategory = REPORT_CATEGORIES.map((c) => ({
    label: c.label,
    value: reports.filter((r) => r.entries[0].category === c.value).length,
  })).sort((a, b) => b.value - a.value);

  const closedNow = now
    ? live
        .map((rb) => ({ rb, clock: closureClock(rb, now) }))
        .filter((x) => x.clock?.closedNow)
        .sort((a, b) => a.clock!.target.getTime() - b.clock!.target.getTime())
    : [];

  const upcoming = now
    ? [
        ...live
          .filter((r) => r.status === "scheduled" && new Date(r.startDate).getTime() - now < 30 * DAY)
          .map((r) => ({ rb: r, when: r.startDate, kind: "Starts" as const })),
        ...live
          .filter((r) => r.status === "active" && new Date(r.endDate).getTime() > now && new Date(r.endDate).getTime() - now < 45 * DAY)
          .map((r) => ({ rb: r, when: r.endDate, kind: "Ends" as const })),
      ].sort((a, b) => a.when.localeCompare(b.when))
    : [];

  const hotspots = AREAS.map((a) => {
    const rbs = roadblocks.filter((r) => r.areaId === a.id);
    const ids = new Set(rbs.map((r) => r.id));
    const areaReports = reports.filter((r) => ids.has(r.roadblockId));
    return {
      area: a,
      active: rbs.filter((r) => r.status === "active").length,
      reports: areaReports.length,
      unviewed: areaReports.filter((r) => !r.viewed).length,
      subs: SUBSCRIBER_COUNTS[a.id] ?? 0,
    };
  })
    .filter((h) => h.active || h.reports)
    .sort((a, b) => b.reports - a.reports || b.active - a.active);

  const activePhases = live.filter((r) => r.status === "active").sort((a, b) => b.phaseIndex - a.phaseIndex);
  const avgProgress = Math.round(
    (activePhases.reduce((s, r) => s + r.phaseIndex, 0) / Math.max(1, activePhases.length) / (CONSTRUCTION_PHASES.length - 1)) * 100,
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations console"
        title={`${greeting(now)}, Ops Admin`}
        description={
          now
            ? `${new Intl.DateTimeFormat("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(now)} · ${live.length} closures tracked across ${AREAS.length} areas`
            : "Loading live data…"
        }
        actions={
          <>
            <Button asChild className="h-10 rounded-full bg-white text-slate-900 hover:bg-blue-50">
              <Link href="/admin/post">
                <MapPinned /> New post {pendingCount > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-[11px] text-white">{pendingCount}</span>}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/admin/reports">
                <ClipboardList /> Review reports {unviewed > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[11px]">{unviewed}</span>}
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-5">
        <KpiCards />

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Closure status" icon={Construction}>
            <p className="text-3xl font-bold tabular-nums">
              {live.length}
              <span className="ml-1.5 text-sm font-medium text-slate-500">open roadblocks</span>
            </p>
            <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
              {breakdown.map((b) =>
                b.value ? (
                  <span key={b.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", b.cls)} style={{ width: `${(b.value / breakdownTotal) * 100}%` }} title={`${b.label}: ${b.value}`} />
                ) : null,
              )}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {breakdown.map((b) => (
                <li key={b.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className={cn("size-2.5 rounded-full", b.cls)} />
                  <span className="text-slate-600">{b.label}</span>
                  <b className="ml-auto text-slate-900 tabular-nums">{b.value}</b>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Reports by category" icon={Tags}>
            <p className="mb-4 text-3xl font-bold tabular-nums">
              {reports.length}
              <span className="ml-1.5 text-sm font-medium text-slate-500">total reports</span>
            </p>
            <HBarList data={byCategory} />
          </Panel>

          <Panel title="Construction progress" icon={Gauge} action={<span className="text-xs text-slate-500">avg {avgProgress}%</span>}>
            <ul className="space-y-3">
              {activePhases.slice(0, 6).map((r) => {
                const pct = Math.round((r.phaseIndex / (CONSTRUCTION_PHASES.length - 1)) * 100);
                return (
                  <li key={r.id} className="text-xs">
                    <div className="mb-1 flex justify-between gap-2">
                      <span className="truncate font-medium text-slate-700">{r.road}</span>
                      <span className="shrink-0 text-slate-500">{CONSTRUCTION_PHASES[r.phaseIndex]}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-50">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: rampBlue(r.phaseIndex / (CONSTRUCTION_PHASES.length - 1), 2) }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel title="Closed right now" icon={Radio} action={<span className="flex items-center gap-1 text-xs text-red-600"><span className="size-1.5 animate-pulse rounded-full bg-red-500" /> Live</span>}>
            {closedNow.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{now ? "No roads closed at this moment." : "Loading…"}</p>
            ) : (
              <ul className="space-y-2">
                {closedNow.map(({ rb, clock }) => (
                  <li key={rb.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <span className={cn("size-2.5 shrink-0 rounded-full", rb.closure === "full" ? "bg-red-500" : "bg-amber-400")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{rb.road}</p>
                      <p className="text-xs text-slate-500">{rb.closure === "full" ? "Full" : "Partial"} · {AREAS.find((a) => a.id === rb.areaId)?.name}</p>
                    </div>
                    <span className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                      <Timer className="size-3.5 text-slate-400" />
                      <TickingCountdown target={clock!.target.getTime()} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Upcoming milestones" icon={CalendarClock}>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nothing in the next few weeks.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-slate-100 pl-4">
                {upcoming.slice(0, 6).map(({ rb, when, kind }) => (
                  <li key={rb.id + kind} className="relative text-sm">
                    <span className={cn("absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-4 ring-white", kind === "Starts" ? "bg-slate-500" : "bg-emerald-500")} />
                    <p className="text-xs text-slate-500">
                      {formatShortDate(when)} · {now ? relativeTime(when, now) : ""}
                    </p>
                    <p className="font-medium">
                      {kind === "Starts" ? "Closure starts" : "Scheduled to reopen"}: <span className="text-slate-600">{rb.road}</span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Recent activity" icon={Activity} bodyClassName="max-h-80 overflow-y-auto">
            <ul className="space-y-3">
              {activity.slice(0, 12).map((a) => {
                const st = ACTIVITY_STYLE[a.kind];
                return (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", st.cls)}>
                      <st.icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">{a.text}</p>
                      <p className="text-xs text-slate-400">{now ? relativeTime(a.at, now) : formatShortDate(a.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Area hotspots" icon={Table2} bodyClassName="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Area</TableHead>
                <TableHead className="text-right">Active closures</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead className="text-right">Awaiting review</TableHead>
                <TableHead className="pr-5 text-right">Subscribers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotspots.map((h) => (
                <TableRow key={h.area.id}>
                  <TableCell className="pl-5 font-medium">{h.area.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.active}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.reports}</TableCell>
                  <TableCell className="text-right">
                    {h.unviewed ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 tabular-nums">{h.unviewed}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">{h.subs.toLocaleString("en-MY")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
