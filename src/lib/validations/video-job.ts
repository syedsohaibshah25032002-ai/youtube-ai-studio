import { z } from "zod";

import { CAPTION_STYLES, DEFAULT_VIDEO_CONFIG, TRANSITIONS } from "@/lib/video/types";

const volume = z.coerce.number().min(0).max(1);

export const videoConfigSchema = z.object({
  imageDurationSeconds: z.coerce
    .number()
    .int("Image duration must be a whole number of seconds")
    .min(2, "Image duration must be at least 2 seconds")
    .max(15, "Image duration must be at most 15 seconds")
    .default(4),
  transition: z.enum(TRANSITIONS).default("fade"),
  captions: z
    .object({
      enabled: z.boolean().default(false),
      style: z.enum(CAPTION_STYLES).default("lower-third"),
    })
    .default({ enabled: false, style: "lower-third" }),
  music: z
    .object({
      enabled: z.boolean().default(false),
      track: z
        .string()
        .trim()
        .max(100, "Music track must be at most 100 characters")
        .default("ambient"),
      volume: volume.default(0.7),
    })
    .default({ enabled: false, track: "ambient", volume: 0.7 }),
});

export const videoJobSchema = z.object({
  aiJobId: z.string().trim().min(1, "Select a completed content job."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters"),
  config: videoConfigSchema.default(DEFAULT_VIDEO_CONFIG),
});

export type VideoJobInput = z.infer<typeof videoJobSchema>;
export type VideoConfigInput = z.infer<typeof videoConfigSchema>;
