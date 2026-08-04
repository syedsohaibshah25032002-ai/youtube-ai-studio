export type ChannelInfo = {
  channelId: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
};

export type GetChannelInfoResult =
  { ok: true; channelInfo: ChannelInfo } | { ok: false; error: string };

export type VideoInfo = {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
};

export type GetVideoInfoResult = { ok: true; videoInfo: VideoInfo } | { ok: false; error: string };
