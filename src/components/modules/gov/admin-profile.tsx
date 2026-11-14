"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bell,
  Check,
  ClipboardList,
  KeyRound,
  LogOut,
  MapPinned,
  Megaphone,
  Pencil,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCurrentUser, useStore } from "@/store/useStore";
import { AdminPageHeader, Panel } from "./admin-shell";

const PERMISSIONS = [
  { label: "Post & edit roadblocks", granted: true, icon: MapPinned },
  { label: "Publish announcements", granted: true, icon: Megaphone },
  { label: "Review citizen reports", granted: true, icon: ClipboardList },
  { label: "Manage admin accounts", granted: false, icon: UserCog },
];

export function AdminProfile() {
  const router = useRouter();
  const user = useCurrentUser();
  const activity = useStore((s) => s.activity);
  const updateUser = useStore((s) => s.updateUser);
  const setNotification = useStore((s) => s.setNotification);
  const signOut = useStore((s) => s.signOut);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });

  const counts = {
    post: activity.filter((a) => a.kind === "post").length,
    announcement: activity.filter((a) => a.kind === "announcement").length,
    review: activity.filter((a) => a.kind === "review").length,
  };

  const prefs = [{ key: "email" as const, title: "Email me new citizen reports", desc: `An email to ${user.email} for each new report`, icon: Bell }];

  return (
    <>
      <AdminPageHeader eyebrow="Profile" title="Admin profile" description="Your operator account, permissions and alert preferences." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <Panel bodyClassName="p-0">
            <div className="flex items-center gap-4 p-6">
              <Avatar className="size-20 ring-4 ring-blue-50">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-semibold text-white">OA</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xl font-semibold">
                  {user.name} <BadgeCheck className="size-5 text-blue-600" />
                </p>
                <p className="text-sm text-slate-500">Administrator · Mutiara Line Ops</p>
                <p className="mt-1 font-mono text-xs text-slate-400">Staff ID MLO-0042</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setForm({ name: user.name, email: user.email, phone: user.phone });
                  setEditing(true);
                }}
              >
                <Pencil /> Edit
              </Button>
            </div>
            <dl className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <dt className="text-xs text-slate-500">Work email</dt>
                <dd className="mt-0.5 truncate font-medium">{user.email}</dd>
              </div>
              <div className="p-4">
                <dt className="text-xs text-slate-500">Phone</dt>
                <dd className="mt-0.5 font-medium">{user.phone}</dd>
              </div>
            </dl>
          </Panel>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Posts", value: counts.post, icon: MapPinned, cls: "bg-blue-50 text-blue-700" },
              { label: "Announcements", value: counts.announcement, icon: Megaphone, cls: "bg-indigo-50 text-indigo-700" },
              { label: "Reviews", value: counts.review, icon: ClipboardList, cls: "bg-emerald-50 text-emerald-700" },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <span className={cn("flex size-8 items-center justify-center rounded-xl", s.cls)}>
                  <s.icon className="size-4" />
                </span>
                <p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <Panel title="Security" icon={KeyRound}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-slate-600">Two-factor authentication</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Enabled</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-600">Session</span>
                <span className="text-xs text-slate-500">This browser · signed in now</span>
              </li>
            </ul>
            <Button
              variant="destructive"
              className="mt-4 w-full rounded-full"
              onClick={() => {
                signOut();
                router.push("/");
                toast("Signed out of the operations console");
              }}
            >
              <LogOut /> Sign out of console
            </Button>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Permissions" icon={ShieldCheck}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <li
                  key={p.label}
                  className={cn("flex items-center gap-3 rounded-2xl border p-3 text-sm", p.granted ? "border-blue-100 bg-blue-50/40" : "border-dashed border-slate-200 text-slate-400")}
                >
                  <p.icon className={cn("size-4", p.granted ? "text-blue-700" : "text-slate-300")} />
                  <span className="flex-1">{p.label}</span>
                  {p.granted ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-slate-300" />}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Alert preferences" icon={Bell} bodyClassName="p-0">
            <ul className="divide-y divide-slate-100">
              {prefs.map((p) => (
                <li key={p.key}>
                  <label htmlFor={`pref-${p.key}`} className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-blue-50/40">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <p.icon className="size-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{p.title}</span>
                      <span className="block text-xs text-slate-500">{p.desc}</span>
                    </span>
                    <Switch id={`pref-${p.key}`} checked={user.notifications[p.key]} onCheckedChange={(v) => setNotification(p.key, v)} className="data-checked:bg-blue-600" />
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit admin profile</DialogTitle>
            <DialogDescription>Shown on announcements and in the audit trail.</DialogDescription>
          </DialogHeader>
          <form
            id="admin-profile"
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.name.trim().length < 2) return toast.error("Enter a name.");
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("Enter a valid email.");
              updateUser(user.id, { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
              setEditing(false);
              toast.success("Profile updated");
            }}
          >
            {(["name", "email", "phone"] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`ap-${k}`} className="capitalize">{k}</Label>
                <Input id={`ap-${k}`} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="h-10 rounded-xl" />
              </div>
            ))}
          </form>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" form="admin-profile" className="rounded-full bg-blue-700 hover:bg-blue-800">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
