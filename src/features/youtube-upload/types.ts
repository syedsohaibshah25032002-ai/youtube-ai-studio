import type { YoutubeVisibility } from "@/lib/youtube-connect/types";

export const YOUTUBE_UPLOAD_STATUSES = [
  "PENDING",
  "UPLOADING",
  "COMPLETED",
  "FAILED",
  "DUPLICATE",
] as const;

export type YoutubeUploadStatus = (typeof YOUTUBE_UPLOAD_STATUSES)[number];

export const YOUTUBE_UPLOAD_STATUS_LABELS: Record<YoutubeUploadStatus, string> = {
  PENDING: "Queued",
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
