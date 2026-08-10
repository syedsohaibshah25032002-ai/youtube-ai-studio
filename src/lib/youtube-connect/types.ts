/**
 * OAuth 2.0 connection contract for YouTube. Mirrors the provider pattern used
 * by the AI, media, video and render engines so a mock connector can stand in
 * for the real Google OAuth flow during development and testing.
 */

export type YoutubeChannelInfo = {
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
};

export type OAuthTokenResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string;
};

export type YoutubeConnectorError = {
  code:
    | "NOT_CONFIGURED"
    | "UPSTREAM"
    | "INVALID_RESPONSE"
    | "TOKEN_REVOKED"
    | "ACCESS_DENIED"
    | "UNKNOWN";
  message: string;
  status?: number;
  cause?: unknown;
};

export type YoutubeVisibility = "public" | "private" | "unlisted";

export type YoutubeUploadMetadata = {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  visibility: YoutubeVisibility;
};

export type YoutubeUploadResult = {
  videoId: string;
  videoUrl: string;
};

export type YoutubeUploadRequest = {
  /** Fresh access token for the connected channel. */
  accessToken: string;
  /** Absolute path to the MP4 file to upload. */
  filePath: string;
  /** Title, description, tags, category and visibility for the upload. */
  metadata: YoutubeUploadMetadata;
  /** Absolute path to an optional thumbnail image uploaded after the video. */
  thumbnailPath?: string | null;
  /**
   * Optional progress hook receiving a 0-100 upload percentage and a stage
   * label while the video bytes are transferred.
   */
  onProgress?: (progress: number, stage?: string) => void | Promise<void>;
};

export interface YoutubeConnector {
  /** Stable identifier persisted on connections, e.g. "google" or "mock". */
  readonly id: string;
  /** Human friendly label shown in the UI. */
  readonly label: string;
  /** True when the connector has the OAuth credentials it needs. */
  isConfigured(): boolean;
  /**
   * Builds the URL a user is sent to in order to authorize the app. The state
   * value is verified on the callback to prevent CSRF on the token exchange.
   */
  getAuthUrl(state: string): Promise<string>;
  /**
   * Exchanges an authorization code for tokens. Throws a `YoutubeConnectorError`
   * when the exchange fails.
   */
  exchangeCode(code: string): Promise<OAuthTokenResult>;
  /** Exchanges a refresh token for a fresh access token. */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult>;
  /** Resolves the connected channel from an access token. */
  fetchChannelInfo(accessToken: string): Promise<YoutubeChannelInfo>;
  /**
   * Uploads an MP4 plus optional thumbnail to the connected channel using the
   * YouTube Data API. Throws a `YoutubeConnectorError` on failure.
   */
  uploadVideo(request: YoutubeUploadRequest): Promise<YoutubeUploadResult>;
  /** Revokes a token. Best-effort; should not throw on already-revoked tokens. */
  revokeToken(token: string): Promise<void>;
}
