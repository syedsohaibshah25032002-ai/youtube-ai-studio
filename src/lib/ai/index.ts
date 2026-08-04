import type { AiProvider } from "./types";
import { MockAiProvider } from "./providers/mock";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";

/**
 * Resolves the active AI provider from configuration.
 *
 * Set `AI_PROVIDER` to `openai` (or `openai-compatible`) and provide
 * `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL` to use a real provider.
 * Anything else falls back to the deterministic mock provider so the
 * application remains fully functional without credentials.
 */
export function getAiProvider(): AiProvider {
  const configured = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  if (configured === "openai" || configured === "openai-compatible") {
    return new OpenAICompatibleProvider();
  }

  return new MockAiProvider();
}

export function isAiConfigured(): boolean {
  return getAiProvider().isConfigured();
}
