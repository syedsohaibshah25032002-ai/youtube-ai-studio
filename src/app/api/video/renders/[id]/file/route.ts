import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Streams the rendered MP4 for a completed render. Files are written to disk at
 * render time, so this route serves them instead of relying on static hosting
 * (which caches 404s for files created after the server starts).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const render = await prisma.videoRender.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, outputPath: true },
  });

  if (!render || !render.outputPath) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  const filename = `${id}.mp4`;
  const filePath = join(process.cwd(), "public", "renders", filename);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(data.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "Render file not found" }, { status: 404 });
  }
}
