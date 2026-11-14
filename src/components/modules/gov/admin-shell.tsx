"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LoaderCircle, LogIn, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

/**
 * One continuous background for every console page: a soft blue wash with a
 * faint grid that fades out, painted with gradients only (no blur filters, so
 * scrolling stays cheap).
 */
function ConsoleBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#f3f6fc]">
      <div className="absolute inset-0 bg-[radial-gradient(70rem_36rem_at_85%_-8%,rgb(59_130_246/0.16),transparent_70%),radial-gradient(50rem_30rem_at_-5%_10%,rgb(30_64_175/0.10),transparent_70%),radial-gradient(60rem_40rem_at_50%_110%,rgb(14_165_233/0.08),transparent_70%)]" />
      <div
        className="absolute inset-0 opacity-[0.5] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(30 64 175 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(30 64 175 / 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

/** Admin-only frame. Other roles see a restricted screen with a way to sign in. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const role = useStore((s) => s.role);
  const ready = useStore((s) => s.sessionReady);
  const pathname = usePathname();

  if (!ready) {
    return (
      <main className="relative isolate flex min-h-dvh items-center justify-center">
        <ConsoleBackdrop />
        <LoaderCircle className="size-6 animate-spin text-blue-700" aria-label="Loading console" />
      </main>
    );
  }

  if (role !== "admin") {
    const citizen = role === "public";
    return (
      <main className="relative isolate flex min-h-dvh items-center justify-center px-4 pt-20 pb-24">
        <ConsoleBackdrop />
        <div className="animate-rise-in w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl shadow-blue-900/15 ring-1 ring-slate-200/70">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/60">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-slate-500">
            {citizen
              ? "Your citizen account can't open the operations console. Sign in with an administrator account to continue."
              : "The operations console is only available to Mutiara Line administrators."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg" className="h-11 rounded-full bg-blue-700 text-base hover:bg-blue-800">
              <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
                <LogIn /> Sign in as administrator
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-11 rounded-full text-slate-600">
              <Link href="/">
                <ArrowLeft /> Back to public site
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="relative isolate min-h-dvh">
      <ConsoleBackdrop />
      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6">{children}</div>
    </div>
  );
}

/** Small count capsule for an AdminPageHeader, e.g. "16 reports" or "3 urgent". */
export function HeaderStat({
  icon: Icon,
  value,
  label,
  tone = "bg-white text-blue-800",
}: {
  icon: typeof ShieldCheck;
  value: number | string;
  label: string;
  /** Classes for the round icon chip. */
  tone?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 ring-1 ring-white/15">
      <span className={cn("flex size-6 items-center justify-center rounded-full", tone)}>
        <Icon className="size-3.5" />
      </span>
      <b className="text-base font-semibold text-white tabular-nums">{value}</b>
      <span className="text-blue-100">{label}</span>
    </span>
  );
}

/** Page title card: a contained blue hero, so the page never splits into a blue half and a white half. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  stats,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  /** HeaderStat capsules, shown on the right with the actions. */
  stats?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mb-6 overflow-hidden rounded-[2rem] bg-linear-to-br from-blue-950 via-blue-800 to-blue-600 px-6 py-7 text-white shadow-xl shadow-blue-900/15 sm:px-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <svg aria-hidden viewBox="0 0 600 160" className="absolute -right-10 -bottom-8 h-40 w-[32rem] opacity-20 max-sm:hidden">
        <path d="M0 140 C 120 120, 180 50, 300 70 S 480 140, 600 30" fill="none" stroke="white" strokeWidth="3" />
        {[[60, 132], [170, 88], [300, 70], [430, 112], [545, 58]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="7" fill="white" />
        ))}
      </svg>
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-blue-200 uppercase">
            <ShieldCheck className="size-3.5" /> {eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-sm text-blue-100/90">{description}</div>}
        </div>
        {(stats || actions) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {stats}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** White card used across admin pages. */
export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  icon?: typeof ShieldCheck;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-slate-200/70 bg-white shadow-sm shadow-blue-900/[0.03]", className)}>
      {title && (
        <header className="flex items-center gap-2 border-b border-blue-100/60 px-5 py-4">
          {Icon && (
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Icon className="size-4" />
            </span>
          )}
          <h2 className="text-sm font-semibold">{title}</h2>
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
