import type { ChannelInfo, VideoInfo } from "./types";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates deterministic, plausible channel data when the YouTube Data API
 * is not configured. This keeps the UI fully functional without an API key.
 */
export function getMockChannelInfo(channelId: string): ChannelInfo {
  const hash = hashString(channelId);

  return {
    channelId,
    name: `YouTube Channel ${channelId.slice(0, 6).toUpperCase()}`,
    thumbnailUrl: `https://placehold.co/200x200/1f2937/ffffff?text=${encodeURIComponent(
      channelId.slice(0, 2).toUpperCase()
    )}`,
    subscriberCount: 1000 + (hash % 999000),
  };
}

/**
 * Generates deterministic, plausible video data when the YouTube Data API
 * is not configured. This keeps the UI fully functional without an API key.
 */
export function getMockVideoInfo(videoId: string): VideoInfo {
  const hash = hashString(videoId);

  const previews = [
    "A deep dive into AI-powered video tools",
    "10 tips to grow your channel this year",
    "Behind the scenes of a viral short",
    "How to plan your content calendar",
    "Editing workflow walkthrough",
  ];

  return {
    videoId,
    title: `${previews[hash % previews.length]} ${videoId.slice(0, 6).toUpperCase()}`,
    description:
      "This is mock video data generated while the YouTube API is disabled. Connect an API key in a later phase to fetch real video information.",
    thumbnailUrl: `https://placehold.co/640x360/111827/ffffff?text=${encodeURIComponent(
      videoId.slice(0, 2).toUpperCase()
    )}`,
  };
}
