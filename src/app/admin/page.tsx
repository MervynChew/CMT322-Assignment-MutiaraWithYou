import type { Metadata } from "next";
import { AdminDashboard } from "@/components/modules/gov/admin-dashboard";

// Gated on the client-side admin role (see admin/layout.tsx), so skip instant-navigation validation.
export const instant = false;

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
