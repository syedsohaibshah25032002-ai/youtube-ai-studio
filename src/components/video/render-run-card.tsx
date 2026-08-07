import Link from "next/link";

import { RenderStatusBadge } from "@/components/video/render-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readErrorLog, readPreviewImages } from "@/features/render-engine/engine";
import { RENDER_RESOLUTION_LABELS } from "@/features/render-engine/types";
import { formatDate } from "@/lib/date";
import { Clock3Icon, MonitorPlayIcon } from "lucide-react";

type RenderRunCardProps = {
  jobId: string;
  jobTitle: string;
  status: string;
  provider: string;
  model: string;
  resolution: string;
  errorLog: unknown;
  outputPath: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  previewImages: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

export function RenderRunCard({
  jobId,
  jobTitle,
  status,
  provider,
  model,
  resolution,
  errorLog,
  outputPath,
  durationSeconds,
  width,
  height,
  previewImages,
  startedAt,
  finishedAt,
  createdAt,
}: RenderRunCardProps) {
  const errors = readErrorLog(errorLog);
  const previews = readPreviewImages(previewImages);

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
        <RenderStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            {provider} / {model}
          </span>
          <span>
            {RENDER_RESOLUTION_LABELS[resolution as keyof typeof RENDER_RESOLUTION_LABELS] ??
              resolution}
          </span>
          <span className="flex items-center gap-1">
            <Clock3Icon className="size-3.5" />
            Started {startedAt ? formatDate(startedAt) : formatDate(createdAt)}
          </span>
          {finishedAt ? <span>Finished {formatDate(finishedAt)}</span> : null}
          {durationSeconds ? <span>{durationSeconds}s</span> : null}
          {width && height ? (
            <span>
              {width}×{height}
            </span>
          ) : null}
        </div>

        {previews.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previews.map((preview) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={preview}
                src={preview}
                alt="Render preview"
                className="bg-muted size-28 rounded-lg border object-cover"
              />
            ))}
          </div>
        ) : null}

        {outputPath ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground truncate text-xs">
              Output: <span className="font-mono">{outputPath}</span>
            </p>
            <Link
              href={outputPath}
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
              target="_blank"
            >
              <MonitorPlayIcon className="size-3.5" />
              Watch
            </Link>
          </div>
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
