import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { toConnectionDisplay } from "@/features/youtube-connection/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Returns a sanitized snapshot of the user's YouTube connection. Token material
 * is never returned; only display data and status.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.youtubeConnection.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      channelId: true,
      channelName: true,
      channelUrl: true,
      thumbnailUrl: true,
      subscriberCount: true,
      provider: true,
      lastError: true,
      lastCheckedAt: true,
      connectedAt: true,
    },
  });

  return NextResponse.json({ connection: toConnectionDisplay(connection) });
}
