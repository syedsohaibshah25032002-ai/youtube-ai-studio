import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  RENDER_RESOLUTIONS,
  type RenderProvider,
  type RenderRequest,
  type RenderResult,
} from "../types";

const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FPS = 30;
const TRANSITION_DURATION = 1;
const PREVIEW_COUNT = 4;

const SCENE_COLORS = [
  "0x1e3a8a",
  "0x9a3412",
  "0x166534",
  "0x6d28d9",
  "0x0f766e",
  "0xa16207",
  "0xbe123c",
  "0x334155",
  "0x7c2d12",
  "0x1e40af",
];

const MUSIC_FREQUENCIES: Record<string, number> = {
  ambient: 220,
  upbeat: 440,
  cinematic: 165,
  "lo-fi": 110,
  podcast: 330,
};

const TRANSITION_NAMES: Record<string, string> = {
  fade: "fade",
  dissolve: "dissolve",
  slide: "slideleft",
};

const MOCK_MODEL = "ffmpeg-5.1";

/**
 * Escapes a string for use inside an ffmpeg drawtext filter value.
 */
function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/%/g, "\\%");
}

function runFfmpeg(args: string[], onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    let durationSeconds = 0;

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      const durationMatch = /Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/.exec(chunk.toString());
      if (durationMatch) {
        durationSeconds =
          Number(durationMatch[1]) * 3600 +
          Number(durationMatch[2]) * 60 +
          Number(durationMatch[3]);
      }
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stderr);
      } else {
        reject(
          new Error(`ffmpeg exited with code ${code}: ${stderr.split("\n").slice(-3).join("\n")}`)
        );
      }
    });

    if (onProgress) {
      const interval = setInterval(() => {
        const timeMatch = /time=(\d{2}):(\d{2}):(\d{2}\.\d+)/.exec(stderr);
        if (timeMatch && durationSeconds > 0) {
          const elapsed =
            Number(timeMatch[1]) * 3600 + Number(timeMatch[2]) * 60 + Number(timeMatch[3]);
          onProgress(Math.min(100, Math.round((elapsed / durationSeconds) * 100)));
        }
      }, 250);
      child.on("close", () => clearInterval(interval));
    }
  });
}

