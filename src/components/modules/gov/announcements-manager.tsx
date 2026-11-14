"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Eye, FileText, ListPlus, Megaphone, Pencil, Plus, Radio, Search, Send, Siren, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AnnouncementDialog, periodText, PRIORITY } from "@/components/shared/announcement-dialog";
import { cn } from "@/lib/utils";
import { formatDateTime, relativeTime } from "@/lib/time";
import type { Announcement } from "@/lib/types";
import { useMinuteNow } from "@/hooks/use-now";
import { useStore } from "@/store/useStore";
import { AdminPageHeader, HeaderStat, HeaderSummary, Panel } from "./admin-shell";
import { AnnouncementForm } from "./announcement-form";

type Lifecycle = "all" | "active" | "upcoming" | "expired";

function lifecycle(a: Announcement, now: number): Exclude<Lifecycle, "all"> {
  const start = a.periodStart ? new Date(a.periodStart).getTime() : new Date(a.date).getTime();
  const end = a.periodEnd ? new Date(a.periodEnd).getTime() + 86_400_000 : Infinity;
  if (now < start) return "upcoming";
  if (now > end) return "expired";
  return "active";
}

const LIFECYCLE_CHIP: Record<Exclude<Lifecycle, "all">, string> = {
  active: "bg-emerald-50 text-emerald-700",
  upcoming: "bg-slate-100 text-slate-600",
  expired: "bg-slate-100 text-slate-400",
};

export function AnnouncementsManager() {
  const now = useMinuteNow();
  const announcements = useStore((s) => s.announcements);
  const queued = useStore((s) => s.pendingAnnouncements.length);
  const addAnnouncement = useStore((s) => s.addAnnouncement);
  const updateAnnouncement = useStore((s) => s.updateAnnouncement);
  const removeAnnouncement = useStore((s) => s.removeAnnouncement);

  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<"all" | Announcement["priority"]>("all");
  const [life, setLife] = useState<Lifecycle>("all");
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const needle = q.trim().toLowerCase();
  const rows = announcements.filter(
    (a) =>
      (priority === "all" || a.priority === priority) &&
      (life === "all" || (now !== null && lifecycle(a, now) === life)) &&
      (!needle || a.title.toLowerCase().includes(needle) || a.body.toLowerCase().includes(needle)),
  );

  const activeNow = now ? announcements.filter((a) => lifecycle(a, now) === "active").length : 0;

  return (
    <>
      <AdminPageHeader
        eyebrow="Announcements"
        title="Announcement centre"
        description={
          <HeaderSummary
            stats={
              <>
                <HeaderStat icon={Megaphone} value={announcements.length} label="published" />
                <HeaderStat icon={Radio} value={activeNow} label="active now" tone="bg-emerald-400 text-emerald-950" />
                <HeaderStat icon={Siren} value={announcements.filter((a) => a.priority === "urgent").length} label="urgent" tone="bg-red-400 text-red-950" />
                <HeaderStat icon={FileText} value={announcements.filter((a) => a.pdfName).length} label="with PDF" tone="bg-sky-200 text-sky-900" />
              </>
            }
            tips={[
              { icon: Eye, text: "Every notice here is shown on the public dashboard. Preview, edit or retire it from the list." },
              { icon: ListPlus, text: "Announcements added in Post publish together with your roadblock changes." },
            ]}
          />
        }
        actions={
          <Button className="h-10 rounded-full bg-white text-slate-900 hover:bg-blue-50" onClick={() => setComposing(true)}>
            <Plus /> New announcement
          </Button>
        }
      />

      <div className="space-y-5">
        {queued > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <Megaphone className="size-4" />
            {queued} announcement{queued > 1 ? "s are" : " is"} queued in a post and will publish with your roadblock changes.
            <Link href="/admin/post" className="ml-auto font-medium underline underline-offset-2">Open Post</Link>
          </div>
        )}

        <Panel bodyClassName="p-0">
          <div className="flex flex-wrap items-center gap-3 rounded-t-3xl border-b border-blue-100/70 bg-linear-to-r from-blue-50/60 to-white p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements…" className="h-9 rounded-full pl-9" />
            </div>
            <ToggleGroup type="single" value={priority} onValueChange={(v) => v && setPriority(v as typeof priority)} className="rounded-full bg-blue-100/60 p-0.5" size="sm">
              {(["all", "urgent", "important", "info"] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className="rounded-full px-3 text-xs capitalize data-[state=on]:bg-white data-[state=on]:text-blue-800 data-[state=on]:shadow-sm">{p}</ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup type="single" value={life} onValueChange={(v) => v && setLife(v as Lifecycle)} className="rounded-full bg-blue-100/60 p-0.5" size="sm">
              {(["all", "active", "upcoming", "expired"] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className="rounded-full px-3 text-xs capitalize data-[state=on]:bg-white data-[state=on]:text-blue-800 data-[state=on]:shadow-sm">{p}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <ul className="divide-y divide-blue-50">
            {rows.map((a) => {
              const p = PRIORITY[a.priority];
              const period = periodText(a);
              const lc = now ? lifecycle(a, now) : null;
              return (
                <li key={a.id} className="flex flex-col gap-3 p-5 transition-colors hover:bg-blue-50/40 sm:flex-row sm:items-start">
                  <span className={cn("hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white sm:flex", p.band)}>
                    <Megaphone className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold", p.chip)}>
                        <span className={cn("size-1.5 rounded-full", p.dot)} /> {p.label}
                      </span>
                      {lc && <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", LIFECYCLE_CHIP[lc])}>{lc}</span>}
                      <span className="text-slate-400">
                        Posted {formatDateTime(a.date)}{now ? ` · ${relativeTime(a.date, now)}` : ""}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-semibold">{a.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {period && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-slate-200">
                          <CalendarDays className="size-3" /> {period}
                        </span>
                      )}
                      {a.pdfName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50/60 px-2 py-1 text-red-700 ring-1 ring-red-100">
                          <FileText className="size-3" /> {a.pdfName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPreviewId(a.id)}>
                      <Eye /> Preview
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(a)}>
                      <Pencil /> Edit
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="rounded-full text-slate-400 hover:text-rose-600" onClick={() => setDeleting(a)} aria-label={`Delete ${a.title}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && <li className="p-12 text-center text-sm text-slate-500">No announcements match these filters.</li>}
          </ul>
        </Panel>
      </div>

      {/* Compose */}
      <Dialog open={composing} onOpenChange={setComposing}>
        <DialogContent className="scroll-inset max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">New announcement</DialogTitle>
            <DialogDescription>Publishes immediately to the public dashboard.</DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            idPrefix="new"
            submitLabel="Publish now"
            submitIcon={<Send />}
            onCancel={() => setComposing(false)}
            onSubmit={(v) => {
              addAnnouncement(v);
              setComposing(false);
              toast.success("Announcement published");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="scroll-inset max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit announcement</DialogTitle>
            <DialogDescription>Changes appear on the public dashboard right away.</DialogDescription>
          </DialogHeader>
          {editing && (
            <AnnouncementForm
              key={editing.id}
              idPrefix="edit"
              initial={editing}
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSubmit={(v) => {
                updateAnnouncement(editing.id, v);
                setEditing(null);
                toast.success("Announcement updated");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>“{deleting?.title}” will be removed from the public dashboard.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="rounded-full">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                if (deleting) removeAnnouncement(deleting.id);
                setDeleting(null);
                toast("Announcement deleted");
              }}
            >
              <Trash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnnouncementDialog announcement={announcements.find((a) => a.id === previewId) ?? null} onOpenChange={(o) => !o && setPreviewId(null)} />
    </>
  );
}
