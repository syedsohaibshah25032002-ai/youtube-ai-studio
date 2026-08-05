import { getMediaProvider } from "@/lib/media";
import type { MediaType } from "@/lib/media/types";
import { prisma } from "@/lib/prisma";
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

/**
 * Runs one media generation for an asset. A new `MediaGenerationRun` record
 * is created for every attempt so the asset history is complete, and the asset
 * status mirrors the outcome. Failures are logged on both the run and asset.
 */
export async function generateAsset(assetId: string, userId: string): Promise<void> {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: assetId, userId },
  });

  if (!asset) {
    throw new Error(`Asset ${assetId} not found.`);
  }

  const provider = getMediaProvider();

  const run = await prisma.mediaGenerationRun.create({
    data: {
      assetId,
      status: "RUNNING",
      provider: provider.id,
      model: provider.defaultModel,
      prompt: asset.prompt,
      startedAt: new Date(),
      errorLog: [],
    },
  });

  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: { status: "RUNNING", provider: provider.id, model: provider.defaultModel },
  });

  try {
    const result = await provider.generate({
      prompt: asset.prompt,
      type: asset.type as MediaType,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
    });

    const finishedAt = new Date();

    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: "COMPLETED",
        mediaUrl: result.url,
        width: result.width,
        height: result.height,
        completedAt: finishedAt,
      },
    });

    await prisma.mediaGenerationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        mediaUrl: result.url,
        width: result.width,
        height: result.height,
        finishedAt,
      },
    });
  } catch (error) {
    const message = toErrorMessage(error);
    const entry: ErrorLogEntry = { action: "generate", message, at: new Date().toISOString() };
    const finishedAt = new Date();

    console.error(`[media] Asset ${assetId} generation failed: ${message}`);

    await prisma.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: "FAILED",
        errorLog: [...readErrorLog(asset.errorLog), entry],
      },
    });

    await prisma.mediaGenerationRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorLog: [entry], finishedAt },
    });
  }
}
