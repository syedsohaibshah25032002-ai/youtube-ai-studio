import { prisma } from "@/lib/prisma";
import { getRenderProvider } from "@/lib/render";
import { RENDER_RESOLUTIONS, type RenderResolution } from "@/lib/render/types";
import { readConfig, readTimeline } from "@/features/video-engine/generator";
import type { ErrorLogEntry } from "./types";

export function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function readErrorLog(value: unknown): ErrorLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is ErrorLogEntry =>
      typeof entry === "object" && entry !== null && "action" in entry && "message" in entry
  );
}

export function readPreviewImages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Runs one MP4 render for a render job. A new `VideoRenderRun` record is
 * created for every attempt so history is complete, and the render mirrors the
 * latest outcome. Each pipeline step is persisted so progress is recoverable.
 */
export async function renderVideo(renderId: string, userId: string): Promise<void> {
  const render = await prisma.videoRender.findFirst({
    where: { id: renderId, userId },
    include: { videoJob: true },
  });

  if (!render) {
    throw new Error(`Render ${renderId} not found.`);
  }

  const provider = getRenderProvider();

  const run = await prisma.videoRenderRun.create({
    data: {
      renderId,
      status: "RUNNING",
      provider: provider.id,
      model: provider.defaultModel,
      progress: 0,
      resolution: render.resolution as RenderResolution,
      previewImages: [],
      startedAt: new Date(),
      errorLog: [],
    },
  });

  await prisma.videoRender.update({
    where: { id: renderId },
    data: {
      status: "RUNNING",
      progress: 0,
      stage: "Preparing",
      provider: provider.id,
      model: provider.defaultModel,
      startedAt: new Date(),
    },
  });

  const updateRender = async (progress: number, stage: string) => {
    await prisma.videoRender.update({
      where: { id: renderId },
      data: { progress, stage },
    });
  };

  try {
    await updateRender(5, "Reading script");
    const script = render.videoJob?.script ?? "";

    await updateRender(15, "Collecting timeline");
    const timeline = readTimeline(render.videoJob?.timeline ?? []);

    await updateRender(25, "Preparing scenes");
    const config = readConfig(render.videoJob?.config);
    const resolution = RENDER_RESOLUTIONS[render.resolution as RenderResolution];

    await updateRender(40, "Rendering MP4");
    const result = await provider.render({
      title: render.videoJob?.title ?? "Generated video",
      script,
      timeline,
      config,
      resolution: render.resolution as RenderResolution,
      outputPath: `renders/${renderId}.mp4`,
      width: resolution.width,
      height: resolution.height,
      onProgress: async (progress, stage) => {
        await updateRender(40 + Math.round(progress * 0.6), stage ?? "Rendering MP4");
      },
    });

    const finishedAt = new Date();

    await prisma.videoRender.update({
      where: { id: renderId },
      data: {
        status: "COMPLETED",
        progress: 100,
        stage: "Completed",
        outputPath: result.outputPath,
        durationSeconds: result.durationSeconds,
        width: result.width,
        height: result.height,
        previewImages: result.previewImages,
        finishedAt,
      },
    });

    await prisma.videoRenderRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        outputPath: result.outputPath,
        durationSeconds: result.durationSeconds,
        width: result.width,
        height: result.height,
        previewImages: result.previewImages,
        finishedAt,
      },
    });
  } catch (error) {
    const message = toErrorMessage(error);
    const entry: ErrorLogEntry = { action: "render", message, at: new Date().toISOString() };
    const finishedAt = new Date();

    console.error(`[render] Render ${renderId} failed: ${message}`);

    await prisma.videoRender.update({
      where: { id: renderId },
      data: {
        status: "FAILED",
        stage: "Failed",
        errorLog: [...readErrorLog(render.errorLog), entry],
        finishedAt,
      },
    });

    await prisma.videoRenderRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorLog: [entry], finishedAt },
    });
  }
}
