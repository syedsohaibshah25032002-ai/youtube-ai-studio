export const siteConfig = {
  name: "YouTube AI Studio",
  description: "AI-powered tools for YouTube creators",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
