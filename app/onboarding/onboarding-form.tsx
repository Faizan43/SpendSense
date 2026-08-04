"use client";

import { useActionState, useState } from "react";

import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/onboarding/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CURRENCIES, currencySymbol } from "@/lib/money";

const LOCALES = [
  { code: "en-GB", label: "United Kingdom (31/12/2026)" },
  { code: "en-US", label: "United States (12/31/2026)" },
  { code: "en-IE", label: "Ireland" },
  { code: "en-AU", label: "Australia" },
  { code: "en-CA", label: "Canada" },
  { code: "de-DE", label: "Germany" },
  { code: "fr-FR", label: "France" },
];

export function OnboardingForm({
  defaultName,
  defaultCurrency,
  defaultLocale,
}: {
  defaultName: string;
  defaultCurrency: string;
  defaultLocale: string;
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );
  const [currency, setCurrency] = useState(defaultCurrency);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="display_name">What should we call you?</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultName}
          placeholder="Alex"
          maxLength={80}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <NativeSelect
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="locale">Date &amp; number format</Label>
          <NativeSelect id="locale" name="locale" defaultValue={defaultLocale}>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="week_starts_on">Weeks start on</Label>
        <NativeSelect id="week_starts_on" name="week_starts_on" defaultValue="1">
          <option value="1">Monday</option>
          <option value="0">Sunday</option>
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="monthly_budget">
          Monthly budget{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">
            {currencySymbol(currency)}
          </span>
          <Input
            id="monthly_budget"
            name="monthly_budget"
            inputMode="decimal"
            placeholder="400.00"
            className="pl-6"
          />
        </div>
        <p className="text-muted-foreground text-xs">
          We&apos;ll show progress against it and warn you before you run out.
        </p>
      </div>

      <AuthAlert error={state.error} />

      <SubmitButton className="w-full">Finish setup</SubmitButton>
    </form>
  );
}
