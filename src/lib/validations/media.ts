import { z } from "zod";

import { MEDIA_TYPES } from "@/lib/media/types";

const optionalDimension = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : value),
  z.coerce
    .number()
    .int("Width must be a whole number")
    .positive("Width must be greater than 0")
    .max(8192, "Dimensions must be at most 8192")
    .optional()
);

export const mediaAssetSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters"),
  type: z.enum(MEDIA_TYPES).default("thumbnail"),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt is required")
    .max(2000, "Prompt must be at most 2000 characters"),
  width: optionalDimension,
  height: optionalDimension,
});

export type MediaAssetInput = z.infer<typeof mediaAssetSchema>;
