"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { VideoStatusBadge } from "@/components/video/video-status-badge";
import type { VideoStatus } from "@/features/video-engine/types";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 200;

type VideoJobProgressProps = {
  jobId: string;
  initialStatus: string;
  initialProgress: number;
};

export function VideoJobProgress({ jobId, initialStatus, initialProgress }: VideoJobProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState("");
  const [gaveUp, setGaveUp] = useState(false);

  const active = status === "PENDING" || status === "RUNNING";

  useEffect(() => {
    if (!active) {
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
        const response = await fetch(`/api/video/jobs/${jobId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setGaveUp(true);
          return;
        }

        const data = (await response.json()) as {
          status: VideoStatus;
          progress: number;
          stage: string;
        };
        setStatus(data.status);
        setProgress(data.progress);
        setStage(data.stage);

        if (data.status === "COMPLETED" || data.status === "FAILED") {
          router.refresh();
          return;
        }
      } catch {
        setGaveUp(true);
        return;
      }

      window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    const timer = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, jobId, router]);

  if (gaveUp) {
    return (
      <p className="text-muted-foreground text-sm">
        Live updates stopped. Reload the page to see the latest status.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <VideoStatusBadge status={status} />
        <span className="text-muted-foreground text-sm">
          {status === "COMPLETED"
            ? "100%"
            : status === "FAILED"
              ? `${progress}%`
              : `${stage || "Rendering..."} · ${progress}%`}
        </span>
      </div>
      <ProgressBar value={progress} indeterminate={status === "RUNNING" && progress === 0} />
    </div>
  );
}
