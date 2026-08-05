"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { MediaStatusBadge } from "@/components/media/media-status-badge";
import type { MediaStatus } from "@/features/media-engine/types";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 200;

type AssetProgressProps = {
  assetId: string;
  initialStatus: string;
};

export function AssetProgress({ assetId, initialStatus }: AssetProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
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
        const response = await fetch(`/api/media/assets/${assetId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) {
          setGaveUp(true);
          return;
        }

        const data = (await response.json()) as { status: MediaStatus };
        setStatus(data.status);

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
  }, [active, assetId, router]);

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
        <MediaStatusBadge status={status} />
        {active ? <span className="text-muted-foreground text-sm">Generating...</span> : null}
      </div>
      <ProgressBar value={0} indeterminate={active} />
    </div>
  );
}
