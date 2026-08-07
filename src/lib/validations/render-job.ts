import { z } from "zod";

export const renderJobSchema = z.object({
  videoJobId: z.string().min(1, "Choose a completed video job."),
  resolution: z.enum(["1080p", "720p"], { message: "Choose a resolution." }),
});

export type RenderJobInput = z.infer<typeof renderJobSchema>;
