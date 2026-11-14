"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ClipboardList,
  FileWarning,
  Home,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Map,
  Megaphone,
  MapPinned,
  ShieldCheck,
  User,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser, useStore } from "@/store/useStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnnouncementsMenu } from "./announcements-menu";

type Tab = { href: string; label: string; short?: string; icon: typeof Home; exact?: boolean };

const PUBLIC_TABS: Tab[] = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/map", label: "Map", icon: Map },
  { href: "/reports", label: "Reports", icon: FileWarning },
  { href: "/profile", label: "Profile", icon: User },
];

const ADMIN_TABS: Tab[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/post", label: "Post", icon: MapPinned },
  { href: "/admin/announcements", label: "Announcements", short: "Notices", icon: Megaphone },
  { href: "/admin/reports", label: "Reports", icon: ClipboardList },
  { href: "/admin/profile", label: "Profile", icon: UserCog },
];

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

function useNav() {
  const pathname = usePathname();
  const role = useStore((s) => s.role);
  const admin = role === "admin";
  // The tab tapped last, shown as active straight away so the pill starts moving on click
  // instead of waiting for the next page to arrive.
  const [pending, setPending] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setPending(null);
  }
  const current = pending ?? pathname;
  const tabs = (admin ? ADMIN_TABS : PUBLIC_TABS).map((t) => ({
    ...t,
    active: t.exact ? current === t.href : current.startsWith(t.href),
    /** The page actually showing (for screen readers), even while the next one loads. */
    here: t.exact ? pathname === t.href : pathname.startsWith(t.href),
    locked: role === "guest" && (t.href === "/reports" || t.href === "/profile"),
  }));
  /** Click handler for a tab link: plain left clicks mark it active right away. */
  const pick = (href: string) => (e: React.MouseEvent) => {
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && href !== pathname) setPending(href);
  };
  return { pathname, role, admin, tabs, pick };
}

/**
 * Slides a pill under the active item of a list. Positions are written straight
 * to the element (no React state), and the first placement skips the transition
 * so the pill doesn't fly in from the left on page load.
 */
function useSlidingPill(activeKey: string) {
  const listRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const place = (animate: boolean) => {
      const target = list.querySelector<HTMLElement>('[data-active="true"] [data-pill-anchor]');
      if (!target) {
        pill.style.opacity = "0";
        return;
      }
      const l = list.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      // Only slide from a visible position; a hidden pill appears in place.
      if (pill.style.opacity !== "1") animate = false;
      if (!animate) pill.style.transition = "none";
      pill.style.width = `${t.width}px`;
      pill.style.height = `${t.height}px`;
      pill.style.transform = `translate(${t.left - l.left - list.clientLeft}px, ${t.top - l.top - list.clientTop}px)`;
      pill.style.opacity = "1";
      if (!animate) {
        void pill.offsetWidth; // commit the jump before restoring the transition
        pill.style.transition = "";
      }
    };

    place(placed.current);
    placed.current = true;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeKey]);

  return { listRef, pillRef };
}

/** Faint pill that follows the pointer across the tabs. */
function useHoverPill() {
  const hoverRef = useRef<HTMLSpanElement>(null);
  const show = (e: React.PointerEvent<HTMLElement>) => {
    const pill = hoverRef.current;
    const list = e.currentTarget.closest("ul");
    if (!pill || !list) return;
    const l = list.getBoundingClientRect();
    const t = e.currentTarget.getBoundingClientRect();
    const wasHidden = pill.style.opacity !== "1";
    if (wasHidden) pill.style.transition = "opacity 150ms";
    pill.style.width = `${t.width}px`;
    pill.style.height = `${t.height}px`;
    pill.style.transform = `translate(${t.left - l.left - list.clientLeft}px, ${t.top - l.top - list.clientTop}px)`;
    pill.style.opacity = "1";
    if (wasHidden) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  };
  const hide = () => {
    if (hoverRef.current) hoverRef.current.style.opacity = "0";
  };
  return { hoverRef, show, hide };
}

const PILL_MOTION = "transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

