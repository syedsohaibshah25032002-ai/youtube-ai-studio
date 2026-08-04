import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { VideoCard } from "@/components/videos/video-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Videos",
  description: "Manage the videos for your connected channels.",
};

export default async function VideosPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [videos, channelCount] = await Promise.all([
    prisma.video.findMany({
      where: { channel: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      include: { channel: { select: { name: true } } },
    }),
    prisma.channel.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground mt-1">
            Draft, schedule and publish videos for your connected channels.
          </p>
        </div>
        <Button render={<Link href="/dashboard/videos/new" />}>Add video</Button>
      </div>

      {videos.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">
            {channelCount === 0 ? "No channels connected yet" : "No videos yet"}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {channelCount === 0
              ? "Connect a channel before adding videos, then you can start creating content."
              : "Create your first video to start drafting, scheduling and publishing content."}
          </p>
          <Button
            className="mt-6"
            render={
              <Link
                href={channelCount === 0 ? "/dashboard/channels/new" : "/dashboard/videos/new"}
              />
            }
          >
            {channelCount === 0 ? "Connect a channel" : "Add your first video"}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              channelName={video.channel.name}
              thumbnailUrl={video.thumbnailUrl}
              visibility={video.visibility}
              publishStatus={video.publishStatus}
              scheduledAt={video.scheduledAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
