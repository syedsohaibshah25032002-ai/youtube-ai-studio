/**
 * Automatic scheduler tuning. All values are env-overridable so the retry and
 * crash-recovery behaviour can be exercised quickly in tests and production
 * can use conservative defaults.
 */

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_BASE_MS = 60_000;
const DEFAULT_RETRY_MAX_MS = 3_600_000;
const DEFAULT_STALE_PROCESSING_MS = 600_000;

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Hard cap on how many times a single upload is processed. */
export function getMaxAttempts(): number {
  return Math.floor(readNumber("YOUTUBE_UPLOAD_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS));
}

/** Exponential backoff for the attempt-th retry (1-based), capped. */
export function getRetryDelayMs(attempt: number): number {
  const base = readNumber("YOUTUBE_UPLOAD_RETRY_BASE_MS", DEFAULT_RETRY_BASE_MS);
  const max = readNumber("YOUTUBE_UPLOAD_RETRY_MAX_MS", DEFAULT_RETRY_MAX_MS);
  const factor = Math.max(0, attempt - 1);
  return Math.min(max, base * 2 ** factor);
}

/**
 * A PROCESSING upload whose `updatedAt` heartbeat has not advanced within this
 * window is assumed crashed (server restarted mid-upload) and is reclaimed for
 * retry.
 */
export function getStaleProcessingMs(): number {
  return readNumber("YOUTUBE_UPLOAD_STALE_MS", DEFAULT_STALE_PROCESSING_MS);
}
