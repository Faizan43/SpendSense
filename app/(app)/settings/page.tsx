import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import type { SearchParams } from "@/lib/filters";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

const TABS = new Set(["profile", "preferences", "alerts", "data"]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const requested = typeof params.tab === "string" ? params.tab : "";
  const defaultTab = TABS.has(requested) ? requested : "profile";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  return (
    <>
      <PageHeader
        title="Settings"
        description="How amounts are shown, when you're warned, and what happens to your data."
      />
      <SettingsTabs
        profile={profile}
        email={user.email ?? ""}
        defaultTab={defaultTab}
      />
    </>
  );
}
