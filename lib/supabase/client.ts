import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/types/database";

/**
 * Browser client. Used for the two things that genuinely need to happen in the
 * browser: auth calls that set cookies, and direct-to-Storage receipt uploads
 * (which bypass the server's request body limit).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
