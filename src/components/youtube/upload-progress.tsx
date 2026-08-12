"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { UploadStatusBadge } from "@/components/youtube/upload-status-badge";
import { formatInTimeZone } from "@/lib/date";
import type { YoutubeUploadDisplay, YoutubeUploadStatus } from "@/features/youtube-upload/types";

const POLL_INTERVAL_MS = 1200;
const SCHEDULED_POLL_INTERVAL_MS = 30_000;
const MAX_POLLS = 400;

type UploadProgressProps = {
  uploadId: string;
  initialStatus: YoutubeUploadStatus;
  initialProgress: number;
};

const ACTIVE_STATUSES = ["PENDING", "SCHEDULED", "PROCESSING", "UPLOADING"];

export function UploadProgress({ uploadId, initialStatus, initialProgress }: UploadProgressProps) {
  const router = useRouter();
  const [upload, setUpload] = useState<YoutubeUploadDisplay | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const active = upload
    ? ACTIVE_STATUSES.includes(upload.status)
    : ACTIVE_STATUSES.includes(initialStatus);

  useEffect(() => {
    if (!active) {
      setUpload((current) => current ?? null);
      return;
    }

    let polls = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      polls += 1;
      if (polls > MAX_POLLS) {
        setGaveUp(true);
        return;
      }

      try {
        const response = await fetch(`/api/youtube/uploads/${uploadId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setGaveUp(true);
          return;
        }

        const data = (await response.json()) as { upload: YoutubeUploadDisplay };
        setUpload(data.upload);

        if (data.upload.status === "COMPLETED" || data.upload.status === "FAILED") {
          router.refresh();
          return;
        }
      } catch {
        setGaveUp(true);
        return;
      }

      const interval =
        upload?.status === "SCHEDULED" ? SCHEDULED_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
      window.setTimeout(poll, interval);
    };

    const timer = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, uploadId, router, upload?.status]);

  if (gaveUp) {
    return (
      <p className="text-muted-foreground text-sm">
        Live updates stopped. Reload the page to see the latest status.
      </p>
    );
  }

  const current = upload ?? {
    status: initialStatus,
    progress: initialProgress,
    stage: "",
    videoId: null,
    videoUrl: null,
    scheduledAt: null,
    timezone: "UTC",
    errorLog: [] as { action: string; message: string; at: string }[],
    title: "",
    id: uploadId,
  };

  const scheduled =
    current.status === "SCHEDULED"
      ? current.scheduledAt
        ? formatInTimeZone(new Date(current.scheduledAt), current.timezone)
        : null
      : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <UploadStatusBadge status={current.status as YoutubeUploadStatus} />
        <span className="text-muted-foreground text-sm">
          {current.status === "COMPLETED"
            ? "Published"
            : current.status === "FAILED"
              ? `${current.progress}%`
              : current.status === "SCHEDULED"
                ? `Scheduled for ${scheduled ?? "later"}`
                : `${current.stage || "Uploading..."} · ${current.progress}%`}
        </span>
      </div>
      <ProgressBar
        value={current.progress}
        indeterminate={
          (current.status === "UPLOADING" || current.status === "PROCESSING") &&
          current.progress < 5
        }
      />

      {current.status === "COMPLETED" && current.videoUrl ? (
        <div className="rounded-md border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm">
          <p className="font-medium text-emerald-700">Video published to YouTube</p>
          <a
            href={current.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-1 block hover:underline"
          >
            {current.videoUrl}
          </a>
          {current.videoId ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Video ID: <span className="font-mono">{current.videoId}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {current.status === "FAILED" && current.errorLog.length > 0 ? (
        <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3 text-xs">
          <p className="text-destructive font-medium">Upload failed</p>
          {current.errorLog.map((entry, index) => (
            <p key={index} className="text-muted-foreground mt-1">
              {entry.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
