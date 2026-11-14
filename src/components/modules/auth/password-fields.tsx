"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const authInput =
  "h-11 rounded-xl border-slate-200 bg-slate-50/60 px-3.5 text-[15px] transition-[background-color,border-color,box-shadow] focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-blue-500/20";

/** Password input with a show / hide toggle. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn(authInput, "pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <span key={String(visible)} className="animate-rule-pop">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </span>
      </button>
    </div>
  );
}

export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number (0–9)", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "One symbol (e.g. ! @ # $)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

export const passwordScore = (p: string) => PASSWORD_RULES.filter((r) => r.test(p)).length;
export const passwordValid = (p: string) => passwordScore(p) === PASSWORD_RULES.length;

const STRENGTH = [
  { label: "Too weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Too weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Weak", bar: "bg-orange-500", text: "text-orange-600" },
  { label: "Fair", bar: "bg-amber-400", text: "text-amber-600" },
  { label: "Good", bar: "bg-blue-600", text: "text-blue-700" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

/** One rule line: a neutral dot until typed, then an animated cross or tick. */
export function RuleItem({ ok, touched, children }: { ok: boolean; touched: boolean; children: React.ReactNode }) {
  const state = ok ? "ok" : touched ? "bad" : "idle";
  return (
    <li className="flex items-center gap-2.5 text-[13px]">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
          state === "ok" ? "bg-emerald-500 text-white" : state === "bad" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-300",
        )}
      >
        {/* Re-keyed on every state change so the icon pops in again. */}
        <span key={state} className={cn("flex", state !== "idle" && "animate-rule-pop")}>
          {state === "ok" ? (
            <Check className="size-3" strokeWidth={3} />
          ) : state === "bad" ? (
            <X className="size-3" strokeWidth={3} />
          ) : (
            <span className="size-1.5 rounded-full bg-current" />
          )}
        </span>
      </span>
      <span className={cn("transition-colors duration-300", state === "ok" ? "text-emerald-700" : state === "bad" ? "text-slate-700" : "text-slate-500")}>
        {children}
      </span>
    </li>
  );
}

/** Live strength meter and rule checklist for a new password. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  const score = passwordScore(password);
  const touched = password.length > 0;
  const s = STRENGTH[score];

  return (
    <div id={id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Password strength</span>
        <span className={cn("font-semibold transition-colors duration-300", touched ? s.text : "text-slate-400")}>
          {touched ? s.label : "Start typing"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden>
        {PASSWORD_RULES.map((r, i) => (
          <span key={r.id} className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <span
              className={cn(
                "block h-full origin-left rounded-full transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                s.bar,
              )}
              style={{ transform: `scaleX(${i < score ? 1 : 0})`, transitionDelay: `${i * 40}ms` }}
            />
          </span>
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => (
          <RuleItem key={r.id} ok={r.test(password)} touched={touched}>
            {r.label}
          </RuleItem>
        ))}
      </ul>
    </div>
  );
}
