import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  const [channelCount, videoCount, aiJobCount] = await Promise.all([
    prisma.channel.count({
      where: { userId: user.id },
    }),
    prisma.video.count({
      where: { channel: { userId: user.id } },
    }),
    prisma.aiJob.count({
      where: { userId: user.id },
    }),
  ]);

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.name ?? user.email}. Your workspace is ready.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-base">Next steps</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            YouTube publishing and AI integration are on the way.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
