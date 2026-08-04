import { chartSlotColor } from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * Colour never carries the category on its own — the name is always beside the
 * dot. That is what lets the same eight hues serve twelve categories.
 */
export function CategoryChip({
  name,
  chartSlot,
  className,
}: {
  name: string;
  chartSlot: number | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: chartSlotColor(chartSlot) }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
