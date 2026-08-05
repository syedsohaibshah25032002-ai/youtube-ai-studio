import Link from "next/link";

import { MediaStatusBadge } from "@/components/media/media-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readErrorLog } from "@/features/media-engine/generator";
import { formatDate } from "@/lib/date";
import { Clock3Icon } from "lucide-react";

type RunCardProps = {
  assetId: string;
  assetTitle: string;
  prompt: string;
  status: string;
  provider: string;
  model: string;
  errorLog: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

export function RunCard({
  assetId,
  assetTitle,
  prompt,
  status,
  provider,
  model,
  errorLog,
  startedAt,
  finishedAt,
  createdAt,
}: RunCardProps) {
  const errors = readErrorLog(errorLog);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">
            <Link
              href={`/dashboard/media/${assetId}`}
              className="hover:text-primary hover:underline"
            >
              {assetTitle}
            </Link>
          </CardTitle>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{prompt}</p>
        </div>
        <MediaStatusBadge status={status} />
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
        </div>
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
