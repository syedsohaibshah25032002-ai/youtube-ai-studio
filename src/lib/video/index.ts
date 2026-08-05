import type { VideoProvider } from "./types";
import { MockVideoProvider } from "./providers/mock";
import { OpenAICompatibleVideoProvider } from "./providers/openai-compatible";

/**
 * Resolves the active video provider from configuration.
 *
 * Set `VIDEO_PROVIDER` to `openai` (or `openai-compatible`) and provide
 * `VIDEO_API_KEY`, `VIDEO_BASE_URL` and `VIDEO_MODEL` to use a real provider.
 * Anything else falls back to the deterministic mock provider so the
 * application remains fully functional without credentials.
 */
export function getVideoProvider(): VideoProvider {
  const configured = (process.env.VIDEO_PROVIDER ?? "mock").toLowerCase();

  if (configured === "openai" || configured === "openai-compatible") {
    return new OpenAICompatibleVideoProvider();
  }

  return new MockVideoProvider();
}

export function isVideoConfigured(): boolean {
  return getVideoProvider().isConfigured();
}
