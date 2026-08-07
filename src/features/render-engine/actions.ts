"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRenderProvider } from "@/lib/render";
import { renderJobSchema, type RenderJobInput } from "@/lib/validations/render-job";
import { renderVideo, toErrorMessage } from "./engine";

export type CreateRenderResult = { renderId: string } | { error: string };

export type RenderActionResult = { ok: true } | { ok: false; error: string };

export async function createVideoRender(input: RenderJobInput): Promise<CreateRenderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = renderJobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the render details." };
  }

  const { videoJobId, resolution } = parsed.data;

  const videoJob = await prisma.videoJob.findFirst({
    where: { id: videoJobId, userId: session.user.id },
  });

  if (!videoJob) {
    return { error: "Video job not found." };
  }

  if (videoJob.status !== "COMPLETED") {
    return { error: "Only completed video jobs can be rendered." };
  }

  const provider = getRenderProvider();

  const render = await prisma.videoRender.create({
    data: {
      userId: session.user.id,
      videoJobId,
      resolution,
      status: "PENDING",
      progress: 0,
      stage: "Waiting to start",
      provider: provider.id,
      model: provider.defaultModel,
      previewImages: [],
      errorLog: [],
    },
  });

  revalidatePath("/dashboard/video");
  revalidatePath(`/dashboard/video/${videoJobId}`);
  revalidatePath("/dashboard/video/renders");

  return { renderId: render.id };
}

export async function retryVideoRender(renderId: string): Promise<RenderActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const render = await prisma.videoRender.findFirst({
    where: { id: renderId, userId: session.user.id },
    select: { id: true, status: true, videoJobId: true },
  });

  if (!render) {
    return { ok: false, error: "Render not found." };
  }

  if (render.status !== "FAILED") {
    return { ok: false, error: "Only failed renders can be retried." };
  }

  try {
    await renderVideo(renderId, session.user.id);
    revalidatePath(`/dashboard/video/${render.videoJobId}`);
    revalidatePath("/dashboard/video/renders");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteVideoRender(renderId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const render = await prisma.videoRender.findFirst({
    where: { id: renderId, userId: session.user.id },
    select: { id: true, videoJobId: true },
  });

  await prisma.videoRender.deleteMany({
    where: { id: renderId, userId: session.user.id },
  });

  revalidatePath("/dashboard/video");
  revalidatePath("/dashboard/video/renders");
  if (render) {
    revalidatePath(`/dashboard/video/${render.videoJobId}`);
  }
  redirect(`/dashboard/video/${render?.videoJobId ?? ""}`);
}
