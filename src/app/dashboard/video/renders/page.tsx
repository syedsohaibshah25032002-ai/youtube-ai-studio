import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { RenderRunCard } from "@/components/video/render-run-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Render History",
  description: "History of every MP4 render.",
};

export default async function RenderHistoryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const runs = await prisma.videoRenderRun.findMany({
    where: { render: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: { render: { include: { videoJob: { select: { id: true, title: true } } } } },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Render History</h1>
          <p className="text-muted-foreground mt-1">
            Every MP4 render across your videos, including failures.
          </p>
        </div>
        <Button render={<Link href="/dashboard/video" />}>Video Studio</Button>
      </div>

      {runs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No renders yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Once you render videos, every attempt will be recorded here.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/video/new" />}>
            Create a video job
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {runs.map((run) => (
            <RenderRunCard
              key={run.id}
              jobId={run.render.videoJob.id}
              jobTitle={run.render.videoJob.title}
              status={run.status}
              provider={run.provider}
              model={run.model}
              resolution={run.resolution}
              errorLog={run.errorLog}
              outputPath={run.outputPath}
              durationSeconds={run.durationSeconds}
              width={run.width}
              height={run.height}
              previewImages={run.previewImages}
              startedAt={run.startedAt}
              finishedAt={run.finishedAt}
              createdAt={run.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
