"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Create account" },
];

function Switch() {
  const pathname = usePathname();
  const params = useSearchParams();
  const index = Math.max(0, TABS.findIndex((t) => t.href === pathname));
  const query = params.toString() ? `?${params.toString()}` : "";

  return (
    <nav aria-label="Account" className="relative mb-8 grid grid-cols-2 rounded-full bg-slate-100 p-1">
      {/* The pill slides between the two halves as you switch pages. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm ring-1 ring-slate-200/80 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TABS.map((t, i) => (
        <Link
          key={t.href}
          href={`${t.href}${query}`}
          replace
          aria-current={i === index ? "page" : undefined}
          className={cn(
            "relative z-10 rounded-full py-2 text-center text-sm font-semibold transition-colors duration-300",
            i === index ? "text-blue-800" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Sign in / Create account toggle that keeps the ?next= target when switching. */
export function AuthSwitch() {
  return (
    <Suspense fallback={<div className="mb-8 h-10 rounded-full bg-slate-100" />}>
      <Switch />
    </Suspense>
  );
}
