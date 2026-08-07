import type { RenderProvider } from "./types";
import { FFmpegRenderProvider } from "./providers/ffmpeg";
import { MockRenderProvider } from "./providers/mock";

/**
 * Resolves the active render provider from configuration.
 *
 * Set `RENDER_PROVIDER` to `ffmpeg` to use the system binary, or `mock` to
 * simulate renders without an external renderer. When unset, the ffmpeg
 * provider is used when a binary is present and the mock provider otherwise,
 * so the application remains fully functional everywhere.
 */
export function getRenderProvider(): RenderProvider {
  const configured = (process.env.RENDER_PROVIDER ?? "").toLowerCase();

  if (configured === "mock") {
    return new MockRenderProvider();
  }

  if (configured === "ffmpeg") {
    return new FFmpegRenderProvider();
  }

  return isRenderConfigured() ? new FFmpegRenderProvider() : new MockRenderProvider();
}

export function isRenderConfigured(): boolean {
  return new FFmpegRenderProvider().isConfigured();
}
