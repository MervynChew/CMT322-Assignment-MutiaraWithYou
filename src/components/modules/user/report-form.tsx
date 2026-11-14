"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Crosshair, History, LoaderCircle, LocateFixed, MapPinned, MapPinOff, Send, Stamp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AREAS, REPORT_CATEGORIES } from "@/lib/mock-data";
import { formatDistance, haversine, REPORT_RADIUS_M } from "@/lib/geo";
import { formatDateTime } from "@/lib/time";
import type { ReportCategory } from "@/lib/types";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useCurrentUser, useSessionUserId, useStore } from "@/store/useStore";
import { ImageDropzone, type UploadedImage } from "./image-dropzone";

const schema = z.object({
  roadblockId: z.string().min(1, "Choose the roadblock you are reporting."),
  observedAt: z.string().min(1, "When did you observe this?"),
  category: z.enum(["inaccurate-status", "wrong-period", "safety-hazard", "congestion", "other"], {
    error: "Pick a category.",
  }),
  description: z
    .string()
    .trim()
    .min(15, "Please describe the issue in at least 15 characters.")
    .max(500, "Keep it under 500 characters."),
});
type FormValues = z.infer<typeof schema>;

/** "2026-10-29T14:05" for datetime-local inputs, in local time. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const underline =
  "h-10 rounded-none border-0 border-b-2 border-dashed border-slate-300 bg-transparent px-1 text-[15px] shadow-none focus-visible:border-solid focus-visible:border-blue-600 focus-visible:ring-0 dark:bg-transparent";

function Num({ n }: { n: string }) {
  return <span className="mr-2 font-mono text-xs font-bold text-blue-700">{n}</span>;
}

/** Details carried over from where the report was started (e.g. "Report inaccuracy" on the map). */
export type ReportPrefill = {
  roadblockId: string;
  /** ISO time the viewer tapped "Report", used as the time observed. */
  observedAt?: string;
  /** Changes on every new link, so reporting the same roadblock twice still fills the form again. */
  key: string;
  /** Where it came from, for the note above the form. */
  from: "map" | "update";
};

