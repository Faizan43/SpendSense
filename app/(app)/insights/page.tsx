import { ArrowRight, Lightbulb, TrendingDown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateInsights } from "@/lib/insights/generate";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const TONE = {
  neutral: { icon: Lightbulb, className: "bg-muted text-muted-foreground" },
  good: { icon: TrendingDown, className: "bg-success/10 text-success" },
  warning: {
    icon: TriangleAlert,
    className: "bg-warning/10 text-warning",
  },
} as const;

export default async function InsightsPage() {
  const insights = await generateInsights();

  return (
    <>
      <PageHeader
        title="Insights"
        description="What moved, what it cost, and what's worth doing about it. Worked out from your own numbers — nothing here is a guess."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => {
          const tone = TONE[insight.tone];
          const Icon = tone.icon;
          return (
            <Card key={insight.id}>
              <CardContent className="flex gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    tone.className,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-pretty">{insight.title}</p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {insight.body}
                  </p>
                  {insight.href ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0"
                      render={<Link href={insight.href} />}
                    >
                      {insight.linkLabel ?? "Take a look"}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
