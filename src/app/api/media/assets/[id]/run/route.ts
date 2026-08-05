import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateAsset, toErrorMessage } from "@/features/media-engine/generator";
import { prisma } from "@/lib/prisma";

/**
 * Starts media generation for an asset. Execution is fired without blocking so
 * the client can observe progress via the status endpoint. Concurrent runs and
 * re-runs of already-completed assets are guarded against.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (asset.status === "RUNNING") {
    return NextResponse.json({ error: "Already running" }, { status: 409 });
  }

  void generateAsset(id, session.user.id)
    .then(() => console.log(`[media] Asset ${id} generation finished.`))
    .catch((error) =>
      console.error(`[media] Asset ${id} generation crashed: ${toErrorMessage(error)}`)
    );

  return NextResponse.json({ ok: true, status: "RUNNING" });
}
