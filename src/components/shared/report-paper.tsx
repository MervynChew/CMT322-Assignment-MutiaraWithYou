/* eslint-disable @next/next/no-img-element -- citizen photo object URLs */
import { Eye, EyeOff, ImageIcon, LocateFixed, Star, StarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AREAS, REPORT_CATEGORIES } from "@/lib/mock-data";
import { formatDistance } from "@/lib/geo";
import { formatDateTime } from "@/lib/time";
import type { Report, ReportEntry, ReportLogEntry, Roadblock } from "@/lib/types";

export const categoryLabel = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

function Filled({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("min-h-10 border-b-2 border-dashed border-slate-300 px-1 pt-2 pb-1 font-serif text-[17px] break-words text-blue-900 italic", className)}>
      {children}
    </p>
  );
}

function Num({ n }: { n: string }) {
  return <span className="mr-2 font-mono text-xs font-bold text-blue-700">{n}</span>;
}

function Barcode({ seed }: { seed: string }) {
  const bits = Array.from(seed.padEnd(22, "0")).map((c, i) => (c.charCodeAt(0) + i) % 3 !== 0);
  return (
    <div aria-hidden className="flex h-9 items-end gap-[2px]">
      {bits.map((b, i) => (
        <span key={i} className={cn("w-[2px] bg-slate-900", b ? "h-full" : "h-3/4")} />
      ))}
    </div>
  );
}

