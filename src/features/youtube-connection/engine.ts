import { prisma } from "@/lib/prisma";
import { getYoutubeConnector } from "@/lib/youtube-connect";
import { decryptTokens, encryptTokens } from "@/lib/youtube-connect/token-crypto";
import type { OAuthTokenResult, YoutubeConnectorError } from "@/lib/youtube-connect/types";
import {
  type ConnectionDisplay,
  type YoutubeConnectionStatus,
  YOUTUBE_CONNECTION_STATUSES,
} from "./types";

type StoredTokens = {
  accessToken: string;
  refreshToken: string | null;
};

function toConnectionErrorCode(error: unknown): YoutubeConnectionStatus {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as YoutubeConnectorError).code
      : "UNKNOWN";

  switch (code) {
    case "TOKEN_REVOKED":
      return "REVOKED";
    case "NOT_CONFIGURED":
    case "UPSTREAM":
    case "INVALID_RESPONSE":
      return "ERROR";
    default:
      return "ERROR";
  }
}

function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function isStatus(value: string): value is YoutubeConnectionStatus {
  return (YOUTUBE_CONNECTION_STATUSES as readonly string[]).includes(value);
}

export function toConnectionDisplay(
  connection: {
    id: string;
    status: string;
    channelId: string;
    channelName: string;
    channelUrl: string | null;
    thumbnailUrl: string | null;
    subscriberCount: number;
    provider: string;
    lastError: string | null;
    lastCheckedAt: Date | null;
    connectedAt: Date | null;
  } | null
): ConnectionDisplay {
  if (!connection) {
    return {
      id: null,
      status: "DISCONNECTED",
      channelId: null,
      channelName: null,
      channelUrl: null,
      thumbnailUrl: null,
      subscriberCount: null,
      provider: null,
      lastError: null,
      lastCheckedAt: null,
      connectedAt: null,
    };
  }

  return {
    id: connection.id,
    status: isStatus(connection.status) ? connection.status : "ERROR",
    channelId: connection.channelId,
    channelName: connection.channelName,
    channelUrl: connection.channelUrl,
    thumbnailUrl: connection.thumbnailUrl,
    subscriberCount: connection.subscriberCount,
    provider: connection.provider,
    lastError: connection.lastError,
    lastCheckedAt: connection.lastCheckedAt,
    connectedAt: connection.connectedAt,
  };
}

/**
 * Completes the OAuth flow for a user by exchanging the authorization code,
 * resolving the connected channel and persisting the (encrypted) tokens.
 */
export async function connectYoutube(
  userId: string,
  code: string
): Promise<{ ok: true; display: ConnectionDisplay } | { ok: false; error: string }> {
  try {
    const connector = getYoutubeConnector();
    const tokens = await connector.exchangeCode(code);
    const channel = await connector.fetchChannelInfo(tokens.accessToken);

    const encrypted = encryptTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    } satisfies StoredTokens);

    const now = new Date();

    const connection = await prisma.youtubeConnection.upsert({
      where: { userId },
      create: {
        userId,
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelUrl: channel.channelUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        status: "CONNECTED",
        provider: connector.id,
        tokensEncrypted: encrypted,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        lastError: null,
        lastCheckedAt: now,
        connectedAt: now,
      },
      update: {
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelUrl: channel.channelUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        status: "CONNECTED",
        provider: connector.id,
        tokensEncrypted: encrypted,
        tokenExpiresAt: tokens.expiresAt,
        scope: tokens.scope,
        lastError: null,
        lastCheckedAt: now,
      },
    });

    return { ok: true, display: toConnectionDisplay(connection) };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

function readTokens(connection: { tokensEncrypted: string | null }): StoredTokens | null {
  if (!connection.tokensEncrypted) {
    return null;
  }
  try {
    return decryptTokens<StoredTokens>(connection.tokensEncrypted);
  } catch {
    return null;
  }
}

