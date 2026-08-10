import type {
  OAuthTokenResult,
  YoutubeChannelInfo,
  YoutubeConnector,
  YoutubeConnectorError,
  YoutubeUploadRequest,
  YoutubeUploadResult,
} from "../types";
import { toYoutubeConnectorError } from "../errors";

import type { FileHandle } from "node:fs/promises";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3";

/**
 * YouTube scopes required to read the connected channel and, in Phase 7B, to
 * publish videos. Requested up front so the user authorizes once.
 */
const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

/** Size of each media chunk sent during a resumable upload. */
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

function toConnectorError(
  code: YoutubeConnectorError["code"],
  message: string,
  status?: number,
  cause?: unknown
): YoutubeConnectorError {
  return toYoutubeConnectorError(code, message, status, cause);
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

  async uploadVideo(request: YoutubeUploadRequest): Promise<YoutubeUploadResult> {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw toConnectorError("NOT_CONFIGURED", "YouTube OAuth credentials are not configured.");
    }

    const file = await import("node:fs/promises").then((fs) => fs.open(request.filePath, "r"));

    try {
      const stats = await file.stat();
      const totalBytes = stats.size;

      if (totalBytes <= 0) {
        throw toConnectorError("INVALID_RESPONSE", "The video file is empty.");
      }

      if (request.onProgress) {
        await request.onProgress(5, "Initiating upload");
      }

      const body = JSON.stringify({
        snippet: {
          title: request.metadata.title,
          description: request.metadata.description,
          tags: request.metadata.tags,
          categoryId: request.metadata.categoryId,
        },
        status: { privacyStatus: request.metadata.visibility },
      });

      const initResponse = await fetch(
        `${YOUTUBE_UPLOAD_URL}/videos?uploadType=resumable&part=snippet,status`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${request.accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": String(totalBytes),
          },
          body,
          cache: "no-store",
        }
      );

      if (initResponse.status === 401 || initResponse.status === 403) {
        throw toConnectorError(
          "TOKEN_REVOKED",
          "YouTube upload authorization was revoked or expired.",
          initResponse.status
        );
      }

      if (!initResponse.ok) {
        throw toConnectorError(
          "UPSTREAM",
          `YouTube upload session could not be created (${initResponse.status}).`,
          initResponse.status
        );
      }

      const uploadUrl = initResponse.headers.get("location");
      if (!uploadUrl) {
        throw toConnectorError("INVALID_RESPONSE", "YouTube returned no upload session URL.");
      }

      const videoId = await this.uploadResumable(uploadUrl, file, totalBytes, request.onProgress);

      if (request.thumbnailPath) {
        await this.setThumbnail(request.accessToken, videoId, request.thumbnailPath);
      }

      if (request.onProgress) {
        await request.onProgress(100, "Completed");
      }

      return {
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    } finally {
      await file.close();
    }
  }

  /**
   * Uploads the open file to a resumable session URL in chunks so progress can
   * be reported. Returns the YouTube video ID parsed from the final response.
   */
  private async uploadResumable(
    uploadUrl: string,
    file: FileHandle,
    totalBytes: number,
    onProgress?: (progress: number, stage?: string) => void | Promise<void>
  ): Promise<string> {
    let offset = 0;

    while (offset < totalBytes) {
      const chunkSize = Math.min(UPLOAD_CHUNK_BYTES, totalBytes - offset);
      const buffer = Buffer.alloc(chunkSize);
      await file.read(buffer, 0, chunkSize, offset);

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${offset}-${offset + chunkSize - 1}/${totalBytes}`,
          "Content-Type": "video/mp4",
        },
        body: buffer,
        cache: "no-store",
      });

      if (response.status === 200 || response.status === 201) {
        const data = (await response.json()) as { id?: string };
        const videoId = data.id;
        if (!videoId) {
          throw toConnectorError("INVALID_RESPONSE", "YouTube returned no video ID.");
        }
        return videoId;
      }

      if (response.status === 308) {
        offset += chunkSize;
        if (onProgress) {
          await onProgress(
            Math.min(95, 10 + Math.round((offset / totalBytes) * 80)),
            "Uploading video"
          );
        }
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw toConnectorError(
          "TOKEN_REVOKED",
          "YouTube upload authorization was revoked or expired.",
          response.status
        );
      }

      throw toConnectorError(
        "UPSTREAM",
        `YouTube media upload failed with status ${response.status}.`,
        response.status
      );
    }

    throw toConnectorError("INVALID_RESPONSE", "YouTube upload ended without a video ID.");
  }

  /** Sets a custom thumbnail on an uploaded video using the media endpoint. */
  private async setThumbnail(
    accessToken: string,
    videoId: string,
    thumbnailPath: string
  ): Promise<void> {
    const thumbnail = await import("node:fs/promises").then((fs) => fs.readFile(thumbnailPath));

    const response = await fetch(
      `${YOUTUBE_UPLOAD_URL}/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "image/jpeg",
          "Content-Length": String(thumbnail.byteLength),
        },
        body: thumbnail,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw toConnectorError(
        "UPSTREAM",
        `YouTube thumbnail upload failed with status ${response.status}.`,
        response.status
      );
    }
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
