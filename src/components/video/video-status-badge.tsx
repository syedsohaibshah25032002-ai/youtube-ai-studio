import { Badge } from "@/components/ui/badge";
import { VIDEO_STATUS_LABELS, type VideoStatus } from "@/features/video-engine/types";
import { Loader2Icon } from "lucide-react";

const STATUS_VARIANT: Record<VideoStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  RUNNING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function VideoStatusBadge({ status }: { status: string }) {
  const normalized = VIDEO_STATUS_LABELS[status as VideoStatus]
    ? (status as VideoStatus)
    : "PENDING";

  return (
    <Badge variant={STATUS_VARIANT[normalized]} className="gap-1.5">
      {normalized === "RUNNING" ? <Loader2Icon className="size-3 animate-spin" /> : null}
      {VIDEO_STATUS_LABELS[normalized]}
    </Badge>
  );
}
