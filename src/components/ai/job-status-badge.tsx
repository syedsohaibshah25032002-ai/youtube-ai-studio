import { Badge } from "@/components/ui/badge";
import { Loader2Icon } from "lucide-react";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  RUNNING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function isJobStatus(value: string): value is JobStatus {
  return value in STATUS_LABEL;
}

export function JobStatusBadge({ status }: { status: string }) {
  const normalized: JobStatus = isJobStatus(status) ? status : "PENDING";

  return (
    <Badge variant={STATUS_VARIANT[normalized]} className="gap-1.5">
      {normalized === "RUNNING" ? <Loader2Icon className="size-3 animate-spin" /> : null}
      {STATUS_LABEL[normalized]}
    </Badge>
  );
}
