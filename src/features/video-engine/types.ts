import type { CaptionStyle, Transition } from "@/lib/video/types";

export const VIDEO_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const TRANSITION_LABELS: Record<Transition, string> = {
  cut: "Cut",
  fade: "Fade",
  dissolve: "Dissolve",
  slide: "Slide",
};

export const CAPTION_STYLE_LABELS: Record<CaptionStyle, string> = {
  "lower-third": "Lower third",
  center: "Center",
  bubble: "Bubble",
};

export const MUSIC_TRACKS = ["ambient", "upbeat", "cinematic", "lo-fi", "podcast"] as const;

export type ErrorLogEntry = {
  action: string;
  message: string;
  at: string;
};
