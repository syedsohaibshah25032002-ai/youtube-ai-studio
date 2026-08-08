import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getYoutubeConnector } from "@/lib/youtube-connect";

export const dynamic = "force-dynamic";

/**
 * Starts the YouTube OAuth 2.0 flow. Generates a CSRF state value, persists it
 * in a short-lived cookie and redirects the user to Google's consent screen.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const connector = getYoutubeConnector();

  if (!connector.isConfigured()) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const params = new URLSearchParams({ error: "not-configured" });
    return NextResponse.redirect(new URL(`/dashboard?${params.toString()}`, base));
  }

  const state = randomBytes(32).toString("hex");

  const response = NextResponse.redirect(await connector.getAuthUrl(state), { status: 302 });

  response.cookies.set("youtube_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return response;
}
