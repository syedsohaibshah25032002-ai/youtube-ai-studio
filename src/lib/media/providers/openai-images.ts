import type {
  MediaGenerationResult,
  MediaProvider,
  MediaProviderError,
  MediaRequest,
} from "../types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "dall-e-3";

const ALLOWED_SIZES = [
  "256x256",
  "512x512",
  "1024x1024",
  "1024x1792",
  "1792x1024",
  "1536x1024",
  "1024x1536",
];

type ImagesResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

function nearestAllowedSize(width: number, height: number): string {
  const requested = `${width}x${height}`;
  if (ALLOWED_SIZES.includes(requested)) {
    return requested;
  }

  const area = width * height;
  return ALLOWED_SIZES.reduce((closest, size) => {
    const [w, h] = size.split("x").map(Number);
    const currentDiff = Math.abs(w * h - area);
    const [cw, ch] = closest.split("x").map(Number);
    return currentDiff < Math.abs(cw * ch - area) ? size : closest;
  }, "1024x1024");
}

/**
 * OpenAI-compatible image generation provider. Works with OpenAI and any
 * compatible `/images/generations` endpoint by setting `MEDIA_BASE_URL`,
 * `MEDIA_API_KEY` and `MEDIA_MODEL`. Generated images are returned inline as
 * data URLs so no external storage is required.
 */
export class OpenAIImagesProvider implements MediaProvider {
  readonly id = "openai";
  readonly label = "OpenAI-compatible images";

  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = (process.env.MEDIA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = process.env.MEDIA_MODEL ?? DEFAULT_MODEL;
  }

  get defaultModel(): string {
    return this.model;
  }

  isConfigured(): boolean {
    return Boolean(process.env.MEDIA_API_KEY);
  }

  async generate(request: MediaRequest): Promise<MediaGenerationResult> {
    const apiKey = process.env.MEDIA_API_KEY;

    if (!apiKey) {
      throw this.error("NOT_CONFIGURED", "MEDIA_API_KEY is not configured.");
    }

    const width = request.width ?? 1024;
    const height = request.height ?? 1024;
    const size = nearestAllowedSize(width, height);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          prompt: request.prompt,
          n: 1,
          size,
          response_format: "b64_json",
        }),
      });
    } catch (cause) {
      throw this.error("UPSTREAM", "Request to the media provider failed.", undefined, cause);
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as ImagesResponse;
        detail = body.error?.message ?? "";
      } catch {
        detail = await response.text();
      }

      throw this.error(
        "UPSTREAM",
        `Media provider returned HTTP ${response.status}.${detail ? ` ${detail}` : ""}`,
        response.status
      );
    }

    const data = (await response.json()) as ImagesResponse;
    const encoded = data.data?.[0]?.b64_json;

    if (typeof encoded !== "string" || encoded.length === 0) {
      throw this.error("INVALID_RESPONSE", "Media provider returned an empty or invalid image.");
    }

    return {
      url: `data:image/png;base64,${encoded}`,
      width,
      height,
      model: this.model,
      provider: this.id,
    };
  }

  private error(
    code: MediaProviderError["code"],
    message: string,
    status?: number,
    cause?: unknown
  ): MediaProviderError {
    return { code, message, status, cause };
  }
}
