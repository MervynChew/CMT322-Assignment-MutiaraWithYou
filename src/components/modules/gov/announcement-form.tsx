"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export type AnnouncementValues = Pick<Announcement, "title" | "body" | "priority" | "periodStart" | "periodEnd" | "pdfName" | "pdfUrl">;

const toInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toIso = (v: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : undefined);

/** Title, details, period, priority and PDF attachment. Shared by the Post queue and the Announcements page. */
export function AnnouncementForm({
  initial,
  submitLabel,
  submitIcon,
  onSubmit,
  onCancel,
  idPrefix = "an",
}: {
  initial?: Partial<AnnouncementValues>;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  onSubmit: (values: AnnouncementValues) => void;
  onCancel?: () => void;
  idPrefix?: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [effective, setEffective] = useState(toInput(initial?.periodStart));
  const [periodEnd, setPeriodEnd] = useState(toInput(initial?.periodEnd));
  const [priority, setPriority] = useState<Announcement["priority"]>(initial?.priority ?? "info");
  const [pdf, setPdf] = useState<{ name: string; url?: string; size?: number } | null>(
    initial?.pdfName ? { name: initial.pdfName, url: initial.pdfUrl } : null,
  );
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function pickPdf(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.");
      return;
    }
    // Object URL lets the PDF be previewed in the announcement popup this session.
    setPdf({ name: f.name, url: URL.createObjectURL(f), size: f.size });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (title.trim().length < 5) errs.title = "Title needs at least 5 characters.";
    if (body.trim().length < 10) errs.body = "Add a few details.";
    if (effective && periodEnd && periodEnd < effective) errs.period = "Period end must be after the start.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      title: title.trim(),
      body: body.trim(),
      priority,
      periodStart: toIso(effective),
      periodEnd: toIso(periodEnd),
      pdfName: pdf?.name,
      pdfUrl: pdf?.url,
    });
    setTitle("");
    setBody("");
    setEffective("");
    setPeriodEnd("");
    setPriority("info");
    setPdf(null);
  }

  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor={id("title")}>Title</Label>
        <Input id={id("title")} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} placeholder="e.g. Weekend closure at Jalan Macallum" className="h-10 rounded-xl" />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={id("body")}>Details</Label>
        <Textarea id={id("body")} rows={4} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body} placeholder="What's happening, who is affected, and what should road users do?" className="rounded-xl" />
        {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={id("date")}>Effective date</Label>
          <Input id={id("date")} type="date" value={effective} onChange={(e) => setEffective(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("end")}>Period ends</Label>
          <Input id={id("end")} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} aria-invalid={!!errors.period} className="h-10 rounded-xl" />
        </div>
        {errors.period && <p className="col-span-2 text-xs text-destructive">{errors.period}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label>Priority</Label>
        <ToggleGroup type="single" variant="outline" value={priority} onValueChange={(v) => v && setPriority(v as Announcement["priority"])} className="w-full">
          <ToggleGroupItem value="info" className="flex-1 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-800">Info</ToggleGroupItem>
          <ToggleGroupItem value="important" className="flex-1 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-800">Important</ToggleGroupItem>
          <ToggleGroupItem value="urgent" className="flex-1 data-[state=on]:bg-red-50 data-[state=on]:text-red-700">Urgent</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-1.5">
        <Label>Attachment (PDF)</Label>
        {pdf ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-[10px] font-bold text-white">PDF</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{pdf.name}</p>
              <p className="text-xs text-slate-500">{pdf.size ? `${(pdf.size / 1024).toFixed(0)} KB · ` : ""}ready to attach</p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => setPdf(null)} aria-label="Remove PDF">
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickPdf(e.dataTransfer.files);
            }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-left text-sm transition",
              dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40",
            )}
          >
            <FileUp className="size-6 text-blue-700" />
            <span>
              <span className="font-medium">Upload traffic management plan</span>
              <span className="block text-xs text-slate-500">Drag a PDF here or click to browse</span>
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            pickPdf(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" className="h-10 rounded-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="h-10 flex-1 rounded-full bg-blue-700 hover:bg-blue-800">
          {submitIcon} {submitLabel}
        </Button>
      </div>
    </form>
  );
}
