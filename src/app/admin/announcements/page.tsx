import type { Metadata } from "next";
import { AnnouncementsManager } from "@/components/modules/gov/announcements-manager";

// Gated on the client-side admin role (see admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export const metadata: Metadata = { title: "Announcements" };

export default function AdminAnnouncementsPage() {
  return <AnnouncementsManager />;
}
