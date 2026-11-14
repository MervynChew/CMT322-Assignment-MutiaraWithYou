"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnnouncementDialog } from "@/components/shared/announcement-dialog";
import { AnnouncementList, AnnouncementsHeader } from "@/components/modules/dashboard/announcements-sidebar";
import { useStore } from "@/store/useStore";

/** Navbar button that drops the announcement list down from the top bar. */
export function AnnouncementsMenu({ className }: { className?: string }) {
  const announcements = useStore((s) => s.announcements);
  const seenAt = useStore((s) => s.announcementsSeenAt);
  const ready = useStore((s) => s.sessionReady);
  const markSeen = useStore((s) => s.markAnnouncementsSeen);
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const unread = ready ? announcements.filter((a) => !seenAt || a.date > seenAt).length : 0;
  const viewing = announcements.find((a) => a.id === openId) ?? null;

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) markSeen();
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={unread ? `Announcements, ${unread} new` : "Announcements"}
            className={cn(
              "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-600 shadow-sm transition-[background-color,color,transform] duration-200 hover:bg-white hover:text-blue-700 active:scale-95 data-[state=open]:bg-blue-700 data-[state=open]:text-white",
              className,
            )}
          >
            <Megaphone className="size-[18px]" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className="z-[60] w-[min(26rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-3xl p-0 shadow-2xl shadow-blue-900/20 ring-slate-200"
        >
          <AnnouncementsHeader count={announcements.length} className="p-4" />
          <AnnouncementList
            announcements={announcements}
            onOpen={(id) => {
              setOpen(false);
              setOpenId(id);
            }}
            className="scroll-inset max-h-[min(65dvh,32rem)] overflow-y-auto p-3"
          />
        </PopoverContent>
      </Popover>
      <AnnouncementDialog announcement={viewing} onOpenChange={(o) => !o && setOpenId(null)} />
    </>
  );
}
