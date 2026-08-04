"use client";

import { ExternalLink, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * The image pane on the review screen. Zoom and rotate matter more than they
 * look: half of checking an extraction is squinting at a crumpled line, and
 * phone photos regularly arrive sideways.
 */
export function ReceiptViewer({
  url,
  isPdf,
  fileName,
}: {
  url: string | null;
  isPdf: boolean;
  fileName: string | null;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center rounded-xl border border-dashed text-sm">
        The original file is no longer available.
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="space-y-2">
        <object
          data={url}
          type="application/pdf"
          className="h-[70vh] w-full rounded-xl border"
          aria-label={fileName ?? "Receipt PDF"}
        >
          <div className="text-muted-foreground p-6 text-sm">
            Your browser won&apos;t display this PDF inline.
          </div>
        </object>
        <Button
          variant="outline"
          size="sm"
          render={<a href={url} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink className="size-4" /> Open in a new tab
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-muted/40 relative h-[70vh] overflow-auto rounded-xl border">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset */}
        <img
          src={url}
          alt={fileName ?? "Uploaded receipt"}
          className="origin-top-left transition-transform"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "top left",
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Rotate"
          onClick={() => setRotation((r) => (r + 90) % 360)}
        >
          <RotateCw className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={<a href={url} target="_blank" rel="noreferrer" />}
        >
          <ExternalLink className="size-3.5" /> Full size
        </Button>
      </div>
    </div>
  );
}
