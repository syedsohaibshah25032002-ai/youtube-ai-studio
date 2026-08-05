export const TRANSITIONS = ["cut", "fade", "dissolve", "slide"] as const;

export type Transition = (typeof TRANSITIONS)[number];

export const CAPTION_STYLES = ["lower-third", "center", "bubble"] as const;

export type CaptionStyle = (typeof CAPTION_STYLES)[number];

export type CaptionConfig = {
  enabled: boolean;
  style: CaptionStyle;
};

export type MusicConfig = {
  enabled: boolean;
  track: string;
  volume: number;
};

export type VideoConfig = {
  imageDurationSeconds: number;
  transition: Transition;
  captions: CaptionConfig;
  music: MusicConfig;
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  imageDurationSeconds: 4,
  transition: "fade",
  captions: { enabled: false, style: "lower-third" },
  music: { enabled: false, track: "ambient", volume: 0.7 },
};

/** A single scene on the video timeline. */
export type Scene = {
  id: string;
  index: number;
  /** Narration / on-screen text derived from the script. */
  text: string;
  mediaAssetId?: string;
  mediaUrl?: string;
  prompt?: string;
  durationSeconds: number;
  transition: Transition;
  captions: Array<{ start: number; end: number; text: string }>;
};

/** A completed media asset eligible for the video timeline. */
export type MediaAssetSummary = {
  id: string;
  title: string;
  mediaUrl: string | null;
  prompt: string;
  width: number | null;
  height: number | null;
};

export type VideoRequest = {
  title: string;
  script: string;
  timeline: Scene[];
  config: VideoConfig;
  /** Preferred destination for the rendered file (the provider may override it). */
  outputPath: string;
  width: number;
  height: number;
  /**
   * Optional progress hook the provider can call while rendering so the job
   * page can show live progress. Receives a 0-100 render percentage.
   */
  onProgress?: (progress: number, stage?: string) => void | Promise<void>;
};

export type VideoGenerationResult = {
  outputPath: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  model: string;
  provider: string;
};

export type VideoProviderError = {
  code: "NOT_CONFIGURED" | "UPSTREAM" | "INVALID_RESPONSE" | "UNKNOWN";
  message: string;
  status?: number;
  cause?: unknown;
};

/**
 * Contract every video provider must implement. Business logic depends only on
 * this interface, so new providers can be plugged in without touching the
 * video generation engine.
 */
export interface VideoProvider {
  /** Stable identifier persisted on jobs and runs, e.g. "mock" or "openai". */
  readonly id: string;
  /** Human friendly label shown in the UI. */
  readonly label: string;
  /** Model used when the caller does not specify one. */
  readonly defaultModel: string;
  /** True when the provider has everything it needs (e.g. an API key). */
  isConfigured(): boolean;
  /**
   * Renders a video from the given timeline. Throws a `VideoProviderError`
   * when the upstream request fails.
   */
  generate(request: VideoRequest): Promise<VideoGenerationResult>;
}
