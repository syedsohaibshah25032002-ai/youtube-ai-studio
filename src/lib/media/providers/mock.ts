import { hashString } from "@/lib/utils";
import type { MediaGenerationResult, MediaProvider, MediaRequest, MediaType } from "../types";

const MOCK_MODEL = "mock-1";

const DEFAULT_DIMENSIONS: Record<MediaType, { width: number; height: number }> = {
  thumbnail: { width: 1280, height: 720 },
  banner: { width: 2560, height: 1440 },
  avatar: { width: 200, height: 200 },
  cover: { width: 800, height: 450 },
  image: { width: 1024, height: 1024 },
};

const PALETTE = ["1f2937", "312e81", "7c2d12", "064e3b", "581c87", "134e4a", "78350f"];

/**
 * Deterministic provider used when no external media provider is configured.
 * Returns a placeholder image URL derived from the request so the whole media
 * engine is fully functional without credentials.
 */
export class MockMediaProvider implements MediaProvider {
  readonly id = "mock";
  readonly label = "Mock (no API key)";
  readonly defaultModel = MOCK_MODEL;

  isConfigured(): boolean {
    return true;
  }

  async generate(request: MediaRequest): Promise<MediaGenerationResult> {
    const hash = hashString(request.prompt.toLowerCase());
    const dimensions = this.resolveDimensions(request);

    const words = request.prompt.trim().split(/\s+/).slice(0, 3);
    const text = encodeURIComponent(words.join(" ").toUpperCase() || "MEDIA");
    const background = PALETTE[hash % PALETTE.length];

    return {
      url: `https://placehold.co/${dimensions.width}x${dimensions.height}/${background}/ffffff?text=${text}`,
      width: dimensions.width,
      height: dimensions.height,
      model: MOCK_MODEL,
      provider: this.id,
    };
  }

  private resolveDimensions(request: MediaRequest): { width: number; height: number } {
    if (request.width && request.height) {
      return { width: request.width, height: request.height };
    }

    return DEFAULT_DIMENSIONS[request.type];
  }
}
