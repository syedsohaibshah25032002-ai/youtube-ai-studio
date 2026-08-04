export type AiRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompletionOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiCompletion = {
  content: string;
  model: string;
  provider: string;
  usage?: AiUsage;
};

/**
 * Contract every AI provider must implement. Business logic depends only on
 * this interface, so new providers can be added without touching the pipeline.
 */
export interface AiProvider {
  /** Stable identifier persisted on jobs and results, e.g. "mock" or "openai". */
  readonly id: string;
  /** Human friendly label shown in the UI. */
  readonly label: string;
  /** Model used when the caller does not specify one. */
  readonly defaultModel: string;
  /** True when the provider has everything it needs (e.g. an API key). */
  isConfigured(): boolean;
  /**
   * Sends a chat-style completion request and returns the assistant content.
   * Throws an `AiProviderError` when the upstream request fails.
   */
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<AiCompletion>;
}

export type AiProviderError = {
  code: "NOT_CONFIGURED" | "UPSTREAM" | "INVALID_RESPONSE" | "UNKNOWN";
  message: string;
  status?: number;
  cause?: unknown;
};
