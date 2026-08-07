import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { RenderProvider, RenderRequest, RenderResult } from "../types";

const MOCK_MODEL = "mock-1";

const RENDER_TICKS = 5;
const TICK_DELAY_MS = 180;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Deterministic provider used when no ffmpeg binary is available. Simulates a
 * render with staged progress updates and writes a placeholder output file so
 * the render engine remains fully functional without a system renderer.
 */
export class MockRenderProvider implements RenderProvider {
  readonly id = "mock";
  readonly label = "Mock (no ffmpeg)";
  readonly defaultModel = MOCK_MODEL;

  isConfigured(): boolean {
    return true;
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    for (let tick = 1; tick <= RENDER_TICKS; tick += 1) {
      if (request.onProgress) {
        await request.onProgress(Math.round((tick / RENDER_TICKS) * 100));
      }
      await delay(TICK_DELAY_MS);
    }

    const total = request.timeline.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const transitionCount = Math.max(0, request.timeline.length - 1);
    const durationSeconds = Math.max(1, total - transitionCount);

    const outputFile = join(process.cwd(), "public", request.outputPath);
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, `mock render: ${request.title}\n`);

    const baseDir = dirname(outputFile);
    const renderId =
      outputFile
        .split("/")
        .pop()
        ?.replace(/\.mp4$/, "") ?? "render";
    const previewDir = join(baseDir, renderId, "previews");
    mkdirSync(previewDir, { recursive: true });

    const previewImages: string[] = [];
    for (let p = 1; p <= 4; p += 1) {
      const previewFile = join(previewDir, `preview-${p}.txt`);
      writeFileSync(previewFile, `mock preview ${p}\n`);
      previewImages.push(`/api/video/renders/${renderId}/previews/preview-${p}.txt`);
    }

    return {
      outputPath: `/api/video/renders/${renderId}/file`,
      durationSeconds,
      width: request.width,
      height: request.height,
      previewImages,
      model: MOCK_MODEL,
      provider: this.id,
    };
  }
}
