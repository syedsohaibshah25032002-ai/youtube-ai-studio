import { Badge } from "@/components/ui/badge";
import {
  YOUTUBE_UPLOAD_STATUS_LABELS,
  type YoutubeUploadStatus,
} from "@/features/youtube-upload/types";

type UploadStatusBadgeProps = {
  status: YoutubeUploadStatus;
};

export function UploadStatusBadge({ status }: UploadStatusBadgeProps) {
  const variant = {
    PENDING: "secondary",
    SCHEDULED: "secondary",
    PROCESSING: "default",
    UPLOADING: "default",
    COMPLETED: "outline",
    FAILED: "destructive",
    CANCELLED: "outline",
    DUPLICATE: "outline",
  }[status] as "secondary" | "default" | "outline" | "destructive";

  return <Badge variant={variant}>{YOUTUBE_UPLOAD_STATUS_LABELS[status]}</Badge>;
}