function isUsableMedia(mediaUrl: string | undefined): string | null {
  if (!mediaUrl || mediaUrl.startsWith("mock://")) {
    return null;
  }
  const path = mediaUrl.replace(/^file:\/\//, "");
  if (existsSync(path)) {
    return path;
  }
  return null;
}

/**
 * Real render provider backed by the system ffmpeg binary. Builds a single
 * filter graph that lays out every scene in timeline order, applies the
 * configured transition between scenes, overlays captions from the scene text
 * and optionally mixes a synthesized background track at the requested volume.
 */
export class FFmpegRenderProvider implements RenderProvider {
  readonly id = "ffmpeg";
  readonly label = "FFmpeg (local render)";
  readonly defaultModel = MOCK_MODEL;

  isConfigured(): boolean {
    return existsSync("/usr/bin/ffmpeg") || existsSync("/usr/local/bin/ffmpeg");
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    if (!this.isConfigured()) {
      throw new Error("ffmpeg is not installed on this machine.");
    }

    const resolution = RENDER_RESOLUTIONS[request.resolution];
    const width = request.width ?? resolution.width;
    const height = request.height ?? resolution.height;

    const outputFile = join(process.cwd(), "public", request.outputPath);
    mkdirSync(dirname(outputFile), { recursive: true });

    const total = request.timeline.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    const transitionCount = Math.max(0, request.timeline.length - 1);
    const outputDuration = Math.max(1, total - transitionCount * TRANSITION_DURATION);

    const inputs: string[] = [];
    const sceneFilters: string[] = [];
    const transitionChain: string[] = [];
    let inputCount = 0;
    let lastLabel = "v0";

    request.timeline.forEach((scene, index) => {
      const color = SCENE_COLORS[index % SCENE_COLORS.length];
      const mediaFile = isUsableMedia(scene.mediaUrl);

      const inputIndex = inputCount;
      if (mediaFile) {
        inputs.push("-loop", "1", "-i", mediaFile);
      } else {
        inputs.push(
          "-f",
          "lavfi",
          "-i",
          `color=c=${color}:s=${width}x${height}:r=${FPS}:d=${scene.durationSeconds}`
        );
      }
      inputCount += 1;

      const caption = scene.captions?.[0]?.text ?? scene.text;
      const filter = [
        `[${inputIndex}:v]drawtext=fontfile=${FONT}`,
        `text='${escapeDrawText(caption)}'`,
        `fontcolor=white:fontsize=${Math.round(height * 0.06)}`,
        `box=1:boxcolor=black@0.35:boxborderw=${Math.round(height * 0.015)}`,
        `x=(w-text_w)/2:y=${height - Math.round(height * 0.12)}`,
        `enable='between(t,0,${scene.durationSeconds})'`,
        `[s${index}]`,
      ].join(":");

      sceneFilters.push(filter);

      if (index === 0) {
        lastLabel = "s0";
      } else {
        const offset =
          request.timeline.slice(0, index).reduce((sum, s) => sum + s.durationSeconds, 0) -
          index * TRANSITION_DURATION;
        const transitionFilter =
          request.config.transition === "cut"
            ? `[${lastLabel}][s${index}]concat=n=2:v=1:a=0[v${index}]`
            : `[${lastLabel}][s${index}]xfade=transition=${TRANSITION_NAMES[request.config.transition] ?? "fade"}:duration=${TRANSITION_DURATION}:offset=${offset}[v${index}]`;
        transitionChain.push(transitionFilter);
        lastLabel = `v${index}`;
      }
    });

    let audioLabel: string | null = null;
    const audioInputIndex = inputCount;

    if (request.config.music.enabled) {
      const frequency = MUSIC_FREQUENCIES[request.config.music.track] ?? 220;
      inputs.push(
        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequency}:sample_rate=44100:duration=${outputDuration}`
      );
      sceneFilters.push(
        `[${audioInputIndex}:a]volume=${request.config.music.volume.toFixed(2)}[audio]`
      );
      audioLabel = "audio";
    }

    const filterGraph = [...sceneFilters, ...transitionChain].join(";");

    const commandArgs = [
      "-y",
      ...inputs,
      "-filter_complex",
      filterGraph,
      "-map",
      `[${lastLabel}]`,
      ...(audioLabel ? ["-map", `[${audioLabel}]`] : []),
      "-t",
      outputDuration.toFixed(2),
      "-r",
      String(FPS),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      ...(audioLabel ? ["-c:a", "aac", "-shortest"] : []),
      outputFile,
    ];

    await runFfmpeg(commandArgs, (progress) => {
      void request.onProgress?.(progress);
    });

    const baseDir = dirname(outputFile);
    const renderId =
      outputFile
        .split("/")
        .pop()
        ?.replace(/\.mp4$/, "") ?? "render";
    const previewDir = join(baseDir, renderId, "previews");
    mkdirSync(previewDir, { recursive: true });

    const previewUrlBase = `/api/video/renders/${renderId}/previews`;

    const previewImages: string[] = [];
    for (let p = 1; p <= PREVIEW_COUNT; p += 1) {
      const time = Math.min(outputDuration - 0.1, (outputDuration / (PREVIEW_COUNT + 1)) * p);
      const previewFile = join(previewDir, `preview-${p}.jpg`);
      try {
        await runFfmpeg([
          "-y",
          "-ss",
          time.toFixed(2),
          "-i",
          outputFile,
          "-frames:v",
          "1",
          "-vf",
          `scale=${width}:${height}`,
          previewFile,
        ]);
        previewImages.push(`${previewUrlBase}/preview-${p}.jpg`);
      } catch {
        // A missing preview frame should not fail the whole render.
      }
    }

    return {
      outputPath: `/api/video/renders/${renderId}/file`,
      durationSeconds: outputDuration,
      width,
      height,
      previewImages,
      model: MOCK_MODEL,
      provider: this.id,
    };
  }
}
