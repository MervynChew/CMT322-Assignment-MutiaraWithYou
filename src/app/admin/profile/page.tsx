import type { Metadata } from "next";
import { AdminProfile } from "@/components/modules/gov/admin-profile";

// Gated on the client-side admin role (see admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export const metadata: Metadata = { title: "Profile" };

export default function AdminProfilePage() {
  return <AdminProfile />;
}
