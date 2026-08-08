import type { YoutubeConnector } from "./types";
import { GoogleYoutubeConnector } from "./providers/google";
import { MockYoutubeConnector } from "./providers/mock";

/**
 * Resolves the active YouTube connector from configuration.
 *
 * Set `YOUTUBE_PROVIDER` to `google` to require real OAuth credentials, or
 * `mock` to simulate connections. When unset, the Google connector is used when
 * credentials are present and the mock connector otherwise, so the application
 * remains fully functional everywhere.
 */
export function getYoutubeConnector(): YoutubeConnector {
  const configured = (process.env.YOUTUBE_PROVIDER ?? "").toLowerCase();

  if (configured === "mock") {
    return new MockYoutubeConnector();
  }

  if (configured === "google") {
    return new GoogleYoutubeConnector();
  }

  return new GoogleYoutubeConnector().isConfigured()
    ? new GoogleYoutubeConnector()
    : new MockYoutubeConnector();
}

export function isYoutubeConfigured(): boolean {
  return new GoogleYoutubeConnector().isConfigured();
}
