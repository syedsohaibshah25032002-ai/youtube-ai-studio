import type { RenderResolution } from "@/lib/render/types";

export const RENDER_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export type RenderStatus = (typeof RENDER_STATUSES)[number];

export const RENDER_STATUS_LABELS: Record<RenderStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Rendering",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const RENDER_RESOLUTION_LABELS: Record<RenderResolution, string> = {
  "1080p": "1080p (Full HD)",
  "720p": "720p (HD)",
};

export type ErrorLogEntry = {
  action: string;
  message: string;
  at: string;
};
