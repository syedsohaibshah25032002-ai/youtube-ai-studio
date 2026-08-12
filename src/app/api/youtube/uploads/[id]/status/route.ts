import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { toUploadDisplay } from "@/features/youtube-upload/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status endpoint polled by the upload page while a video uploads.
 * Returns sanitized upload state; token material is never included.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const upload = await prisma.youtubeUpload.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      renderId: true,
      videoJobId: true,
      title: true,
      description: true,
      tags: true,
      categoryId: true,
      visibility: true,
      status: true,
      progress: true,
      stage: true,
      videoId: true,
      videoUrl: true,
      scheduledAt: true,
      timezone: true,
      errorLog: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  return NextResponse.json({ upload: toUploadDisplay(upload) });
}
