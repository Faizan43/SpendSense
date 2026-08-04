"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/(auth)/actions";

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

export function CredentialsForm({
  action,
  mode,
  next,
  initialError,
}: {
  action: Action;
  mode: "sign-in" | "sign-up";
  next?: string;
  initialError?: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {
    error: initialError,
  });
  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignUp ? (
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Name</Label>
          <Input
            id="display_name"
            name="display_name"
            autoComplete="name"
            placeholder="Alex Morgan"
          />
        </div>
      ) : null}

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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {!isSignUp ? (
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Forgot password?
            </Link>
          ) : null}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
        />
      </div>

      <AuthAlert error={state.error} message={state.message} />

      <SubmitButton className="w-full">
        {isSignUp ? "Create account" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
