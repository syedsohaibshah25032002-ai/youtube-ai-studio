import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadHistoryCard } from "@/components/youtube/upload-history-card";
import { UploadVideoForm } from "@/components/youtube/upload-video-form";
import { listUploadableRenders } from "@/features/youtube-upload/engine";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Publish to YouTube",
  description: "Upload completed renders to your connected YouTube channel.",
};

export default async function YoutubeUploadPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const connection = await prisma.youtubeConnection.findUnique({
    where: { userId: session.user.id },
    select: { status: true, channelName: true },
  });

  const connected = connection?.status === "CONNECTED";
  const renders = await listUploadableRenders(session.user.id);

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Publish to YouTube</h1>
        <p className="text-muted-foreground mt-2">
          Upload a completed render to your connected channel with full metadata and visibility
          control.
        </p>
      </div>

      {!connected ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">YouTube channel not connected</CardTitle>
            <CardDescription>
              Connect your channel before publishing. Once connected you can upload here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/api/youtube/connect" />}>Connect YouTube</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New upload</CardTitle>
              <CardDescription>
                {connection?.channelName
                  ? `Publishing to ${connection.channelName}`
                  : "Publishing to your connected channel"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadVideoForm
                renders={renders.map((render) => ({
                  id: render.id,
                  videoJobId: render.videoJob.id,
                  videoJobTitle: render.videoJob.title,
                  resolution: render.resolution,
                  finishedAt: render.finishedAt,
                }))}
                connected={connected}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <UploadHistoryCard />
          </div>
        </div>
      )}
    </div>
  );
}
