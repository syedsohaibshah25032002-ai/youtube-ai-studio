"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import { videoJobSchema, type VideoJobInput } from "@/lib/validations/video-job";
import { generateVideo, toErrorMessage } from "./generator";

export type CreateVideoJobResult = { videoJobId: string } | { error: string };

export type VideoActionResult = { ok: true } | { ok: false; error: string };

export async function createVideoJob(input: VideoJobInput): Promise<CreateVideoJobResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = videoJobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the video job details." };
  }

  const { aiJobId, title, config } = parsed.data;

  const aiJob = await prisma.aiJob.findFirst({
    where: { id: aiJobId, userId: session.user.id },
    include: { results: { where: { section: "script" }, take: 1 } },
  });

  if (!aiJob) {
    return { error: "Content job not found." };
  }

  if (aiJob.status !== "COMPLETED") {
    return { error: "Only completed content jobs can be turned into a video." };
  }

  const scriptResult = aiJob.results[0];
  const script =
    scriptResult && typeof scriptResult.content === "string" ? scriptResult.content : "";

  const provider = getVideoProvider();

  const job = await prisma.videoJob.create({
    data: {
      userId: session.user.id,
      aiJobId,
      title,
      status: "PENDING",
      progress: 0,
      stage: "Waiting to start",
      provider: provider.id,
      model: provider.defaultModel,
      config,
      script,
      timeline: [],
      errorLog: [],
    },
  });

  revalidatePath("/dashboard/video");

  return { videoJobId: job.id };
}

export async function retryVideoJob(videoJobId: string): Promise<VideoActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const job = await prisma.videoJob.findFirst({
    where: { id: videoJobId, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!job) {
    return { ok: false, error: "Video job not found." };
  }

  if (job.status !== "FAILED") {
    return { ok: false, error: "Only failed video jobs can be retried." };
  }

  try {
    await generateVideo(videoJobId, session.user.id);
    revalidatePath(`/dashboard/video/${videoJobId}`);
    revalidatePath("/dashboard/video");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteVideoJob(videoJobId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.videoJob.deleteMany({
    where: { id: videoJobId, userId: session.user.id },
  });

  revalidatePath("/dashboard/video");
  revalidatePath("/dashboard/video/history");
  redirect("/dashboard/video");
}
