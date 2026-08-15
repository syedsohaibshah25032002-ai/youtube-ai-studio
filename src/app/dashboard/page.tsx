import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toConnectionDisplay } from "@/features/youtube-connection/engine";
import { YoutubeConnectionCard } from "@/components/youtube/youtube-connection-card";
import { prisma } from "@/lib/prisma";

function getConnectionMessage(searchParams: Record<string, string | string[] | undefined>): {
  kind: "success" | "error" | null;
  message: string;
} {
  if (searchParams.connected === "1") {
    return { kind: "success", message: "YouTube channel connected successfully." };
  }

  const errorParam = Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error;

  if (errorParam === "access-denied") {
    return { kind: "error", message: "Connection cancelled. Authorize the app to continue." };
  }

  if (errorParam === "state-mismatch") {
    return { kind: "error", message: "Connection failed because the request expired. Try again." };
  }

  if (errorParam === "not-configured") {
    return {
      kind: "error",
      message: "YouTube connection is not configured on this instance yet.",
    };
  }

  if (typeof errorParam === "string" && errorParam.startsWith("connect-failed:")) {
    const detail = errorParam.slice("connect-failed:".length).replaceAll("%20", " ");
    return { kind: "error", message: `Connection failed: ${detail}` };
  }

  return { kind: null, message: "" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const params = await searchParams;
  const message = getConnectionMessage(params);

  const [
    channelCount,
    videoCount,
    aiJobCount,
    mediaAssetCount,
    videoJobCount,
    renderCount,
    youtubeUploadCount,
  ] = await Promise.all([
    prisma.channel.count({
      where: { userId: user.id },
    }),
    prisma.video.count({
      where: { channel: { userId: user.id } },
    }),
    prisma.aiJob.count({
      where: { userId: user.id },
    }),
    prisma.mediaAsset.count({
      where: { userId: user.id },
    }),
    prisma.videoJob.count({
      where: { userId: user.id },
    }),
    prisma.videoRender.count({
      where: { userId: user.id },
    }),
    prisma.youtubeUpload.count({
      where: { userId: user.id },
    }),
  ]);

  const youtubeConnection = await prisma.youtubeConnection.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.name ?? user.email}. Your workspace is ready.
        </p>
      </div>

      {message.kind ? (
        <div
          className={
            message.kind === "success"
              ? "rounded-md border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm"
              : "border-destructive/30 bg-destructive/10 rounded-md border p-3 text-sm"
          }
        >
          <p
            className={
              message.kind === "success"
                ? "font-medium text-emerald-700"
                : "text-destructive font-medium"
            }
          >
            {message.message}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <YoutubeConnectionCard connection={toConnectionDisplay(youtubeConnection)} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your profile</CardTitle>
            <CardDescription>Signed in as</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{user.name ?? "No name set"}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels</CardTitle>
            <CardDescription>
              {channelCount === 0
                ? "No channels connected yet"
                : `${channelCount} connected ${channelCount === 1 ? "channel" : "channels"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={channelCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/channels" />}
            >
              {channelCount === 0 ? "Connect a channel" : "Manage channels"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Videos</CardTitle>
            <CardDescription>
              {videoCount === 0
                ? "No videos yet"
                : `${videoCount} ${videoCount === 1 ? "video" : "videos"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={videoCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/videos" />}
            >
              {videoCount === 0 ? "Add a video" : "Manage videos"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Content Engine</CardTitle>
            <CardDescription>
              {aiJobCount === 0
                ? "No generations yet"
                : `${aiJobCount} ${aiJobCount === 1 ? "generation" : "generations"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={aiJobCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/ai" />}
            >
              {aiJobCount === 0 ? "Start generating" : "Open AI Engine"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Media Library</CardTitle>
            <CardDescription>
              {mediaAssetCount === 0
                ? "No media yet"
                : `${mediaAssetCount} ${mediaAssetCount === 1 ? "asset" : "assets"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={mediaAssetCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/media" />}
            >
              {mediaAssetCount === 0 ? "Generate media" : "Open Media Library"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video Studio</CardTitle>
            <CardDescription>
              {videoJobCount === 0
                ? "No video jobs yet"
                : `${videoJobCount} ${videoJobCount === 1 ? "video job" : "video jobs"}`}
              {renderCount > 0
                ? ` · ${renderCount} ${renderCount === 1 ? "render" : "renders"}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={videoJobCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/video" />}
            >
              {videoJobCount === 0 ? "Generate a video" : "Open Video Studio"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">YouTube Publishing</CardTitle>
            <CardDescription>
              {youtubeUploadCount === 0
                ? "No uploads yet"
                : `${youtubeUploadCount} ${youtubeUploadCount === 1 ? "upload" : "uploads"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={youtubeUploadCount === 0 ? "default" : "outline"}
              size="sm"
              render={<Link href="/dashboard/youtube/upload" />}
            >
              {youtubeUploadCount === 0 ? "Publish a video" : "Manage uploads"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
