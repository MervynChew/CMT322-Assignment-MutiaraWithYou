"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Eye, EyeOff, FileDown, FilterX, LoaderCircle, Search, Star, StarOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ADMIN_USER_ID, REPORT_CATEGORIES, reporterName } from "@/lib/mock-data";
import { exportReportsPdf } from "@/lib/report-pdf";
import { formatDateTime } from "@/lib/time";
import type { Report } from "@/lib/types";
import { findRoadblock, useStore } from "@/store/useStore";

type SortKey = "id" | "roadblock" | "category" | "status" | "date" | "focus";
type SortDir = "asc" | "desc";

const categoryLabel = (v: string) => REPORT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
const PAGE_SIZE = 8;

function SortHead({
  k,
  sort,
  onSort,
  children,
  className,
}: {
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 uppercase hover:text-blue-700", active && "text-blue-700")}>
        {children} <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}

export function ReportReviewTable({ onOpen }: { onOpen: (id: string) => void }) {
  const reports = useStore((s) => s.reports);
  const roadblocks = useStore((s) => s.roadblocks);
  const users = useStore((s) => s.users);
  const setReportViewed = useStore((s) => s.setReportViewed);
  const setReportFocus = useStore((s) => s.setReportFocus);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [focusOnly, setFocusOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const archive = useStore((s) => s.archive);
  const roadName = (id: string) => findRoadblock({ roadblocks, archive }, id)?.road ?? "Removed roadblock";

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromT = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toT = to ? new Date(`${to}T23:59:59`).getTime() : Infinity;
    const filtered = reports.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      const latest = r.entries[r.entries.length - 1];
      return (
        (category === "all" || r.entries[0].category === category) &&
        (status === "all" || (status === "viewed" ? r.viewed : !r.viewed)) &&
        (!focusOnly || r.focused) &&
        t >= fromT &&
        t <= toT &&
        (!needle ||
          r.id.toLowerCase().includes(needle) ||
          roadName(r.roadblockId).toLowerCase().includes(needle) ||
          reporterName(r.userId, users).toLowerCase().includes(needle) ||
          latest.note.toLowerCase().includes(needle))
      );
    });
    const val = (r: Report): string | number => {
      switch (sort.key) {
        case "id": return r.id;
        case "roadblock": return roadName(r.roadblockId);
        case "category": return categoryLabel(r.entries[0].category);
        case "status": return r.viewed ? 1 : 0;
        case "focus": return r.focused ? 1 : 0;
        case "date": return r.createdAt;
      }
    };
    return filtered.sort((a, b) => {
      const A = val(a);
      const B = val(b);
      const c = A < B ? -1 : A > B ? 1 : b.createdAt.localeCompare(a.createdAt);
      return sort.dir === "asc" ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roadName derives from roadblocks
  }, [reports, roadblocks, q, category, status, focusOnly, from, to, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtersActive = q || category !== "all" || status !== "all" || focusOnly || from || to;
  const focusCount = reports.filter((r) => r.focused).length;

  // Selection only counts reports that still exist.
  const selectedReports = reports.filter((r) => selected.has(r.id));
  const allRowsSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someRowsSelected = rows.some((r) => selected.has(r.id));

  function toggleSort(key: SortKey) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  }

  function toggleRow(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      for (const r of rows) {
        if (on) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  }

  async function exportSelected() {
    if (!selectedReports.length) return;
    setExporting(true);
    try {
      // Keep the table's order in the PDF.
      const order = new Map(rows.map((r, i) => [r.id, i]));
      const list = [...selectedReports].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
      const exportedBy = users.find((u) => u.id === ADMIN_USER_ID)?.name ?? "Admin";
      const file = await exportReportsPdf(list, { roadblocks, users, exportedBy });
      toast.success(`Exported ${list.length} report${list.length === 1 ? "" : "s"}`, { description: file });
    } catch (e) {
      toast.error("Couldn't create the PDF", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setExporting(false);
    }
  }

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-3xl py-0 shadow-sm shadow-blue-900/[0.04] ring-blue-100">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 border-b border-blue-100/70 bg-linear-to-r from-blue-50/60 to-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder="Search report ID, road, reporter…" className="h-9 rounded-full pl-9" />
        </div>
        <button
          type="button"
          aria-pressed={focusOnly}
          onClick={() => resetPage(setFocusOnly)(!focusOnly)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition",
            focusOnly ? "border-amber-300 bg-amber-100 text-amber-900" : "border-slate-200 text-slate-600 hover:bg-slate-50",
          )}
        >
          <Star className={cn("size-4", focusOnly ? "fill-amber-500 text-amber-500" : "text-amber-500")} />
          Focus
          <span className={cn("rounded-full px-1.5 text-xs", focusOnly ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600")}>{focusCount}</span>
        </button>
        <Select value={category} onValueChange={resetPage(setCategory)}>
          <SelectTrigger className="h-9 w-[190px] rounded-full data-[size=default]:h-9" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            {REPORT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={resetPage(setStatus)}>
          <SelectTrigger className="h-9 w-[150px] rounded-full data-[size=default]:h-9" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="not-viewed">Pending review</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Input type="date" aria-label="From date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} className="h-9 w-[140px] rounded-full" />
          to
          <Input type="date" aria-label="To date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} className="h-9 w-[140px] rounded-full" />
        </div>
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setQ("");
              setCategory("all");
              setStatus("all");
              setFocusOnly(false);
              setFrom("");
              setTo("");
              setPage(0);
            }}
          >
            <FilterX /> Reset
          </Button>
        )}
      </div>

      {/* Selection / bulk actions */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-sm transition-colors",
          selectedReports.length ? "border-blue-200 bg-blue-100/60" : "border-blue-100/70 bg-white",
        )}
      >
        <span className={cn("font-medium", selectedReports.length ? "text-blue-900" : "text-slate-500")}>
          {selectedReports.length ? `${selectedReports.length} selected` : "Select reports to export or add to focus"}
        </span>
        {rows.length > 0 && !allRowsSelected && (
          <Button variant="link" size="sm" className="h-auto px-1 text-blue-700" onClick={() => toggleAll(true)}>
            Select all {rows.length}
            {filtersActive ? " matching" : ""}
          </Button>
        )}
        {selectedReports.length > 0 && (
          <>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSelected(new Set())}>
              <X /> Clear
            </Button>
            <span className="mx-1 hidden h-4 w-px bg-blue-200 sm:block" />
            <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => setReportFocus([...selected], true)}>
              <Star className="text-amber-500" /> Add to focus
            </Button>
            <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => setReportFocus([...selected], false)}>
              <StarOff /> Remove focus
            </Button>
          </>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-auto">
              <Button size="sm" className="rounded-full bg-blue-700 hover:bg-blue-800" disabled={!selectedReports.length || exporting} onClick={exportSelected}>
                {exporting ? <LoaderCircle className="animate-spin" /> : <FileDown />}
                Export PDF{selectedReports.length ? ` (${selectedReports.length})` : ""}
              </Button>
            </span>
          </TooltipTrigger>
          {!selectedReports.length && <TooltipContent>Select one or more reports first</TooltipContent>}
        </Tooltip>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pl-4">
              <Checkbox
                aria-label="Select all matching reports"
                checked={allRowsSelected ? true : someRowsSelected ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(v === true)}
              />
            </TableHead>
            <SortHead sort={sort} onSort={toggleSort} k="focus" className="w-12">
              <Star className="size-3.5" />
              <span className="sr-only">Focus</span>
            </SortHead>
            <SortHead sort={sort} onSort={toggleSort} k="id">Report</SortHead>
            <SortHead sort={sort} onSort={toggleSort} k="roadblock">Roadblock</SortHead>
            <TableHead className="hidden md:table-cell">Reporter</TableHead>
            <SortHead sort={sort} onSort={toggleSort} k="category">Category</SortHead>
            <SortHead sort={sort} onSort={toggleSort} k="date">Filed</SortHead>
            <SortHead sort={sort} onSort={toggleSort} k="status">Status</SortHead>
            <TableHead className="pr-4 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r) => {
            const isSelected = selected.has(r.id);
            return (
              <TableRow key={r.id} data-state={isSelected ? "selected" : undefined} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox aria-label={`Select ${r.id}`} checked={isSelected} onCheckedChange={(v) => toggleRow(r.id, v === true)} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-pressed={!!r.focused}
                    aria-label={r.focused ? `Remove ${r.id} from focus` : `Add ${r.id} to focus`}
                    title={r.focused ? "In focus · click to remove" : "Add to focus"}
                    onClick={() => setReportFocus([r.id], !r.focused)}
                    className="rounded-full p-1 transition hover:bg-amber-50"
                  >
                    <Star className={cn("size-4", r.focused ? "fill-amber-400 text-amber-500" : "text-slate-300 hover:text-amber-400")} />
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs text-blue-700">{r.id}</TableCell>
                <TableCell className="max-w-[220px] truncate font-medium">{roadName(r.roadblockId)}</TableCell>
                <TableCell className="hidden text-slate-600 md:table-cell">{reporterName(r.userId, users)}</TableCell>
                <TableCell><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{categoryLabel(r.entries[0].category)}</span></TableCell>
                <TableCell className="text-slate-600">
                  {formatDateTime(r.createdAt)}
                  {r.entries.length > 1 && <span className="ml-1 rounded-full bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700">+{r.entries.length - 1}</span>}
                </TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", r.viewed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
                    {r.viewed ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    {r.viewed ? "Viewed" : "Pending review"}
                  </span>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Button
                    size="xs"
                    variant={r.viewed ? "ghost" : "outline"}
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportViewed(r.id, !r.viewed);
                    }}
                  >
                    {r.viewed ? "Mark pending" : "Mark viewed"}
                  </Button>
                  <ChevronRight className="ml-1 inline size-4 text-slate-300" />
                </TableCell>
              </TableRow>
            );
          })}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                {focusOnly && !focusCount ? "No reports in focus yet. Star a report to add it." : "No reports match these filters."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-blue-100/70 bg-blue-50/30 px-4 py-3 text-sm text-slate-500">
        <span>{rows.length} report{rows.length === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</Button>
          <span className="tabular-nums">{current + 1} / {pages}</span>
          <Button variant="outline" size="sm" className="rounded-full" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}
