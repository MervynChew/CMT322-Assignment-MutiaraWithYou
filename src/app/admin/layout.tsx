import type { Metadata } from "next";
import { AdminShell } from "@/components/modules/gov/admin-shell";

// Admin pages are gated on the client-side role, so non-admins see a restricted
// screen instead of the page. Opt the section out of instant-navigation validation,
// which otherwise reports the gated page as a "dropped segment".
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Ops Console", template: "%s · Ops Console" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
