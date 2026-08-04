"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { retryJob } from "@/features/content-generator/actions";
import { RotateCcwIcon } from "lucide-react";

type RetryJobButtonProps = {
  jobId: string;
};

export function RetryJobButton({ jobId }: RetryJobButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryJob(jobId);
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
