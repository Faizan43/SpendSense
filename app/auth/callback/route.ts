import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the OAuth / email-link code for a session cookie, then sends the
 * user on to wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is no longer valid.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link has expired. Please try again.")}`,
    );
  }

  // A brand-new account has no profile row until the signup trigger runs; the
  // onboarding page handles the case where it hasn't landed yet.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .maybeSingle();

  const destination =
    !profile?.onboarded_at && next === "/dashboard" ? "/onboarding" : next;

  return NextResponse.redirect(`${origin}${destination}`);
}
