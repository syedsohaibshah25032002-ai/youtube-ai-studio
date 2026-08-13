import { join } from "node:path";

import { prisma } from "@/lib/prisma";
import { getYoutubeConnector } from "@/lib/youtube-connect";
import type { YoutubeUploadMetadata, YoutubeUploadResult } from "@/lib/youtube-connect/types";
import { resolveYoutubeAccessToken } from "@/features/youtube-connection/engine";
import { isValidTimeZone, zonedToUtc } from "@/lib/date";
import { getMaxAttempts, getRetryDelayMs, getStaleProcessingMs } from "./scheduler";
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

/** Statuses the queue may atomically claim for processing. */
const CLAIMABLE_STATUSES = ["PENDING", "SCHEDULED"] as const;

/** Statuses that mean a render is already queued or published. */
const BUSY_STATUSES = [
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
  "UPLOADING",
  "COMPLETED",
  "DUPLICATE",
] as const;

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
  scheduledAt: Date | null;
  timezone: string;
  attempts: number;
  nextAttemptAt: Date | null;
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
    scheduledAt: upload.scheduledAt,
    timezone: upload.timezone,
    attempts: upload.attempts,
    nextAttemptAt: upload.nextAttemptAt,
    errorLog: readErrorLog(upload.errorLog),
    startedAt: upload.startedAt,
    finishedAt: upload.finishedAt,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

export type CreateUploadResult =
  { ok: true; upload: YoutubeUploadDisplay; duplicate: boolean } | { ok: false; error: string };

type ResolvedSchedule = {
  status: "PENDING" | "SCHEDULED";
  scheduledAt: Date | null;
  timezone: string;
};

/**
 * Resolves an optional datetime-local value + IANA timezone into a stored UTC
 * instant and the initial queue status. A schedule in the future is queued as
 * SCHEDULED; anything else (missing or already due) publishes immediately.
 */
function resolveSchedule(input: YoutubeUploadInput): ResolvedSchedule {
  const timezone = input.timezone || "UTC";
  if (!isValidTimeZone(timezone)) {
    throw new Error("Pick a valid timezone for the scheduled publish.");
  }

  const raw = input.scheduledAt?.trim();
  if (!raw) {
    return { status: "PENDING", scheduledAt: null, timezone };
  }

  const scheduledAt = zonedToUtc(raw, timezone);
  const future = scheduledAt.getTime() > Date.now() + 1000;
  return {
    status: future ? "SCHEDULED" : "PENDING",
    scheduledAt: future ? scheduledAt : null,
    timezone,
  };
}

/**
 * Resolves the completed renders the user may publish. Renders already queued
 * or published are excluded so the same MP4 cannot be uploaded twice.
 */
