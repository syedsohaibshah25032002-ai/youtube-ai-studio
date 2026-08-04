import { z } from "zod";

import { visibilityOptions } from "./channel";

export const publishStatuses = ["draft", "scheduled", "published"] as const;

const urlOrEmpty = (value: string) => value === "" || z.url().safeParse(value).success;

export const videoFormSchema = z
  .object({
    channelId: z.string().min(1, "Please choose a channel"),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z.string().max(10000, "Description must be at most 10000 characters").default(""),
    tags: z.array(z.string().max(100)).default([]),
    categoryId: z.string().default(""),
    visibility: z.enum(visibilityOptions).default("public"),
    thumbnailUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(urlOrEmpty, { message: "Thumbnail URL must be a valid URL" })
      .default(""),
    publishStatus: z.enum(publishStatuses).default("draft"),
    scheduledAt: z.string().trim().max(40).default(""),
  })
  .refine(
    (data) => data.publishStatus !== "scheduled" || !Number.isNaN(Date.parse(data.scheduledAt)),
    {
      message: "Please provide a valid schedule date",
      path: ["scheduledAt"],
    }
  );

export type VideoFormInput = z.infer<typeof videoFormSchema>;