function Logo({ admin }: { admin: boolean }) {
  const reveal = "grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity,margin] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";
  const open = "group-hover/logo:grid-cols-[1fr] group-hover/logo:opacity-100 group-hover/logo:ml-2.5 group-focus-visible/logo:grid-cols-[1fr] group-focus-visible/logo:opacity-100 group-focus-visible/logo:ml-2.5";
  return (
    <Link
      href={admin ? "/admin" : "/"}
      aria-label="Mutiara with you, home"
      className={cn(
        "group/logo flex h-10 shrink-0 items-center rounded-full p-0.5 pr-0.5 transition-[padding,background-color,box-shadow] duration-500 hover:pr-4 focus-visible:pr-4 focus-visible:outline-none",
        admin ? "hover:bg-white/10" : "hover:bg-white hover:shadow-[0_4px_16px_-6px_rgb(30_64_175/0.35)]",
      )}
    >
      <Image
        src="/logo/logo.png"
        alt=""
        width={36}
        height={36}
        loading="eager"
        className="size-9 rounded-[11px] shadow-md shadow-blue-900/25 transition-transform duration-500 group-hover/logo:-rotate-6 group-active/logo:scale-95"
      />
      <span className={cn(reveal, open)}>
        <span className="overflow-hidden text-[15px] whitespace-nowrap">
          <span className={cn("font-bold tracking-tight", admin ? "text-white" : "text-slate-900")}>Mutiara</span>{" "}
          <span className={cn("font-medium", admin ? "text-blue-200" : "bg-linear-to-r from-blue-700 to-sky-500 bg-clip-text text-transparent")}>
            with you
          </span>
        </span>
      </span>
    </Link>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Sign-in button for guests, account menu once signed in. */
function AccountButton({ admin }: { admin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useStore((s) => s.role);
  const ready = useStore((s) => s.sessionReady);
  const signOut = useStore((s) => s.signOut);
  const user = useCurrentUser();

  if (!ready) return <span aria-hidden className="h-10 w-24 rounded-full bg-slate-900/5" />;

  if (role === "guest") {
    const onAuthPage = AUTH_ROUTES.includes(pathname);
    const next = onAuthPage || pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/sign-in${next}`}
        className={cn(
          "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-sm transition-[background-color,box-shadow,transform] duration-200 active:scale-95",
          onAuthPage
            ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200"
            : "bg-blue-700 text-white shadow-blue-800/30 hover:bg-blue-800 hover:shadow-md",
        )}
      >
        <LogIn className="size-4" /> Sign in
      </Link>
    );
  }

  const firstName = user.name.split(" ")[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "group flex h-10 shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium shadow-sm ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          admin ? "bg-white/10 text-white ring-white/10 hover:bg-white/15" : "bg-white/70 text-slate-700 ring-white/70 hover:bg-white",
        )}
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-xs font-bold text-white",
            admin ? "bg-linear-to-br from-sky-400 to-blue-600" : "bg-linear-to-br from-blue-500 to-blue-800",
          )}
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{firstName}</span>
        <ChevronDown className="size-4 opacity-60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="z-[60] w-64 rounded-2xl p-1.5">
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
          <span className="block truncate text-xs font-normal text-slate-500">{user.email}</span>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
            {admin ? <ShieldCheck className="size-3" /> : <User className="size-3" />}
            {admin ? "Administrator" : "Citizen account"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {admin ? (
          <>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link href="/admin"><LayoutDashboard /> Operations dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link href="/admin/profile"><UserCog /> Admin profile</Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link href="/profile"><User /> Profile &amp; alerts</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link href="/reports?tab=mine"><FileWarning /> My reports</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="rounded-xl"
          onSelect={() => {
            signOut();
            router.push("/");
            toast("Signed out", { description: "See you again soon." });
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const subscribeScroll = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};

/** True once the page has scrolled a little (the glass firms up so text behind it can't distract). */
function useScrolled() {
  return useSyncExternalStore(subscribeScroll, () => window.scrollY > 8, () => false);
}

/** Top bar: logo and tabs on the left, announcements and account on the right. */
export function Navbar() {
  const { pathname, admin, tabs, pick } = useNav();
  const activeKey = `${admin}|${tabs.find((t) => t.active)?.href ?? ""}`;
  const { listRef, pillRef } = useSlidingPill(activeKey);
  const { hoverRef, show, hide } = useHoverPill();
  const scrolled = useScrolled();
  const home = pathname === "/";
  const overMap = pathname === "/map";

  return (
    // Its own view-transition name keeps the bar still (and its pill sliding) while pages cross-fade.
    <header className="pointer-events-none fixed inset-x-0 top-3 z-[45] flex justify-center px-3" style={{ viewTransitionName: "site-nav" }}>
      <nav
        aria-label="Main"
        className={cn(
          // Frosted glass: translucent, blurred and slightly saturated, with a bright top edge.
          "pointer-events-auto flex w-full max-w-5xl items-center gap-2 rounded-full border p-1.5 ring-1 backdrop-saturate-150 transition-[background-color,box-shadow] duration-500",
          // Lighter blur over the map: the browser re-blurs on every frame it pans.
          overMap ? "backdrop-blur-md" : "backdrop-blur-xl",
          admin
            ? cn(
                "border-white/10 shadow-[0_8px_32px_-8px_rgb(2_6_23/0.6),inset_0_1px_0_rgb(255_255_255/0.08)] ring-white/5",
                scrolled ? "bg-slate-900/85" : "bg-slate-900/70",
              )
            : cn(
                "border-white/70 shadow-[0_10px_36px_-12px_rgb(30_64_175/0.35),inset_0_1px_0_rgb(255_255_255/0.9)] ring-slate-900/5",
                scrolled || overMap ? "bg-white/75" : "bg-white/50",
              ),
        )}
      >
        <Logo admin={admin} />

        {/* Desktop / tablet tabs sit right next to the logo */}
        <ul
          ref={listRef}
          onPointerLeave={hide}
          className={cn("relative hidden items-center gap-0.5 rounded-full p-1 md:flex", admin ? "bg-white/5" : "bg-slate-900/[0.04]")}
        >
          <span
            ref={hoverRef}
            aria-hidden
            className={cn("pointer-events-none absolute top-0 left-0 rounded-full opacity-0", PILL_MOTION, admin ? "bg-white/10" : "bg-white shadow-sm")}
          />
          <span
            ref={pillRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-0 left-0 rounded-full opacity-0",
              PILL_MOTION,
              admin ? "bg-white shadow-sm" : "bg-blue-700 shadow-md shadow-blue-800/30",
            )}
          />
          {tabs.map(({ href, label, icon: Icon, active, here, locked }) => (
            <li key={href} data-active={active} className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    transitionTypes={["nav"]}
                    onClick={pick(href)}
                    data-pill-anchor
                    aria-current={here ? "page" : undefined}
                    onPointerEnter={show}
                    className={cn(
                      "relative flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-300",
                      admin
                        ? active
                          ? "text-slate-900"
                          : "text-slate-300 hover:text-white"
                        : active
                          ? "text-white"
                          : "text-slate-600 hover:text-blue-800",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className={cn(admin && "hidden lg:inline")}>{label}</span>
                    {locked && <Lock className={cn("size-3 transition-colors", active ? "text-blue-200" : "text-slate-400")} />}
                  </Link>
                </TooltipTrigger>
                {admin && <TooltipContent className="lg:hidden">{label}</TooltipContent>}
              </Tooltip>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {/* Large screens show announcements beside the home page; everywhere else they open from here. */}
          {!admin && <AnnouncementsMenu className={cn(home && "lg:hidden")} />}
          <AccountButton admin={admin} />
        </div>
      </nav>
    </header>
  );
}

/** Phones: tabs move to a thumb-friendly bar at the bottom of the screen. */
export function MobileTabBar() {
  const { pathname, admin, tabs, pick } = useNav();
  const activeKey = `${admin}|${tabs.find((t) => t.active)?.href ?? ""}`;
  const { listRef, pillRef } = useSlidingPill(activeKey);
  // Full-screen pages (the map) let the bar float over the content; others get a spacer.
  const fullBleed = pathname === "/map";

  return (
    <>
      {!fullBleed && <div aria-hidden className="h-20 md:hidden" />}
      <nav
        aria-label="Main"
        style={{ viewTransitionName: "site-tabs" }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] flex justify-center px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] md:hidden"
      >
        <ul
          ref={listRef}
          className={cn(
            "pointer-events-auto relative grid w-full max-w-md gap-1 rounded-[1.6rem] p-1.5 ring-1",
            tabs.length === 5 ? "grid-cols-5" : "grid-cols-4",
            admin
              ? "border border-white/10 bg-slate-900/95 shadow-[0_8px_32px_-8px_rgb(2_6_23/0.7)] ring-white/5"
              : "border border-white/70 bg-white/95 shadow-[0_8px_32px_-6px_rgb(30_64_175/0.3)] ring-black/5",
          )}
        >
          <span
            ref={pillRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-0 left-0 rounded-full opacity-0",
              PILL_MOTION,
              admin ? "bg-white" : "bg-blue-700 shadow-sm shadow-blue-800/30",
            )}
          />
          {tabs.map(({ href, label, short, icon: Icon, active, here, locked }) => (
            <li key={href} data-active={active} className="min-w-0">
              <Link
                href={href}
                transitionTypes={["nav"]}
                onClick={pick(href)}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-medium transition-colors duration-300",
                  admin ? (active ? "text-white" : "text-slate-400") : active ? "text-blue-800" : "text-slate-500",
                )}
              >
                <span
                  data-pill-anchor
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300",
                    active && (admin ? "text-slate-900" : "text-white"),
                  )}
                >
                  <Icon className="size-[18px]" />
                  {locked && (
                    <span className="absolute -top-0.5 right-1.5 flex size-3.5 items-center justify-center rounded-full bg-slate-200 text-slate-500 ring-2 ring-white">
                      <Lock className="size-2" />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center">{short ?? label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
