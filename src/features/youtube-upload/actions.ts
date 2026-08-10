"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { youtubeUploadSchema, type YoutubeUploadInput } from "@/lib/validations/youtube-upload";
import { createYoutubeUpload, type CreateUploadResult } from "./engine";

/**
 * Queues an MP4 render for publishing to the user's connected YouTube channel.
 * Rejects duplicate uploads of the same render.
 */
export async function createYoutubeUploadAction(
  input: YoutubeUploadInput
): Promise<CreateUploadResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = youtubeUploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the upload details.",
    };
  }

  const result = await createYoutubeUpload(session.user.id, parsed.data);

  if (result.ok) {
    revalidatePath("/dashboard/youtube/upload");
  }

  return result;
}

export type UploadHistoryItem = {
  id: string;
  renderId: string;
  videoJobId: string | null;
  title: string;
  status: string;
  progress: number;
  stage: string;
  videoId: string | null;
  videoUrl: string | null;
  errorLog: unknown;
  createdAt: Date;
  finishedAt: Date | null;
};

/**
 * Returns the user's recent upload history (sanitized). Used by the dedicated
 * upload page and dashboard.
 */
export async function listYoutubeUploadsAction(): Promise<UploadHistoryItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const uploads = await prisma.youtubeUpload.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      renderId: true,
      videoJobId: true,
      title: true,
      status: true,
      progress: true,
      stage: true,
      videoId: true,
      videoUrl: true,
      errorLog: true,
      createdAt: true,
      finishedAt: true,
    },
  });

  return uploads;
}
