"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Non-modal right-side frame that floats over the map, so the map stays
 * interactive while details are open.
 */
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={cn(
        // Phones: a bottom sheet that sits above the tab bar. Tablets and up: a side panel.
        "fixed inset-x-2 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[900] flex max-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/[0.97] shadow-2xl shadow-slate-900/20 ring-1 ring-black/5 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.32,.72,0,1)]",
        "md:inset-x-auto md:top-20 md:right-3 md:bottom-3 md:max-h-none md:w-[420px]",
        open ? "translate-y-0 opacity-100 md:translate-x-0" : "pointer-events-none translate-y-[110%] opacity-0 md:translate-x-[110%] md:translate-y-0",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-slate-100 p-5">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-tight font-semibold">{title}</h2>
          {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
        </div>
        <Button variant="ghost" size="icon" className="-mt-1 -mr-2 rounded-full" onClick={onClose} aria-label="Close panel">
          <X />
        </Button>
      </header>
      <div className="scroll-inset flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