export async function listUploadableRenders(userId: string) {
  const published = await prisma.youtubeUpload.findMany({
    where: { userId, status: { in: [...BUSY_STATUSES] } },
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

  let schedule: ResolvedSchedule;
  try {
    schedule = resolveSchedule(input);
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }

  const base = {
    videoJobId: render.videoJob.id,
    title: input.title,
    description: input.description,
    tags: input.tags,
    categoryId: input.categoryId,
    visibility: input.visibility,
    thumbnailPath: input.thumbnailPath || null,
    scheduledAt: schedule.scheduledAt,
    timezone: schedule.timezone,
  };

  const upload = await prisma.youtubeUpload.upsert({
    where: { userId_renderId: { userId, renderId: render.id } },
    create: {
      ...base,
      userId,
      renderId: render.id,
      status: schedule.status,
      progress: 0,
      stage: schedule.status === "SCHEDULED" ? "Scheduled" : "Waiting to start",
      errorLog: [],
    },
    update: {
      ...base,
      status: schedule.status,
      progress: 0,
      stage: schedule.status === "SCHEDULED" ? "Scheduled" : "Waiting to start",
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
 * Atomically claims a queued upload for processing. The transition only succeeds
 * when the record is still PENDING/SCHEDULED, its schedule (if any) is due and
 * its retry gate (`nextAttemptAt`) has passed. This means a future-scheduled
 * upload can never be started early, a retrying upload waits out its backoff,
 * and two workers can never process the same record concurrently. Each claim
 * increments the attempt counter. Returns true when this caller won the claim.
 */
export async function claimYoutubeUpload(uploadId: string, userId: string): Promise<boolean> {
  const now = new Date();
  const result = await prisma.youtubeUpload.updateMany({
    where: {
      id: uploadId,
      userId,
      status: { in: [...CLAIMABLE_STATUSES] },
      AND: [
        { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
        { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
      ],
    },
    data: {
      status: "PROCESSING",
      progress: 5,
      stage: "Resolving credentials",
      startedAt: now,
      attempts: { increment: 1 },
    },
  });
  return result.count === 1;
}

/**
 * Schedules a retry for a failed upload: returns it to a claimable status and
 * places the retry gate in the future so the sweep re-runs it after a backoff.
 * The record (and its full error history) is always preserved.
 */
async function scheduleRetry(uploadId: string, attempts: number, message: string): Promise<void> {
  const retryAt = new Date(Date.now() + getRetryDelayMs(attempts));
  const upload = await prisma.youtubeUpload.findUnique({ where: { id: uploadId } });

  await prisma.youtubeUpload.update({
    where: { id: uploadId },
    data: {
      status: upload?.scheduledAt ? "SCHEDULED" : "PENDING",
      progress: 0,
      stage: `Retry scheduled`,
      nextAttemptAt: retryAt,
      startedAt: null,
      errorLog: [
        ...readErrorLog(upload?.errorLog),
        {
          action: "retry",
          message,
          at: new Date().toISOString(),
        },
      ],
    },
  });
}

/**
 * Runs the actual upload for an already-claimed record: resolves a fresh access
 * token, streams the rendered MP4 to YouTube with live progress, then publishes
 * the final video ID/URL. Transient failures are retried automatically with
 * backoff; token revocation is terminal. The record is never lost. Never
 * exposes token material.
 */
export async function performYoutubeUpload(uploadId: string, userId: string): Promise<void> {
  const upload = await prisma.youtubeUpload.findFirst({
    where: { id: uploadId, userId },
  });

  if (!upload || upload.status !== "PROCESSING") {
    return;
  }

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
        nextAttemptAt: null,
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
    const attempts = upload.attempts;
    const retryable = !revoked && attempts < getMaxAttempts();

    console.error(`[youtube] Upload ${uploadId} failed (attempt ${attempts}): ${message}`);

    if (retryable) {
      await scheduleRetry(uploadId, attempts, message);
    } else {
      await prisma.youtubeUpload.update({
        where: { id: uploadId },
        data: {
          status: "FAILED",
          stage: revoked ? "Credentials revoked" : "Failed",
          nextAttemptAt: null,
          errorLog: [...readErrorLog(upload.errorLog), entry],
          finishedAt: new Date(),
        },
      });
    }

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

/**
 * Crash recovery: reclaims PROCESSING uploads whose progress heartbeat has not
 * advanced within the stale window (e.g. the server restarted mid-upload) and
 * returns them to a claimable status with a retry gate. The record is never
 * deleted and the failure is preserved in the error log.
 */
export async function reclaimStaleProcessingUploads(limit = 25): Promise<number> {
  const staleBefore = new Date(Date.now() - getStaleProcessingMs());
  const stale = await prisma.youtubeUpload.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
    orderBy: { updatedAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let reclaimed = 0;
  for (const upload of stale) {
    const current = await prisma.youtubeUpload.findUnique({
      where: { id: upload.id },
      select: { attempts: true, scheduledAt: true, errorLog: true },
    });
    if (!current) {
      continue;
    }

    const result = await prisma.youtubeUpload.updateMany({
      where: {
        id: upload.id,
        status: "PROCESSING",
        updatedAt: { lt: staleBefore },
      },
      data: {
        status: current.scheduledAt ? "SCHEDULED" : "PENDING",
        progress: 0,
        stage: "Reclaimed after interruption",
        nextAttemptAt: new Date(Date.now() + getRetryDelayMs(current.attempts)),
        startedAt: null,
        errorLog: [
          ...readErrorLog(current.errorLog),
          {
            action: "reclaim",
            message: "Processing was interrupted and reclaimed for retry.",
            at: new Date().toISOString(),
          },
        ],
      },
    });

    if (result.count === 1) {
      reclaimed += 1;
    }
  }

  return reclaimed;
}

/**
 * Claims a queued upload and starts the upload work without blocking the
 * caller. Safe to call from request handlers and the queue sweep alike; the
 * atomic claim guarantees only one runner performs the upload.
 */
export async function runYoutubeUpload(uploadId: string, userId: string): Promise<boolean> {
  const claimed = await claimYoutubeUpload(uploadId, userId);
  if (!claimed) {
    return false;
  }

  void performYoutubeUpload(uploadId, userId).catch((error) =>
    console.error(`[youtube] Upload ${uploadId} crashed: ${toErrorMessage(error)}`)
  );

  return true;
}

/**
 * Queue sweep: reclaims crashed PROCESSING uploads, then finds every upload
 * whose schedule (and retry gate, if any) is due and hands each off to a
 * claim + perform cycle. Called on a timer by the queue worker and safe to run
 * from multiple server instances because of the atomic claim.
 */
export async function processDueYoutubeUploads(
  userId?: string,
  limit = 10
): Promise<{ claimed: number; remaining: number; reclaimed: number }> {
  const reclaimed = await reclaimStaleProcessingUploads();
  const now = new Date();
  const due = await prisma.youtubeUpload.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: [...CLAIMABLE_STATUSES] },
      AND: [
        { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
        { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, userId: true },
  });

  let claimed = 0;
  for (const upload of due) {
    if (await runYoutubeUpload(upload.id, upload.userId)) {
      claimed += 1;
    }
  }

  return { claimed, remaining: due.length - claimed, reclaimed };
}
