"use client";

import { Check, Crosshair, Eraser, Megaphone, Minus, PencilLine, Plus, ReceiptText, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ADMIN_USER_ID, AREAS, CONSTRUCTION_PHASES } from "@/lib/mock-data";
import { formatDistance } from "@/lib/geo";
import { formatShortDate, formatWindow } from "@/lib/time";
import { effectiveModes, modesLabel } from "@/components/shared/travel-modes";
import type { PendingChange, Roadblock } from "@/lib/types";
import { useStore } from "@/store/useStore";

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
  if (c.kind === "remove") return { sign: "−", title: `Removed ${name}`, details: ["Pin will be deleted"] };
  return { sign: "~", title: `Edited ${name}`, details: diff(c.before, c.roadblock) };
}


/** Zig-zag torn paper edge. */
function Zigzag({ flip }: { flip?: boolean }) {
  const mask = "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 12px 100%";
  return <div aria-hidden className={cn("h-3 w-full bg-white", flip && "rotate-180")} style={{ mask, WebkitMask: mask }} />;
}

const KIND: Record<PendingChange["kind"], { label: string; icon: typeof Plus; chip: string; bar: string }> = {
  add: { label: "Added", icon: Plus, chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500" },
  edit: { label: "Edited", icon: PencilLine, chip: "bg-blue-50 text-blue-700 ring-blue-200", bar: "bg-blue-500" },
  remove: { label: "Removed", icon: Minus, chip: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500" },
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

  const counts = {
    add: pending.filter((c) => c.kind === "add").length,
    edit: pending.filter((c) => c.kind === "edit").length,
    remove: pending.filter((c) => c.kind === "remove").length,
  };
  const total = pending.length + pendingAnnouncements.length;
  // Every post tells the public what changed: it needs at least one announcement.
  const hasAnnouncement = pendingAnnouncements.length > 0;
  const canPost = total > 0 && hasAnnouncement;

  function post() {
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
        <dl className="mt-4 grid grid-cols-4 gap-1.5 text-center">
          {[
            { label: "Added", value: counts.add, cls: "text-emerald-700" },
            { label: "Edited", value: counts.edit, cls: "text-blue-700" },
            { label: "Removed", value: counts.remove, cls: "text-rose-700" },
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
              <Button className="h-10 flex-1 rounded-full bg-blue-700 hover:bg-blue-800" disabled={!canPost} onClick={post}>
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
    </div>
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
