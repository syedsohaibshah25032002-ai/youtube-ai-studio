import { Badge } from "@/components/ui/badge";
import { MEDIA_STATUS_LABELS, type MediaStatus } from "@/features/media-engine/types";
import { Loader2Icon } from "lucide-react";

const STATUS_VARIANT: Record<MediaStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  RUNNING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function MediaStatusBadge({ status }: { status: string }) {
  const normalized = MEDIA_STATUS_LABELS[status as MediaStatus]
    ? (status as MediaStatus)
    : "PENDING";

  return (
    <Badge variant={STATUS_VARIANT[normalized]} className="gap-1.5">
      {normalized === "RUNNING" ? <Loader2Icon className="size-3 animate-spin" /> : null}
      {MEDIA_STATUS_LABELS[normalized]}
    </Badge>
  );
}
