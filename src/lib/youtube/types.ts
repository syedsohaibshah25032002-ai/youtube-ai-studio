export type ChannelInfo = {
  channelId: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
};

export type GetChannelInfoResult =
  { ok: true; channelInfo: ChannelInfo } | { ok: false; error: string };
