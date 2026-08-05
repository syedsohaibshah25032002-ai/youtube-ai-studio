import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateVideo, toErrorMessage } from "@/features/video-engine/generator";
import { prisma } from "@/lib/prisma";

/**
 * Starts video generation for a job. Execution is fired without blocking so
 * the client can observe progress via the status endpoint. Concurrent runs
 * are guarded against.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.videoJob.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Video job not found" }, { status: 404 });
  }

  if (job.status === "RUNNING") {
    return NextResponse.json({ error: "Already running" }, { status: 409 });
  }

  void generateVideo(id, session.user.id)
    .then(() => console.log(`[video] Job ${id} generation finished.`))
    .catch((error) =>
      console.error(`[video] Job ${id} generation crashed: ${toErrorMessage(error)}`)
    );

  return NextResponse.json({ ok: true, status: "RUNNING" });
}
