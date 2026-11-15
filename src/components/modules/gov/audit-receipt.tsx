"use client";

import { useState } from "react";
import { ArchiveRestore, Check, CircleCheck, Crosshair, Eraser, Megaphone, Minus, PencilLine, Plus, ReceiptText, Send, TriangleAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ADMIN_USER_ID, AREAS, CONSTRUCTION_PHASES } from "@/lib/mock-data";
import { formatDistance } from "@/lib/geo";
import { formatPeriod, formatShortDate, formatWindow } from "@/lib/time";
import { CLOSURE_TYPES, closureTypeOf } from "@/lib/closure-type";
import { effectiveModes, modesLabel } from "@/components/shared/travel-modes";
import type { PendingChange, Roadblock } from "@/lib/types";
import { takesDown, useStore } from "@/store/useStore";

const time = new Intl.DateTimeFormat("en-MY", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

function segmentSummary(rb: Roadblock): string | null {
  const segs = rb.segments ?? [];
  if (!segs.length) return null;
  const full = segs.filter((s) => s.kind === "full").length;
  const parts = [full && `${full} full`, segs.length - full && `${segs.length - full} partial`].filter(Boolean);
  const total = segs.reduce((n, s) => n + s.lengthM, 0);
  return `Drawn: ${parts.join(" + ")} (${formatDistance(total)})`;
}

/** Human-readable list of what changed in an edit. */
function diff(before: Roadblock, after: Roadblock): string[] {
  const out: string[] = [];
  if (before.road !== after.road) out.push(`Renamed to ${after.road}`);
  if (before.closure !== after.closure) out.push(`Closure → ${after.closure}`);
  const blocks = (rb: Roadblock) => [...effectiveModes(rb)].sort().join();
  if (blocks(before) !== blocks(after)) out.push(`Blocks → ${modesLabel(effectiveModes(after))}`);
  if (before.radiusM !== after.radiusM) out.push(`Blocked zone → ${formatDistance(after.radiusM)}`);
  if (before.status !== after.status) out.push(`Status → ${after.status}`);
  if (before.phaseIndex !== after.phaseIndex) out.push(`Phase → ${CONSTRUCTION_PHASES[after.phaseIndex]}`);
  if (before.startDate !== after.startDate || before.endDate !== after.endDate)
    out.push(`Period → ${formatShortDate(after.startDate)} – ${formatShortDate(after.endDate)}`);
  if (JSON.stringify(before.dailyWindow) !== JSON.stringify(after.dailyWindow)) out.push(`Hours → ${formatWindow(after.dailyWindow)}`);
  if (before.lat !== after.lat || before.lng !== after.lng) out.push("Pin moved");
  if (JSON.stringify(before.segments ?? []) !== JSON.stringify(after.segments ?? []))
    out.push(segmentSummary(after) ?? "Drawn stretches cleared");
  if (before.areaId !== after.areaId) out.push(`Area → ${AREAS.find((a) => a.id === after.areaId)?.name}`);
  if (before.description !== after.description || before.detour !== after.detour) out.push("Notes updated");
  return out.length ? out : ["No field changes"];
}

function line(c: PendingChange) {
  const name = c.roadblock.road;
  const closure = c.roadblock.closure === "full" ? "full" : "partial";
  if (c.kind === "add")
    return {
      sign: "+",
      title: `Added ${name} ${closure} closure`,
      details: [
        `Blocks ${modesLabel(effectiveModes(c.roadblock)).toLowerCase()}`,
        `Blocked zone ${formatDistance(c.roadblock.radiusM)}`,
        formatWindow(c.roadblock.dailyWindow),
        c.roadblock.status === "scheduled" ? `Starts ${formatShortDate(c.roadblock.startDate)}` : "Active immediately",
        segmentSummary(c.roadblock) ?? "Pin only (nothing drawn)",
      ],
    };
  if (c.kind === "remove")
    return { sign: "−", title: `Removed ${name}`, details: ["Comes off the public map and home page", PAST_NOTE] };
  if (c.kind === "done") {
    const edits = diff(c.before, c.roadblock).filter((d) => d !== "No field changes" && !d.startsWith("Status"));
    return { sign: "✓", title: `Marked ${name} as done`, details: ["Works completed: comes off the public map and home page", ...edits, PAST_NOTE] };
  }
  if (c.kind === "restore")
    return {
      sign: "+",
      title: `Restored ${name}`,
      details: [
        "Back on the public map from Past roadblocks",
        c.roadblock.status === "completed" ? "Shows as completed (road reopened)" : `Shows as ${CLOSURE_TYPES[closureTypeOf(c.roadblock)].label.toLowerCase()}`,
      ],
    };
  return { sign: "~", title: `Edited ${name}`, details: diff(c.before, c.roadblock) };
}


const PAST_NOTE = "Kept under Past roadblocks, so it can be restored";

/** Zig-zag torn paper edge. */
function Zigzag({ flip }: { flip?: boolean }) {
  const mask = "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 12px 100%";
  return <div aria-hidden className={cn("h-3 w-full bg-white", flip && "rotate-180")} style={{ mask, WebkitMask: mask }} />;
}

const KIND: Record<PendingChange["kind"], { label: string; icon: typeof Plus; chip: string; bar: string }> = {
  add: { label: "Added", icon: Plus, chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500" },
  edit: { label: "Edited", icon: PencilLine, chip: "bg-blue-50 text-blue-700 ring-blue-200", bar: "bg-blue-500" },
  remove: { label: "Removed", icon: Minus, chip: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500" },
  done: { label: "Done", icon: CircleCheck, chip: "bg-teal-50 text-teal-700 ring-teal-200", bar: "bg-teal-500" },
  restore: { label: "Restored", icon: ArchiveRestore, chip: "bg-sky-50 text-sky-700 ring-sky-200", bar: "bg-sky-500" },
};

/** Takes the admin to the announcement form below the receipt. */
export function goToAnnouncementForm() {
  const card = document.getElementById("post-announcement");
  card?.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => document.getElementById("queue-title")?.focus({ preventScroll: true }), 450);
}

export function AuditReceipt({
  selectedId,
  onSelect,
  compact,
  onReview,
}: {
  /** Roadblock currently highlighted on the canvas. */
  selectedId?: string | null;
  /** Called when a receipt line is clicked, to reveal it on the map. */
  onSelect?: (change: PendingChange) => void;
  /** Smaller version shown over the full-screen map. */
  compact?: boolean;
  /**
   * Full-screen map only: posting happens from the full receipt, so instead of
   * Post this offers a button that leaves full screen and opens the receipt.
   */
  onReview?: () => void;
}) {
  const pending = useStore((s) => s.pendingChanges);
  const pendingAnnouncements = useStore((s) => s.pendingAnnouncements);
  const discardChange = useStore((s) => s.discardChange);
  const discardPendingAnnouncement = useStore((s) => s.discardPendingAnnouncement);
  const clearChanges = useStore((s) => s.clearChanges);
  const commitChanges = useStore((s) => s.commitChanges);
  const operator = useStore((s) => s.users.find((u) => u.id === ADMIN_USER_ID)?.name ?? "Admin");

  const count = (...kinds: PendingChange["kind"][]) => pending.filter((c) => kinds.includes(c.kind)).length;
  const total = pending.length + pendingAnnouncements.length;
  // Every post tells the public what changed: it needs at least one announcement.
  const hasAnnouncement = pendingAnnouncements.length > 0;
  const canPost = total > 0 && hasAnnouncement;
  /** Roadblocks this post takes off the public map: Post asks before posting them. */
  const leaving = pending.filter(takesDown);
  const [confirming, setConfirming] = useState(false);

  function requestPost() {
    if (leaving.length) setConfirming(true);
    else post();
  }

  function post() {
    setConfirming(false);
    const n = commitChanges();
    const parts = [
      n.roadblocks && `${n.roadblocks} roadblock change${n.roadblocks === 1 ? "" : "s"}`,
      n.announcements && `${n.announcements} announcement${n.announcements === 1 ? "" : "s"}`,
    ].filter(Boolean);
    toast.success(`Posted ${parts.join(" and ")}`, { description: "The public map and dashboard are now updated." });
  }

  return (
    <div id={compact ? undefined : "post-receipt"} className="scroll-mt-24 drop-shadow-[0_10px_20px_rgb(15_23_42/0.12)]">
      <Zigzag flip />
      <div className="bg-white px-4 py-4 text-sm text-slate-800 sm:px-5">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-slate-500">MUTIARA LINE OPS</p>
          <p className="mt-1 text-lg font-bold tracking-tight">Changes to post</p>
          <p className="text-xs text-slate-500">Not live yet · prepared by {operator}</p>
        </div>

        {/* Summary */}
        <dl className="mt-4 grid grid-cols-5 gap-1.5 text-center">
          {[
            { label: "Added", value: count("add", "restore"), cls: "text-emerald-700" },
            { label: "Edited", value: count("edit"), cls: "text-blue-700" },
            { label: "Done", value: count("done"), cls: "text-teal-700" },
            { label: "Removed", value: count("remove"), cls: "text-rose-700" },
            { label: "Notices", value: pendingAnnouncements.length, cls: "text-indigo-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-1 py-2">
              <dd className={cn("text-xl leading-none font-bold tabular-nums", s.value ? s.cls : "text-slate-300")}>{s.value}</dd>
              <dt className="mt-1 text-xs text-slate-500">{s.label}</dt>
            </div>
          ))}
        </dl>

        <div className="my-4 border-t-2 border-dashed border-slate-200" />

        {total === 0 ? (
          <p className="py-4 text-center text-sm leading-relaxed text-slate-500">
            Nothing to post yet.
            <br />
            Pick a tool and click the map to add a closure, or click a pin to edit it.
          </p>
        ) : (
          <div className={cn("scroll-inset space-y-4 overflow-y-auto pr-1", compact ? "max-h-[45vh]" : "max-h-[32rem]")}>
            {pending.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Roadblocks</h4>
                <ol className="space-y-2">
                  {pending.map((c) => {
                    const l = line(c);
                    const k = KIND[c.kind];
                    const selected = c.roadblock.id === selectedId;
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          "relative overflow-hidden rounded-2xl bg-white ring-1 transition-shadow",
                          selected ? "shadow-md ring-2 ring-blue-400" : "ring-slate-200",
                        )}
                      >
                        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", k.bar)} />
                        <div className="py-2.5 pr-2.5 pl-4">
                          <div className="flex items-start gap-2">
                            <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", k.chip)}>
                              <k.icon className="size-3" strokeWidth={3} /> {k.label}
                            </span>
                            <p className="min-w-0 flex-1 leading-snug font-semibold text-slate-900">{c.roadblock.road || "Untitled roadblock"}</p>
                            <span className="shrink-0 pt-0.5 text-xs text-slate-400 tabular-nums">{time.format(new Date(c.at))}</span>
                          </div>
                          <ul className="mt-1.5 space-y-0.5 text-[13px] leading-snug text-slate-600">
                            {l.details.filter(Boolean).map((d) => (
                              <li key={d} className="flex gap-1.5">
                                <span aria-hidden className="text-slate-300">•</span>
                                {d}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 flex gap-1.5">
                            {onSelect && (
                              <Button variant="ghost" size="sm" className="h-8 rounded-full px-2.5 text-blue-700 hover:bg-blue-50" onClick={() => onSelect(c)}>
                                <Crosshair /> Show on map
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-8 rounded-full px-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                discardChange(c.id);
                                toast(`Undid: ${l.title}`);
                              }}
                            >
                              <Undo2 /> Undo
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {pendingAnnouncements.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Announcements</h4>
                <ol className="space-y-2">
                  {pendingAnnouncements.map((a) => (
                    <li key={a.id} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
                      <div className="flex items-start gap-2 py-2.5 pr-2.5 pl-4">
                        <Megaphone className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                        <div className="min-w-0 flex-1">
                          <p className="leading-snug font-semibold text-slate-900">{a.title}</p>
                          <p className="text-[13px] text-slate-500 capitalize">
                            {a.priority}
                            {a.pdfName ? ` · ${a.pdfName}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 rounded-full px-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Remove announcement ${a.title}`}
                          onClick={() => discardPendingAnnouncement(a.id)}
                        >
                          <Undo2 /> Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        <div className="my-4 border-t-2 border-dashed border-slate-200" />

        {onReview ? (
          // Over the full-screen map: review on the full page, where the announcement is added and the post is sent.
          <div className="space-y-2">
            <p className="text-center text-xs leading-snug text-slate-500">Posting happens on the full receipt, together with an announcement.</p>
            <Button className="h-10 w-full rounded-full bg-blue-700 hover:bg-blue-800" disabled={!total} onClick={onReview}>
              <ReceiptText /> Review receipt &amp; post
            </Button>
          </div>
        ) : (
          <>
            {/* Ready-to-post checklist */}
            <ul className="space-y-1.5 text-sm">
              <li className={cn("flex items-center gap-2", total ? "text-slate-700" : "text-slate-400")}>
                <CheckIcon ok={total > 0} />
                {pending.length
                  ? `${pending.length} roadblock change${pending.length === 1 ? "" : "s"} ready`
                  : "Roadblock changes (optional)"}
              </li>
              <li className={cn("flex items-center gap-2", hasAnnouncement ? "text-slate-700" : "text-amber-800")}>
                <CheckIcon ok={hasAnnouncement} />
                {hasAnnouncement ? (
                  `${pendingAnnouncements.length} announcement${pendingAnnouncements.length === 1 ? "" : "s"} to publish`
                ) : (
                  <span>
                    Add at least one announcement.{" "}
                    <button type="button" onClick={goToAnnouncementForm} className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                      Add one
                    </button>
                  </span>
                )}
              </li>
            </ul>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-full"
                disabled={!total}
                onClick={() => {
                  clearChanges();
                  toast("Pending changes discarded");
                }}
              >
                <Eraser /> Clear
              </Button>
              <Button className="h-10 flex-1 rounded-full bg-blue-700 hover:bg-blue-800" disabled={!canPost} onClick={requestPost}>
                <Send /> Post / Confirm
              </Button>
            </div>
            {total > 0 && !hasAnnouncement && (
              <p className="mt-2 text-center text-xs text-slate-500">Every post needs an announcement so the public knows what changed.</p>
            )}
          </>
        )}
      </div>
      <Zigzag />

      <ConfirmTakeDown
        open={confirming}
        leaving={leaving}
        others={pending.length - leaving.length}
        announcements={pendingAnnouncements.length}
        onCancel={() => setConfirming(false)}
        onConfirm={post}
        onShow={
          onSelect &&
          ((c) => {
            setConfirming(false);
            onSelect(c);
          })
        }
      />
    </div>
  );
}

/** What each take-down means, shown above its group in the Post warning. */
const TAKE_DOWN = {
  done: { label: "Mark as done", heading: "text-teal-700", meaning: "Works finished and the road has reopened." },
  remove: { label: "Remove", heading: "text-rose-700", meaning: "For a roadblock added by mistake, or works that are no longer going ahead." },
} as const;

/**
 * Asked on Post when it would take roadblocks off the public map (removed, or
 * marked as done), so the admin can check they picked the right ones and knows
 * what happens next.
 */
function ConfirmTakeDown({
  open,
  leaving,
  others,
  announcements,
  onCancel,
  onConfirm,
  onShow,
}: {
  open: boolean;
  leaving: PendingChange[];
  others: number;
  announcements: number;
  onCancel: () => void;
  onConfirm: () => void;
  onShow?: (c: PendingChange) => void;
}) {
  const reports = useStore((s) => s.reports);
  const n = leaving.length;
  const one = n === 1;
  const ids = new Set(leaving.map((c) => c.roadblock.id));
  const linked = reports.filter((r) => ids.has(r.roadblockId)).length;
  const also = [
    others && `${others} other roadblock change${others === 1 ? "" : "s"}`,
    announcements && `${announcements} announcement${announcements === 1 ? "" : "s"}`,
  ].filter(Boolean);
  const groups = (["done", "remove"] as const)
    .map((kind) => ({ kind, items: leaving.filter((c) => c.kind === kind) }))
    .filter((g) => g.items.length > 0);
  const consequences = [
    `${one ? "It disappears" : "They disappear"} from the public map and home page, so drivers no longer see ${one ? "this closure" : "these closures"}.`,
    `Citizens can't send new reports or updates on ${one ? "it" : "them"}.` +
      (linked ? ` The ${linked} report${linked === 1 ? "" : "s"} already sent stay${linked === 1 ? "s" : ""} in Reports.` : ""),
    `${one ? "It moves" : "They move"} to Past roadblocks (admin only). Picked the wrong one? Restore it there and post again.`,
    also.length > 0 && `This post also publishes ${also.join(" and ")}.`,
  ].filter((x): x is string => Boolean(x));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="scroll-inset max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <TriangleAlert className="size-5" />
          </span>
          <DialogTitle className="text-xl">
            Take {one ? "this roadblock" : `these ${n} roadblocks`} off the public map?
          </DialogTitle>
          <DialogDescription>Check each one before you post.</DialogDescription>
        </DialogHeader>

        {groups.map(({ kind, items }) => {
          const t = TAKE_DOWN[kind];
          const k = KIND[kind];
          return (
            <section key={kind} aria-label={t.label}>
              <h4 className={cn("flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase", t.heading)}>
                <k.icon className="size-3.5" strokeWidth={3} /> {t.label} · {items.length}
              </h4>
              <p className="mt-0.5 mb-2 text-xs text-slate-500">{t.meaning}</p>
              <ul className="space-y-2">
                {items.map((c) => {
                  const rb = c.roadblock;
                  const looksDone = kind === "remove" && rb.phaseIndex === CONSTRUCTION_PHASES.length - 1;
                  return (
                    <li key={c.id} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", k.bar)} />
                      <div className="flex items-start gap-2 py-2.5 pr-2 pl-4">
                        <div className="min-w-0 flex-1">
                          <p className="leading-snug font-semibold text-slate-900">{rb.road || "Untitled roadblock"}</p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500">
                            {AREAS.find((a) => a.id === rb.areaId)?.name} · {CLOSURE_TYPES[closureTypeOf(rb)].label} · {formatPeriod(rb.startDate, rb.endDate)}
                          </p>
                          {looksDone && (
                            <p className="mt-1 text-xs leading-snug text-amber-700">
                              Works are completed. If the road has reopened, Mark as done fits better than Remove.
                            </p>
                          )}
                        </div>
                        {onShow && (
                          <Button variant="ghost" size="sm" className="h-8 shrink-0 rounded-full px-2.5 text-blue-700 hover:bg-blue-50" onClick={() => onShow(c)}>
                            <Crosshair /> Show
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold text-slate-800">When you post</p>
          <ul className="mt-1.5 space-y-1 text-xs leading-snug text-slate-600">
            {consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={onCancel} autoFocus>
            Go back
          </Button>
          <Button className="rounded-full bg-rose-600 hover:bg-rose-700" onClick={onConfirm}>
            <Send /> Yes, post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full",
        ok ? "bg-emerald-500 text-white" : "bg-white text-amber-600 ring-2 ring-amber-300",
      )}
    >
      {ok ? <Check className="size-3" strokeWidth={3} /> : <span className="text-xs font-bold">!</span>}
    </span>
  );
}
