import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteVideoButton } from "@/components/video/delete-video-button";
import { GenerateVideoButton } from "@/components/video/generate-video-button";
import { RetryVideoButton } from "@/components/video/retry-video-button";
import { VideoJobProgress } from "@/components/video/video-job-progress";
import { VideoRunCard } from "@/components/video/video-run-card";
import { VideoStatusBadge } from "@/components/video/video-status-badge";
import { VideoTimeline } from "@/components/video/video-timeline";
import { CAPTION_STYLE_LABELS, TRANSITION_LABELS } from "@/features/video-engine/types";
import { readConfig, readErrorLog, readTimeline } from "@/features/video-engine/generator";
import { formatDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon, ClipboardXIcon, FilmIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Video job",
  description: "Review an AI-generated video job.",
};

export default async function VideoJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const job = await prisma.videoJob.findFirst({
    where: { id, userId: session.user.id },
    include: {
      runs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!job) {
    redirect("/dashboard/video");
  }

  const config = readConfig(job.config);
  const timeline = readTimeline(job.timeline);
  const errors = readErrorLog(job.errorLog);

  return (
    <div className="container mx-auto max-w-4xl flex-1 px-4 py-10">
      <Link
        href="/dashboard/video"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Video Studio
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <VideoStatusBadge status={job.status} />
            <span className="text-muted-foreground text-xs">
              {job.provider} / {job.model}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Created {formatDate(job.createdAt)} · {job.runs.length}{" "}
            {job.runs.length === 1 ? "generation" : "generations"}
            {job.durationSeconds ? ` · ${job.durationSeconds}s` : ""}
            {job.width && job.height ? ` · ${job.width}×${job.height}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateVideoButton jobId={job.id} />
          <DeleteVideoButton jobId={job.id} />
        </div>
      </div>

      <div className="mb-8">
        <VideoJobProgress
          jobId={job.id}
          initialStatus={job.status}
          initialProgress={job.progress}
        />
      </div>

      {job.status === "COMPLETED" ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FilmIcon className="size-4" />
              Generated video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {job.outputPath ? (
              <p className="text-muted-foreground text-sm">
                Output path: <span className="font-mono">{job.outputPath}</span>
              </p>
            ) : null}
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span>
                {job.provider} / {job.model}
              </span>
              {job.durationSeconds ? <span>Duration: {job.durationSeconds}s</span> : null}
              {job.width && job.height ? (
                <span>
                  Resolution: {job.width}×{job.height}
                </span>
              ) : null}
              {job.finishedAt ? <span>Finished {formatDate(job.finishedAt)}</span> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p className="text-muted-foreground flex justify-between">
              <span>Image duration</span>
              <span className="text-foreground">{config.imageDurationSeconds}s</span>
            </p>
            <p className="text-muted-foreground flex justify-between">
              <span>Transition</span>
              <span className="text-foreground">{TRANSITION_LABELS[config.transition]}</span>
            </p>
            <p className="text-muted-foreground flex justify-between">
              <span>Captions</span>
              <span className="text-foreground">
                {config.captions.enabled ? CAPTION_STYLE_LABELS[config.captions.style] : "Off"}
              </span>
            </p>
            <p className="text-muted-foreground flex justify-between">
              <span>Background music</span>
              <span className="text-foreground">
                {config.music.enabled ? config.music.track : "Off"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Script</CardTitle>
          </CardHeader>
          <CardContent>
            {job.script.trim().length === 0 ? (
              <p className="text-muted-foreground text-sm">No script collected yet.</p>
            ) : (
              <p className="text-muted-foreground line-clamp-6 text-sm whitespace-pre-wrap">
                {job.script}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {job.status === "FAILED" ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardXIcon className="size-4" />
              Generation failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No error details recorded.</p>
            ) : (
              errors.map((entry, index) => (
                <div
                  key={`${entry.action}-${entry.at}-${index}`}
                  className="bg-destructive/5 border-destructive/20 rounded-lg border p-3"
                >
                  <p className="text-muted-foreground text-sm">{entry.message}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(new Date(entry.at))}
                  </p>
                </div>
              ))
            )}
            <p className="text-muted-foreground pt-2 text-sm">
              Retry runs the full pipeline again: it recollects the script and media, rebuilds the
              timeline and renders a new attempt.
            </p>
            <RetryVideoButton jobId={job.id} />
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <Badge variant="outline">{timeline.length} scenes</Badge>
      </div>

      <div className="mb-8">
        <VideoTimeline scenes={timeline} musicEnabled={config.music.enabled} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Generation history</h2>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/video/history" />}>
          View all history
        </Button>
      </div>

      <div className="space-y-4">
        {job.runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No generations yet.</p>
        ) : (
          job.runs.map((run) => (
            <VideoRunCard
              key={run.id}
              jobId={job.id}
              jobTitle={job.title}
              status={run.status}
              provider={run.provider}
              model={run.model}
              errorLog={run.errorLog}
              outputPath={run.outputPath}
              durationSeconds={run.durationSeconds}
              startedAt={run.startedAt}
              finishedAt={run.finishedAt}
              createdAt={run.createdAt}
            />
          ))
        )}
      </div>
    </div>
  );
}
