import type { YoutubeVisibility } from "@/lib/youtube-connect/types";

export const YOUTUBE_UPLOAD_STATUSES = [
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
  "UPLOADING",
  "COMPLETED",
  "FAILED",
  "DUPLICATE",
] as const;

export type YoutubeUploadStatus = (typeof YOUTUBE_UPLOAD_STATUSES)[number];

export const YOUTUBE_UPLOAD_STATUS_LABELS: Record<YoutubeUploadStatus, string> = {
  PENDING: "Queued",
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  UPLOADING: "Uploading",
  COMPLETED: "Published",
  FAILED: "Failed",
  DUPLICATE: "Already published",
};

/**
 * Sanitized upload record returned by the API and UI. Never includes token
 * material, file paths or the encrypted credentials blob.
 */
export type YoutubeUploadDisplay = {
  id: string;
  renderId: string;
  videoJobId: string | null;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  visibility: YoutubeVisibility;
  status: YoutubeUploadStatus;
  progress: number;
  stage: string;
  videoId: string | null;
  videoUrl: string | null;
  scheduledAt: Date | null;
  timezone: string;
  errorLog: { action: string; message: string; at: string }[];
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Common YouTube video categories (IDs are stable in the Data API). A curated
 * subset is exposed in the UI while the full set can be provided later.
 */
export const YOUTUBE_CATEGORIES = [
  { id: "1", label: "Film & Animation" },
  { id: "2", label: "Autos & Vehicles" },
  { id: "10", label: "Music" },
  { id: "15", label: "Pets & Animals" },
  { id: "17", label: "Sports" },
  { id: "19", label: "Travel & Events" },
  { id: "20", label: "Gaming" },
  { id: "22", label: "People & Blogs" },
  { id: "23", label: "Comedy" },
  { id: "24", label: "Entertainment" },
  { id: "25", label: "News & Politics" },
  { id: "26", label: "Howto & Style" },
  { id: "27", label: "Education" },
  { id: "28", label: "Science & Technology" },
  { id: "29", label: "Nonprofits & Activism" },
  { id: "30", label: "Movies" },
] as const;

/**
 * Curated IANA timezone list offered in the scheduling UI. The displayed label
 * names match the IANA `tzdata` keys so the queue can compute exact publish
 * instants across daylight-saving boundaries.
 */
export const YOUTUBE_TIMEZONES = [
  { id: "UTC", label: "(UTC) Coordinated Universal Time" },
  { id: "America/Los_Angeles", label: "(UTC-08:00) Los Angeles" },
  { id: "America/Denver", label: "(UTC-07:00) Denver" },
  { id: "America/Chicago", label: "(UTC-06:00) Chicago" },
  { id: "America/New_York", label: "(UTC-05:00) New York" },
  { id: "America/Sao_Paulo", label: "(UTC-03:00) São Paulo" },
  { id: "Europe/London", label: "(UTC+00:00) London" },
  { id: "Europe/Paris", label: "(UTC+01:00) Paris" },
  { id: "Europe/Berlin", label: "(UTC+01:00) Berlin" },
  { id: "Europe/Madrid", label: "(UTC+01:00) Madrid" },
  { id: "Europe/Rome", label: "(UTC+01:00) Rome" },
  { id: "Europe/Moscow", label: "(UTC+03:00) Moscow" },
  { id: "Asia/Dubai", label: "(UTC+04:00) Dubai" },
  { id: "Asia/Kolkata", label: "(UTC+05:30) Kolkata" },
  { id: "Asia/Singapore", label: "(UTC+08:00) Singapore" },
  { id: "Asia/Hong_Kong", label: "(UTC+08:00) Hong Kong" },
  { id: "Asia/Shanghai", label: "(UTC+08:00) Shanghai" },
  { id: "Asia/Tokyo", label: "(UTC+09:00) Tokyo" },
  { id: "Asia/Seoul", label: "(UTC+09:00) Seoul" },
  { id: "Australia/Sydney", label: "(UTC+10:00) Sydney" },
] as const;
