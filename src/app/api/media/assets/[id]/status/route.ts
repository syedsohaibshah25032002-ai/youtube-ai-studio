import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight status endpoint polled by the asset page while generation runs.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      mediaUrl: true,
      errorLog: true,
      updatedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
}
