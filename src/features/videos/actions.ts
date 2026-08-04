"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { videoFormSchema, type VideoFormInput } from "@/lib/validations/video";
import { getVideoInfo } from "@/lib/youtube";
import type { GetVideoInfoResult } from "@/lib/youtube/types";

export type VideoActionState = {
  error?: string;
};

export async function fetchVideoInfoAction(videoId: string): Promise<GetVideoInfoResult> {
  return getVideoInfo(videoId);
}

function parseSchedule(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveOwnedChannel(channelId: string, userId: string) {
  return prisma.channel.findFirst({
    where: { id: channelId, userId },
    select: { id: true },
  });
}

export async function createVideo(input: VideoFormInput): Promise<VideoActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = videoFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the video details." };
  }

  const data = parsed.data;

  const channel = await resolveOwnedChannel(data.channelId, session.user.id);
  if (!channel) {
    return { error: "Channel not found." };
  }

  const scheduledAt = data.publishStatus === "scheduled" ? parseSchedule(data.scheduledAt) : null;
  const publishedAt = data.publishStatus === "published" ? new Date() : null;

  await prisma.video.create({
    data: {
      channelId: data.channelId,
      title: data.title,
      description: data.description || null,
      tags: data.tags,
      categoryId: data.categoryId || null,
      visibility: data.visibility,
      thumbnailUrl: data.thumbnailUrl || null,
      publishStatus: data.publishStatus,
      scheduledAt,
      publishedAt,
    },
  });

  revalidatePath("/dashboard/videos");
  redirect("/dashboard/videos");
}

export async function updateVideo(
  videoId: string,
  input: VideoFormInput
): Promise<VideoActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = videoFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the video details." };
  }

  const data = parsed.data;

  const video = await prisma.video.findFirst({
    where: { id: videoId, channel: { userId: session.user.id } },
    select: { id: true, publishedAt: true },
  });

  if (!video) {
    return { error: "Video not found." };
  }

  const channel = await resolveOwnedChannel(data.channelId, session.user.id);
  if (!channel) {
    return { error: "Channel not found." };
  }

  const scheduledAt = data.publishStatus === "scheduled" ? parseSchedule(data.scheduledAt) : null;
  const publishedAt = data.publishStatus === "published" ? (video.publishedAt ?? new Date()) : null;

  await prisma.video.update({
    where: { id: videoId },
    data: {
      channelId: data.channelId,
      title: data.title,
      description: data.description || null,
      tags: data.tags,
      categoryId: data.categoryId || null,
      visibility: data.visibility,
      thumbnailUrl: data.thumbnailUrl || null,
      publishStatus: data.publishStatus,
      scheduledAt,
      publishedAt,
    },
  });

  revalidatePath("/dashboard/videos");
  redirect("/dashboard/videos");
}

export async function deleteVideo(videoId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.video.deleteMany({
    where: { id: videoId, channel: { userId: session.user.id } },
  });

  revalidatePath("/dashboard/videos");
  redirect("/dashboard/videos");
}
