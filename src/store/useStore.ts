"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildSeed,
  CURRENT_USER_ID,
  ADMIN_USER_ID,
  SEED_BASE,
} from "@/lib/mock-data";
import type {
  ActivityItem,
  Announcement,
  PendingAnnouncement,
  LatLng,
  PendingChange,
  Report,
  ReportEntry,
  ReportLogEntry,
  Role,
  Roadblock,
  TravelMode,
  User,
} from "@/lib/types";

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Where the viewer is, from their device (used for the 1 km reporting rule). */
export type UserPosition = LatLng & { label: string; accuracy?: number; at: string };

type NewChange =
  | { kind: "add"; roadblock: Roadblock }
  | { kind: "edit"; roadblock: Roadblock }
  | { kind: "remove"; roadblock: Roadblock };

type State = {
  /** True once the seed has been shifted to the viewer's current date. */
  seeded: boolean;
  /** True once the saved session has been read from the browser (avoids a guest flash). */
  sessionReady: boolean;
  role: Role;
  /** Signed-in account, or null for a guest. */
  sessionUserId: string | null;
  /** Kinds of traffic the public map and feed show roadblocks for. */
  modeFilter: TravelMode[];
  /** When the viewer last opened the announcements list (drives the unread badge). */
  announcementsSeenAt: string | null;
  users: User[];
  roadblocks: Roadblock[];
  reports: Report[];
  announcements: Announcement[];
  pendingChanges: PendingChange[];
  /** Announcements drafted in the Post tab; published on Post / Confirm. */
  pendingAnnouncements: PendingAnnouncement[];
  activity: ActivityItem[];
  /** Viewer position used for the 1 km reporting rule (unknown until they share it). */
  position: UserPosition | null;
};

export type SignUpInput = { name: string; email: string; phone?: string };
export type AuthResult = { ok: true; role: Role; name: string } | { ok: false; error: string };

type Actions = {
  rebaseSeed: () => void;

  /** Mock sign in: any password is accepted for an email that has an account. */
  signIn: (email: string) => AuthResult;
  /** Mock sign up: creates a citizen account and signs it in. */
  signUp: (input: SignUpInput) => AuthResult;
  signOut: () => void;

  setModeFilter: (modes: TravelMode[]) => void;
  markAnnouncementsSeen: () => void;

  updateUser: (id: string, patch: Partial<Omit<User, "id">>) => void;
  toggleSubscription: (areaId: string) => void;
  setNotification: (key: keyof User["notifications"], value: boolean) => void;

  queueChange: (change: NewChange) => void;
  discardChange: (id: string) => void;
  clearChanges: () => void;
  /** Publishes queued roadblock changes and announcements together. */
  commitChanges: () => { roadblocks: number; announcements: number };
  queueAnnouncement: (a: Omit<PendingAnnouncement, "id">) => void;
  discardPendingAnnouncement: (id: string) => void;

  createReport: (roadblockId: string, entry: Omit<ReportEntry, "at">) => string;
  appendToReport: (reportId: string, entry: Omit<ReportEntry, "at">) => void;
  /** Marks a report viewed / pending review, recording which admin did it. */
  setReportViewed: (reportId: string, viewed: boolean) => void;
  /** Adds / removes a report from the admin focus list, recording which admin did it. */
  setReportFocus: (reportIds: string[], focused: boolean) => void;

  addAnnouncement: (a: Omit<Announcement, "id" | "date" | "author">) => void;
  updateAnnouncement: (id: string, patch: Partial<Omit<Announcement, "id">>) => void;
  removeAnnouncement: (id: string) => void;

  setPosition: (p: UserPosition | null) => void;
};

export type Store = State & Actions;

