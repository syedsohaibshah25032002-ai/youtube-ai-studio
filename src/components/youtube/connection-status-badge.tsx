import { Badge } from "@/components/ui/badge";
import {
  YOUTUBE_CONNECTION_STATUS_LABELS,
  type YoutubeConnectionStatus,
} from "@/features/youtube-connection/types";

const STATUS_VARIANT: Record<
  YoutubeConnectionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  CONNECTED: "default",
  EXPIRED: "destructive",
  REVOKED: "destructive",
  ERROR: "destructive",
  DISCONNECTED: "outline",
};

export function YoutubeConnectionStatusBadge({ status }: { status: string }) {
  const normalized = YOUTUBE_CONNECTION_STATUS_LABELS[status as YoutubeConnectionStatus]
    ? (status as YoutubeConnectionStatus)
    : "DISCONNECTED";

  return (
    <Badge variant={STATUS_VARIANT[normalized]} className="gap-1.5">
      {normalized === "CONNECTED" ? <span className="size-2 rounded-full bg-current" /> : null}
      {YOUTUBE_CONNECTION_STATUS_LABELS[normalized]}
    </Badge>
  );
}
