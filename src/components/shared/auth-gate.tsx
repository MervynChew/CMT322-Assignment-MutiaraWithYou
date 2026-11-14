"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Check, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

/**
 * Signed-in only content. Guests see the page frozen and blurred behind a
 * sign-in prompt; the navbar (z-45) stays sharp and clickable above the blur.
 */
export function AuthGate({
  children,
  title,
  description,
  perks,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  perks: string[];
}) {
  const role = useStore((s) => s.role);
  const ready = useStore((s) => s.sessionReady);
  const pathname = usePathname();
  const locked = role === "guest";

  // Freeze the page behind the prompt (also spares the browser re-blurring on scroll).
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [locked]);

  if (!locked) return <>{children}</>;

  const next = `?next=${encodeURIComponent(pathname)}`;
  return (
    <>
      <div aria-hidden inert className="pointer-events-none select-none">
        {children}
      </div>

      <div aria-hidden className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[7px] duration-300 animate-in fade-in-0" />

      {ready && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto px-4 pt-20 pb-28 md:pb-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            aria-describedby="gate-desc"
            className="animate-rise-in w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-950/25 ring-1 ring-slate-200/80"
          >
            <div className="relative overflow-hidden bg-linear-to-br from-blue-900 via-blue-800 to-blue-600 px-7 pt-7 pb-6 text-white">
              <svg aria-hidden viewBox="0 0 300 120" className="absolute -right-6 -bottom-4 w-64 opacity-20">
                <path d="M0 100 C 70 90, 100 30, 160 40 S 250 100, 300 20" fill="none" stroke="white" strokeWidth="3" />
                {[[20, 97], [95, 55], [160, 40], [230, 78], [285, 30]].map(([x, y]) => (
                  <circle key={x} cx={x} cy={y} r="6" fill="white" />
                ))}
              </svg>
              <div className="relative flex items-center gap-3">
                <span className="relative">
                  <Image src="/logo/logo.png" alt="" width={52} height={52} className="size-13 rounded-2xl shadow-lg shadow-blue-950/40 ring-1 ring-white/25" />
                  <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-white text-blue-800 shadow ring-2 ring-blue-800">
                    <LockKeyhole className="size-3.5" />
                  </span>
                </span>
                <span className="text-xs font-semibold tracking-[0.18em] text-blue-100 uppercase">Members only</span>
              </div>
              <h2 id="gate-title" className="relative mt-5 text-2xl leading-tight font-bold tracking-tight">
                {title}
              </h2>
              <p id="gate-desc" className="relative mt-1.5 text-sm text-blue-100/90">
                {description}
              </p>
            </div>

            <div className="px-7 pt-5 pb-7">
              <ul className="space-y-2.5">
                {perks.map((p, i) => (
                  <li key={p} className="animate-rise-in flex items-start gap-2.5 text-sm text-slate-600" style={{ animationDelay: `${120 + i * 70}ms` }}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <Button asChild size="lg" className="h-11 rounded-xl bg-blue-700 text-[15px] shadow-lg shadow-blue-800/20 hover:bg-blue-800">
                  <Link href={`/sign-in${next}`} autoFocus>
                    <LogIn /> Sign in
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 rounded-xl text-[15px]">
                  <Link href={`/sign-up${next}`}>
                    <UserPlus /> Create account
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">
                Just looking?{" "}
                <Link href="/map" className="font-medium text-blue-700 hover:underline">
                  Browse the live map
                </Link>{" "}
                without an account.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
