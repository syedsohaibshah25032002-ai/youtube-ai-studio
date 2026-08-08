import type { OAuthTokenResult, YoutubeChannelInfo, YoutubeConnector } from "../types";

const MOCK_CHANNEL_ID = "UCmock1234567890abcdef";
const MOCK_SUBSCRIBER_COUNT = 1284;

/**
 * Deterministic connector used when no Google OAuth credentials are available.
 * Simulates the full OAuth flow so the connection feature remains fully
 * functional without touching Google. The authorization URL points back at the
 * local callback so the redirect + code exchange path is still exercised.
 */
export class MockYoutubeConnector implements YoutubeConnector {
  readonly id = "mock";
  readonly label = "Mock (no OAuth credentials)";

  isConfigured(): boolean {
    return true;
  }

  async getAuthUrl(state: string): Promise<string> {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const params = new URLSearchParams({ code: "mock-auth-code", state });
    return `${base}/api/youtube/callback?${params.toString()}`;
  }

  async exchangeCode(_code: string): Promise<OAuthTokenResult> {
    void _code;
    return {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: "youtube.readonly youtube.upload",
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResult> {
    void _refreshToken;
    return {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: "youtube.readonly youtube.upload",
    };
  }

  async fetchChannelInfo(_accessToken: string): Promise<YoutubeChannelInfo> {
    void _accessToken;
    return {
      channelId: MOCK_CHANNEL_ID,
      channelName: "Demo Creator Channel",
      channelUrl: "https://www.youtube.com/channel/" + MOCK_CHANNEL_ID,
      thumbnailUrl: null,
      subscriberCount: MOCK_SUBSCRIBER_COUNT,
    };
  }

  async revokeToken(_token: string): Promise<void> {
    void _token;
    // Nothing to revoke in mock mode.
  }
}
