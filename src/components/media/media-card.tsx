import Image from "next/image";
import Link from "next/link";

import { MediaStatusBadge } from "@/components/media/media-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDIA_TYPE_LABELS } from "@/features/media-engine/types";
import { formatDate } from "@/lib/date";
import type { MediaType } from "@/lib/media/types";
import { ImageIcon } from "lucide-react";

type MediaCardProps = {
  id: string;
  title: string;
  type: MediaType;
  prompt: string;
  status: string;
  mediaUrl: string | null;
  provider: string;
  createdAt: Date;
};

export function MediaCard({
  id,
  title,
  type,
  prompt,
  status,
  mediaUrl,
  provider,
  createdAt,
}: MediaCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/dashboard/media/${id}`} className="group relative block">
        {mediaUrl ? (
          <div className="bg-muted relative aspect-video overflow-hidden">
            <Image
              src={mediaUrl}
              alt={`${title} preview`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center">
            <ImageIcon className="size-8" />
          </div>
        )}
      </Link>
      <CardHeader className="gap-1">
        <CardTitle className="truncate text-base">
          <Link href={`/dashboard/media/${id}`} className="hover:underline">
            {title}
          </Link>
        </CardTitle>
        <p className="text-muted-foreground line-clamp-2 text-sm">{prompt}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <MediaStatusBadge status={status} />
        <Badge variant="outline">{MEDIA_TYPE_LABELS[type]}</Badge>
      </CardContent>
      <CardFooter className="text-muted-foreground mt-auto text-xs">
        {provider} · {formatDate(createdAt)}
      </CardFooter>
    </Card>
  );
}
