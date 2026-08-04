"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function clearNotifications() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .not("read_at", "is", null);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
