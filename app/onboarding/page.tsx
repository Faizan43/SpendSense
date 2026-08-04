import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 space-y-2">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Wallet className="size-4" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          A couple of details and you&apos;re in
        </h1>
        <p className="text-muted-foreground text-sm">
          These set how amounts and dates are shown. You can change any of it
          later in Settings.
        </p>
      </div>

      <OnboardingForm
        defaultName={profile?.display_name ?? ""}
        defaultCurrency={profile?.currency ?? "GBP"}
        defaultLocale={profile?.locale ?? "en-GB"}
      />
    </div>
  );
}
