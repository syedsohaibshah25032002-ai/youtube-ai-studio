import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status endpoint polled by the job page while a video renders.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.videoJob.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      progress: true,
      stage: true,
      errorLog: true,
      updatedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Video job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
