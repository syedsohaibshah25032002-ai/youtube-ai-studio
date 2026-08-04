import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { VideoForm } from "@/components/videos/video-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toDatetimeLocalValue } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { type VideoFormInput } from "@/lib/validations/video";

export const metadata: Metadata = {
  title: "Edit video",
  description: "Update a video for your connected channels.",
};

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const video = await prisma.video.findFirst({
    where: { id, channel: { userId: session.user.id } },
    include: { channel: { select: { name: true } } },
  });

  if (!video) {
    redirect("/dashboard/videos");
  }

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const initial: VideoFormInput = {
    channelId: video.channelId,
    title: video.title,
    description: video.description ?? "",
    tags: Array.isArray(video.tags) ? (video.tags as string[]) : [],
    categoryId: video.categoryId ?? "",
    visibility: video.visibility as VideoFormInput["visibility"],
    thumbnailUrl: video.thumbnailUrl ?? "",
    publishStatus: video.publishStatus as VideoFormInput["publishStatus"],
    scheduledAt: video.scheduledAt ? toDatetimeLocalValue(video.scheduledAt) : "",
  };

  return (
    <div className="container mx-auto max-w-3xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit video</CardTitle>
          <CardDescription>Update the details for {video.title}.</CardDescription>
        </CardHeader>
        <CardContent>
          <VideoForm mode="edit" videoId={video.id} channelOptions={channels} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
