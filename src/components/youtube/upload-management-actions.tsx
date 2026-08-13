"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  cancelYoutubeUploadAction,
  publishYoutubeUploadNowAction,
  retryYoutubeUploadAction,
} from "@/features/youtube-upload/actions";

/**
 * Per-record management actions shown on the upload history page. Only the
 * operations valid for the current status are offered: cancelling a queued or
 * scheduled upload, publishing a scheduled upload immediately, or retrying a
 * terminal failure.
 */
export function UploadManagementActions({
  uploadId,
  status,
}: {
  uploadId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "The operation could not be completed.");
        return;
      }
      setNotice(message);
    });
  }

  const cancellable = status === "PENDING" || status === "SCHEDULED";
  const publishable = status === "SCHEDULED";
  const retryable = status === "FAILED";

  if (!cancellable && !publishable && !retryable) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {publishable ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(
                () => publishYoutubeUploadNowAction(uploadId),
                "Publishing now. Watch the status below."
              )
            }
          >
            {isPending ? "Publishing..." : "Publish now"}
          </Button>
        ) : null}
        {retryable ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => retryYoutubeUploadAction(uploadId), "Retrying the upload.")}
          >
            {isPending ? "Retrying..." : "Retry"}
          </Button>
        ) : null}
        {cancellable ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => cancelYoutubeUploadAction(uploadId), "Upload cancelled.")}
          >
            {isPending ? "Cancelling..." : "Cancel"}
          </Button>
        ) : null}
      </div>
      {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