/** Read-only copy of one sheet of the citizen's paper form (original or continuation). */
export function ReportSheet({
  report,
  entry,
  index,
  roadblock,
  reporter,
  email,
}: {
  report: Report;
  entry: ReportEntry;
  index: number;
  roadblock?: Roadblock;
  reporter: string;
  email: string;
}) {
  const area = AREAS.find((a) => a.id === roadblock?.areaId);
  const continuation = index > 0;
  const photos = entry.images.map((name, i) => ({ name, url: entry.imageUrls?.[i] }));

  return (
    <div className="relative">
      {!continuation && (
        <>
          <div aria-hidden className="absolute inset-0 translate-x-0.5 translate-y-3 rotate-[0.5deg] rounded-[1.75rem] sm:translate-x-1.5 sm:rotate-[1deg] bg-white shadow-md ring-1 ring-slate-200" />
          <div aria-hidden className="absolute inset-0 -translate-x-1 translate-y-1.5 -rotate-[0.6deg] rounded-[1.75rem] bg-[#fbfaf6] shadow ring-1 ring-slate-200" />
        </>
      )}
      <article className="relative overflow-hidden rounded-[1.75rem] bg-[#fffdf8] shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
        <header className="relative border-b-2 border-slate-900 px-5 pt-6 pb-4 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                Form MWY-R1 · {continuation ? `Continuation sheet ${index}` : "Rev. 2026"}
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{continuation ? "Report Update" : "Citizen Roadblock Report"}</h3>
              <p className="text-sm text-slate-500">Mutiara Line Construction Information Desk</p>
            </div>
            <div className="hidden text-right sm:block">
              <Barcode seed={report.id + index} />
              <p className="mt-1 font-mono text-[10px] text-slate-500">{report.id}</p>
            </div>
          </div>
          {/* Received stamp */}
          <div className="pointer-events-none absolute top-6 right-48 hidden rotate-[-10deg] rounded-lg border-[3px] border-blue-700/60 px-2 py-1 text-center font-mono text-blue-700/70 uppercase md:block">
            <p className="text-[10px] font-black tracking-widest">Received</p>
            <p className="text-[10px] font-bold">{formatDateTime(entry.at)}</p>
          </div>
          {report.viewed && index === report.entries.length - 1 && (
            <div className="pointer-events-none absolute right-6 -bottom-4 rotate-[8deg] rounded-lg border-[3px] border-emerald-600/70 bg-[#fffdf8] px-2 py-0.5 font-mono text-xs font-black tracking-widest text-emerald-700/80 uppercase">
              Viewed
            </div>
          )}
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-8">
          <div>
            <p className="text-sm font-semibold"><Num n="01" /> Location / Roadblock</p>
            <Filled>
              {roadblock?.road ?? "Removed roadblock"}
              {area && <span className="ml-2 text-sm text-slate-500 not-italic">({area.name})</span>}
            </Filled>
            {entry.distanceM !== undefined && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <LocateFixed className="size-3.5" />
                Filed {formatDistance(entry.distanceM)} from the site
                {entry.positionLabel && <span className="text-emerald-700/70">· {entry.positionLabel}</span>}
              </p>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold"><Num n="02" /> Date &amp; time observed</p>
              <Filled>{formatDateTime(entry.observedAt)}</Filled>
            </div>
            <div>
              <p className="text-sm font-semibold"><Num n="03" /> Category</p>
              <Filled>{categoryLabel(entry.category)}</Filled>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold"><Num n="04" /> Site photos</p>
            {photos.length === 0 ? (
              <p className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-400">No photos attached</p>
            ) : (
              <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p, i) => (
                  <li key={i} className="overflow-hidden rounded-xl bg-white p-1.5 pb-2 shadow ring-1 ring-slate-200" style={{ rotate: `${(i % 2 ? 1 : -1) * 1.5}deg` }}>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer">
                        <img src={p.url} alt={p.name} className="aspect-square w-full rounded-lg object-cover" />
                      </a>
                    ) : (
                      <div className="construction-stripes flex aspect-square w-full items-center justify-center rounded-lg opacity-80">
                        <span className="rounded-full bg-white/90 p-2"><ImageIcon className="size-4 text-slate-600" /></span>
                      </div>
                    )}
                    <p className="mt-1 truncate px-0.5 text-[10px] text-slate-500">{p.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold"><Num n="05" /> {continuation ? "Additional details" : "Description"}</p>
            <div className="paper-lines mt-2 min-h-40 rounded-xl border border-slate-200 px-3 py-[6px] font-serif text-[17px] leading-8 break-words whitespace-pre-line text-blue-900 italic">
              {entry.note}
            </div>
          </div>
        </div>

        <div aria-hidden className="relative h-6">
          <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-slate-100 ring-1 ring-slate-200" />
          <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-slate-100 ring-1 ring-slate-200" />
          <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-300" />
        </div>

        <footer className="px-5 pt-2 pb-6 sm:px-8">
          <p className="font-serif text-2xl text-blue-900 italic">{reporter}</p>
          <div className="mt-1 border-t border-slate-400 pt-1 text-[11px] tracking-wider break-words text-slate-500 uppercase">
            Reporter signature · {email} · signed {formatDateTime(entry.at)}
          </div>
        </footer>
      </article>
    </div>
  );
}

const LOG_META: Record<ReportLogEntry["action"], { label: string; icon: typeof Eye; cls: string }> = {
  viewed: { label: "Viewed", icon: Eye, cls: "text-emerald-700" },
  unviewed: { label: "Back to pending", icon: EyeOff, cls: "text-slate-500" },
  focused: { label: "Added to focus", icon: Star, cls: "text-amber-600" },
  unfocused: { label: "Removed from focus", icon: StarOff, cls: "text-slate-500" },
};

/**
 * Small "office use" slip under the paper. Admins see who viewed / focused the
 * report; citizens see when it was viewed and whether it was marked important
 * (staff names stay private).
 */
export function HandlingLog({ report, audience }: { report: Report; audience: "admin" | "citizen" }) {
  const log = (report.log ?? []).filter((l) => audience === "admin" || l.action === "viewed" || l.action === "unviewed");
  const lastViewed = [...(report.log ?? [])].reverse().find((l) => l.action === "viewed");
  const lastFocused = [...(report.log ?? [])].reverse().find((l) => l.action === "focused");

  return (
    <aside className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 font-mono text-[11px] text-slate-600">
      <p className="flex flex-wrap items-center justify-between gap-2 tracking-[0.18em] text-slate-400 uppercase">
        <span>Office use · handling log</span>
        <span className="flex gap-1.5 tracking-normal normal-case">
          <span className={cn("rounded-full px-1.5 py-px", report.viewed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            {report.viewed ? "Viewed" : "Pending review"}
          </span>
          {report.focused && (
            <span className="rounded-full bg-amber-100 px-1.5 py-px text-amber-800">★ {audience === "admin" ? "Focus" : "Important"}</span>
          )}
        </span>
      </p>
      {audience === "citizen" ? (
        <div className="mt-1.5 space-y-0.5">
          <p>
            {report.viewed && lastViewed
              ? `Viewed by the Mutiara Line operations team on ${formatDateTime(lastViewed.at)}.`
              : report.viewed
                ? "Viewed by the Mutiara Line operations team."
                : "Pending review: an administrator hasn't opened this report yet."}
          </p>
          {report.focused && (
            <p className="text-amber-700">
              ★ Marked important for follow-up{lastFocused ? ` on ${formatDateTime(lastFocused.at)}` : ""}.
            </p>
          )}
        </div>
      ) : log.length === 0 ? (
        <p className="mt-1.5 text-slate-400">No admin has handled this report yet.</p>
      ) : (
        <ol className="mt-1.5 space-y-0.5">
          {log.map((l, i) => {
            const meta = LOG_META[l.action];
            return (
              <li key={i} className="grid grid-cols-[1rem_8.5rem_minmax(0,1fr)_auto] items-center gap-1.5">
                <meta.icon className={cn("size-3", meta.cls)} />
                <span className={meta.cls}>{meta.label}</span>
                <span className="truncate font-semibold text-slate-700">{l.adminName}</span>
                <span className="text-slate-400">{formatDateTime(l.at)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
