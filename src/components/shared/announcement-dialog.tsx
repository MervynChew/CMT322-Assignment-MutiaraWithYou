"use client";

import { useState } from "react";
import { ArrowLeft, CalendarDays, Download, ExternalLink, FileText, Megaphone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatShortDate } from "@/lib/time";
import type { Announcement } from "@/lib/types";

export const PRIORITY: Record<Announcement["priority"], { label: string; dot: string; chip: string; band: string }> = {
  urgent: { label: "Urgent", dot: "bg-red-500", chip: "bg-red-50 text-red-700", band: "from-red-600 to-rose-500" },
  important: { label: "Important", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800", band: "from-amber-500 to-orange-500" },
  info: { label: "Info", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-800", band: "from-blue-800 to-blue-600" },
};

export function periodText(a: Pick<Announcement, "periodStart" | "periodEnd">) {
  if (!a.periodStart) return null;
  return a.periodEnd ? `${formatShortDate(a.periodStart)} – ${formatDate(a.periodEnd)}` : `From ${formatDate(a.periodStart)}`;
}

/** Announcement details with an in-dialog PDF viewer. */
export function AnnouncementDialog({
  announcement,
  onOpenChange,
}: {
  announcement: Announcement | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [viewing, setViewing] = useState(false);
  const [prevId, setPrevId] = useState(announcement?.id);
  if (announcement?.id !== prevId) {
    // Opening a different announcement always starts on the details view.
    setPrevId(announcement?.id);
    setViewing(false);
  }
  const a = announcement;
  const p = a ? PRIORITY[a.priority] : PRIORITY.info;
  const period = a ? periodText(a) : null;

  return (
    <Dialog open={a !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-3xl p-0 transition-[max-width] duration-300",
          viewing ? "sm:max-w-4xl" : "sm:max-w-lg",
        )}
      >
        {a && !viewing && (
          <>
            <div className={cn("bg-gradient-to-br px-6 pt-6 pb-5 text-white", p.band)}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                <Megaphone className="size-3" /> {p.label}
              </span>
              <DialogHeader className="mt-3 text-left">
                <DialogTitle className="text-2xl leading-tight text-white">{a.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80">
                  <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" /> {a.author}</span>
                  <span>Posted {formatDateTime(a.date)}</span>
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 p-6">
              {period && (
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                    <CalendarDays className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-slate-500">Effective period</p>
                    <p className="text-sm font-medium">{period}</p>
                  </div>
                </div>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{a.body}</p>
              {a.pdfName && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/40 p-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-red-600 text-[10px] font-bold text-white">PDF</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.pdfName}</p>
                    <p className="text-xs text-slate-500">{a.pdfUrl ? "Attached document" : "Preview not available"}</p>
                  </div>
                  {a.pdfUrl && (
                    <Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800" onClick={() => setViewing(true)}>
                      <FileText /> View PDF
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {a && viewing && a.pdfUrl && (
          <div className="flex h-[80vh] flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 py-2.5 pr-12 pl-3">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setViewing(false)}>
                <ArrowLeft /> Back
              </Button>
              <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">{a.pdfName}</DialogTitle>
              <DialogDescription className="sr-only">PDF attachment for {a.title}</DialogDescription>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <a href={a.pdfUrl} download={a.pdfName}>
                  <Download /> <span className="hidden sm:inline">Download</span>
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <a href={a.pdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> <span className="hidden sm:inline">New tab</span>
                </a>
              </Button>
            </div>
            <iframe src={a.pdfUrl} title={a.pdfName} className="w-full flex-1 bg-slate-100" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
