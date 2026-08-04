import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteVideoForm } from "@/components/videos/delete-video-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Delete video",
  description: "Remove a video from your account.",
};

export default async function DeleteVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const video = await prisma.video.findFirst({
    where: { id, channel: { userId: session.user.id } },
    select: { id: true, title: true },
  });

  if (!video) {
    redirect("/dashboard/videos");
  }

  return (
    <div className="container mx-auto max-w-lg flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Delete video</CardTitle>
          <CardDescription>
            This will permanently remove the video from your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteVideoForm videoId={video.id} videoTitle={video.title} />
        </CardContent>
      </Card>
    </div>
  );
}
