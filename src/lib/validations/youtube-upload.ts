import { z } from "zod";

export const youtubeVisibilityOptions = ["public", "private", "unlisted"] as const;

export const youtubeUploadSchema = z.object({
  renderId: z.string().min(1, "Choose a completed render to upload."),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().max(10000, "Description must be at most 10000 characters").default(""),
  tags: z.array(z.string().trim().max(100)).max(500).default([]),
  categoryId: z.string().default("22"),
  visibility: z.enum(youtubeVisibilityOptions).default("private"),
  thumbnailPath: z.string().trim().max(1024).default(""),
});

export type YoutubeUploadInput = z.infer<typeof youtubeUploadSchema>;
