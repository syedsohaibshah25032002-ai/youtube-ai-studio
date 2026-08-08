import type {
  OAuthTokenResult,
  YoutubeChannelInfo,
  YoutubeConnector,
  YoutubeConnectorError,
} from "../types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube scopes required to read the connected channel and, in Phase 7B, to
 * publish videos. Requested up front so the user authorizes once.
 */
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

function toConnectorError(
  code: YoutubeConnectorError["code"],
  message: string,
  status?: number,
  cause?: unknown
): YoutubeConnectorError {
  const error = new Error(message) as unknown as YoutubeConnectorError;
  error.code = code;
  error.status = status;
  error.cause = cause;
  return error;
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function postForm(url: string, body: Record<string, string>): Promise<GoogleTokenResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok) {
    const isRevoked = data.error === "invalid_grant" || data.error === "invalid_token";
    throw toConnectorError(
      isRevoked ? "TOKEN_REVOKED" : "UPSTREAM",
      data.error_description ?? data.error ?? `Google responded with status ${response.status}`,
      response.status
    );
  }

  return data;
}

function toTokenResult(data: GoogleTokenResponse): OAuthTokenResult {
  return {
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    scope: data.scope ?? "",
  };
}

/**
 * Real connector backed by Google's OAuth 2.0 and YouTube Data API v3. Requires
 * `YOUTUBE_OAUTH_CLIENT_ID` and `YOUTUBE_OAUTH_CLIENT_SECRET`.
 */
export class GoogleYoutubeConnector implements YoutubeConnector {
  readonly id = "google";
  readonly label = "Google (YouTube OAuth 2.0)";

  isConfigured(): boolean {
    return Boolean(process.env.YOUTUBE_OAUTH_CLIENT_ID && process.env.YOUTUBE_OAUTH_CLIENT_SECRET);
  }

  getRedirectUri(): string {
    const base =
      process.env.YOUTUBE_OAUTH_REDIRECT_URI ??
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/youtube/callback`;
    return base;
  }

  async getAuthUrl(state: string): Promise<string> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw toConnectorError("NOT_CONFIGURED", "YouTube OAuth client ID is not configured.");
    }

    const scopes = process.env.YOUTUBE_OAUTH_SCOPES
      ? process.env.YOUTUBE_OAUTH_SCOPES.split(" ")
      : DEFAULT_SCOPES;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.getRedirectUri(),
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResult> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw toConnectorError("NOT_CONFIGURED", "YouTube OAuth credentials are not configured.");
    }

    const data = await postForm(GOOGLE_TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.getRedirectUri(),
    });

    if (!data.access_token) {
      throw toConnectorError("INVALID_RESPONSE", "Google returned no access token.");
    }

    return toTokenResult(data);
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw toConnectorError("NOT_CONFIGURED", "YouTube OAuth credentials are not configured.");
    }

    const data = await postForm(GOOGLE_TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    if (!data.access_token) {
      throw toConnectorError("INVALID_RESPONSE", "Google returned no access token.");
    }

    return toTokenResult(data);
  }

  async fetchChannelInfo(accessToken: string): Promise<YoutubeChannelInfo> {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      mine: "true",
    });

    const response = await fetch(`${YOUTUBE_API_URL}/channels?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const isRevoked = response.status === 401 || response.status === 403;
      throw toConnectorError(
        isRevoked ? "TOKEN_REVOKED" : "UPSTREAM",
        `YouTube API request failed with status ${response.status}`,
        response.status
      );
    }

    const data = (await response.json()) as {
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
          customUrl?: string;
        };
        statistics?: { subscriberCount?: string };
      }>;
    };

    const item = data.items?.[0];
    if (!item) {
      throw toConnectorError("INVALID_RESPONSE", "No channel found for the connected account.");
    }

    const channelId = item.id ?? "";
    const customUrl = item.snippet?.customUrl ?? "";

    return {
      channelId,
      channelName: item.snippet?.title ?? channelId,
      channelUrl: customUrl
        ? `https://www.youtube.com/${customUrl}`
        : `https://www.youtube.com/channel/${channelId}`,
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
      subscriberCount: Number.parseInt(item.statistics?.subscriberCount ?? "0", 10) || 0,
    };
  }

  async revokeToken(token: string): Promise<void> {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        cache: "no-store",
      });
    } catch {
      // Revocation is best-effort; an already-revoked token is fine.
    }
  }
}
