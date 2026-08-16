"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 20_000;

type UploadHistoryAutoRefreshProps = {
  hasActive: boolean;
};

export function UploadHistoryAutoRefresh({ hasActive }: UploadHistoryAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasActive) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        router.refresh();
        schedule();
      }, POLL_INTERVAL_MS);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [hasActive, router]);

  return null;
}
