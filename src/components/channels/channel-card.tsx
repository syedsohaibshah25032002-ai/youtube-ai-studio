import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ChannelCardProps = {
  id: string;
  name: string;
  channelId: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
};

export function formatSubscriberCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
}

export function ChannelCard({
  id,
  name,
  channelId,
  thumbnailUrl,
  subscriberCount,
}: ChannelCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={`${name} thumbnail`}
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{name}</CardTitle>
          <p className="text-muted-foreground truncate font-mono text-xs">{channelId}</p>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Badge variant="secondary">{formatSubscriberCount(subscriberCount)} subscribers</Badge>
      </CardContent>
      <CardFooter className="mt-auto gap-2">
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/dashboard/channels/${id}/edit`} />}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          render={<Link href={`/dashboard/channels/${id}/delete`} />}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
