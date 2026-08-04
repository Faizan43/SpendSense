"use client";

import { ArrowRight, PenLine, Receipt } from "lucide-react";
import Link from "next/link";

import { useMoney } from "@/components/money-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";

export function RecentTrips({
  trips,
}: {
  trips: Array<{
    id: string;
    purchaseDate: string;
    totalMinor: number;
    storeName: string | null;
    source: string;
  }>;
}) {
  const { format } = useMoney();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Recent shops</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/expenses" />}>
            All expenses <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {trips.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No shops recorded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/expenses/${trip.id}`}
                  className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    {trip.source === "receipt" ? (
                      <Receipt className="size-4" />
                    ) : (
                      <PenLine className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {trip.storeName ?? "Unknown store"}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {formatDate(trip.purchaseDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {format(trip.totalMinor)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
