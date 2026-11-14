import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/modules/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    // ?next= is read with useSearchParams, which needs a Suspense boundary.
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
