import Link from "next/link";

import { ProgressBar } from "@/components/ai/progress-bar";
import { VideoStatusBadge } from "@/components/video/video-status-badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { ArrowRightIcon, ClapperboardIcon, PlayCircleIcon } from "lucide-react";

type VideoJobCardProps = {
  id: string;
  title: string;
  status: string;
  progress: number;
  stage: string;
  provider: string;
  createdAt: Date;
  /** YouTube watch URL when this job's render has been published. */
  youtubeVideoUrl?: string | null;
};

export function VideoJobCard({
  id,
  title,
  status,
  progress,
  stage,
  provider,
  createdAt,
  youtubeVideoUrl,
}: VideoJobCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClapperboardIcon className="text-primary size-4 shrink-0" />
            <span className="line-clamp-2">{title}</span>
          </CardTitle>
          <VideoStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ProgressBar value={progress} />
        <p className="text-muted-foreground text-xs">
          {status === "RUNNING"
            ? stage || `Rendering... ${progress}%`
            : status === "COMPLETED"
              ? "Video generated"
              : status === "FAILED"
                ? "Generation failed — view details to retry"
                : "Waiting to start"}
        </p>
        {youtubeVideoUrl ? (
          <a
            href={youtubeVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
          >
            <PlayCircleIcon className="size-3.5" />
            Published on YouTube
          </a>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {provider} · {formatDate(createdAt)}
        </span>
        <Link
          href={`/dashboard/video/${id}`}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
        >
          View
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
