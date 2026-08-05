import type { MediaType } from "@/lib/media/types";

export const MEDIA_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  thumbnail: "Thumbnail",
  banner: "Banner",
  avatar: "Avatar",
  cover: "Cover",
  image: "Image",
};

export type ErrorLogEntry = {
  action: string;
  message: string;
  at: string;
};
