import { join } from "node:path";

import { prisma } from "@/lib/prisma";
import { getYoutubeConnector } from "@/lib/youtube-connect";
import type { YoutubeUploadMetadata, YoutubeUploadResult } from "@/lib/youtube-connect/types";
import { resolveYoutubeAccessToken } from "@/features/youtube-connection/engine";
import type { YoutubeUploadInput } from "@/lib/validations/youtube-upload";
import {
  type YoutubeUploadDisplay,
  type YoutubeUploadStatus,
  YOUTUBE_UPLOAD_STATUSES,
} from "./types";

type ErrorLogEntry = {
  action: string;
  message: string;
  at: string;
};

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

export function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function isStatus(value: string): value is YoutubeUploadStatus {
  return (YOUTUBE_UPLOAD_STATUSES as readonly string[]).includes(value);
}

export function toUploadDisplay(upload: {
  id: string;
  renderId: string;
  videoJobId: string | null;
  title: string;
  description: string;
  tags: unknown;
  categoryId: string;
  visibility: string;
  status: string;
  progress: number;
  stage: string;
  videoId: string | null;
  videoUrl: string | null;
  errorLog: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): YoutubeUploadDisplay {
  return {
    id: upload.id,
    renderId: upload.renderId,
    videoJobId: upload.videoJobId,
    title: upload.title,
    description: upload.description,
    tags: readTags(upload.tags),
    categoryId: upload.categoryId,
    visibility: upload.visibility as YoutubeUploadDisplay["visibility"],
    status: isStatus(upload.status) ? upload.status : "FAILED",
    progress: upload.progress,
    stage: upload.stage,
    videoId: upload.videoId,
    videoUrl: upload.videoUrl,
    errorLog: readErrorLog(upload.errorLog),
    startedAt: upload.startedAt,
    finishedAt: upload.finishedAt,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

export type CreateUploadResult =
  { ok: true; upload: YoutubeUploadDisplay; duplicate: boolean } | { ok: false; error: string };

/**
 * Resolves the completed renders the user may publish. Renders already queued
 * or published are excluded so the same MP4 cannot be uploaded twice.
 */
export async function listUploadableRenders(userId: string) {
  const published = await prisma.youtubeUpload.findMany({
    where: { userId, status: { in: ["PENDING", "UPLOADING", "COMPLETED", "DUPLICATE"] } },
    select: { renderId: true },
  });
  const excluded = new Set(published.map((upload) => upload.renderId));

  const renders = await prisma.videoRender.findMany({
    where: { userId, status: "COMPLETED", outputPath: { not: null } },
    orderBy: { finishedAt: "desc" },
    include: { videoJob: { select: { id: true, title: true } } },
  });

  return renders.filter((render) => !excluded.has(render.id));
}

/**
 * Creates an upload record for a completed render. Duplicate uploads of the
 * same render are rejected with `duplicate: true`, returning the existing
 * record so the UI can show the already-published result.
 */
export async function createYoutubeUpload(
  userId: string,
  input: YoutubeUploadInput
): Promise<CreateUploadResult> {
  const render = await prisma.videoRender.findFirst({
    where: { id: input.renderId, userId, status: "COMPLETED", outputPath: { not: null } },
    include: { videoJob: { select: { id: true } } },
  });

  if (!render) {
    return { ok: false, error: "Choose a completed render that has a video file." };
  }

  const existing = await prisma.youtubeUpload.findUnique({
    where: { userId_renderId: { userId, renderId: render.id } },
  });

  if (existing && existing.status !== "FAILED") {
    return { ok: true, upload: toUploadDisplay(existing), duplicate: true };
  }

  const upload = await prisma.youtubeUpload.upsert({
    where: { userId_renderId: { userId, renderId: render.id } },
    create: {
      userId,
      renderId: render.id,
      videoJobId: render.videoJob.id,
      title: input.title,
      description: input.description,
      tags: input.tags,
      categoryId: input.categoryId,
      visibility: input.visibility,
      thumbnailPath: input.thumbnailPath || null,
      status: "PENDING",
      progress: 0,
      stage: "Waiting to start",
      errorLog: [],
    },
    update: {
      videoJobId: render.videoJob.id,
      title: input.title,
      description: input.description,
      tags: input.tags,
      categoryId: input.categoryId,
      visibility: input.visibility,
      thumbnailPath: input.thumbnailPath || null,
      status: "PENDING",
      progress: 0,
      stage: "Waiting to start",
      errorLog: [],
      videoId: null,
      videoUrl: null,
      startedAt: null,
      finishedAt: null,
    },
  });

  return { ok: true, upload: toUploadDisplay(upload), duplicate: false };
}

/**
 * Executes the upload for a queued record: resolves a fresh access token,
 * streams the rendered MP4 to YouTube with live progress, then publishes the
 * final video ID/URL. Never exposes token material.
 */
export async function runYoutubeUpload(uploadId: string, userId: string): Promise<void> {
  const upload = await prisma.youtubeUpload.findFirst({
    where: { id: uploadId, userId },
  });

  if (!upload) {
    throw new Error(`Upload ${uploadId} not found.`);
  }

  const startedAt = new Date();

  await prisma.youtubeUpload.update({
    where: { id: uploadId },
    data: { status: "UPLOADING", progress: 5, stage: "Resolving credentials", startedAt },
  });

  try {
    const { accessToken, connectionId } = await resolveYoutubeAccessToken(userId);

    const filePath = join(process.cwd(), "public", "renders", `${upload.renderId}.mp4`);
    const thumbnailPath = upload.thumbnailPath
      ? join(process.cwd(), "public", upload.thumbnailPath.replace(/^\/+/, ""))
      : null;

    const connector = getYoutubeConnector();

    const metadata: YoutubeUploadMetadata = {
      title: upload.title,
      description: upload.description,
      tags: readTags(upload.tags),
      categoryId: upload.categoryId,
      visibility: upload.visibility as YoutubeUploadMetadata["visibility"],
    };

    const result: YoutubeUploadResult = await connector.uploadVideo({
      accessToken,
      filePath,
      metadata,
      thumbnailPath,
      onProgress: async (progress, stage) => {
        await prisma.youtubeUpload.update({
          where: { id: uploadId },
          data: { progress, stage: stage ?? "Uploading" },
        });
      },
    });

    await prisma.youtubeUpload.update({
      where: { id: uploadId },
      data: {
        status: "COMPLETED",
        progress: 100,
        stage: "Published",
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        finishedAt: new Date(),
      },
    });

    await prisma.youtubeConnection.update({
      where: { id: connectionId },
      data: { lastError: null, lastCheckedAt: new Date() },
    });
  } catch (error) {
    const message = toErrorMessage(error);
    const entry: ErrorLogEntry = { action: "upload", message, at: new Date().toISOString() };

    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    const revoked = code === "TOKEN_REVOKED";

    console.error(`[youtube] Upload ${uploadId} failed: ${message}`);

    await prisma.youtubeUpload.update({
      where: { id: uploadId },
      data: {
        status: "FAILED",
        stage: revoked ? "Credentials revoked" : "Failed",
        errorLog: [...readErrorLog(upload.errorLog), entry],
        finishedAt: new Date(),
      },
    });

    const connection = await prisma.youtubeConnection.findUnique({ where: { userId } });
    if (connection) {
      await prisma.youtubeConnection.update({
        where: { id: connection.id },
        data: {
          status: revoked ? "REVOKED" : connection.status,
          lastError: message,
          lastCheckedAt: new Date(),
        },
      });
    }
  }
}
