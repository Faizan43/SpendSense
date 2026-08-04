import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

import { env } from "@/lib/env";
import {
  EXTRACTION_PROMPT,
  RECEIPT_JSON_SCHEMA,
  receiptExtractionSchema,
  type ReceiptExtraction,
} from "@/lib/anthropic/receipt-schema";

/** Claude's high-resolution ceiling. Anything larger costs tokens and adds nothing. */
const MAX_EDGE_PX = 2576;

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export type ExtractionResult = {
  data: ReceiptExtraction;
  model: string;
  usage: { input: number; output: number };
};

/**
 * Straightens, shrinks and re-encodes a photographed receipt.
 *
 * Auto-rotation matters more than it sounds: phone cameras record orientation
 * in EXIF rather than in the pixels, so a portrait photo often arrives on its
 * side. Metadata is stripped at the same time, which removes the GPS tag most
 * phones attach to a photo taken in a shop.
 */
async function normalizeImage(
  buffer: Buffer,
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" }> {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();

  const longestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const pipeline =
    longestEdge > MAX_EDGE_PX
      ? image.resize({
          width: MAX_EDGE_PX,
          height: MAX_EDGE_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
      : image;

  const output = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { data: output.toString("base64"), mediaType: "image/jpeg" };
}

/**
 * Reads a receipt image or PDF into structured line items.
 *
 * PDFs go straight to the model as a document block — there is no separate OCR
 * pass to rasterise or stitch, and multi-page receipts come back as one list.
 */
export async function extractReceipt(
  file: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  const isPdf = mimeType === "application/pdf";

  const content: Anthropic.MessageCreateParams["messages"][number]["content"] =
    isPdf
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: file.toString("base64"),
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ]
      : await (async () => {
          const { data, mediaType } = await normalizeImage(file);
          return [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mediaType,
                data,
              },
            },
            { type: "text" as const, text: EXTRACTION_PROMPT },
          ];
        })();

  const model = env.anthropicModel;

  const response = await getClient().messages.create({
    model,
    max_tokens: 8000,
    // Thinking must stay on. Unlike Opus 5, Sonnet 4.6 does not default to
    // adaptive thinking when the param is omitted, so it's set explicitly
    // here. Leaving it off is what triggers the known "writes the answer as
    // prose instead of the structured shape" behaviour, and medium effort
    // already keeps the cost sensible.
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: RECEIPT_JSON_SCHEMA },
    },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      "The model declined to read this file. If it isn't a clear receipt, try entering the items by hand.",
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "That receipt is longer than one pass allows. Try splitting it, or enter the items by hand.",
    );
  }

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("The model returned nothing readable for this receipt.");
  }

  let json: unknown;
  try {
    json = JSON.parse(text.text);
  } catch {
    throw new Error("The extracted receipt data wasn't valid JSON.");
  }

  const parsed = receiptExtractionSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `The extracted receipt data didn't match the expected shape: ${parsed.error.issues[0]?.message ?? "unknown field"}`,
    );
  }

  return {
    data: parsed.data,
    model,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}
