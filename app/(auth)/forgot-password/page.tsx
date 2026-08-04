"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ll email you a link to choose a new one.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <AuthAlert error={state.error} message={state.message} />

        <SubmitButton className="w-full">Send reset link</SubmitButton>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
