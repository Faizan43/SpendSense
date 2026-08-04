"use client";

import { createContext, useContext, useMemo } from "react";

import {
  DEFAULT_CURRENCY,
  formatMoney,
  formatMoneyCompact,
} from "@/lib/money";

type MoneyContextValue = {
  currency: string;
  locale: string;
  format: (minor: number | null | undefined) => string;
  formatCompact: (minor: number | null | undefined) => string;
};

const MoneyContext = createContext<MoneyContextValue>({
  currency: DEFAULT_CURRENCY,
  locale: "en-GB",
  format: (m) => formatMoney(m),
  formatCompact: (m) => formatMoneyCompact(m),
});

/**
 * Currency and locale live on the profile, so client components need them
 * without prop-drilling through every chart and table cell.
 */
export function MoneyProvider({
  currency,
  locale,
  children,
}: {
  currency: string;
  locale: string;
  children: React.ReactNode;
}) {
  const value = useMemo<MoneyContextValue>(
    () => ({
      currency,
      locale,
      format: (m) => formatMoney(m, currency, locale),
      formatCompact: (m) => formatMoneyCompact(m, currency, locale),
    }),
    [currency, locale],
  );

  return <MoneyContext value={value}>{children}</MoneyContext>;
}

export function useMoney() {
  return useContext(MoneyContext);
}
