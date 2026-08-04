import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = data ?? [];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Budget warnings, and anything that went wrong reading a receipt."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon="target"
          title="Nothing to report"
          description="Set a budget and we'll tell you when you're approaching it, rather than after you've passed it."
          action={
            <Button render={<Link href="/budgets" />}>Set a budget</Button>
          }
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </>
  );
}
