"use client";

import { useMoney } from "@/components/money-provider";

/** Formats a stored minor-unit amount with the user's currency and locale. */
export function ProductAmount({ minor }: { minor: number | null | undefined }) {
  const { format } = useMoney();
  return <>{format(minor)}</>;
}
