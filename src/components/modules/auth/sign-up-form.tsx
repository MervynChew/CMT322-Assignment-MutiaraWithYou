"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { authInput, PasswordChecklist, PasswordInput, passwordValid, RuleItem } from "./password-fields";
import { destinationFor, wait } from "./sign-in-form";

type Errors = Partial<Record<"name" | "email" | "phone" | "password" | "confirm", string>>;

function FieldError({ children }: { children?: string }) {
  return (
    <div className={cn("grid transition-[grid-template-rows,opacity] duration-300", children ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
      <p className="overflow-hidden text-xs text-rose-600">{children}</p>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const signUp = useStore((s) => s.signUp);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const next = params.get("next");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Errors = {};
    if (form.name.trim().length < 2) err.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = "Enter a valid email address.";
    if (form.phone.trim() && !/^\+?6?0[\d\s-]{8,13}$/.test(form.phone.trim())) err.phone = "Enter a Malaysian number, e.g. +60 12-345 6789.";
    if (!passwordValid(form.password)) err.password = "Your password doesn't meet every rule yet.";
    if (form.confirm !== form.password || !form.confirm) err.confirm = "Passwords don't match.";
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    await wait(800); // mock network round trip
    const result = signUp({ name: form.name, email: form.email, phone: form.phone });
    setBusy(false);
    if (!result.ok) return setErrors({ email: result.error });
    toast.success(`Welcome aboard, ${result.name.split(" ")[0]}!`, { description: "Your account is ready. Pick areas to follow in your profile." });
    router.replace(destinationFor("public", next));
  }

  const matches = form.confirm.length > 0 && form.confirm === form.password;

  return (
    <div className="animate-rise-in">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Get alerts for the areas you travel through and report closures that look wrong.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="su-name">Full name</Label>
            <Input id="su-name" autoComplete="name" value={form.name} onChange={set("name")} placeholder="Aisyah Rahman" aria-invalid={!!errors.name} className={authInput} />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="su-phone">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input id="su-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="+60 12-345 6789" aria-invalid={!!errors.phone} className={authInput} />
            <FieldError>{errors.phone}</FieldError>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@gmail.com" aria-invalid={!!errors.email} className={authInput} />
          <FieldError>{errors.email}</FieldError>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="su-password">Password</Label>
          <PasswordInput
            id="su-password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            placeholder="Create a password"
            aria-invalid={!!errors.password}
            aria-describedby="su-rules"
          />
          <PasswordChecklist id="su-rules" password={form.password} />
          <FieldError>{errors.password}</FieldError>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="su-confirm">Confirm password</Label>
          <PasswordInput
            id="su-confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
            placeholder="Type it again"
            aria-invalid={!!errors.confirm}
          />
          <ul className="px-1 pt-0.5">
            <RuleItem ok={matches} touched={form.confirm.length > 0}>
              Passwords match
            </RuleItem>
          </ul>
          <FieldError>{errors.confirm}</FieldError>
        </div>

        <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-blue-700 text-[15px] shadow-lg shadow-blue-800/20 hover:bg-blue-800">
          {busy ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} replace className="font-semibold text-blue-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
