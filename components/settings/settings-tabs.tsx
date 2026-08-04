"use client";

import { Download, Loader2, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteAllData,
  deleteAllReceipts,
  updateProfile,
  type SettingsState,
} from "@/app/(app)/settings/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRENCIES } from "@/lib/money";
import type { ProfileRow } from "@/lib/types/database";

const LOCALES = [
  { code: "en-GB", label: "United Kingdom" },
  { code: "en-US", label: "United States" },
  { code: "en-IE", label: "Ireland" },
  { code: "en-AU", label: "Australia" },
  { code: "en-CA", label: "Canada" },
  { code: "de-DE", label: "Germany" },
  { code: "fr-FR", label: "France" },
];

export function SettingsTabs({
  profile,
  email,
  defaultTab,
}: {
  profile: ProfileRow;
  email: string;
  defaultTab: string;
}) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateProfile,
    {},
  );
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<null | "receipts" | "everything">(null);
  const [confirmText, setConfirmText] = useState("");

  function runDestructive(action: () => Promise<SettingsState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done");
      setConfirm(null);
      setConfirmText("");
    });
  }

  return (
    <>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="data">Your data</TabsTrigger>
        </TabsList>

        <form action={formAction}>
          {/* All three tabs post the same form, so a change on one tab isn't
              lost when you switch to another before saving. */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    defaultValue={profile.display_name ?? ""}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled readOnly />
                  <p className="text-muted-foreground text-xs">
                    Changing your email means signing in again — use the
                    password reset flow.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <NativeSelect
                      id="currency"
                      name="currency"
                      defaultValue={profile.currency}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} {c.code} — {c.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <p className="text-muted-foreground text-xs">
                      Amounts already recorded aren&apos;t converted — this
                      changes how they&apos;re displayed.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="locale">Date &amp; number format</Label>
                    <NativeSelect
                      id="locale"
                      name="locale"
                      defaultValue={profile.locale}
                    >
                      {LOCALES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="week_starts_on">Weeks start on</Label>
                    <NativeSelect
                      id="week_starts_on"
                      name="week_starts_on"
                      defaultValue={String(profile.week_starts_on)}
                    >
                      <option value="1">Monday</option>
                      <option value="0">Sunday</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Theme</Label>
                    <div>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="default_alert_threshold_pct">
                    Warn me by default at
                  </Label>
                  <NativeSelect
                    id="default_alert_threshold_pct"
                    name="default_alert_threshold_pct"
                    defaultValue={String(profile.default_alert_threshold_pct)}
                    className="max-w-xs"
                  >
                    {[50, 60, 70, 75, 80, 85, 90, 95].map((pct) => (
                      <option key={pct} value={pct}>
                        {pct}% of a budget
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-muted-foreground text-xs">
                    Applies to new budgets. Existing ones keep whatever you set
                    on them.
                  </p>
                </div>

                <p className="text-muted-foreground text-sm">
                  Alerts appear in the app under Notifications. Email delivery
                  isn&apos;t set up — that needs a mail provider this app
                  doesn&apos;t assume you have.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-4 flex items-center gap-3">
            <SubmitButton>Save settings</SubmitButton>
            <AuthAlert error={state.error} message={state.message} />
          </div>
        </form>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export and import</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                render={
                  <a href="/api/export/csv?preset=all-time" download />
                }
              >
                <Download className="size-4" /> Export everything as CSV
              </Button>
              <Button
                variant="outline"
                render={
                  <a
                    href="/api/export/pdf?preset=this-year"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <Download className="size-4" /> This year as a PDF
              </Button>
              <Button variant="outline" render={<Link href="/expenses/new" />}>
                <Upload className="size-4" /> Import a CSV
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2 text-base">
                <TriangleAlert className="size-4" /> Danger zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Delete all receipt files</p>
                  <p className="text-muted-foreground text-sm">
                    Removes every uploaded image and PDF. The shops you saved
                    from them stay.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setConfirm("receipts")}>
                  Delete receipts
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">Delete all my data</p>
                  <p className="text-muted-foreground text-sm">
                    Every shop, receipt, budget, store and product. This
                    can&apos;t be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setConfirm("everything")}
                >
                  Delete everything
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "receipts"
                ? "Delete every receipt file?"
                : "Delete all of your data?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "receipts"
                ? "The images go for good. Your recorded spending is unaffected."
                : "Every shop, item, receipt, budget, store and product is removed. There is no undo, and no backup on our side — export a CSV first if you might want it."}
            </DialogDescription>
          </DialogHeader>

          {confirm === "everything" ? (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-text">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                pending || (confirm === "everything" && confirmText !== "DELETE")
              }
              onClick={() =>
                runDestructive(
                  confirm === "receipts" ? deleteAllReceipts : deleteAllData,
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
