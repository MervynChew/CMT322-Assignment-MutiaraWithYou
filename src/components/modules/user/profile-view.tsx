"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  FileWarning,
  Info,
  LoaderCircle,
  LocateFixed,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Phone,
  Radar,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthGate } from "@/components/shared/auth-gate";
import { cn } from "@/lib/utils";
import { AREAS } from "@/lib/mock-data";
import { relativeTime } from "@/lib/time";
import type { User } from "@/lib/types";
import { useDeviceLocation } from "@/hooks/use-device-location";
import { useMinuteNow } from "@/hooks/use-now";
import { useCurrentUser, useStore } from "@/store/useStore";

/* ---------- Building blocks ---------- */

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 px-1">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">{children}</div>
    </section>
  );
}

type Tone = "blue" | "sky" | "emerald" | "green" | "indigo" | "amber" | "rose" | "slate";
const TONE: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700",
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  green: "bg-green-50 text-green-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-500",
};

function IconBubble({ icon: Icon, tone, small }: { icon: typeof Bell; tone: Tone; small?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-2xl transition-colors duration-300", small ? "size-9" : "size-11", TONE[tone])}>
      <Icon className={small ? "size-4" : "size-5"} />
    </span>
  );
}

function Row({
  icon,
  tone,
  title,
  subtitle,
  trailing,
  onClick,
  htmlFor,
}: {
  icon: typeof Bell;
  tone: Tone;
  title: string;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  htmlFor?: string;
}) {
  const inner = (
    <>
      <IconBubble icon={icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-base leading-tight font-medium text-slate-900">{title}</span>
        {subtitle && <span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span>}
      </span>
      {trailing ?? (onClick && <ChevronRight className="size-5 shrink-0 text-slate-300" />)}
    </>
  );
  const cls =
    "relative flex min-h-[4.5rem] w-full items-center gap-4 px-5 py-3.5 text-left transition-colors [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-5 [&+&]:before:left-[4.75rem] [&+&]:before:h-px [&+&]:before:bg-slate-100";
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn(cls, "hover:bg-slate-50 active:bg-slate-100")}>
        {inner}
      </button>
    );
  if (htmlFor)
    return (
      <label htmlFor={htmlFor} className={cn(cls, "cursor-pointer hover:bg-slate-50")}>
        {inner}
      </label>
    );
  return <div className={cls}>{inner}</div>;
}

