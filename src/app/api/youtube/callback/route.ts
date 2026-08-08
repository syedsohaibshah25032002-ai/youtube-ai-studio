import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { connectYoutube } from "@/features/youtube-connection/engine";

export const dynamic = "force-dynamic";

function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Receives the OAuth callback from Google (or the mock connector). Verifies the
 * CSRF state cookie, exchanges the authorization code for tokens and stores the
 * encrypted connection before redirecting back to the dashboard.
 */
export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("youtube_oauth_state")?.value;

  if (error) {
    const params = new URLSearchParams({ error: "access-denied" });
    return NextResponse.redirect(new URL(`/dashboard?${params.toString()}`, base));
  }

  if (!code || !state || state !== cookieState) {
    const params = new URLSearchParams({ error: "state-mismatch" });
    return NextResponse.redirect(new URL(`/dashboard?${params.toString()}`, base));
  }

  const result = await connectYoutube(session.user.id, code);

  if (!result.ok) {
    const params = new URLSearchParams({ error: `connect-failed:${toErrorMessage(result.error)}` });
    return NextResponse.redirect(new URL(`/dashboard?${params.toString()}`, base));
  }

  const params = new URLSearchParams({ connected: "1" });
  return NextResponse.redirect(new URL(`/dashboard?${params.toString()}`, base));
}
