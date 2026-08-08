"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { checkYoutubeConnection, disconnectYoutube } from "./engine";
import { getYoutubeConnector } from "@/lib/youtube-connect";
import type { ConnectionDisplay } from "./types";

export type YoutubeConnectionActionState =
  { ok: true; display: ConnectionDisplay } | { ok: false; error: string };

/**
 * Re-checks the stored connection: refreshes an expired access token, verifies
 * the channel still responds and updates the persisted status accordingly.
 */
export async function refreshYoutubeConnectionAction(): Promise<YoutubeConnectionActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await checkYoutubeConnection(session.user.id);

  revalidatePath("/dashboard");

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, display: result.display };
}

/**
 * Disconnects the user's YouTube channel. Revokes tokens best-effort, clears
 * stored credentials and marks the connection disconnected.
 */
export async function disconnectYoutubeConnectionAction(): Promise<YoutubeConnectionActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const result = await disconnectYoutube(session.user.id);

  revalidatePath("/dashboard");

  return { ok: true, display: result.display };
}

/**
 * Returns the URL used to start a (re)connection. The caller redirects to it.
 */
export async function startYoutubeConnectionUrlAction(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const connector = getYoutubeConnector();
  if (!connector.isConfigured()) {
    throw new Error("YouTube connection is not configured.");
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/youtube/connect`;
}
