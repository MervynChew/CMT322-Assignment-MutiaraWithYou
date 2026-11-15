"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  LocateFixed,
  Mail,
  MapPin,
  MapPinned,
  History,
  Star,
  Tag,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClosureBadge, StatusBadge } from "@/components/shared/status-badges";
import { cn } from "@/lib/utils";
import { AREAS, REPORTER_NAMES, reporterName } from "@/lib/mock-data";
import { formatDistance } from "@/lib/geo";
import { formatDateTime, isOverdue, relativeTime } from "@/lib/time";
import type { ArchivedRoadblock, Report, Roadblock } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { findRoadblock, useStore } from "@/store/useStore";
import { categoryLabel, HandlingLog, ReportSheet } from "@/components/shared/report-paper";

function reporterEmail(userId: string, users: { id: string; email: string }[]) {
  const known = users.find((u) => u.id === userId)?.email;
  if (known) return known;
  return `${(REPORTER_NAMES[userId] ?? "citizen").toLowerCase().replace(/\s+/g, ".")}@gmail.com`;
}

/* ---------- Summary frame ---------- */

function SummaryFrame({
  report,
  roadblock,
  past,
  email,
  siblings,
  onOpen,
}: {
  report: Report;
  roadblock?: Roadblock;
  /** Set when the roadblock has since come off the public map. */
  past?: ArchivedRoadblock;
  email: string;
  siblings: Report[];
  onOpen: (id: string) => void;
}) {
  const now = useMinuteNow();
  const users = useStore((s) => s.users);
  const reporter = reporterName(report.userId, users);
  const setReportViewed = useStore((s) => s.setReportViewed);
  const setReportFocus = useStore((s) => s.setReportFocus);
  const area = AREAS.find((a) => a.id === roadblock?.areaId);
  const first = report.entries[0];
  const latest = report.entries[report.entries.length - 1];

  const rows: { icon: typeof Clock; label: string; value: React.ReactNode }[] = [
    { icon: UserRound, label: "Reporter", value: reporter },
    { icon: Mail, label: "Contact", value: email },
    { icon: Tag, label: "Category", value: categoryLabel(first.category) },
    { icon: Clock, label: "Filed", value: `${formatDateTime(report.createdAt)}${now ? ` · ${relativeTime(report.createdAt, now)}` : ""}` },
    { icon: Clock, label: "Last update", value: formatDateTime(latest.at) },
    // Only older reports recorded where they were filed from.
    ...(first.distanceM !== undefined ? [{ icon: LocateFixed, label: "Distance at filing", value: `${formatDistance(first.distanceM)} from pin` }] : []),
  ];

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="bg-linear-to-br from-blue-950 to-blue-800 p-5 text-white">
          <p className="font-mono text-xs text-blue-300">{report.id}</p>
          <h2 className="mt-1 text-lg leading-snug font-semibold">{roadblock?.road ?? "Removed roadblock"}</h2>
          <p className="flex items-center gap-1 text-sm text-slate-300">
            <MapPin className="size-3.5" /> {area?.name ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                report.viewed ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/20 text-amber-200",
              )}
            >
              {report.viewed ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
              {report.viewed ? "Viewed" : "Pending review"}
            </span>
            {report.focused && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                <Star className="size-3 fill-current" /> Focus
              </span>
            )}
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
              {report.entries.length} entr{report.entries.length === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 px-5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3 py-3 text-sm">
              <r.icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <dt className="w-28 shrink-0 text-slate-500">{r.label}</dt>
              <dd className="min-w-0 flex-1 font-medium break-words">{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
          <Button
            className={cn(
              "col-span-2 h-10 rounded-full",
              report.focused
                ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "bg-amber-400 text-amber-950 hover:bg-amber-300",
            )}
            onClick={() => setReportFocus([report.id], !report.focused)}
            aria-pressed={!!report.focused}
          >
            <Star className={cn(report.focused && "fill-current")} />
            {report.focused ? "In focus · remove" : "Add to focus"}
          </Button>
          <Button
            className={cn("h-10 rounded-full", !report.viewed && "bg-blue-700 hover:bg-blue-800")}
            variant={report.viewed ? "outline" : "default"}
            onClick={() => setReportViewed(report.id, !report.viewed)}
          >
            {report.viewed ? <EyeOff /> : <Eye />}
            {report.viewed ? "Mark pending" : "Mark viewed"}
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-full">
            <Link href="/admin/post">
              <MapPinned /> Fix in Post
            </Link>
          </Button>
        </div>
      </div>

      {roadblock && (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Roadblock on record</p>
          <div className="flex flex-wrap gap-1.5">
            {past ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <History className="size-3" /> Past roadblock · {past.reason === "done" ? "marked as done" : "removed"} {formatDateTime(past.at)}
              </span>
            ) : (
              <StatusBadge status={roadblock.status} overdue={now !== null && isOverdue(roadblock, now)} />
            )}
            <ClosureBadge roadblock={roadblock} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{roadblock.description}</p>
        </div>
      )}

      {siblings.length > 0 && (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Other reports on this roadblock</p>
          <ul className="space-y-1">
            {siblings.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                  <span className="font-mono text-xs text-blue-700">{s.id}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">{reporterName(s.userId, users)}</span>
                  {s.focused && <Star className="size-3 fill-amber-400 text-amber-400" />}
                  <span className={cn("size-2 rounded-full", s.viewed ? "bg-emerald-500" : "bg-amber-400")} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export function ReportReviewDetail({
  reportId,
  onBack,
  onOpen,
  orderedIds,
}: {
  reportId: string;
  onBack: () => void;
  onOpen: (id: string) => void;
  /** Report order of the list the admin came from, for prev/next. */
  orderedIds: string[];
}) {
  const reports = useStore((s) => s.reports);
  const report = reports.find((r) => r.id === reportId);
  const roadblock = useStore((s) => findRoadblock(s, report?.roadblockId));
  const past = useStore((s) => s.archive.find((a) => a.roadblock.id === report?.roadblockId));
  const users = useStore((s) => s.users);

  if (!report) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
        <p className="text-slate-600">Report {reportId} was not found.</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={onBack}>
          <ArrowLeft /> Back to all reports
        </Button>
      </div>
    );
  }

  const reporter = reporterName(report.userId, users);
  const email = reporterEmail(report.userId, users);
  const siblings = reports.filter((r) => r.roadblockId === report.roadblockId && r.id !== report.id);
  const idx = orderedIds.indexOf(report.id);
  const prev = idx > 0 ? orderedIds[idx - 1] : null;
  const next = idx >= 0 && idx < orderedIds.length - 1 ? orderedIds[idx + 1] : null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-10 rounded-full bg-white shadow-sm" onClick={onBack}>
          <ArrowLeft /> All reports
        </Button>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          {idx >= 0 && <span className="tabular-nums">{idx + 1} of {orderedIds.length}</span>}
          <Button variant="outline" size="icon" className="rounded-full bg-white shadow-sm" disabled={!prev} onClick={() => prev && onOpen(prev)} aria-label="Previous report">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full bg-white shadow-sm" disabled={!next} onClick={() => next && onOpen(next)} aria-label="Next report">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <SummaryFrame report={report} roadblock={roadblock} past={past} email={email} siblings={siblings} onOpen={onOpen} />
        <div className="space-y-8">
          <p className="text-xs font-semibold tracking-widest text-blue-800/70 uppercase">
            Submitted form{report.entries.length > 1 ? ` · ${report.entries.length - 1} continuation sheet${report.entries.length > 2 ? "s" : ""}` : ""}
          </p>
          {report.entries.map((e, i) => (
            <ReportSheet key={i} report={report} entry={e} index={i} roadblock={roadblock} reporter={reporter} email={email} />
          ))}
          <HandlingLog report={report} audience="admin" />
        </div>
      </div>
    </div>
  );
}