const seed = buildSeed(0);
const ALL_MODES: TravelMode[] = ["car", "motorcycle", "pedestrian"];
const normalEmail = (e: string) => e.trim().toLowerCase();

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      seeded: false,
      sessionReady: false,
      role: "guest",
      sessionUserId: null,
      modeFilter: ALL_MODES,
      announcementsSeenAt: null,
      ...seed,
      pendingChanges: [],
      pendingAnnouncements: [],
      position: null,

      rebaseSeed: () => {
        if (get().seeded) return;
        // The seed is written as if it were 11:00 on SEED_BASE; move it so that moment is right now.
        // Shifting by the exact time (not whole days) keeps "today" events in the past at any hour,
        // so nothing reads "in 9h" first thing in the morning.
        const seedNow = new Date(`${SEED_BASE}T11:00:00+08:00`).getTime();
        const shift = (Date.now() - seedNow) / 86_400_000;
        // Accounts carry no dates, and may hold sign-ups / profile edits restored from the browser.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { users, ...dated } = buildSeed(shift);
        set({ seeded: true, ...dated });
      },

      signIn: (email) => {
        const user = get().users.find((u) => normalEmail(u.email) === normalEmail(email));
        if (!user) return { ok: false, error: "No account uses that email. Check it or create an account." };
        const role: Role = user.id === ADMIN_USER_ID ? "admin" : "public";
        set({ role, sessionUserId: user.id });
        return { ok: true, role, name: user.name };
      },

      signUp: ({ name, email, phone }) => {
        if (get().users.some((u) => normalEmail(u.email) === normalEmail(email)))
          return { ok: false, error: "An account with this email already exists. Sign in instead." };
        const user: User = {
          id: uid("u"),
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() ?? "",
          subscriptions: [],
          notifications: { email: true, whatsapp: false, sms: false, smartLocation: false },
        };
        set((s) => ({ users: [...s.users, user], role: "public", sessionUserId: user.id }));
        return { ok: true, role: "public", name: user.name };
      },

      signOut: () => set({ role: "guest", sessionUserId: null }),

      setModeFilter: (modes) => set({ modeFilter: modes.length ? modes : ALL_MODES }),
      markAnnouncementsSeen: () => set({ announcementsSeenAt: new Date().toISOString() }),

      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

      toggleSubscription: (areaId) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === s.sessionUserId
              ? {
                  ...u,
                  subscriptions: u.subscriptions.includes(areaId)
                    ? u.subscriptions.filter((x) => x !== areaId)
                    : [...u.subscriptions, areaId],
                }
              : u,
          ),
        })),

      setNotification: (key, value) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === s.sessionUserId ? { ...u, notifications: { ...u.notifications, [key]: value } } : u,
          ),
        })),

      queueChange: (change) =>
        set((s) => {
          const at = new Date().toISOString();
          const id = change.roadblock.id;
          const existing = s.pendingChanges.find((c) => c.roadblock.id === id);
          let pending = s.pendingChanges;

          if (existing) {
            // Collapse multiple edits to the same roadblock into one receipt line.
            if (existing.kind === "add") {
              pending =
                change.kind === "remove"
                  ? pending.filter((c) => c !== existing)
                  : pending.map((c) => (c === existing ? { ...existing, roadblock: change.roadblock, at } : c));
              return { pendingChanges: pending };
            }
            if (existing.kind === "edit") {
              pending = pending.map((c) =>
                c === existing
                  ? change.kind === "remove"
                    ? { id: existing.id, kind: "remove", at, roadblock: existing.before }
                    : { ...existing, roadblock: change.roadblock, at }
                  : c,
              );
              return { pendingChanges: pending };
            }
            return {}; // already queued for removal
          }

          if (change.kind === "edit") {
            const before = s.roadblocks.find((r) => r.id === id);
            if (!before) return {};
            return { pendingChanges: [...pending, { id: uid("chg"), kind: "edit", at, roadblock: change.roadblock, before }] };
          }
          return { pendingChanges: [...pending, { id: uid("chg"), at, ...change }] };
    }),

  discardChange: (id) => set((s) => ({ pendingChanges: s.pendingChanges.filter((c) => c.id !== id) })),
  clearChanges: () => set({ pendingChanges: [], pendingAnnouncements: [] }),

  queueAnnouncement: (a) => set((s) => ({ pendingAnnouncements: [...s.pendingAnnouncements, { ...a, id: uid("an") }] })),
  discardPendingAnnouncement: (id) =>
    set((s) => ({ pendingAnnouncements: s.pendingAnnouncements.filter((a) => a.id !== id) })),

  commitChanges: () => {
    const { pendingChanges, pendingAnnouncements, roadblocks } = get();
    const now = new Date().toISOString();
    let next = [...roadblocks];
    const log: ActivityItem[] = [];
    for (const c of pendingChanges) {
      if (c.kind === "add") next.push({ ...c.roadblock, lastUpdated: now });
      if (c.kind === "edit")
        next = next.map((r) => (r.id === c.roadblock.id ? { ...c.roadblock, lastUpdated: now } : r));
      if (c.kind === "remove") next = next.filter((r) => r.id !== c.roadblock.id);
      const verb = c.kind === "add" ? "Added" : c.kind === "edit" ? "Updated" : "Removed";
      log.push({ id: uid("ac"), at: now, kind: "post", text: `${verb} ${c.roadblock.road}` });
    }
    const published: Announcement[] = pendingAnnouncements.map((a) => ({ ...a, date: now, author: "Mutiara Line Ops" }));
    for (const a of published) log.push({ id: uid("ac"), at: now, kind: "announcement", text: `Published “${a.title}”` });
    set((s) => ({
      roadblocks: next,
      pendingChanges: [],
      pendingAnnouncements: [],
      announcements: [...published.reverse(), ...s.announcements],
      activity: [...log.reverse(), ...s.activity],
    }));
    return { roadblocks: pendingChanges.length, announcements: pendingAnnouncements.length };
  },

  createReport: (roadblockId, entry) => {
    const max = Math.max(...get().reports.map((r) => Number(r.id.replace("RPT-", "")) || 0), 1000);
    const id = `RPT-${max + 1}`;
    const at = new Date().toISOString();
    const report: Report = {
      id,
      roadblockId,
      userId: get().sessionUserId ?? CURRENT_USER_ID,
      createdAt: at,
      viewed: false,
      entries: [{ ...entry, at }],
    };
    set((s) => ({
      reports: [report, ...s.reports],
      activity: [{ id: uid("ac"), at, kind: "report", text: `New report ${id}` }, ...s.activity],
    }));
    return id;
  },

  appendToReport: (reportId, entry) =>
    set((s) => ({
      reports: s.reports.map((r) =>
        r.id === reportId ? { ...r, entries: [...r.entries, { ...entry, at: new Date().toISOString() }] } : r,
      ),
    })),

  setReportViewed: (reportId, viewed) =>
    set((s) => {
      const report = s.reports.find((r) => r.id === reportId);
      if (!report || report.viewed === viewed) return {};
      const entry = logEntry(s, viewed ? "viewed" : "unviewed");
      return {
        reports: s.reports.map((r) => (r.id === reportId ? { ...r, viewed, log: [...(r.log ?? []), entry] } : r)),
        activity: viewed
          ? [{ id: uid("ac"), at: entry.at, kind: "review", text: `${entry.adminName} reviewed ${reportId}` }, ...s.activity]
          : s.activity,
      };
    }),

  setReportFocus: (reportIds, focused) =>
    set((s) => {
      const ids = new Set(reportIds.filter((id) => s.reports.some((r) => r.id === id && !!r.focused !== focused)));
      if (!ids.size) return {};
      const entry = logEntry(s, focused ? "focused" : "unfocused");
      return {
        reports: s.reports.map((r) => (ids.has(r.id) ? { ...r, focused, log: [...(r.log ?? []), entry] } : r)),
        activity: focused
          ? [{ id: uid("ac"), at: entry.at, kind: "review", text: `${entry.adminName} added ${[...ids].join(", ")} to focus` }, ...s.activity]
          : s.activity,
      };
    }),

  addAnnouncement: (a) =>
    set((s) => {
      const date = new Date().toISOString();
      return {
        announcements: [{ ...a, id: uid("an"), date, author: "Mutiara Line Ops" }, ...s.announcements],
        activity: [{ id: uid("ac"), at: date, kind: "announcement", text: `Published “${a.title}”` }, ...s.activity],
      };
    }),

  updateAnnouncement: (id, patch) =>
    set((s) => ({ announcements: s.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

  removeAnnouncement: (id) => set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) })),

  setPosition: (position) => set({ position }),
    }),
    {
      name: "mutiara-with-you",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Read in <Providers> after hydration so the server HTML and first client render agree.
      skipHydration: true,
      partialize: (s) => ({
        role: s.role,
        sessionUserId: s.sessionUserId,
        users: s.users,
        modeFilter: s.modeFilter,
        announcementsSeenAt: s.announcementsSeenAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        // Accounts saved by an older version may miss newer notification settings.
        const users = (p.users?.length ? p.users : current.users).map((u) => ({
          ...u,
          notifications: {
            email: true,
            whatsapp: false,
            sms: false,
            smartLocation: false,
            ...(u.notifications as Partial<User["notifications"]>),
          },
        }));
        const signedIn = !!p.sessionUserId && users.some((u) => u.id === p.sessionUserId);
        return {
          ...current,
          users,
          modeFilter: p.modeFilter?.length ? p.modeFilter : current.modeFilter,
          announcementsSeenAt: p.announcementsSeenAt ?? null,
          sessionUserId: signedIn ? p.sessionUserId! : null,
          role: signedIn ? (p.role ?? "public") : "guest",
        };
      },
    },
  ),
);

