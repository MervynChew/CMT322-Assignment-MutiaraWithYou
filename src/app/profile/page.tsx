import type { Metadata } from "next";
import { ProfileView } from "@/components/modules/user/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <main className="px-4 pt-24 pb-16 sm:px-6">
      <ProfileView />
    </main>
  );
}
