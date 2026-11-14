"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, ChartColumn, Eye, FileText, Maximize2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badges";
import { cn } from "@/lib/utils";
import { AREAS, REPORT_CATEGORIES, reporterName, SUBSCRIBER_COUNTS } from "@/lib/mock-data";
import { formatDate, formatDateTime, isOverdue, isSameDay } from "@/lib/time";
import { useMinuteNow } from "@/hooks/use-now";
import { useStore } from "@/store/useStore";
import { BarChart, HBarList, SplitBar, type BarDatum } from "./mini-charts";

type KpiKey = "today" | "viewed" | "trend" | "subs" | "overdue";
type Range = "weekly" | "monthly";

/** Mock historical volume so trend charts aren't empty (combined with live reports). */
const HISTORICAL = [4, 6, 3, 7, 5, 2, 3, 6, 8, 5, 4, 3, 2, 5, 7, 9, 6, 4, 3, 5, 6, 4, 2, 3, 7, 5, 6, 8, 4, 3];
const DAY = 86_400_000;
const dayLabel = new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "Asia/Kuala_Lumpur" });
const dateLabel = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
const categoryLabel = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

function KpiCard({
  title,
  icon: Icon,
  accent,
  onOpen,
  children,
  className,
  action,
}: {
  action?: React.ReactNode;
  title: string;
  icon: typeof FileText;
  accent: string;
  onOpen: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className={cn(
        "group relative cursor-pointer rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10 focus-visible:ring-3 focus-visible:ring-blue-500/40 focus-visible:outline-none",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex size-8 items-center justify-center rounded-xl", accent)}>
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-medium text-slate-600">{title}</h3>
        <span className="ml-auto flex items-center gap-2">
          {action}
          <Maximize2 className="size-3.5 text-slate-300 transition group-hover:text-blue-600" />
        </span>
      </div>
      {children}
    </div>
  );
}

export function KpiCards() {
  const router = useRouter();
  const now = useMinuteNow();
  const reports = useStore((s) => s.reports);
  const roadblocks = useStore((s) => s.roadblocks);
  const users = useStore((s) => s.users);
  const setReportViewed = useStore((s) => s.setReportViewed);
  const [open, setOpen] = useState<KpiKey | null>(null);
  const [range, setRange] = useState<Range>("weekly");

  const today = now ? reports.filter((r) => isSameDay(r.createdAt, now)) : [];
  const yesterday = now ? reports.filter((r) => isSameDay(r.createdAt, now - DAY)).length : 0;
  const viewed = reports.filter((r) => r.viewed);
  const notViewed = reports.filter((r) => !r.viewed);
  const overdue = now ? roadblocks.filter((r) => isOverdue(r, now)) : [];

  const subs: BarDatum[] = AREAS.map((a) => ({ label: a.name, value: SUBSCRIBER_COUNTS[a.id] ?? 0 })).sort(
    (a, b) => b.value - a.value,
  );
  const totalSubs = subs.reduce((s, d) => s + d.value, 0);

  const trend = useMemo<Record<Range, BarDatum[]>>(() => {
    if (!now) return { weekly: [], monthly: [] };
    const daily = Array.from({ length: 28 }, (_, i) => {
      const t = now - (27 - i) * DAY;
      const live = reports.filter((r) => isSameDay(r.createdAt, t)).length;
      return { t, value: HISTORICAL[i] + live };
    });
    return {
      weekly: daily.slice(-7).map((d) => ({ label: dayLabel.format(d.t), value: d.value })),
      monthly: [0, 1, 2, 3].map((w) => {
        const chunk = daily.slice(w * 7, w * 7 + 7);
        return { label: `Wk of ${dateLabel.format(chunk[0].t)}`, value: chunk.reduce((s, d) => s + d.value, 0) };
      }),
    };
  }, [now, reports]);
  const trendTotal = trend[range].reduce((s, d) => s + d.value, 0);

  const rangeToggle = (
    <ToggleGroup
      type="single"
      value={range}
      onValueChange={(v) => v && setRange(v as Range)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="rounded-full bg-slate-100 p-0.5"
      size="sm"
    >
      <ToggleGroupItem value="weekly" className="rounded-full px-2.5 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm">Weekly</ToggleGroupItem>
      <ToggleGroupItem value="monthly" className="rounded-full px-2.5 text-xs data-[state=on]:bg-white data-[state=on]:shadow-sm">Monthly</ToggleGroupItem>
    </ToggleGroup>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Reports today" icon={FileText} accent="bg-blue-50 text-blue-700" onOpen={() => setOpen("today")} className="xl:col-span-2">
          <p className="text-4xl font-bold tracking-tight tabular-nums">{now ? today.length : "–"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {now ? `${today.length >= yesterday ? "▲" : "▼"} vs ${yesterday} yesterday` : "Loading…"}
          </p>
        </KpiCard>

        <KpiCard title="Viewed vs pending" icon={Eye} accent="bg-sky-50 text-sky-700" onOpen={() => setOpen("viewed")} className="xl:col-span-2">
          <p className="mb-3 text-4xl font-bold tracking-tight tabular-nums">
            {Math.round((viewed.length / Math.max(1, reports.length)) * 100)}%
            <span className="ml-1 text-sm font-medium text-slate-500">reviewed</span>
          </p>
          <SplitBar a={viewed.length} b={notViewed.length} aLabel="Viewed" bLabel="Pending review" />
        </KpiCard>

        <KpiCard title="Overdue roadblocks" icon={TriangleAlert} accent="bg-rose-50 text-rose-600" onOpen={() => setOpen("overdue")} className="xl:col-span-2">
          <p className={cn("text-4xl font-bold tracking-tight tabular-nums", overdue.length && "text-rose-600")}>{now ? overdue.length : "–"}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {overdue.length ? overdue.map((o) => o.road).join(", ") : "All closures on schedule"}
          </p>
        </KpiCard>

        <KpiCard title="Report trends" icon={ChartColumn} accent="bg-indigo-50 text-indigo-700" onOpen={() => setOpen("trend")} className="sm:col-span-2 xl:col-span-3" action={rangeToggle}>
          <p className="mb-2 text-sm text-slate-500">
            <b className="text-2xl text-slate-900 tabular-nums">{trendTotal}</b> reports in the last {range === "weekly" ? "7 days" : "4 weeks"}
          </p>
          <BarChart data={trend[range]} height={90} />
        </KpiCard>

        <KpiCard title="Active subscriptions by location" icon={BellRing} accent="bg-blue-50 text-blue-700" onOpen={() => setOpen("subs")} className="sm:col-span-2 xl:col-span-3">
          <p className="mb-3 text-sm text-slate-500">
            <b className="text-2xl text-slate-900 tabular-nums">{totalSubs.toLocaleString("en-MY")}</b> subscribers · top 4 areas
          </p>
          <HBarList data={subs} limit={4} max={subs[0].value} />
        </KpiCard>
      </div>

      {/* ---------- Detail dialogs ---------- */}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:max-w-2xl">
          {open === "today" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Reports filed today</DialogTitle>
                <DialogDescription>{today.length} new citizen reports since midnight.</DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Roadblock</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {today.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>{roadblocks.find((b) => b.id === r.roadblockId)?.road}</TableCell>
                      <TableCell>{categoryLabel(r.entries[0].category)}</TableCell>
                      <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {today.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-slate-500">No reports yet today.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {open === "viewed" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Review backlog</DialogTitle>
                <DialogDescription>
                  {viewed.length} viewed · {notViewed.length} pending review. Mark reports as viewed to clear the backlog.
                </DialogDescription>
              </DialogHeader>
              <SplitBar a={viewed.length} b={notViewed.length} aLabel="Viewed" bLabel="Pending review" />
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                {notViewed.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className="font-mono text-xs text-blue-700">{r.id}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {roadblocks.find((b) => b.id === r.roadblockId)?.road} — {reporterName(r.userId, users)}
                    </span>
                    <Button size="xs" variant="outline" className="rounded-full" onClick={() => setReportViewed(r.id, true)}>
                      <Eye /> Mark viewed
                    </Button>
                  </li>
                ))}
                {notViewed.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Backlog cleared 🎉</li>}
              </ul>
            </>
          )}

          {open === "trend" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Report trends</DialogTitle>
                <DialogDescription>Citizen reports per {range === "weekly" ? "day (last 7 days)" : "week (last 4 weeks)"}.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end">{rangeToggle}</div>
              <BarChart data={trend[range]} height={220} />
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[
                  { k: "Total", v: trendTotal },
                  { k: "Peak", v: Math.max(0, ...trend[range].map((d) => d.value)) },
                  { k: "Average", v: (trendTotal / Math.max(1, trend[range].length)).toFixed(1) },
                ].map(({ k, v }) => (
                  <div key={k} className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="text-xl font-semibold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {open === "subs" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Active subscriptions by location</DialogTitle>
                <DialogDescription>{totalSubs.toLocaleString("en-MY")} subscribers receiving closure alerts.</DialogDescription>
              </DialogHeader>
              <HBarList data={subs} />
            </>
          )}

          {open === "overdue" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Overdue roadblocks</DialogTitle>
                <DialogDescription>Closures still open past their scheduled end date.</DialogDescription>
              </DialogHeader>
              <ul className="space-y-2">
                {overdue.map((rb) => (
                  <li key={rb.id} className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                    <CalendarClock className="size-5 text-rose-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{rb.road}</p>
                      <p className="text-xs text-slate-500">
                        Was due {formatDate(rb.endDate)} · {now ? Math.floor((now - new Date(rb.endDate).getTime()) / DAY) : 0} days overdue
                      </p>
                    </div>
                    <StatusBadge status={rb.status} overdue />
                  </li>
                ))}
                {overdue.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nothing overdue.</li>}
              </ul>
              <Button
                className="rounded-full bg-blue-700 hover:bg-blue-800"
                onClick={() => {
                  setOpen(null);
                  router.push("/admin/post");
                }}
              >
                Update in Post editor
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
