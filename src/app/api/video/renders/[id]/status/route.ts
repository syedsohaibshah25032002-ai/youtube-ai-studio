import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status endpoint polled by the render history while an MP4 renders.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const render = await prisma.videoRender.findFirst({
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

  if (!render) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  return NextResponse.json(render);
}
