import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { VideoForm } from "@/components/videos/video-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Add video",
  description: "Create a new video for one of your connected channels.",
};

export default async function NewVideoPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (channels.length === 0) {
    return (
      <div className="container mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Connect a channel first</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          You need at least one connected channel before you can add videos.
        </p>
        <Button className="mt-6" render={<Link href="/dashboard/channels/new" />}>
          Connect a channel
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Add a video</CardTitle>
          <CardDescription>
            Create a new video entry. Publishing to YouTube is coming in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoForm mode="create" channelOptions={channels} />
        </CardContent>
      </Card>
    </div>
  );
}
