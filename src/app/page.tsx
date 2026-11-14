import { Hero } from "@/components/modules/dashboard/hero";
import { SolutionsGrid } from "@/components/modules/dashboard/solutions-grid";
import { Subscriptions } from "@/components/modules/dashboard/subscriptions";
import { RoadblockFeed } from "@/components/modules/dashboard/roadblock-feed";
import { StationLine } from "@/components/modules/dashboard/station-line";
import { AnnouncementsSidebar } from "@/components/modules/dashboard/announcements-sidebar";

export default function HomePage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-24 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-10">
        <Hero />
        <SolutionsGrid />
        <Subscriptions />
        <StationLine />
        <RoadblockFeed />
      </div>
      <AnnouncementsSidebar />
    </main>
  );
}
