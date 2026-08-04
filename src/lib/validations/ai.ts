import { z } from "zod";

export const generationJobSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .max(500, "Topic must be at most 500 characters"),
  channelId: z.string().trim().max(100).default(""),
});

export type GenerationJobInput = z.infer<typeof generationJobSchema>;
