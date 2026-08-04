import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        That page doesn&apos;t exist
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        The link may be out of date, or the thing it pointed at has been
        deleted.
      </p>
      <Button render={<Link href="/dashboard" />}>Back to the dashboard</Button>
    </div>
  );
}
