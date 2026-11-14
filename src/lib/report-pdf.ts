import { AREAS, REPORTER_NAMES, REPORT_CATEGORIES } from "./mock-data";
import { formatDistance } from "./geo";
import { formatDateTime } from "./time";
import type { Report, ReportLogEntry, Roadblock, User } from "./types";

/** Built-in PDF fonts only cover Latin-1, so swap typographic characters for plain ones. */
function safe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[  ]/g, " ")
    .replace(/[^\x00-\xff]/g, "?");
}

const categoryLabel = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function reporterName(userId: string, users: User[]): string {
  return users.find((u) => u.id === userId)?.name ?? REPORTER_NAMES[userId] ?? userId;
}

export function reporterEmail(userId: string, users: User[]): string {
  const known = users.find((u) => u.id === userId)?.email;
  if (known) return known;
  return `${(REPORTER_NAMES[userId] ?? "citizen").toLowerCase().replace(/\s+/g, ".")}@gmail.com`;
}

const LOG_LABEL: Record<ReportLogEntry["action"], string> = {
  viewed: "Viewed",
  unviewed: "Back to pending",
  focused: "Added to focus",
  unfocused: "Removed from focus",
};

/** Reads a (blob:) image URL into a data URL jsPDF can embed; null if it can't be loaded. */
async function loadImage(url: string): Promise<{ data: string; w: number; h: number; type: "JPEG" | "PNG" } | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = data;
    });
    return { data, ...dims, type: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

/** Downloads the selected reports as one PDF: a summary page, then each report in full. */
export async function exportReportsPdf(
  reports: Report[],
  ctx: { roadblocks: Roadblock[]; users: User[]; exportedBy: string },
): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  const blue: [number, number, number] = [30, 64, 175];
  const slate: [number, number, number] = [71, 85, 105];
  const ink: [number, number, number] = [15, 23, 42];
  let y = M;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const ensure = (h: number) => {
    if (y + h > H - M - 20) {
      doc.addPage();
      y = M;
    }
  };
  const write = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; x?: number; width?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    setColor(opts.color ?? ink);
    const lines = doc.splitTextToSize(safe(text), opts.width ?? W - 2 * M) as string[];
    for (const line of lines) {
      ensure(size * 1.35);
      doc.text(line, opts.x ?? M, y + size);
      y += size * 1.35;
    }
    y += opts.gap ?? 0;
  };
  const rule = (gap = 10) => {
    ensure(gap * 2);
    y += gap;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += gap;
  };
  const exportedAt = formatDateTime(new Date().toISOString());

  /* ---------- Cover / summary ---------- */
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 96, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(191, 219, 254);
  doc.text("MUTIARA WITH YOU · OPERATIONS CONSOLE", M, 38);
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Citizen report export", M, 68);
  y = 122;
  write(`${reports.length} report${reports.length === 1 ? "" : "s"} · exported by ${ctx.exportedBy} on ${exportedAt}`, { color: slate, gap: 10 });

  const cols = [
    { label: "Report", x: M, w: 62 },
    { label: "Roadblock", x: M + 62, w: 150 },
    { label: "Category", x: M + 212, w: 120 },
    { label: "Filed", x: M + 332, w: 90 },
    { label: "Status", x: M + 422, w: 85 },
  ];
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y, W - 2 * M, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(slate);
  cols.forEach((c) => doc.text(c.label.toUpperCase(), c.x + 4, y + 13));
  y += 24;
  doc.setFont("helvetica", "normal");
  for (const r of reports) {
    ensure(18);
    const rb = ctx.roadblocks.find((x) => x.id === r.roadblockId);
    const cells = [
      r.id,
      rb?.road ?? "Removed roadblock",
      categoryLabel(r.entries[0].category),
      formatDateTime(r.createdAt),
      `${r.viewed ? "Viewed" : "Pending review"}${r.focused ? " · Focus" : ""}`,
    ];
    doc.setFontSize(8.5);
    setColor(ink);
    cells.forEach((text, i) => {
      const [line] = doc.splitTextToSize(safe(text), cols[i].w - 8) as string[];
      doc.text(line, cols[i].x + 4, y + 10);
    });
    y += 16;
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y - 2, W - M, y - 2);
  }

  /* ---------- One section per report ---------- */
  for (const r of reports) {
    doc.addPage();
    y = M;
    const rb = ctx.roadblocks.find((x) => x.id === r.roadblockId);
    const area = AREAS.find((a) => a.id === rb?.areaId);
    const first = r.entries[0];

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(M, y, W - 2 * M, 64, 10, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(147, 197, 253);
    doc.text(safe(`FORM MWY-R1 · ${r.id}`), M + 16, y + 22);
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(safe(rb?.road ?? "Removed roadblock"), M + 16, y + 44, { maxWidth: W - 2 * M - 150 });
    doc.setFontSize(9);
    doc.text(safe(`${r.viewed ? "VIEWED" : "PENDING REVIEW"}${r.focused ? "  ·  FOCUS" : ""}`), W - M - 16, y + 22, { align: "right" });
    y += 82;

    const fields: [string, string][] = [
      ["Area", area?.name ?? "-"],
      ["Reporter", reporterName(r.userId, ctx.users)],
      ["Contact", reporterEmail(r.userId, ctx.users)],
      ["Category", categoryLabel(first.category)],
      ["Filed", formatDateTime(r.createdAt)],
    ];
    if (first.distanceM !== undefined) fields.push(["Distance at filing", `${formatDistance(first.distanceM)} from the pin`]);
    const colW = (W - 2 * M) / 2;
    fields.forEach(([k, v], i) => {
      const x = M + (i % 2) * colW;
      if (i % 2 === 0) ensure(30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(slate);
      doc.text(k.toUpperCase(), x, y + 8);
      doc.setFontSize(10.5);
      setColor(ink);
      doc.text(safe(v), x, y + 22, { maxWidth: colW - 12 });
      if (i % 2 === 1) y += 32;
    });
    if (fields.length % 2) y += 32;

    for (const [i, e] of r.entries.entries()) {
      rule(8);
      write(i === 0 ? "Original report" : `Update #${i}`, { size: 12, bold: true, color: blue });
      write(`Received ${formatDateTime(e.at)} · observed ${formatDateTime(e.observedAt)} · ${categoryLabel(e.category)}`, { size: 9, color: slate, gap: 6 });
      write(e.note, { size: 11, gap: 6 });
      if (e.images.length) {
        write(`Photos: ${e.images.join(", ")}`, { size: 9, color: slate, gap: 4 });
        const urls = e.imageUrls ?? [];
        let x = M;
        let rowH = 0;
        for (const url of urls) {
          const img = await loadImage(url);
          if (!img) continue;
          const w = 120;
          const h = Math.min(120, (img.h / img.w) * w);
          if (x + w > W - M) {
            x = M;
            y += rowH + 8;
            rowH = 0;
          }
          ensure(h + 8);
          doc.addImage(img.data, img.type, x, y, w, h);
          x += w + 8;
          rowH = Math.max(rowH, h);
        }
        if (rowH) y += rowH + 8;
      }
    }

    rule(8);
    write("Handling log", { size: 10, bold: true, color: slate });
    const log = r.log ?? [];
    if (!log.length) write("No admin has handled this report yet.", { size: 9, color: slate });
    for (const l of log) write(`${formatDateTime(l.at)}  ·  ${LOG_LABEL[l.action]}  ·  ${l.adminName}`, { size: 9, color: ink });
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(safe(`Mutiara with you · exported by ${ctx.exportedBy} · ${exportedAt}`), M, H - 24);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 24, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `mutiara-reports-${stamp}-${reports.length}.pdf`;
  doc.save(name);
  return name;
}
