import type { ChannelInfo } from "./types";

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
