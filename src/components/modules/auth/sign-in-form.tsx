"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CircleAlert, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { authInput, PasswordInput } from "./password-fields";

/** Where to go after signing in. Only same-site paths are honoured. */
export function destinationFor(role: Role, next: string | null) {
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  if (role === "admin") return safe?.startsWith("/admin") ? safe : "/admin";
  return safe && !safe.startsWith("/admin") ? safe : "/";
}

const DEMO = [
  { label: "Citizen", name: "Aisyah Rahman", email: "aisyah.rahman@gmail.com", icon: UserRound, cls: "bg-blue-100 text-blue-800" },
  { label: "Administrator", name: "Ops Admin", email: "ops.admin@mutiara.example", icon: ShieldCheck, cls: "bg-blue-800 text-white" },
];

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useStore((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const wantsAdmin = next?.startsWith("/admin");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setError(null);
    setBusy(true);
    await wait(650); // mock network round trip
    const result = signIn(email);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    toast.success(`Welcome back, ${result.name.split(" ")[0]}`);
    router.replace(destinationFor(result.role, next));
  }

  return (
    <div className="animate-rise-in">
      <h1 className="text-2xl font-bold tracking-tight">{wantsAdmin ? "Sign in to the ops console" : "Welcome back"}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {wantsAdmin ? "Use your Mutiara Line operations account." : "Sign in to file reports and manage your area alerts."}
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="si-email">Email</Label>
          <Input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            aria-invalid={!!error}
            className={authInput}
          />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="si-password">Password</Label>
            <button
              type="button"
              onClick={() =>
                email.trim()
                  ? toast.success("Check your inbox", { description: `If an account uses ${email.trim()}, we've sent a link to reset its password.` })
                  : toast("Enter your email first", { description: "We'll send a password reset link to it." })
              }
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="si-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            aria-invalid={!!error}
          />
        </div>

        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300", error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <p role="alert" className="flex items-start gap-2 overflow-hidden rounded-xl bg-rose-50 text-sm text-rose-700">
            <CircleAlert className="mt-2.5 ml-3 size-4 shrink-0" />
            <span className="py-2 pr-3">{error}</span>
          </p>
        </div>

        <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-blue-700 text-[15px] shadow-lg shadow-blue-800/20 hover:bg-blue-800">
          {busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6">
        <p className="mb-2 flex items-center gap-3 text-xs font-medium text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> Demo accounts <span className="h-px flex-1 bg-slate-200" />
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword("Demo@2026");
                setError(null);
              }}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition-[border-color,background-color] hover:border-blue-300 hover:bg-blue-50/50"
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", d.cls)}>
                <d.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className="block truncate text-xs text-slate-500">{d.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to Mutiara with you?{" "}
        <Link href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} replace className="font-semibold text-blue-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
