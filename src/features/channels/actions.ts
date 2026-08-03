"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { channelFormSchema, type ChannelFormInput } from "@/lib/validations/channel";
import { getChannelInfo } from "@/lib/youtube";
import type { GetChannelInfoResult } from "@/lib/youtube/types";

export type ChannelActionState = {
  error?: string;
};

export async function fetchChannelInfoAction(channelId: string): Promise<GetChannelInfoResult> {
  return getChannelInfo(channelId);
}

export async function createChannel(input: ChannelFormInput): Promise<ChannelActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = channelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the channel details." };
  }

  const data = parsed.data;

  const existing = await prisma.channel.findFirst({
    where: { userId: session.user.id, channelId: data.channelId },
    select: { id: true },
  });

  if (existing) {
    return { error: "You have already connected this channel." };
  }

  await prisma.channel.create({
    data: {
      userId: session.user.id,
      name: data.name,
      channelId: data.channelId,
      thumbnailUrl: data.thumbnailUrl || null,
      subscriberCount: data.subscriberCount,
      uploadDefaults: data.uploadDefaults,
      settings: data.settings,
    },
  });

  revalidatePath("/dashboard/channels");
  redirect("/dashboard/channels");
}

export async function updateChannel(
  channelId: string,
  input: ChannelFormInput
): Promise<ChannelActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = channelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the channel details." };
  }

  const data = parsed.data;

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, userId: session.user.id },
    select: { id: true },
  });

  if (!channel) {
    return { error: "Channel not found." };
  }

  const duplicate = await prisma.channel.findFirst({
    where: {
      userId: session.user.id,
      channelId: data.channelId,
      NOT: { id: channelId },
    },
    select: { id: true },
  });

  if (duplicate) {
    return { error: "You have already connected this channel." };
  }

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      name: data.name,
      channelId: data.channelId,
      thumbnailUrl: data.thumbnailUrl || null,
      subscriberCount: data.subscriberCount,
      uploadDefaults: data.uploadDefaults,
      settings: data.settings,
    },
  });

  revalidatePath("/dashboard/channels");
  redirect("/dashboard/channels");
}

export async function deleteChannel(channelId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.channel.deleteMany({
    where: { id: channelId, userId: session.user.id },
  });

  revalidatePath("/dashboard/channels");
  redirect("/dashboard/channels");
}
