import type { VideoGenerationResult, VideoProvider, VideoRequest } from "../types";

const MOCK_MODEL = "mock-1";

const RENDER_TICKS = 5;
const TICK_DELAY_MS = 180;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Deterministic provider used when no external video provider is configured.
 * Simulates a render with staged progress updates and returns a mock output
 * path so the whole engine is fully functional without credentials.
 */
export class MockVideoProvider implements VideoProvider {
  readonly id = "mock";
  readonly label = "Mock (no API key)";
  readonly defaultModel = MOCK_MODEL;

  isConfigured(): boolean {
    return true;
  }

  async generate(request: VideoRequest): Promise<VideoGenerationResult> {
    for (let tick = 1; tick <= RENDER_TICKS; tick += 1) {
      if (request.onProgress) {
        await request.onProgress(Math.round((tick / RENDER_TICKS) * 100));
      }
      await delay(TICK_DELAY_MS);
    }

    const durationSeconds = request.timeline.reduce(
      (total, scene) => total + scene.durationSeconds,
      0
    );

    return {
      outputPath: `mock://${request.outputPath}`,
      durationSeconds,
      width: request.width,
      height: request.height,
      model: MOCK_MODEL,
      provider: this.id,
    };
  }
}
