import { prisma } from "@/lib/prisma";
import { getVideoProvider } from "@/lib/video";
import {
  CAPTION_STYLES,
  DEFAULT_VIDEO_CONFIG,
  TRANSITIONS,
  type CaptionStyle,
  type MediaAssetSummary,
  type Scene,
  type Transition,
  type VideoConfig,
} from "@/lib/video/types";
import { buildTimeline, sumSceneDuration } from "./timeline";
import type { ErrorLogEntry } from "./types";

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

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

/** Defensively parses the stored JSON config, falling back to defaults. */
export function readConfig(value: unknown): VideoConfig {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_VIDEO_CONFIG };
  }

  const raw = value as Partial<VideoConfig>;

  const transition: Transition = TRANSITIONS.includes(raw.transition as Transition)
    ? (raw.transition as Transition)
    : DEFAULT_VIDEO_CONFIG.transition;

  const captionStyle: CaptionStyle = CAPTION_STYLES.includes(raw.captions?.style as CaptionStyle)
    ? (raw.captions?.style as CaptionStyle)
    : DEFAULT_VIDEO_CONFIG.captions.style;

  return {
    imageDurationSeconds:
      typeof raw.imageDurationSeconds === "number"
        ? raw.imageDurationSeconds
        : DEFAULT_VIDEO_CONFIG.imageDurationSeconds,
    transition,
    captions: {
      enabled:
        typeof raw.captions?.enabled === "boolean"
          ? raw.captions.enabled
          : DEFAULT_VIDEO_CONFIG.captions.enabled,
      style: captionStyle,
    },
    music: {
      enabled:
        typeof raw.music?.enabled === "boolean"
          ? raw.music.enabled
          : DEFAULT_VIDEO_CONFIG.music.enabled,
      track:
        typeof raw.music?.track === "string" && raw.music.track.length > 0
          ? raw.music.track
          : DEFAULT_VIDEO_CONFIG.music.track,
      volume:
        typeof raw.music?.volume === "number"
          ? raw.music.volume
          : DEFAULT_VIDEO_CONFIG.music.volume,
    },
  };
}

export function readTimeline(value: unknown): Scene[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (scene): scene is Scene =>
      typeof scene === "object" &&
      scene !== null &&
      typeof (scene as Scene).id === "string" &&
      typeof (scene as Scene).text === "string" &&
      typeof (scene as Scene).durationSeconds === "number"
  );
}

async function collectMedia(userId: string): Promise<MediaAssetSummary[]> {
  const assets = await prisma.mediaAsset.findMany({
    where: { userId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mediaUrl: true,
      prompt: true,
      width: true,
      height: true,
    },
  });

  return assets;
}

async function collectScript(job: { script: string; aiJobId: string | null }): Promise<string> {
  if (job.script.trim().length > 0) {
    return job.script;
  }

  if (job.aiJobId) {
    const result = await prisma.aiSectionResult.findUnique({
      where: { jobId_section: { jobId: job.aiJobId, section: "script" } },
      select: { content: true },
    });

    if (result && typeof result.content === "string" && result.content.trim().length > 0) {
      return result.content;
    }
  }

  throw new Error(
    "No script is available. Create the video job from a completed content job that includes a script."
  );
}

/**
 * Runs one video generation for a job. A new `VideoGenerationRun` record is
 * created for every attempt so history is complete, and the job mirrors the
 * latest outcome. Each pipeline step is persisted so progress is recoverable.
 */
export async function generateVideo(jobId: string, userId: string): Promise<void> {
  const job = await prisma.videoJob.findFirst({ where: { id: jobId, userId } });

  if (!job) {
    throw new Error(`Video job ${jobId} not found.`);
  }

  const provider = getVideoProvider();

  const run = await prisma.videoGenerationRun.create({
    data: {
      videoJobId: jobId,
      status: "RUNNING",
      provider: provider.id,
      model: provider.defaultModel,
      progress: 0,
      timeline: [],
      startedAt: new Date(),
      errorLog: [],
    },
  });

  await prisma.videoJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      progress: 0,
      stage: "Preparing",
      provider: provider.id,
      model: provider.defaultModel,
      startedAt: new Date(),
    },
  });

  const updateJob = async (progress: number, stage: string) => {
    await prisma.videoJob.update({
      where: { id: jobId },
      data: { progress, stage },
    });
  };

  try {
    await updateJob(5, "Collecting script");
    const script = await collectScript(job);

    await updateJob(15, "Collecting media assets");
    const assets = await collectMedia(userId);

    await updateJob(25, "Building timeline");
    const config = readConfig(job.config);
    const timeline = buildTimeline(script, assets, config);
    await prisma.videoJob.update({ where: { id: jobId }, data: { script, timeline } });
    await prisma.videoGenerationRun.update({
      where: { id: run.id },
      data: { timeline },
    });

    const computedDuration = sumSceneDuration(timeline);

    await updateJob(40, "Rendering video");
    const result = await provider.generate({
      title: job.title,
      script,
      timeline,
      config,
      outputPath: `videos/${jobId}.mp4`,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      onProgress: async (progress, stage) => {
        await updateJob(40 + Math.round(progress * 0.5), stage ?? "Rendering video");
      },
    });

    const finishedAt = new Date();
    const duration = result.durationSeconds ?? computedDuration;

    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        stage: "Completed",
        outputPath: result.outputPath,
        durationSeconds: duration,
        width: result.width ?? DEFAULT_WIDTH,
        height: result.height ?? DEFAULT_HEIGHT,
        finishedAt,
      },
    });

    await prisma.videoGenerationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        progress: 100,
        outputPath: result.outputPath,
        durationSeconds: duration,
        width: result.width ?? DEFAULT_WIDTH,
        height: result.height ?? DEFAULT_HEIGHT,
        finishedAt,
      },
    });
  } catch (error) {
    const message = toErrorMessage(error);
    const entry: ErrorLogEntry = { action: "generate", message, at: new Date().toISOString() };
    const finishedAt = new Date();

    console.error(`[video] Job ${jobId} generation failed: ${message}`);

    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        stage: "Failed",
        errorLog: [...readErrorLog(job.errorLog), entry],
        finishedAt,
      },
    });

    await prisma.videoGenerationRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorLog: [entry], finishedAt },
    });
  }
}
