import Link from "next/link";
import type { Metadata } from "next";

import { signUp } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Start tracking your spending
        </h1>
        <p className="text-muted-foreground text-sm">
          Snap a receipt and see where your money actually goes.
        </p>
      </div>

      <CredentialsForm action={signUp} mode="sign-up" />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
