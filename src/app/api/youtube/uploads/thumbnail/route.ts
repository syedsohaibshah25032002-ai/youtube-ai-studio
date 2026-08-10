import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Stores a thumbnail image picked by the user so the upload engine can pass it
 * to YouTube after the video upload. Returns the public-relative path; never
 * stores or returns credentials.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No thumbnail file provided" }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Thumbnail must be a JPEG, PNG or WebP image" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Thumbnail must be at most 2MB" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = extname(file.name).toLowerCase() || ".jpg";
  const relativePath = join(
    "uploads",
    "thumbnails",
    session.user.id,
    `${randomUUID()}${extension}`
  );
  const absolutePath = join(process.cwd(), "public", relativePath);

  await mkdir(join(process.cwd(), "public", "uploads", "thumbnails", session.user.id), {
    recursive: true,
  });
  await writeFile(absolutePath, bytes);

  return NextResponse.json({ path: relativePath });
}
