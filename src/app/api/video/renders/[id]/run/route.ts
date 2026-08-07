import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { renderVideo, toErrorMessage } from "@/features/render-engine/engine";
import { prisma } from "@/lib/prisma";

/**
 * Starts MP4 rendering for a render job. Execution is fired without blocking so
 * the client can observe progress via the status endpoint. Concurrent renders
 * are guarded against.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const render = await prisma.videoRender.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!render) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  if (render.status === "RUNNING") {
    return NextResponse.json({ error: "Already rendering" }, { status: 409 });
  }

  void renderVideo(id, session.user.id)
    .then(() => console.log(`[render] Render ${id} finished.`))
    .catch((error) => console.error(`[render] Render ${id} crashed: ${toErrorMessage(error)}`));

  return NextResponse.json({ ok: true, status: "RUNNING" });
}
