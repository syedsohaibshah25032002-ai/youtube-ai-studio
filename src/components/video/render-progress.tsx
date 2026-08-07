"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { RenderStatusBadge } from "@/components/video/render-status-badge";
import type { RenderStatus } from "@/features/render-engine/types";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 400;

type RenderProgressProps = {
  renderId: string;
  initialStatus: string;
  initialProgress: number;
};

export function RenderProgress({ renderId, initialStatus, initialProgress }: RenderProgressProps) {
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
        const response = await fetch(`/api/video/renders/${renderId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setGaveUp(true);
          return;
        }

        const data = (await response.json()) as {
          status: RenderStatus;
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
  }, [active, renderId, router]);

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
        <RenderStatusBadge status={status} />
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
