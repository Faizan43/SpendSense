import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A styled native <select>. Used for form fields in preference to the
 * popover-based Select: it submits with a plain <form> (so server actions work
 * without client state), it is keyboard- and screen-reader-native, and on
 * mobile it opens the platform picker.
 */
export function NativeSelect({
  className,
  children,
  size = "default",
  ...props
}: Omit<ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive w-full appearance-none rounded-lg border py-2 pr-8 pl-2.5 text-sm outline-none transition-colors focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          size === "sm" ? "h-7 text-[0.8rem]" : "h-8",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
    </div>
  );
}
