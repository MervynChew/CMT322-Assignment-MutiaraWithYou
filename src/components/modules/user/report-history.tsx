"use client";

import { useState } from "react";
import { ChevronRight, Eye, FileText, Hourglass, ImageIcon, Inbox, Lock, MapPin, PenLine, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandlingLog, ReportSheet, categoryLabel } from "@/components/shared/report-paper";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/time";
import type { Report } from "@/lib/types";
import { findRoadblock, useCurrentUser, useSessionUserId, useStore } from "@/store/useStore";
import { ReportStatusLine } from "./report-status-line";

export function ReportStatusChips({ report }: { report: Report }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
          report.viewed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800",
        )}
      >
        {report.viewed ? <Eye className="size-3" /> : <Hourglass className="size-3" />}
        {report.viewed ? "Viewed" : "Pending review"}
      </span>
      {report.focused && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
          <Star className="size-3 fill-current" /> Important
        </span>
      )}
    </span>
  );
}

function ReportCard({
  report,
  onAddUpdate,
  onView,
}: {
  report: Report;
  onAddUpdate: (roadblockId: string) => void;
  onView: (id: string) => void;
}) {
  // Past roadblocks (off the public map) keep their name here, but can't take updates.
  const roadblock = useStore((s) => findRoadblock(s, report.roadblockId));
  const live = useStore((s) => s.roadblocks.some((r) => r.id === report.roadblockId));
  const area = AREAS.find((a) => a.id === roadblock?.areaId);
  const [expanded, setExpanded] = useState(false);
  const latest = report.entries[report.entries.length - 1];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View report ${report.id}`}
      onClick={() => onView(report.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onView(report.id);
        }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-[box-shadow] hover:shadow-md hover:ring-blue-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", report.viewed ? "bg-emerald-500" : "bg-amber-400")} />
      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-blue-700">{report.id}</p>
            <h3 className="font-semibold">{roadblock?.road ?? "Removed roadblock"}</h3>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="size-3 shrink-0" /> {area?.name} · Filed {formatDateTime(report.createdAt)}
            </p>
          </div>
          <ReportStatusChips report={report} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-slate-700">{latest.note}</p>

        <div className="mt-4 rounded-2xl bg-slate-50 px-2 pt-2.5 pb-2">
          <ReportStatusLine report={report} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{categoryLabel(latest.category)}</span>
          {report.entries.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-800 hover:bg-blue-100"
            >
              {expanded ? "Hide" : "Show"} updates ({report.entries.length - 1})
            </button>
          )}
          <div className="ml-auto flex gap-1.5">
            {!report.viewed && live && (
              <Button size="xs" variant="outline" className="rounded-full" onClick={() => onAddUpdate(report.roadblockId)}>
                <PenLine /> Add update
              </Button>
            )}
            <Button size="xs" variant="ghost" className="rounded-full text-blue-800 hover:bg-blue-50" onClick={() => onView(report.id)}>
              <FileText /> View report <ChevronRight className="transition group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        {expanded && (
          <ol className="mt-4 space-y-3 border-l-2 border-dashed border-slate-200 pl-4" onClick={(e) => e.stopPropagation()}>
            {report.entries.map((e, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <p className="text-xs text-slate-500">
                  {i === 0 ? "Original report" : `Update ${i}`} · {formatDateTime(e.at)}
                </p>
                <p className="text-slate-700">{e.note}</p>
                {e.images.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <ImageIcon className="size-3" /> {e.images.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}

/**
 * Read-only copy of a submitted report. The header and footer stay put and only
 * the paper scrolls, so the scrollbar sits inside the report, not on the dialog edge.
 */
function ReportViewer({
  report,
  onClose,
  onAddUpdate,
}: {
  report: Report | null;
  onClose: () => void;
  onAddUpdate: (roadblockId: string) => void;
}) {
  const user = useCurrentUser();
  const roadblock = useStore((s) => findRoadblock(s, report?.roadblockId));
  const live = useStore((s) => s.roadblocks.some((r) => r.id === report?.roadblockId));

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-3xl bg-slate-100 p-0 sm:max-w-3xl"
      >
        {report && (
          <>
            <DialogHeader className="relative shrink-0 border-b border-slate-200 bg-white px-5 pt-4 pb-3 text-left">
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3 rounded-full" onClick={onClose} aria-label="Close">
                <X />
              </Button>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
                <span className="font-mono text-sm text-blue-700">{report.id}</span>
                <span className="min-w-0 truncate">{roadblock?.road ?? "Removed roadblock"}</span>
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <ReportStatusChips report={report} />
                  <span className="text-slate-500">
                    {report.entries.length} sheet{report.entries.length === 1 ? "" : "s"} · filed {formatDateTime(report.createdAt)}
                  </span>
                  {report.viewed && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Lock className="size-3" /> View only
                    </span>
                  )}
                </div>
              </DialogDescription>
              <ReportStatusLine report={report} className="mx-auto mt-3 max-w-md" />
            </DialogHeader>

            <div className="scroll-inset min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-8 p-4 sm:p-6">
                {report.entries.map((e, i) => (
                  <ReportSheet key={i} report={report} entry={e} index={i} roadblock={roadblock} reporter={user.name} email={user.email} />
                ))}
                <HandlingLog report={report} audience="citizen" />
              </div>
            </div>

            {!report.viewed && live && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                <p className="mr-auto hidden text-xs text-slate-500 sm:block">Not reviewed yet, so you can still add to it.</p>
                <Button variant="ghost" className="rounded-full" onClick={onClose}>Close</Button>
                <Button
                  className="rounded-full bg-blue-700 hover:bg-blue-800"
                  onClick={() => {
                    onClose();
                    onAddUpdate(report.roadblockId);
                  }}
                >
                  <PenLine /> Add update
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReportHistory({ onAddUpdate }: { onAddUpdate: (roadblockId: string) => void }) {
  // Select the stable array, then derive (a filtered selector would return a new array every render).
  const allReports = useStore((s) => s.reports);
  const me = useSessionUserId();
  const reports = allReports.filter((r) => r.userId === me);
  const pending = reports.filter((r) => !r.viewed);
  const viewed = reports.filter((r) => r.viewed);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = reports.find((r) => r.id === viewingId) ?? null;

  const empty = (text: string) => (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-300 py-14 text-center text-sm text-slate-500">
      <Inbox className="size-8 text-slate-300" /> {text}
    </div>
  );
  const card = (r: Report) => <ReportCard key={r.id} report={r} onAddUpdate={onAddUpdate} onView={setViewingId} />;

  return (
    <>
      <Tabs defaultValue="pending" className="mx-auto max-w-3xl">
        <TabsList className="mb-4 h-10 w-full rounded-full bg-slate-200/60 p-1 sm:w-auto">
          <TabsTrigger value="pending" className="rounded-full px-4">
            Pending review <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-xs text-white">{pending.length}</span>
          </TabsTrigger>
          <TabsTrigger value="viewed" className="rounded-full px-4">
            Viewed <span className="ml-1 rounded-full bg-emerald-500 px-1.5 text-xs text-white">{viewed.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3">
          {pending.length ? pending.map(card) : empty("No reports waiting for review.")}
        </TabsContent>
        <TabsContent value="viewed" className="space-y-3">
          {viewed.length ? viewed.map(card) : empty("No reviewed reports yet.")}
        </TabsContent>
      </Tabs>
      <ReportViewer report={viewing} onClose={() => setViewingId(null)} onAddUpdate={onAddUpdate} />
    </>
  );
}
