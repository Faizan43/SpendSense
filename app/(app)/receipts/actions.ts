"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const createSchema = z.object({
  storagePath: z.string().min(1),
  mimeType: z.string().refine((m) => ALLOWED_MIME.has(m), {
    message: "Only JPG, PNG, WebP and PDF receipts are supported.",
  }),
  originalFilename: z.string().max(255).optional(),
  fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

/**
 * Registers a file that has already been uploaded straight to Storage.
 *
 * The upload bypasses the app server entirely — a 9 MB receipt photo through a
 * server action would hit the request body limit — so this records what landed
 * and hands back an id to kick extraction off with.
 */
export async function createReceiptRecord(input: {
  storagePath: string;
  mimeType: string;
  originalFilename?: string;
  fileSizeBytes: number;
}) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "You need to be signed in." };

  // The storage policy already pins objects to the user's own folder; this
  // makes the same guarantee on the row so a hand-crafted call can't point a
  // receipt at someone else's file.
  if (!parsed.data.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "That upload path isn't yours." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("receipts")
    .insert({
      user_id: user.id,
      storage_path: parsed.data.storagePath,
      mime_type: parsed.data.mimeType,
      original_filename: parsed.data.originalFilename ?? null,
      file_size_bytes: parsed.data.fileSizeBytes,
      currency: profile?.currency ?? "GBP",
      status: "uploaded",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message ?? "Couldn't record that upload.",
    };
  }

  revalidatePath("/receipts");
  return { ok: true as const, receiptId: data.id };
}

export async function deleteReceipt(id: string) {
  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (receipt?.storage_path) {
    await supabase.storage.from("receipts").remove([receipt.storage_path]);
  }

  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/** Called once the reviewed items have been saved as a shopping trip. */
export async function markReceiptConfirmed(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("receipts")
    .update({ status: "confirmed", error_message: null })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/receipts");
  revalidatePath(`/receipts/${id}`);
  return { ok: true as const };
}

/** A short-lived URL for showing a private receipt image in the browser. */
export async function getReceiptImageUrl(storagePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, 60 * 30);
  return data?.signedUrl ?? null;
}