// ---------- Selectors & derived helpers ----------

/** Log line attributed to the signed-in admin. */
function logEntry(s: State, action: ReportLogEntry["action"]): ReportLogEntry {
  const admin = s.users.find((u) => u.id === ADMIN_USER_ID);
  return { at: new Date().toISOString(), action, adminId: ADMIN_USER_ID, adminName: admin?.name ?? "Admin" };
}

/** Placeholder shown (blurred) behind the sign-in prompt for guests. */
const GUEST_PREVIEW: User = {
  id: "guest",
  name: "Your Name",
  email: "you@gmail.com",
  phone: "+60 12-000 0000",
  subscriptions: ["bayan-baru", "sungai-nibong"],
  notifications: { email: true, whatsapp: true, sms: false, smartLocation: true },
};

export const useCurrentUser = () =>
  useStore((s) => s.users.find((u) => u.id === s.sessionUserId) ?? GUEST_PREVIEW);

/** Reports belong to this id (the demo citizen's id while signed out, for previews). */
export const useSessionUserId = () => useStore((s) => s.sessionUserId ?? CURRENT_USER_ID);

/** Roadblocks as they would look after the admin's queued (uncommitted) changes. */
export function applyPending(roadblocks: Roadblock[], pending: PendingChange[]): Roadblock[] {
  let next = [...roadblocks];
  for (const c of pending) {
    if (c.kind === "add") next.push(c.roadblock);
    if (c.kind === "edit") next = next.map((r) => (r.id === c.roadblock.id ? c.roadblock : r));
    if (c.kind === "remove") next = next.filter((r) => r.id !== c.roadblock.id);
  }
  return next;
}

export const newRoadblockId = () => uid("rb");
export const newSegmentId = () => uid("seg");
