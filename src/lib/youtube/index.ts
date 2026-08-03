import { getMockChannelInfo } from "./mock";
import type { ChannelInfo, GetChannelInfoResult } from "./types";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

type YouTubeChannelResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      thumbnails?: {
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
    };
  }>;
};

function toChannelInfo(channelId: string, data: YouTubeChannelResponse): ChannelInfo | null {
  const item = data.items?.[0];
  if (!item) {
    return null;
  }

  return {
    channelId: item.id || channelId,
    name: item.snippet?.title ?? channelId,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
    subscriberCount: Number.parseInt(item.statistics?.subscriberCount ?? "0", 10) || 0,
  };
}

async function fetchFromYouTubeApi(channelId: string, apiKey: string): Promise<ChannelInfo> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: channelId,
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_API_URL}/channels?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`YouTube API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as YouTubeChannelResponse;
  const channelInfo = toChannelInfo(channelId, data);

  if (!channelInfo) {
    throw new Error("Channel not found on YouTube");
  }

  return channelInfo;
}

/**
 * Resolves channel information for a given YouTube channel ID.
 *
 * When `YOUTUBE_API_KEY` is set, data is fetched from the YouTube Data API v3.
 * Otherwise deterministic mock data is returned so the app remains fully
 * functional without an API key.
 */
export async function getChannelInfo(channelId: string): Promise<GetChannelInfoResult> {
  if (!channelId.trim()) {
    return { ok: false, error: "Please enter a channel ID first." };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const channelInfo = await fetchFromYouTubeApi(channelId.trim(), apiKey);
      return { ok: true, channelInfo };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not fetch channel information.",
      };
    }
  }

  return { ok: true, channelInfo: getMockChannelInfo(channelId.trim()) };
}
