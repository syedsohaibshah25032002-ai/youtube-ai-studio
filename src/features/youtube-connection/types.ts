export const YOUTUBE_CONNECTION_STATUSES = [
  "CONNECTED",
  "EXPIRED",
  "REVOKED",
  "ERROR",
  "DISCONNECTED",
] as const;

export type YoutubeConnectionStatus = (typeof YOUTUBE_CONNECTION_STATUSES)[number];

export const YOUTUBE_CONNECTION_STATUS_LABELS: Record<YoutubeConnectionStatus, string> = {
  CONNECTED: "Connected",
  EXPIRED: "Token expired",
  REVOKED: "Access revoked",
  ERROR: "Connection error",
  DISCONNECTED: "Not connected",
};

export type ConnectionDisplay = {
  id: string | null;
  status: YoutubeConnectionStatus;
  channelId: string | null;
  channelName: string | null;
  channelUrl: string | null;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  provider: string | null;
  lastError: string | null;
  lastCheckedAt: Date | null;
  connectedAt: Date | null;
};
