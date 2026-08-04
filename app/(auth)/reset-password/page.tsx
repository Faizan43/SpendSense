"use client";

import { useActionState } from "react";

import { updatePassword, type AuthState } from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePassword,
    {},
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          You&apos;re signed in from the reset link — set a password and
          you&apos;re done.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <AuthAlert error={state.error} message={state.message} />

        <SubmitButton className="w-full">Update password</SubmitButton>
      </form>
    </div>
  );
}
