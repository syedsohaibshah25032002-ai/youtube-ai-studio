import type { MediaProvider } from "./types";
import { MockMediaProvider } from "./providers/mock";
import { OpenAIImagesProvider } from "./providers/openai-images";

/**
 * Resolves the active media provider from configuration.
 *
 * Set `MEDIA_PROVIDER` to `openai` (or `openai-compatible`) and provide
 * `MEDIA_API_KEY`, `MEDIA_BASE_URL` and `MEDIA_MODEL` to use a real provider.
 * Anything else falls back to the deterministic mock provider so the
 * application remains fully functional without credentials.
 */
export function getMediaProvider(): MediaProvider {
  const configured = (process.env.MEDIA_PROVIDER ?? "mock").toLowerCase();

  if (configured === "openai" || configured === "openai-compatible") {
    return new OpenAIImagesProvider();
  }

  return new MockMediaProvider();
}

export function isMediaConfigured(): boolean {
  return getMediaProvider().isConfigured();
}
