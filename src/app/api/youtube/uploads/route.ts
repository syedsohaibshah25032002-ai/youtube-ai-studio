import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { toUploadDisplay } from "@/features/youtube-upload/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lists the current user's upload history as sanitized records. Token material
 * and file paths are never included.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploads = await prisma.youtubeUpload.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ uploads: uploads.map(toUploadDisplay) });
}
