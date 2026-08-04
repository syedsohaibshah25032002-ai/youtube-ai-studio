import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PublishStatusBadge } from "@/components/videos/publish-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { getYouTubeCategoryLabel } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon, CalendarClockIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Video details",
  description: "View the details of a video.",
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function VideoDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const video = await prisma.video.findFirst({
    where: { id, channel: { userId: session.user.id } },
    include: { channel: { select: { id: true, name: true } } },
  });

  if (!video) {
    redirect("/dashboard/videos");
  }

  const tags = Array.isArray(video.tags) ? (video.tags as string[]) : [];
  const categoryLabel = video.categoryId ? getYouTubeCategoryLabel(video.categoryId) : null;

  return (
    <div className="container mx-auto max-w-4xl flex-1 px-4 py-10">
      <Link
        href="/dashboard/videos"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-4" />
        Back to videos
      </Link>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PublishStatusBadge status={video.publishStatus} />
              <Badge variant="outline">
                {video.visibility.charAt(0).toUpperCase() + video.visibility.slice(1)}
              </Badge>
              {video.scheduledAt ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <CalendarClockIcon className="size-3.5" />
                  Scheduled for {formatDate(video.scheduledAt)}
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{video.title}</h1>
            <p className="text-muted-foreground mt-2">
              Uploaded to <span className="text-foreground font-medium">{video.channel.name}</span>
            </p>
          </div>

          {video.thumbnailUrl ? (
            <div className="bg-muted relative aspect-video overflow-hidden rounded-lg border">
              <Image
                src={video.thumbnailUrl}
                alt={`${video.title} thumbnail`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {video.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {tags.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Metadata for this video</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Channel" value={video.channel.name} />
              <DetailRow label="Category" value={categoryLabel ?? "No category"} />
              <DetailRow
                label="Visibility"
                value={video.visibility.charAt(0).toUpperCase() + video.visibility.slice(1)}
              />
              <DetailRow
                label="Publish status"
                value={video.publishStatus.charAt(0).toUpperCase() + video.publishStatus.slice(1)}
              />
              <DetailRow label="Scheduled for" value={formatDate(video.scheduledAt)} />
              <DetailRow label="Published at" value={formatDate(video.publishedAt)} />
              <DetailRow label="Created at" value={formatDate(video.createdAt)} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" render={<Link href={`/dashboard/videos/${video.id}/edit`} />}>
          Edit video
        </Button>
        <Button
          variant="destructive"
          render={<Link href={`/dashboard/videos/${video.id}/delete`} />}
        >
          Delete video
        </Button>
      </div>
    </div>
  );
}
