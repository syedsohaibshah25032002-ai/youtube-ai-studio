import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoJobForm } from "@/components/video/video-job-form";
import { isVideoConfigured } from "@/lib/video";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "New video job",
  description: "Create a new AI-generated video from a completed content job.",
};

export default async function NewVideoJobPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const completedJobs = await prisma.aiJob.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true },
  });

  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>New video job</CardTitle>
          <CardDescription>
            {isVideoConfigured()
              ? "Videos are generated with your configured video provider."
              : "No video provider configured — deterministic mock videos are generated so you can explore the pipeline."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You need at least one completed content job before you can generate a video. Start a
              generation in the AI Engine and wait for it to finish.
            </p>
          ) : (
            <VideoJobForm completedJobs={completedJobs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
