import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/modules/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    // ?next= is read with useSearchParams, which needs a Suspense boundary.
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
