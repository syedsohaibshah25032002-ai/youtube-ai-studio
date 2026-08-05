export const MEDIA_TYPES = ["thumbnail", "banner", "avatar", "cover", "image"] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export type MediaRequest = {
  prompt: string;
  type: MediaType;
  width?: number;
  height?: number;
};

export type MediaGenerationResult = {
  url: string;
  width?: number;
  height?: number;
  model: string;
  provider: string;
};

export type MediaProviderError = {
  code: "NOT_CONFIGURED" | "UPSTREAM" | "INVALID_RESPONSE" | "UNKNOWN";
  message: string;
  status?: number;
  cause?: unknown;
};

/**
 * Contract every media provider must implement. Business logic depends only
 * on this interface, so new providers can be plugged in without touching the
 * media engine.
 */
export interface MediaProvider {
  /** Stable identifier persisted on assets and runs, e.g. "mock" or "openai". */
  readonly id: string;
  /** Human friendly label shown in the UI. */
  readonly label: string;
  /** Model used when the caller does not specify one. */
  readonly defaultModel: string;
  /** True when the provider has everything it needs (e.g. an API key). */
  isConfigured(): boolean;
  /**
   * Generates a media asset from a prompt. Throws a `MediaProviderError` when
   * the upstream request fails.
   */
  generate(request: MediaRequest): Promise<MediaGenerationResult>;
}
