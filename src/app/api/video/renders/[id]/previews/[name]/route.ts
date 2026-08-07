import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Streams a preview image generated during rendering. Preview images are
 * written to disk at render time alongside the MP4.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name } = await params;

  const render = await prisma.videoRender.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!render) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  if (!/^preview-\d+\.(jpg|png|txt)$/.test(name)) {
    return NextResponse.json({ error: "Invalid preview name" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "renders", id, "previews", name);

  try {
    const data = await readFile(filePath);
    const contentType = name.endsWith(".txt")
      ? "text/plain; charset=utf-8"
      : name.endsWith(".png")
        ? "image/png"
        : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "Preview not found" }, { status: 404 });
  }
}
