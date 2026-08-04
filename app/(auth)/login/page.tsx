import Link from "next/link";
import type { Metadata } from "next";

import { signIn } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to pick up where you left off.
        </p>
      </div>

      <CredentialsForm
        action={signIn}
        mode="sign-in"
        next={params.next}
        initialError={params.error}
      />

      <p className="text-muted-foreground text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="text-foreground font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
