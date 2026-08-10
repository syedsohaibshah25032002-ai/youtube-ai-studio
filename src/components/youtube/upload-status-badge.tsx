import { Badge } from "@/components/ui/badge";
import type { YoutubeUploadStatus } from "@/features/youtube-upload/types";

type UploadStatusBadgeProps = {
  status: YoutubeUploadStatus;
};

export function UploadStatusBadge({ status }: UploadStatusBadgeProps) {
  const variant = {
    PENDING: "secondary",
    UPLOADING: "default",
    COMPLETED: "outline",
    FAILED: "destructive",
    DUPLICATE: "outline",
  }[status] as "secondary" | "default" | "outline" | "destructive";

  const label = {
    PENDING: "Queued",
    UPLOADING: "Uploading",
    COMPLETED: "Published",
    FAILED: "Failed",
    DUPLICATE: "Already published",
  }[status];

  return <Badge variant={variant}>{label}</Badge>;
}
