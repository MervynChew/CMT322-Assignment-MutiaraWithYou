"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, Eye, FileText, ListPlus, Megaphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementDialog, periodText, PRIORITY } from "@/components/shared/announcement-dialog";
import { cn } from "@/lib/utils";
import type { Announcement, PendingAnnouncement } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { AnnouncementForm } from "./announcement-form";

/** One queued announcement with everything that will be published: priority, text, period and PDF. */
function QueuedAnnouncement({
  a,
  index,
  onPreview,
  onRemove,
}: {
  a: PendingAnnouncement;
  index: number;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const p = PRIORITY[a.priority];
  const period = periodText(a);
  const long = a.body.length > 160;

  return (
    <li className="animate-rise-in overflow-hidden rounded-2xl bg-white ring-1 ring-blue-100">
      <div className={cn("h-1 bg-linear-to-r", p.band)} />
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-400">#{index + 1}</span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold", p.chip)}>
            <span className={cn("size-1.5 rounded-full", p.dot)} /> {p.label}
          </span>
          <span className="ml-auto text-slate-400">Publishes with this post</span>
        </div>
        <h4 className="mt-2 text-sm leading-snug font-semibold text-slate-900">{a.title}</h4>
        <p className={cn("mt-1 text-sm whitespace-pre-line text-slate-600", !expanded && "line-clamp-3")}>{a.body}</p>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            {expanded ? "Show less" : "Show full text"}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-slate-200">
            <CalendarDays className="size-3" /> {period ?? "No set period"}
          </span>
          {a.pdfName && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-1 text-red-700 ring-1 ring-red-100">
              <FileText className="size-3 shrink-0" /> <span className="truncate">{a.pdfName}</span>
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onPreview}>
            <Eye /> Preview
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700" onClick={onRemove}>
            <Trash2 /> Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

/**
 * Post tab announcement frame: add-only. Drafts are queued and published together
 * with roadblock changes on Post / Confirm. History lives on the Announcements page.
 */
export function AnnouncementQueue() {
  const pending = useStore((s) => s.pendingAnnouncements);
  const queueAnnouncement = useStore((s) => s.queueAnnouncement);
  const discard = useStore((s) => s.discardPendingAnnouncement);
  const [preview, setPreview] = useState<Announcement | null>(null);

  return (
    <Card id="post-announcement" className="scroll-mt-24 rounded-3xl py-0 shadow-sm ring-slate-200/70">
      <CardHeader className="border-b border-blue-100 bg-linear-to-r from-blue-50 to-white pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Megaphone className="size-4" />
          </span>
          Add announcement to this post
        </CardTitle>
        <CardDescription>Queued announcements publish together with your roadblock changes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-5">
        <AnnouncementForm
          idPrefix="queue"
          submitLabel="Add to post"
          submitIcon={<ListPlus />}
          onSubmit={(v) => {
            queueAnnouncement(v);
            toast.success("Announcement added to the post", { description: v.title });
          }}
        />

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            In this post
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">{pending.length}</span>
          </p>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              No announcements added yet. Anything you add shows here in full before you post.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {pending.map((a, i) => (
                <QueuedAnnouncement
                  key={a.id}
                  a={a}
                  index={i}
                  onPreview={() => setPreview({ ...a, date: new Date().toISOString(), author: "Mutiara Line Ops" })}
                  onRemove={() => {
                    discard(a.id);
                    toast(`Removed “${a.title}” from the post`);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      <AnnouncementDialog announcement={preview} onOpenChange={(o) => !o && setPreview(null)} />
    </Card>
  );
}