function BigSwitch({ small, ...props }: React.ComponentProps<typeof Switch> & { small?: boolean }) {
  return (
    <Switch
      {...props}
      className={cn(
        "shrink-0 data-checked:bg-blue-600",
        small
          ? "data-[size=default]:h-[22px] data-[size=default]:w-[38px] [&_[data-slot=switch-thumb]]:size-[18px]! [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-[16px]!"
          : "data-[size=default]:h-[26px] data-[size=default]:w-[46px] [&_[data-slot=switch-thumb]]:size-[22px]! [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-[20px]!",
      )}
    />
  );
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ---------- Header card ---------- */

function ProfileHeader({ user, onEdit }: { user: User; onEdit: () => void }) {
  const role = useStore((s) => s.role);
  const reports = useStore((s) => s.reports);
  const filed = reports.filter((r) => r.userId === user.id).length;
  const channels = [user.notifications.email, user.notifications.whatsapp && !!user.phone, user.notifications.sms && !!user.phone].filter(Boolean).length;
  const areas = user.notifications.smartLocation ? user.subscriptions.length : 0;

  const stats = [
    { label: areas === 1 ? "Area followed" : "Areas followed", value: areas, icon: MapPin },
    { label: filed === 1 ? "Report filed" : "Reports filed", value: filed, icon: FileWarning },
    { label: "Alert channels on", value: `${channels}/3`, icon: Bell },
  ];

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-blue-900 via-blue-700 to-sky-600 p-5 text-white shadow-lg shadow-blue-900/20 sm:p-7">
      {/* Soft decoration */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
      />

      <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-blue-800 shadow-lg ring-4 ring-white/25 sm:size-20 sm:text-2xl">
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h1>
          <p className="truncate text-blue-100">{user.email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium ring-1 ring-white/20">
            {role === "admin" ? <ShieldCheck className="size-3.5" /> : <UserRound className="size-3.5" />}
            {role === "admin" ? "Administrator" : "Citizen account"}
          </span>
        </div>
        <Button onClick={onEdit} className="h-11 rounded-full bg-white px-5 text-blue-800 shadow-md hover:bg-blue-50 max-sm:w-full">
          <Pencil /> Edit name
        </Button>
      </div>

      <dl className="relative mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col-reverse justify-end rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 sm:px-4 sm:py-3">
            <dt className="mt-0.5 flex items-start gap-1.5 text-xs leading-snug text-blue-100">
              <Icon className="mt-px size-3.5 shrink-0 max-sm:hidden" /> {label}
            </dt>
            <dd className="text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Smart location: the area list unfolds under the switch ---------- */

function SmartLocations({ user }: { user: User }) {
  const roadblocks = useStore((s) => s.roadblocks);
  const toggleSubscription = useStore((s) => s.toggleSubscription);
  const setNotification = useStore((s) => s.setNotification);
  const on = user.notifications.smartLocation;
  const chosen = user.subscriptions.length;

  return (
    <Group title="Areas you follow" description="Get alerts when closures in these areas change.">
      <Row
        icon={Radar}
        tone={on ? "blue" : "slate"}
        title="Smart location alerts"
        subtitle={on ? `${chosen} area${chosen === 1 ? "" : "s"} followed` : "Turn on to choose your areas"}
        htmlFor="sw-smart"
        trailing={<BigSwitch id="sw-smart" checked={on} onCheckedChange={(v) => setNotification("smartLocation", v)} />}
      />

      <div className={cn("grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]", on ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!on}>
          <div className={cn("border-t border-slate-100 bg-slate-50/70 py-3 transition-opacity duration-500", on ? "opacity-100" : "opacity-0")}>
            {/* Indented under the switch, with a guide line, so it reads as part of it. */}
            <ul className="relative mr-3 ml-[2.6rem] border-l-2 border-blue-100 pl-2.5">
              {AREAS.map((a) => {
                const active = roadblocks.filter((r) => r.areaId === a.id && r.status === "active").length;
                const followed = user.subscriptions.includes(a.id);
                return (
                  <li key={a.id}>
                    <label
                      htmlFor={`sw-${a.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white"
                    >
                      <IconBubble icon={MapPin} tone={followed ? "sky" : "slate"} small />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-tight font-medium text-slate-900">{a.name}</span>
                        <span className={cn("block text-sm", active ? "text-amber-700" : "text-slate-500")}>
                          {active ? `${active} active closure${active > 1 ? "s" : ""}` : "No active closures"}
                        </span>
                      </span>
                      <BigSwitch small id={`sw-${a.id}`} checked={followed} onCheckedChange={() => toggleSubscription(a.id)} />
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </Group>
  );
}

/* ---------- Notification channels ---------- */

function Notifications({ user, onAddPhone }: { user: User; onAddPhone: () => void }) {
  const setNotification = useStore((s) => s.setNotification);
  const n = user.notifications;
  const hasPhone = !!user.phone;

  const phoneChannel = (key: "whatsapp" | "sms", name: string) => {
    if (!hasPhone)
      return (
        <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={onAddPhone}>
          Add phone
        </Button>
      );
    return (
      <BigSwitch
        id={`sw-${key}`}
        checked={n[key]}
        onCheckedChange={(v) => {
          setNotification(key, v);
          toast(v ? `${name} alerts on` : `${name} alerts off`, { description: v ? `Announcements will be sent to ${user.phone}.` : undefined });
        }}
      />
    );
  };

  return (
    <Group title="Notifications" description="Choose how we tell you about new announcements.">
      <Row
        icon={Mail}
        tone={n.email ? "blue" : "slate"}
        title="Email"
        subtitle={user.email}
        htmlFor="sw-email"
        trailing={<BigSwitch id="sw-email" checked={n.email} onCheckedChange={(v) => setNotification("email", v)} />}
      />
      <Row
        icon={MessageCircle}
        tone={n.whatsapp && hasPhone ? "green" : "slate"}
        title="WhatsApp"
        subtitle={hasPhone ? user.phone : "Add a phone number to get WhatsApp messages"}
        htmlFor={hasPhone ? "sw-whatsapp" : undefined}
        trailing={phoneChannel("whatsapp", "WhatsApp")}
      />
      <Row
        icon={MessageSquareText}
        tone={n.sms && hasPhone ? "indigo" : "slate"}
        title="SMS"
        subtitle={hasPhone ? `Text messages to ${user.phone}` : "Add a phone number to get text messages"}
        htmlFor={hasPhone ? "sw-sms" : undefined}
        trailing={phoneChannel("sms", "SMS")}
      />
    </Group>
  );
}

/* ---------- Real device location ---------- */

function DeviceLocation() {
  const { position, status, error, locate } = useDeviceLocation();
  const now = useMinuteNow();
  const known = position !== null;

  const subtitle =
    status === "locating"
      ? "Finding you…"
      : status === "error"
        ? error
        : known
          ? `${position.label}${position.accuracy ? ` · ±${Math.round(position.accuracy)} m` : ""}`
          : "Not shared yet. Used for nearby alerts and the 1 km reporting rule.";

  return (
    <Group title="Your location" description="Only used on this device to check what's near you.">
      <Row
        icon={LocateFixed}
        tone={known ? "sky" : status === "error" ? "rose" : "slate"}
        title={known ? "Current location" : "Share your location"}
        subtitle={
          <span className={cn(status === "error" && "text-rose-600")}>
            {subtitle}
            {known && status === "idle" && now && <span className="text-slate-400"> · updated {relativeTime(position.at, now)}</span>}
          </span>
        }
        trailing={
          <Button
            variant={known ? "outline" : "default"}
            size="sm"
            disabled={status === "locating"}
            onClick={() => void locate()}
            className={cn("h-9 shrink-0 rounded-full px-3.5", !known && "bg-blue-700 hover:bg-blue-800")}
            aria-label={known ? "Refresh location" : "Use my location"}
          >
            {status === "locating" ? <LoaderCircle className="animate-spin" /> : known ? <RefreshCw /> : <LocateFixed />}
            <span className={cn(known && "max-sm:hidden")}>{known ? "Refresh" : "Use my location"}</span>
          </Button>
        }
      />
    </Group>
  );
}

/* ---------- Edit dialog ---------- */

type EditKey = "name" | "email" | "phone";
const EDIT_META: Record<EditKey, { label: string; type: string; hint: string; validate: (v: string) => string | null }> = {
  name: {
    label: "Your name",
    type: "text",
    hint: "Shown on your reports and in your account menu.",
    validate: (v) => (v.trim().length < 2 ? "Enter your name." : null),
  },
  email: {
    label: "Email address",
    type: "email",
    hint: "Used for announcement emails and report follow-ups.",
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address."),
  },
  phone: {
    label: "Phone number",
    type: "tel",
    hint: "Used for WhatsApp and SMS alerts, if you turn them on.",
    validate: (v) => (/^\+?6?0[\d\s-]{8,13}$/.test(v.trim()) ? null : "Enter a Malaysian number, e.g. +60 12-345 6789."),
  },
};

function EditDialog({ field, user, onClose }: { field: EditKey | null; user: User; onClose: () => void }) {
  const updateUser = useStore((s) => s.updateUser);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const meta = field ? EDIT_META[field] : null;

  return (
    <Dialog
      open={field !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="rounded-[28px] p-6 sm:max-w-md"
        onOpenAutoFocus={() => {
          setValue(field ? user[field] : "");
          setError(null);
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{meta?.label}</DialogTitle>
          <DialogDescription>{meta?.hint}</DialogDescription>
        </DialogHeader>
        <form
          id="edit-profile"
          onSubmit={(e) => {
            e.preventDefault();
            if (!field || !meta) return;
            const err = meta.validate(value);
            if (err) return setError(err);
            updateUser(user.id, { [field]: value.trim() });
            toast.success(`${meta.label} updated`);
            onClose();
          }}
          className="space-y-2"
        >
          <Label htmlFor="edit-value" className="sr-only">
            {meta?.label}
          </Label>
          <Input
            id="edit-value"
            type={meta?.type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            className="h-12 rounded-2xl text-base"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="ghost" className="h-11 flex-1 rounded-full text-blue-700">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="edit-profile" className="h-11 flex-1 rounded-full bg-blue-700 hover:bg-blue-800">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Page ---------- */

function ProfileContent() {
  const router = useRouter();
  const user = useCurrentUser();
  const signOut = useStore((s) => s.signOut);
  const [editing, setEditing] = useState<EditKey | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProfileHeader user={user} onEdit={() => setEditing("name")} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <Group title="Account details">
            <Row icon={UserRound} tone="blue" title="Name" subtitle={user.name} onClick={() => setEditing("name")} />
            <Row icon={Mail} tone="blue" title="Email" subtitle={user.email} onClick={() => setEditing("email")} />
            <Row icon={Phone} tone="emerald" title="Phone number" subtitle={user.phone || "Not added"} onClick={() => setEditing("phone")} />
          </Group>

          <Notifications user={user} onAddPhone={() => setEditing("phone")} />
          <DeviceLocation />
          <Group title="More">
            <Row icon={Info} tone="blue" title="About Mutiara with you" subtitle="Live Mutiara LRT closures, detours and alerts for Penang" />
            <Row
              icon={LogOut}
              tone="rose"
              title="Sign out"
              subtitle="You can sign back in at any time"
              onClick={() => {
                signOut();
                router.push("/");
                toast("Signed out", { description: "See you again soon." });
              }}
            />
          </Group>
        </div>

        <div className="space-y-6">
          <SmartLocations user={user} />
        </div>
      </div>

      <EditDialog field={editing} user={user} onClose={() => setEditing(null)} />
    </div>
  );
}

export function ProfileView() {
  return (
    <AuthGate
      title="Your profile is waiting"
      description="Sign in to manage your account, area alerts and location."
      perks={[
        "Follow the areas you travel through",
        "Get announcements by email, WhatsApp or SMS",
        "Keep your report history in one place",
      ]}
    >
      <ProfileContent />
    </AuthGate>
  );
}
