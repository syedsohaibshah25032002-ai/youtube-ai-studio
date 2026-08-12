import { processDueYoutubeUploads, toErrorMessage } from "./engine";

const DEFAULT_POLL_INTERVAL_MS = 30_000;

let started = false;
let timer: NodeJS.Timeout | null = null;

/**
 * Starts the YouTube publish queue worker. The sweep reads due uploads directly
 * from the database and claims each record atomically, so the queue survives
 * server restarts and never publishes before an upload's scheduled time. Safe to
 * call from every server instance; the atomic claim prevents duplicate work.
 */
export function startYoutubeUploadQueueWorker(): void {
  if (started) {
    return;
  }
  started = true;

  const intervalMs = Number(process.env.YOUTUBE_UPLOAD_QUEUE_POLL_MS ?? DEFAULT_POLL_INTERVAL_MS);
  const safeIntervalMs =
    Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_POLL_INTERVAL_MS;

  void sweep();

  timer = setInterval(() => {
    void sweep();
  }, safeIntervalMs);
  timer.unref();
}

async function sweep(): Promise<void> {
  try {
    const { claimed, remaining } = await processDueYoutubeUploads();
    if (claimed > 0 || remaining > 0) {
      console.log(
        `[youtube] Queue sweep claimed ${claimed} upload(s), ${remaining} not claimable.`
      );
    }
  } catch (error) {
    console.error(`[youtube] Queue sweep failed: ${toErrorMessage(error)}`);
  }
}

/** Stops the queue worker (used by tests and during shutdown). */
export function stopYoutubeUploadQueueWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}
