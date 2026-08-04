import {
  Camera,
  ChartPie,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: Camera,
    title: "Snap the receipt",
    body: "Photograph it or drop in a PDF. Every line item is read out — product, quantity, unit price and total.",
  },
  {
    icon: Sparkles,
    title: "It sorts itself",
    body: "Items are categorised automatically, and every correction you make teaches it for next time.",
  },
  {
    icon: ChartPie,
    title: "See where it went",
    body: "Category breakdowns, monthly trends, store comparisons, and which products quietly got more expensive.",
  },
];

const FEATURES = [
  {
    icon: Wallet,
    title: "Manual entry too",
    body: "No receipt? Add one item or a whole shop in a spreadsheet-style grid, or import a CSV.",
  },
  {
    icon: Target,
    title: "Budgets that warn you early",
    body: "Set a monthly cap and per-category limits. Get told at 80%, not after you've blown it.",
  },
  {
    icon: ChartPie,
    title: "Export anything",
    body: "Every view exports to CSV or a printable PDF, filters and all.",
  },
];

export default async function LandingPage() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Wallet className="size-4" />
          </span>
          SpendSense
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Get started
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="py-14 sm:py-24">
          <div className="max-w-2xl space-y-5">
            <p className="text-primary text-sm font-medium">
              SpendSense
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Know exactly where your money goes
            </h1>
            <p className="text-muted-foreground text-lg text-pretty">
              Photograph a receipt and every item lands in the right category on
              its own. Then see the month, the trend, the store that&apos;s
              quietly costing you more — and stay inside a budget you actually
              set.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button size="lg" render={<Link href="/signup" />}>
                Track your first receipt
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/login" />}>
                I already have an account
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-14 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-lg">
                    <step.icon className="size-4" />
                  </span>
                  <span className="text-muted-foreground text-xs font-medium tabular-nums">
                    Step {i + 1}
                  </span>
                </div>
                <h2 className="font-medium">{step.title}</h2>
                <p className="text-muted-foreground text-sm">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-2">
              <f.icon className="text-primary size-5" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-8 text-sm sm:px-6">
        Your receipts stay private to your account.
      </footer>
    </div>
  );
}
