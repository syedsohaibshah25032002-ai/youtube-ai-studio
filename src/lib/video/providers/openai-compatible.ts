import type {
  VideoGenerationResult,
  VideoProvider,
  VideoProviderError,
  VideoRequest,
} from "../types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "video-gen";

type VideoResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

/**
 * OpenAI-compatible video generation provider. Works with OpenAI and any
 * compatible `/videos/generations` endpoint by setting `VIDEO_BASE_URL`,
 * `VIDEO_API_KEY` and `VIDEO_MODEL`. The returned video is referenced by URL
 * (or inline data URL when returned as base64), so no local storage is needed.
 */
export class OpenAICompatibleVideoProvider implements VideoProvider {
  readonly id = "openai";
  readonly label = "OpenAI-compatible video";

  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = (process.env.VIDEO_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = process.env.VIDEO_MODEL ?? DEFAULT_MODEL;
  }

  get defaultModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.VIDEO_API_KEY);
  }

  async generate(request: VideoRequest): Promise<VideoGenerationResult> {
    const apiKey = process.env.VIDEO_API_KEY;

    if (!apiKey) {
      throw this.error("NOT_CONFIGURED", "VIDEO_API_KEY is not configured.");
    }

    const durationSeconds = request.timeline.reduce(
      (total, scene) => total + scene.durationSeconds,
      0
    );

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/videos/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.title,
          script: request.script,
          duration: durationSeconds,
          timeline: request.timeline.map((scene) => ({
            text: scene.text,
            duration: scene.durationSeconds,
            transition: scene.transition,
          })),
          n: 1,
        }),
      });
    } catch (cause) {
      throw this.error("UPSTREAM", "Request to the video provider failed.", undefined, cause);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as VideoResponse;
        detail = body.error?.message ?? "";
      } catch {
        detail = await response.text();
      }

      throw this.error(
        "UPSTREAM",
        `Video provider returned HTTP ${response.status}.${detail ? ` ${detail}` : ""}`,
        response.status
      );
    }

    const data = (await response.json()) as VideoResponse;
    const item = data.data?.[0];
    const url = item?.url;
    const encoded = item?.b64_json;

    let outputPath: string | null = null;
    if (typeof url === "string" && url.length > 0) {
      outputPath = url;
    } else if (typeof encoded === "string" && encoded.length > 0) {
      outputPath = `data:video/mp4;base64,${encoded}`;
    }

    if (!outputPath) {
      throw this.error("INVALID_RESPONSE", "Video provider returned an empty or invalid result.");
    }

    return {
      outputPath,
      width: request.width,
      height: request.height,
      model: this.model,
      provider: this.id,
    };
  }

  private error(
    code: VideoProviderError["code"],
    message: string,
    status?: number,
    cause?: unknown
  ): VideoProviderError {
    return { code, message, status, cause };
  }
}