async function applyRefreshTokens(connectionId: string, tokens: OAuthTokenResult): Promise<void> {
  await prisma.youtubeConnection.update({
    where: { id: connectionId },
    data: {
      tokensEncrypted: encryptTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      } satisfies StoredTokens),
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope,
    },
  });
}

/**
 * Verifies a stored connection and refreshes it when needed. Returns a display
 * snapshot with a status reflecting whether the connection is healthy,
 * expired, revoked or errored. Never returns token material.
 */
export async function checkYoutubeConnection(
  userId: string
): Promise<{ ok: true; display: ConnectionDisplay } | { ok: false; error: string }> {
  const connection = await prisma.youtubeConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return { ok: true, display: toConnectionDisplay(null) };
  }

  const connector = getYoutubeConnector();
  const tokens = readTokens(connection);
  const now = new Date();

  if (!tokens) {
    await prisma.youtubeConnection.update({
      where: { id: connection.id },
      data: {
        status: "ERROR",
        lastError: "Stored credentials could not be decrypted.",
        lastCheckedAt: now,
      },
    });
    const updated = await prisma.youtubeConnection.findUnique({ where: { userId } });
    return { ok: true, display: toConnectionDisplay(updated) };
  }

  const accessExpired =
    connection.tokenExpiresAt === null || connection.tokenExpiresAt.getTime() <= now.getTime();

  try {
    let accessToken = tokens.accessToken;
    let refreshToken = tokens.refreshToken;

    if (accessExpired) {
      if (!refreshToken) {
        await markConnection(
          userId,
          "EXPIRED",
          "Access token expired and no refresh token is available.",
          now
        );
        return await displayConnection(userId);
      }
      const refreshed = await connector.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken ?? refreshToken;
      await applyRefreshTokens(connection.id, { ...refreshed, refreshToken });
    }

    const channel = await connector.fetchChannelInfo(accessToken);

    await prisma.youtubeConnection.update({
      where: { id: connection.id },
      data: {
        status: "CONNECTED",
        channelId: channel.channelId,
        channelName: channel.channelName,
        channelUrl: channel.channelUrl,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        lastError: null,
        lastCheckedAt: now,
      },
    });

    return await displayConnection(userId);
  } catch (error) {
    const status = toConnectionErrorCode(error);
    const message = toErrorMessage(error);
    await markConnection(userId, status, message, now);
    return await displayConnection(userId);
  }
}

async function markConnection(
  userId: string,
  status: YoutubeConnectionStatus,
  message: string,
  at: Date
): Promise<void> {
  await prisma.youtubeConnection.update({
    where: { userId },
    data: { status, lastError: message, lastCheckedAt: at },
  });
}

async function displayConnection(
  userId: string
): Promise<{ ok: true; display: ConnectionDisplay }> {
  const connection = await prisma.youtubeConnection.findUnique({ where: { userId } });
  return { ok: true, display: toConnectionDisplay(connection) };
}

/**
 * Disconnects a user's YouTube connection: revokes the tokens best-effort,
 * clears stored credentials and marks the connection disconnected. The row is
 * kept so the UI can show the previously connected channel and its status.
 */
export async function disconnectYoutube(
  userId: string
): Promise<{ ok: true; display: ConnectionDisplay }> {
  const connection = await prisma.youtubeConnection.findUnique({ where: { userId } });

  if (!connection) {
    return { ok: true, display: toConnectionDisplay(null) };
  }

  const tokens = readTokens(connection);
  if (tokens?.accessToken) {
    const connector = getYoutubeConnector();
    await connector.revokeToken(tokens.accessToken);
  }

  const updated = await prisma.youtubeConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      tokensEncrypted: encryptTokens({
        accessToken: "",
        refreshToken: null,
      } satisfies StoredTokens),
      tokenExpiresAt: null,
      lastError: null,
      lastCheckedAt: new Date(),
    },
  });

  return { ok: true, display: toConnectionDisplay(updated) };
}
