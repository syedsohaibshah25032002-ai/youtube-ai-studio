import Link from "next/link";

import { JobStatusBadge } from "@/components/ai/job-status-badge";
import { ProgressBar } from "@/components/ai/progress-bar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";

type JobCardProps = {
  id: string;
  topic: string;
  status: string;
  progress: number;
  provider: string;
  createdAt: Date;
};

export function JobCard({ id, topic, status, progress, provider, createdAt }: JobCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SparklesIcon className="text-primary size-4 shrink-0" />
            <span className="line-clamp-2">{topic}</span>
          </CardTitle>
          <JobStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ProgressBar value={progress} />
        <p className="text-muted-foreground text-xs">
          {status === "RUNNING"
            ? `Generating... ${progress}%`
            : status === "COMPLETED"
              ? "All sections generated"
              : status === "FAILED"
                ? "Generation failed — view details to retry"
                : "Waiting to start"}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {provider} · {formatDate(createdAt)}
        </span>
        <Link
          href={`/dashboard/ai/jobs/${id}`}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
        >
          View
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
