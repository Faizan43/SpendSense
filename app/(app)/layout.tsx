import { Bell, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { MoneyProvider } from "@/components/money-provider";
import { AddMenu } from "@/components/layout/add-menu";
import { BottomNav, NavLinks } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  // The signup trigger creates the profile; if onboarding was never finished,
  // finish it before showing the app.
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <MoneyProvider currency={profile.currency} locale={profile.locale}>
      <ConfirmDialogProvider>
        <div className="flex min-h-svh">
          <aside className="bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
            <div className="p-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-1.5 py-1 font-heading text-sm"
              >
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full">
                  <Wallet className="size-4" />
                </span>
                SpendSense
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              <NavLinks />
            </div>
            <div className="border-t p-2">
              <SignOutButton />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-6">
              <MobileNav />

              <div className="flex-1" />

              <Button
                variant="outline"
                size="icon"
                className="relative"
                render={<Link href="/notifications" aria-label="Notifications" />}
              >
                <Bell className="size-4" />
                {unread ? (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[10px] tabular-nums"
                  >
                    {unread > 9 ? "9+" : unread}
                  </Badge>
                ) : null}
              </Button>

              <AddMenu />

              <ThemeToggle />
            </header>

            <main className="flex-1 px-3 pt-4 pb-24 sm:px-6 sm:pb-10">
              <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
            </main>
          </div>

          <BottomNav />
        </div>
      </ConfirmDialogProvider>
    </MoneyProvider>
  );
}
