import { z } from "zod";

export const visibilityOptions = ["public", "unlisted", "private"] as const;

export const uploadDefaultsSchema = z.object({
  titleTemplate: z.string().max(200, "Title template must be at most 200 characters").default(""),
  descriptionTemplate: z
    .string()
    .max(5000, "Description template must be at most 5000 characters")
    .default(""),
  tags: z.array(z.string().max(100)).default([]),
  categoryId: z.string().default(""),
  visibility: z.enum(visibilityOptions).default("public"),
  language: z.string().default("en"),
});

export const channelSettingsSchema = z.object({
  defaultLanguage: z.string().default("en"),
  notifyOnPublish: z.boolean().default(true),
  autoPublish: z.boolean().default(false),
});

export const channelFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Channel name is required")
    .max(100, "Channel name must be at most 100 characters"),
  channelId: z
    .string()
    .trim()
    .min(1, "Channel ID is required")
    .max(100, "Channel ID must be at most 100 characters")
    .regex(
      /^[A-Za-z0-9_@-]+$/,
      "Channel ID may only contain letters, numbers, dashes, underscores and @"
    ),
  thumbnailUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || z.url().safeParse(value).success, {
      message: "Thumbnail URL must be a valid URL",
    })
    .default(""),
  subscriberCount: z.coerce
    .number()
    .int("Subscriber count must be a whole number")
    .min(0)
    .default(0),
  uploadDefaults: uploadDefaultsSchema,
  settings: channelSettingsSchema,
});

export type UploadDefaults = z.infer<typeof uploadDefaultsSchema>;
export type ChannelSettings = z.infer<typeof channelSettingsSchema>;
export type ChannelFormInput = z.infer<typeof channelFormSchema>;
