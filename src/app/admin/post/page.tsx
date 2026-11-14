import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/modules/gov/admin-shell";
import { MapEditor } from "@/components/modules/gov/map-editor";

// Gated on the client-side admin role (see admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export const metadata: Metadata = { title: "Post" };

export default function AdminPostPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Post"
        title="Roadblock canvas"
        description="Pick a closure tool and click the map to add it, or click a pin to edit. Everything you queue (including announcements) goes live together when you press Post / Confirm."
      />
      <MapEditor />
    </>
  );
}
