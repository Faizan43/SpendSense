import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SearchParams } from "@/lib/filters";

function toQuery(params: SearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v) search.append(key, v);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Exports honour whatever is currently filtered — what you see is what you get. */
export function ExportMenu({ params }: { params: SearchParams }) {
  const query = toQuery(params);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <Download className="size-4" />
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<a href={`/api/export/csv${query}`} download />}
        >
          <FileSpreadsheet className="size-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<a href={`/api/export/pdf${query}`} target="_blank" rel="noreferrer" />}
        >
          <FileText className="size-4" /> PDF report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
