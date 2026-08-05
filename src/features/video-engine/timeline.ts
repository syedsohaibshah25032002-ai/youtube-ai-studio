import type { MediaAssetSummary, Scene, VideoConfig } from "@/lib/video/types";

const MAX_SCENES = 10;
const MIN_SCENE_LENGTH = 12;
const MAX_CAPTION_LENGTH = 90;

function toCaption(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  if (firstSentence.length <= MAX_CAPTION_LENGTH) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, MAX_CAPTION_LENGTH).trimEnd()}…`;
}

function extractParagraphs(script: string): string[] {
  const blocks = script
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .flatMap((block) => block.split(/\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^#{1,6}\s/.test(line))
    .filter((line) => line.length >= MIN_SCENE_LENGTH);
}

/**
 * Builds a deterministic scene timeline from a script and the user's completed
 * media assets. Media is assigned round-robin so every scene can show a
 * different image even with fewer assets than scenes.
 */
export function buildTimeline(
  script: string,
  assets: MediaAssetSummary[],
  config: VideoConfig
): Scene[] {
  const paragraphs = extractParagraphs(script);
  const source = paragraphs.length > 0 ? paragraphs : [script.trim() || configTitleFallback()];
  const scenes = source.slice(0, MAX_SCENES);

  return scenes.map((text, index) => {
    const scene: Scene = {
      id: `scene-${index + 1}`,
      index,
      text,
      durationSeconds: config.imageDurationSeconds,
      transition: config.transition,
      captions: [],
    };

    if (config.captions.enabled) {
      scene.captions = [{ start: 0, end: scene.durationSeconds, text: toCaption(scene.text) }];
    }

    if (assets.length > 0) {
      const asset = assets[index % assets.length];
      scene.mediaAssetId = asset.id;
      scene.mediaUrl = asset.mediaUrl ?? undefined;
      scene.prompt = asset.prompt;
    }

    return scene;
  });
}

function configTitleFallback(): string {
  return "Generated video scene";
}

export function sumSceneDuration(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.durationSeconds, 0);
}
