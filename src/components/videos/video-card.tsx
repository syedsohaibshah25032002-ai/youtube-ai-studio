import Image from "next/image";
import Link from "next/link";

import { PublishStatusBadge } from "@/components/videos/publish-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { CalendarClockIcon } from "lucide-react";

type VideoCardProps = {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string | null;
  visibility: string;
  publishStatus: string;
  scheduledAt: Date | null;
};

export function VideoCard({
  id,
  title,
  channelName,
  thumbnailUrl,
  visibility,
  publishStatus,
  scheduledAt,
}: VideoCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/dashboard/videos/${id}`} className="group block">
        {thumbnailUrl ? (
          <div className="bg-muted relative aspect-video overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt={`${title} thumbnail`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center">
            No thumbnail
          </div>
        )}
      </Link>
      <CardHeader className="gap-1">
        <CardTitle className="truncate text-base">
          <Link href={`/dashboard/videos/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground truncate text-sm">{channelName}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <PublishStatusBadge status={publishStatus} />
        <Badge variant="outline">{visibility.charAt(0).toUpperCase() + visibility.slice(1)}</Badge>
        {scheduledAt ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <CalendarClockIcon className="size-3.5" />
            {formatDate(scheduledAt)}
          </span>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto gap-2">
        <Button size="sm" variant="outline" render={<Link href={`/dashboard/videos/${id}`} />}>
          View
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`/dashboard/videos/${id}/edit`} />}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          render={<Link href={`/dashboard/videos/${id}/delete`} />}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
