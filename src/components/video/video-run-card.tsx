import Link from "next/link";

import { VideoStatusBadge } from "@/components/video/video-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readErrorLog } from "@/features/video-engine/generator";
import { formatDate } from "@/lib/date";
import { Clock3Icon, FilmIcon } from "lucide-react";

type VideoRunCardProps = {
  jobId: string;
  jobTitle: string;
  status: string;
  provider: string;
  model: string;
  errorLog: unknown;
  outputPath: string | null;
  durationSeconds: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

export function VideoRunCard({
  jobId,
  jobTitle,
  status,
  provider,
  model,
  errorLog,
  outputPath,
  durationSeconds,
  startedAt,
  finishedAt,
  createdAt,
}: VideoRunCardProps) {
  const errors = readErrorLog(errorLog);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">
            <Link href={`/dashboard/video/${jobId}`} className="hover:text-primary hover:underline">
              {jobTitle}
            </Link>
          </CardTitle>
        </div>
        <VideoStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            {provider} / {model}
          </span>
          <span className="flex items-center gap-1">
            <Clock3Icon className="size-3.5" />
            Started {startedAt ? formatDate(startedAt) : formatDate(createdAt)}
          </span>
          {finishedAt ? <span>Finished {formatDate(finishedAt)}</span> : null}
          {durationSeconds ? (
            <span className="flex items-center gap-1">
              <FilmIcon className="size-3.5" />
              {durationSeconds}s
            </span>
          ) : null}
        </div>
        {outputPath ? (
          <p className="text-muted-foreground truncate text-xs">
            Output: <span className="font-mono">{outputPath}</span>
          </p>
        ) : null}
        {errors.length > 0 ? (
          <div className="bg-destructive/5 border-destructive/20 rounded-lg border p-3">
            {errors.map((entry, index) => (
              <p key={`${entry.action}-${entry.at}-${index}`} className="text-destructive text-xs">
                {entry.message}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
