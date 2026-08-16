import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { VideoJobCard } from "@/components/video/video-job-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Video Studio",
  description: "Generate complete videos from your AI content.",
};

export default async function VideoStudioPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const jobs = await prisma.videoJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      progress: true,
      stage: true,
      provider: true,
      createdAt: true,
    },
  });

  const published = await prisma.youtubeUpload.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["COMPLETED", "DUPLICATE"] },
      videoJobId: { not: null },
    },
    select: { videoJobId: true, videoUrl: true },
  });

  const publishedUrls = new Map<string, string>();
  for (const upload of published) {
    if (upload.videoJobId && upload.videoUrl) {
      publishedUrls.set(upload.videoJobId, upload.videoUrl);
    }
  }

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Video Studio</h1>
          <p className="text-muted-foreground mt-1">
            Turn completed content jobs into video with timelines, transitions and captions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" render={<Link href="/dashboard/video/renders" />}>
            Render history
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/video/history" />}>
            Generation history
          </Button>
          <Button render={<Link href="/dashboard/video/new" />}>New video job</Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No video jobs yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Generate content in the AI Engine first, then turn it into a video with your media
            assets.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/video/new" />}>
            Create a video job
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <VideoJobCard
              key={job.id}
              id={job.id}
              title={job.title}
              status={job.status}
              progress={job.progress}
              stage={job.stage}
              provider={job.provider}
              createdAt={job.createdAt}
              youtubeVideoUrl={publishedUrls.get(job.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
