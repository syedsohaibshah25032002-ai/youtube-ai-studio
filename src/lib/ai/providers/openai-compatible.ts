import type {
  AiCompletion,
  AiCompletionOptions,
  AiMessage,
  AiProvider,
  AiProviderError,
} from "../types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

/**
 * OpenAI-compatible chat completions provider. Works with OpenAI and any
 * compatible endpoint (Azure, Ollama, local proxies, etc.) by setting
 * `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`.
 */
export class OpenAICompatibleProvider implements AiProvider {
  readonly id = "openai";
  readonly label = "OpenAI-compatible";

  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = process.env.AI_MODEL ?? DEFAULT_MODEL;
  }

  get defaultModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.AI_API_KEY);
  }

  async complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<AiCompletion> {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      throw this.error("NOT_CONFIGURED", "AI_API_KEY is not configured.");
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model ?? this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1500,
        }),
      });
    } catch (cause) {
      throw this.error("UPSTREAM", "Request to the AI provider failed.", undefined, cause);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as ChatCompletionResponse;
        detail = body.error?.message ?? "";
      } catch {
        detail = await response.text();
      }

      throw this.error(
        "UPSTREAM",
        `AI provider returned HTTP ${response.status}.${detail ? ` ${detail}` : ""}`,
        response.status
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.length === 0) {
      throw this.error("INVALID_RESPONSE", "AI provider returned an empty or invalid response.");
    }

    return {
      content,
      model: options?.model ?? this.model,
      provider: this.id,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  private error(
    code: AiProviderError["code"],
    message: string,
    status?: number,
    cause?: unknown
  ): AiProviderError {
    return { code, message, status, cause };
  }
}
