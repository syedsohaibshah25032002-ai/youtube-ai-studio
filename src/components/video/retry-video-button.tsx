"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { retryVideoJob } from "@/features/video-engine/actions";
import { RotateCcwIcon } from "lucide-react";

type RetryVideoButtonProps = {
  jobId: string;
};

export function RetryVideoButton({ jobId }: RetryVideoButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryVideoJob(jobId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleRetry} disabled={isPending}>
        <RotateCcwIcon className={isPending ? "size-4 animate-spin" : "size-4"} />
        {isPending ? "Retrying..." : "Retry generation"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
