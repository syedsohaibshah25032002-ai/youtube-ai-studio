import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { formatInTimeZone, isValidTimeZone } from "@/lib/date";
import { runYoutubeUpload, toErrorMessage } from "@/features/youtube-upload/engine";
import { prisma } from "@/lib/prisma";

/**
 * Starts the YouTube upload for a queued upload record. Execution is fired
 * without blocking so the client can observe progress via the status endpoint.
 * Uploads already in progress are guarded against, and scheduled uploads are
 * rejected until their publish time arrives.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const upload = await prisma.youtubeUpload.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      timezone: true,
      nextAttemptAt: true,
      attempts: true,
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  if (upload.status === "PROCESSING" || upload.status === "UPLOADING") {
    return NextResponse.json({ error: "Already uploading" }, { status: 409 });
  }

  if (upload.status === "COMPLETED" || upload.status === "DUPLICATE") {
    return NextResponse.json(
      { error: "This video was already published to YouTube" },
      { status: 409 }
    );
  }

  if (upload.status === "CANCELLED") {
    return NextResponse.json({ error: "This upload was cancelled." }, { status: 409 });
  }

  if (upload.status === "FAILED") {
    if (upload.nextAttemptAt && upload.nextAttemptAt.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Automatic retry is scheduled and cannot be skipped." },
        { status: 409 }
      );
    }
  }

  if (upload.nextAttemptAt && upload.nextAttemptAt.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "This upload is waiting for its scheduled retry and cannot be run now." },
      { status: 409 }
    );
  }

  if (upload.status === "SCHEDULED") {
    const timezone = isValidTimeZone(upload.timezone) ? upload.timezone : "UTC";
    if (upload.scheduledAt && upload.scheduledAt.getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: `This video is scheduled for ${formatInTimeZone(
            upload.scheduledAt,
            timezone
          )} and cannot be published early.`,
        },
        { status: 409 }
      );
    }
  }

  void runYoutubeUpload(id, session.user.id)
    .then(() => console.log(`[youtube] Upload ${id} finished.`))
    .catch((error) => console.error(`[youtube] Upload ${id} crashed: ${toErrorMessage(error)}`));

  return NextResponse.json({ ok: true, status: "PROCESSING" });
}
