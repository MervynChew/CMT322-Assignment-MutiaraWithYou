"use client";

import { useState } from "react";
import { CalendarDays, ChevronRight, FileText, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate, relativeTime } from "@/lib/time";
import type { Announcement } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { useStore } from "@/store/useStore";
import { AnnouncementDialog, periodText, PRIORITY } from "@/components/shared/announcement-dialog";

/** Gradient header shared by the sidebar and the navbar panel. */
export function AnnouncementsHeader({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 bg-linear-to-r from-blue-800 to-blue-600 p-5 text-white", className)}>
      <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15">
        <Megaphone className="size-5" />
      </span>
      <div>
        <h2 className="font-semibold">Announcements</h2>
        <p className="text-xs text-blue-100">Official updates from Mutiara Line Ops</p>
      </div>
      <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{count}</span>
    </div>
  );
}

/** Announcement cards; `onOpen` shows the full notice. */
export function AnnouncementList({
  announcements,
  onOpen,
  className,
}: {
  announcements: Announcement[];
  onOpen: (id: string) => void;
  className?: string;
}) {
  const now = useMinuteNow();
  return (
    <ol className={cn("space-y-3 p-4", className)}>
      {announcements.map((a) => {
        const p = PRIORITY[a.priority];
        const period = periodText(a);
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              className="group w-full rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition-[background-color,border-color,box-shadow] hover:border-blue-200 hover:bg-white hover:shadow-md focus-visible:ring-3 focus-visible:ring-blue-500/40 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold", p.chip)}>
                  <span className={cn("size-1.5 rounded-full", p.dot)} /> {p.label}
                </span>
                <span className="ml-auto text-slate-400">{now ? relativeTime(a.date, now) : formatShortDate(a.date)}</span>
              </div>
              <h3 className="mt-2 flex items-start gap-1 text-sm leading-snug font-semibold">
                <span className="flex-1">{a.title}</span>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </h3>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">{a.body}</p>
              {(period || a.pdfName) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {period && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                      <CalendarDays className="size-3" /> {period}
                    </span>
                  )}
                  {a.pdfName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-red-700 ring-1 ring-red-100">
                      <FileText className="size-3" /> {a.pdfName}
                    </span>
                  )}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Right-hand column on large screens. Smaller screens open the list from the navbar instead. */
export function AnnouncementsSidebar() {
  const announcements = useStore((s) => s.announcements);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = announcements.find((a) => a.id === openId) ?? null;

  return (
    <aside className="hidden flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7.5rem)]">
      <AnnouncementsHeader count={announcements.length} />
      <AnnouncementList announcements={announcements} onOpen={setOpenId} className="scroll-inset flex-1 overflow-y-auto" />
      <AnnouncementDialog announcement={open} onOpenChange={(o) => !o && setOpenId(null)} />
    </aside>
  );
}