export function ReportForm({
  prefill,
  onSubmitted,
}: {
  prefill?: ReportPrefill | null;
  onSubmitted: () => void;
}) {
  const initialRoadblockId = prefill?.roadblockId;
  const roadblocks = useStore((s) => s.roadblocks);
  const reports = useStore((s) => s.reports);
  const { position, status: locStatus, error: locError, locate } = useDeviceLocation();
  const createReport = useStore((s) => s.createReport);
  const appendToReport = useStore((s) => s.appendToReport);
  const user = useCurrentUser();
  const me = useSessionUserId();
  const [images, setImages] = useState<UploadedImage[]>([]);

  const reportable = roadblocks.filter((r) => r.status !== "completed");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roadblockId: initialRoadblockId && reportable.some((r) => r.id === initialRoadblockId) ? initialRoadblockId : "",
      observedAt: prefill?.observedAt ? toLocalInput(new Date(prefill.observedAt)) : "",
      category: undefined,
      description: "",
    },
  });
  // A note above the form saying what was filled in; shown again for each new link.
  const [notice, setNotice] = useState<ReportPrefill | null>(prefill ?? null);
  const [noticeKey, setNoticeKey] = useState(prefill?.key);
  if (prefill && prefill.key !== noticeKey) {
    setNoticeKey(prefill.key);
    setNotice(prefill);
  }

  // Fill in the roadblock and time each time the viewer arrives from a "Report" link (the page stays mounted between visits).
  const prefillKey = prefill?.key;
  useEffect(() => {
    if (!prefill) return;
    form.setValue("roadblockId", prefill.roadblockId, { shouldValidate: true });
    if (prefill.observedAt) form.setValue("observedAt", toLocalInput(new Date(prefill.observedAt)), { shouldValidate: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only for a new link
  }, [prefillKey]);

  const roadblockId = useWatch({ control: form.control, name: "roadblockId" });
  const roadblock = roadblocks.find((r) => r.id === roadblockId);
  const distance = roadblock && position ? haversine(position, roadblock) : null;
  const outOfRange = distance !== null && distance > REPORT_RADIUS_M;
  /** Reports need a real location within 1 km of the site. */
  const blocked = !position || outOfRange;

  /** Rule: one active report per roadblock — while it is pending review, new details are added to it as an update. */
  const openReport = useMemo(
    () => reports.find((r) => r.userId === me && r.roadblockId === roadblockId && !r.viewed),
    [reports, roadblockId, me],
  );

  function onSubmit(values: FormValues) {
    if (blocked || !position) {
      if (!position) toast.error("Share your location first", { description: "Reports can only be sent from within 1 km of the roadblock." });
      return;
    }
    const entry = {
      note: values.description,
      category: values.category as ReportCategory,
      observedAt: new Date(values.observedAt).toISOString(),
      images: images.map((i) => i.name),
      // Kept (not revoked) so admins can see the photos when reviewing this session.
      imageUrls: images.map((i) => i.url),
      distanceM: distance ?? undefined,
      positionLabel: position.label,
    };
    if (openReport) {
      appendToReport(openReport.id, entry);
      toast.success(`Update added to ${openReport.id}`, { description: "You can follow it under My reports." });
    } else {
      const id = createReport(values.roadblockId, entry);
      toast.success(`Report ${id} submitted`, { description: "We'll notify you once an admin reviews it." });
    }
    setImages([]);
    form.reset({ roadblockId: values.roadblockId, observedAt: "", category: undefined, description: "" });
    onSubmitted();
  }

  const errors = form.formState.errors;

  const noticeRoad = notice ? roadblocks.find((r) => r.id === notice.roadblockId)?.road : undefined;

  return (
    <>
      {notice && noticeRoad && (
        <div role="status" className="animate-rise-in mx-auto mb-5 flex max-w-2xl items-start gap-3 rounded-2xl bg-blue-50 p-3.5 text-sm text-blue-950 ring-1 ring-blue-200">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
            <MapPinned className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{notice.from === "map" ? "Filled in from the map" : "Adding an update"}</p>
            <p className="mt-0.5 text-blue-900/80">
              Roadblock: <b className="font-medium text-blue-950">{noticeRoad}</b>
              {notice.observedAt && (
                <>
                  {" "}
                  · Seen: <b className="font-medium text-blue-950">{formatDateTime(notice.observedAt)}</b>
                </>
              )}
              . Change anything that isn&apos;t right, then describe what you saw.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="relative mx-auto max-w-2xl">
      {/* stacked paper sheets */}
      <div aria-hidden className="absolute inset-0 translate-x-0.5 translate-y-3 rotate-[0.6deg] rounded-[1.75rem] sm:translate-x-2 sm:rotate-[1.2deg] bg-white shadow-md ring-1 ring-slate-200" />
      <div aria-hidden className="absolute inset-0 -translate-x-1 translate-y-1.5 -rotate-[0.8deg] rounded-[1.75rem] bg-[#fbfaf6] shadow ring-1 ring-slate-200" />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="relative overflow-hidden rounded-[1.75rem] bg-[#fffdf8] shadow-xl shadow-slate-900/10 ring-1 ring-slate-200"
      >
        {/* Form header */}
        <header className="relative border-b-2 border-slate-900 px-6 pt-6 pb-4 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-slate-500 uppercase">Form MWY-R1 · Rev. 2026</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Citizen Roadblock Report</h2>
              <p className="text-sm text-slate-500">Mutiara Line Construction Information Desk</p>
            </div>
            <div className="hidden text-right sm:block">
              <div aria-hidden className="flex h-9 items-end gap-[2px]">
                {"1101001011101001101011".split("").map((b, i) => (
                  <span key={i} className={cn("w-[2px] bg-slate-900", b === "1" ? "h-full" : "h-3/4")} />
                ))}
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{openReport ? openReport.id : "NEW REPORT"}</p>
            </div>
          </div>
          {openReport && (
            <div className="pointer-events-none absolute top-6 right-48 hidden rotate-[-12deg] rounded-lg border-[3px] border-red-600/70 px-2 py-1 font-mono text-xs font-black tracking-widest text-red-600/70 uppercase sm:block">
              Update only
            </div>
          )}
        </header>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          {openReport && (
            <Alert className="rounded-2xl border-amber-200 bg-amber-50 text-amber-900">
              <History />
              <AlertTitle>Report {openReport.id} is still pending review</AlertTitle>
              <AlertDescription className="text-amber-800">
                You can have one active report per roadblock, so this will be added to {openReport.id} as an update
                instead of opening a new report.
                <ol className="mt-2 space-y-1 border-l-2 border-amber-300 pl-3 text-xs">
                  {openReport.entries.map((e, i) => (
                    <li key={i}>
                      <span className="font-semibold">{formatDateTime(e.at)}</span> — {e.note}
                    </li>
                  ))}
                </ol>
              </AlertDescription>
            </Alert>
          )}

          <FieldGroup className="gap-6">
            {/* 01 Location */}
            <Field data-invalid={!!errors.roadblockId}>
              <FieldLabel htmlFor="roadblockId" className="text-sm font-semibold">
                <Num n="01" /> Location / Roadblock
              </FieldLabel>
              <Controller
                control={form.control}
                name="roadblockId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="roadblockId" aria-invalid={!!errors.roadblockId} className={cn(underline, "w-full justify-between data-[size=default]:h-10")}>
                      <SelectValue placeholder="Select the roadblock pin…" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl">
                      {AREAS.filter((a) => reportable.some((r) => r.areaId === a.id)).map((a) => (
                        <SelectGroup key={a.id}>
                          <SelectLabel>{a.name}</SelectLabel>
                          {reportable
                            .filter((r) => r.areaId === a.id)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.road}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.roadblockId]} />

              {/* 1 km rule, checked against the device's real location */}
              <div
                className={cn(
                  "mt-1 flex flex-col gap-3 rounded-2xl p-3 text-sm sm:flex-row sm:items-center",
                  !roadblock || !position
                    ? "bg-slate-100/70 text-slate-700"
                    : outOfRange
                      ? "bg-red-50 text-red-800"
                      : "bg-emerald-50 text-emerald-800",
                )}
              >
                <div className="flex flex-1 items-start gap-2">
                  {outOfRange ? <MapPinOff className="mt-0.5 size-4 shrink-0" /> : <LocateFixed className="mt-0.5 size-4 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {!position
                        ? "Share your location to check you're within 1 km of the roadblock."
                        : !roadblock
                          ? "Reports are limited to within 1 km of a roadblock."
                          : outOfRange
                            ? `You are ${formatDistance(distance!)} away. Move within 1 km to report.`
                            : `You are ${formatDistance(distance!)} from this site. Within range.`}
                    </p>
                    <p className={cn("text-xs", locStatus === "error" ? "text-rose-700" : "opacity-75")}>
                      {locStatus === "locating"
                        ? "Finding you…"
                        : locStatus === "error"
                          ? locError
                          : position
                            ? `Your location: ${position.label}`
                            : "Your location is only used for this check."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={position ? "outline" : "default"}
                  disabled={locStatus === "locating"}
                  className={cn("h-9 shrink-0 rounded-full px-3.5", position ? "bg-white" : "bg-blue-700 hover:bg-blue-800")}
                  onClick={() => void locate()}
                >
                  {locStatus === "locating" ? <LoaderCircle className="animate-spin" /> : <Crosshair />}
                  {position ? "Refresh location" : "Use my location"}
                </Button>
              </div>
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* 02 Date & time */}
              <Field data-invalid={!!errors.observedAt}>
                <FieldLabel htmlFor="observedAt" className="text-sm font-semibold">
                  <Num n="02" /> Date &amp; time observed
                </FieldLabel>
                <div className="flex items-end gap-2">
                  <Input id="observedAt" type="datetime-local" aria-invalid={!!errors.observedAt} className={underline} {...form.register("observedAt")} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-blue-700"
                    onClick={() => form.setValue("observedAt", toLocalInput(new Date()), { shouldValidate: true })}
                  >
                    Now
                  </Button>
                </div>
                <FieldError errors={[errors.observedAt]} />
              </Field>

              {/* 03 Category */}
              <Field data-invalid={!!errors.category}>
                <FieldLabel htmlFor="category" className="text-sm font-semibold">
                  <Num n="03" /> Category
                </FieldLabel>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="category" aria-invalid={!!errors.category} className={cn(underline, "w-full justify-between data-[size=default]:h-10")}>
                        <SelectValue placeholder="Choose a category…" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-xl">
                        {REPORT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[errors.category]} />
              </Field>
            </div>

            {/* 04 Photos */}
            <Field>
              <FieldLabel className="text-sm font-semibold">
                <Num n="04" /> Site photos <span className="font-normal text-slate-400">(optional)</span>
              </FieldLabel>
              <ImageDropzone value={images} onChange={setImages} />
            </Field>

            {/* 05 Description */}
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="description" className="text-sm font-semibold">
                <Num n="05" /> {openReport ? "Additional details" : "Description"}
              </FieldLabel>
              <Textarea
                id="description"
                rows={5}
                aria-invalid={!!errors.description}
                placeholder="Describe what you observed…"
                className="paper-lines min-h-40 resize-none rounded-xl border-slate-200 bg-transparent px-3 py-[6px] text-[15px] leading-8 shadow-none focus-visible:ring-blue-500/30"
                {...form.register("description")}
              />
              <FieldDescription>Be specific: time, lane, signage, and what differs from the app.</FieldDescription>
              <FieldError errors={[errors.description]} />
            </Field>
          </FieldGroup>
        </div>

        {/* Perforated tear line */}
        <div aria-hidden className="relative h-6">
          <span className="absolute top-1/2 -left-3 size-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-slate-200" />
          <span className="absolute top-1/2 -right-3 size-6 -translate-y-1/2 rounded-full bg-slate-50 ring-1 ring-slate-200" />
          <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-300" />
        </div>

        <footer className="flex flex-col gap-4 px-6 pt-2 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="flex-1">
            <p className="font-serif text-2xl text-blue-900 italic">{user.name}</p>
            <div className="mt-1 border-t border-slate-400 pt-1 text-[11px] tracking-wider text-slate-500 uppercase">
              Reporter signature · {user.email}
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={blocked || form.formState.isSubmitting}
            className="h-12 rounded-full bg-blue-700 px-6 text-base shadow-lg shadow-blue-800/25 hover:bg-blue-800"
          >
            {openReport ? <Stamp /> : <Send />}
            {openReport ? `Add update to ${openReport.id}` : "Submit report"}
          </Button>
        </footer>
      </form>
      </div>
    </>
  );
}
