import type { Scene, VideoConfig } from "@/lib/video/types";

export const RENDER_RESOLUTIONS = {
  "1080p": { width: 1920, height: 1080, label: "1080p (Full HD)" },
  "720p": { width: 1280, height: 720, label: "720p (HD)" },
} as const;

export type RenderResolution = keyof typeof RENDER_RESOLUTIONS;

export type RenderRequest = {
  title: string;
  script: string;
  timeline: Scene[];
  config: VideoConfig;
  resolution: RenderResolution;
  /** Preferred destination for the rendered file (the provider may override it). */
  outputPath: string;
  width: number;
  height: number;
  /**
   * Optional progress hook the provider can call while rendering so the job
   * can show live progress. Receives a 0-100 render percentage.
   */
  onProgress?: (progress: number, stage?: string) => void | Promise<void>;
};

export type RenderResult = {
  outputPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  previewImages: string[];
  model: string;
  provider: string;
};

export type RenderProviderError = {
  code: "NOT_CONFIGURED" | "UPSTREAM" | "INVALID_RESPONSE" | "UNKNOWN";
  message: string;
  status?: number;
  cause?: unknown;
};

/**
 * Contract every render provider must implement. Business logic depends only
 * on this interface, so new renderers can be plugged in without touching the
 * render engine.
 */
export interface RenderProvider {
  /** Stable identifier persisted on renders and runs, e.g. "ffmpeg" or "mock". */
  readonly id: string;
  /** Human friendly label shown in the UI. */
  readonly label: string;
  /** Model used when the caller does not specify one. */
  readonly defaultModel: string;
  /** True when the provider has everything it needs (e.g. an ffmpeg binary). */
  isConfigured(): boolean;
  /**
   * Renders an MP4 from the given timeline. Throws a `RenderProviderError`
   * when the render fails.
   */
  render(request: RenderRequest): Promise<RenderResult>;
}
