import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConnectionDisplay } from "@/features/youtube-connection/types";
import { YoutubeConnectionStatusBadge } from "@/components/youtube/connection-status-badge";
import { DisconnectYoutubeButton } from "@/components/youtube/disconnect-youtube-button";
import { CheckYoutubeConnectionButton } from "@/components/youtube/check-connection-button";
import { VideoIcon } from "lucide-react";

type YoutubeConnectionCardProps = {
  connection: ConnectionDisplay;
};

function formatDate(date: Date | null): string {
  if (!date) {
    return "Never";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function YoutubeConnectionCard({ connection }: YoutubeConnectionCardProps) {
  const isConnected = connection.status === "CONNECTED";
  const needsAttention =
    connection.status === "EXPIRED" ||
    connection.status === "REVOKED" ||
    connection.status === "ERROR";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <VideoIcon className="size-4" />
            YouTube connection
          </span>
          <YoutubeConnectionStatusBadge status={connection.status} />
        </CardTitle>
        <CardDescription>
          Connect your YouTube channel to publish rendered videos to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isConnected && connection.channelName ? (
          <div className="flex items-center gap-3">
            {connection.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={connection.thumbnailUrl}
                alt={connection.channelName}
                className="size-12 rounded-full border object-cover"
              />
            ) : (
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <VideoIcon className="text-muted-foreground size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{connection.channelName}</p>
              <p className="text-muted-foreground text-xs">
                {connection.subscriberCount !== null
                  ? `${connection.subscriberCount.toLocaleString()} subscribers`
                  : "Subscriber count unknown"}
              </p>
              {connection.channelUrl ? (
                <a
                  href={connection.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-xs hover:underline"
                >
                  View channel
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {connection.channelId ? (
          <p className="text-muted-foreground text-xs">
            Channel ID: <span className="font-mono">{connection.channelId}</span>
          </p>
        ) : null}

        {connection.lastError ? (
          <div className="border-destructive/30 bg-destructive/10 rounded-md border p-3 text-xs">
            <p className="text-destructive font-medium">Connection issue</p>
            <p className="text-muted-foreground mt-1">{connection.lastError}</p>
            <p className="text-muted-foreground mt-1">
              Checked {formatDate(connection.lastCheckedAt)}.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {connection.connectedAt
              ? `Connected ${formatDate(connection.connectedAt)}.`
              : "Not connected yet."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!isConnected || needsAttention ? (
            <Button size="sm" render={<Link href="/api/youtube/connect" />}>
              {needsAttention ? "Reconnect YouTube" : "Connect YouTube"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" render={<Link href="/api/youtube/connect" />}>
              Reconnect
            </Button>
          )}

          {isConnected || needsAttention ? (
            <>
              <CheckYoutubeConnectionButton />
              <DisconnectYoutubeButton />
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
