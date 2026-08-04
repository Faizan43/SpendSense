import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Request-scoped client carrying the signed-in user's session. Everything the
 * app reads and writes goes through this, so RLS is always in force.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws on an anonymous request. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * For pages that must have a user. Layouts already redirect anonymous traffic,
 * so reaching here without one is a bug rather than a normal flow.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
