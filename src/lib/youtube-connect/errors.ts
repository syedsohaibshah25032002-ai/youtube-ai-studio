import type { YoutubeConnectorError } from "./types";

/**
 * Builds a `YoutubeConnectorError` used across the YouTube connectors. Thrown
 * errors are caught by the connection and upload engines and mapped to user
 * facing statuses without ever surfacing token material.
 */
export function toYoutubeConnectorError(
  code: YoutubeConnectorError["code"],
  message: string,
  status?: number,
  cause?: unknown
): YoutubeConnectorError {
  const error = new Error(message) as unknown as YoutubeConnectorError;
  error.code = code;
  error.status = status;
  error.cause = cause;
  return error;
}
