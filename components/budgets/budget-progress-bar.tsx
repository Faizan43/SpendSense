"use client";

import { useMoney } from "@/components/money-provider";
import { BUDGET_STATUS_CLASSES, budgetStatus, percentOf } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The bar is never the only signal — the status word and the numbers say the
 * same thing in text, so the colour is reinforcement rather than the message.
 */
export function BudgetProgressBar({
  label,
  spentMinor,
  amountMinor,
  sublabel,
  size = "default",
}: {
  label: React.ReactNode;
  spentMinor: number;
  amountMinor: number;
  sublabel?: React.ReactNode;
  size?: "sm" | "default";
}) {
  const { format } = useMoney();
  const pct = percentOf(spentMinor, amountMinor);
  const status = budgetStatus(pct);
  const styles = BUDGET_STATUS_CLASSES[status];
  const remaining = amountMinor - spentMinor;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="shrink-0 tabular-nums">
          {format(spentMinor)}{" "}
          <span className="text-muted-foreground">/ {format(amountMinor)}</span>
        </span>
      </div>

      <div
        className={cn(
          "bg-muted w-full overflow-hidden rounded-full",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${typeof label === "string" ? label : "Budget"} usage`}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", styles.bar)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("font-medium", styles.text)}>
          {styles.label} · {Math.round(pct)}%
        </span>
        <span className="text-muted-foreground tabular-nums">
          {remaining >= 0
            ? `${format(remaining)} left`
            : `${format(Math.abs(remaining))} over`}
        </span>
      </div>

      {sublabel ? (
        <p className="text-muted-foreground text-xs">{sublabel}</p>
      ) : null}
    </div>
  );
}
