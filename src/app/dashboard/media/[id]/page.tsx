import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AssetProgress } from "@/components/media/asset-progress";
import { DeleteAssetButton } from "@/components/media/delete-asset-button";
import { GenerateButton } from "@/components/media/generate-button";
import { MediaStatusBadge } from "@/components/media/media-status-badge";
import { RunCard } from "@/components/media/run-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readErrorLog } from "@/features/media-engine/generator";
import { MEDIA_TYPE_LABELS } from "@/features/media-engine/types";
import { formatDate } from "@/lib/date";
import type { MediaType } from "@/lib/media/types";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon, ClipboardXIcon } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Media asset",
  description: "Review an AI-generated media asset.",
};

export default async function MediaAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const asset = await prisma.mediaAsset.findFirst({
    where: { id, userId: session.user.id },
    include: {
      runs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!asset) {
    redirect("/dashboard/media");
  }

  const errors = readErrorLog(asset.errorLog);

  return (
    <div className="container mx-auto max-w-4xl flex-1 px-4 py-10">
      <Link
        href="/dashboard/media"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-4" />
        Back to media library
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <MediaStatusBadge status={asset.status} />
            <Badge variant="outline">{MEDIA_TYPE_LABELS[asset.type as MediaType]}</Badge>
            <span className="text-muted-foreground text-xs">
              {asset.provider} / {asset.model}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Created {formatDate(asset.createdAt)} · {asset.runs.length}{" "}
            {asset.runs.length === 1 ? "generation" : "generations"}
            {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateButton assetId={asset.id} />
          <DeleteAssetButton assetId={asset.id} />
        </div>
      </div>

      <div className="mb-8">
        <AssetProgress assetId={asset.id} initialStatus={asset.status} />
      </div>

      {asset.mediaUrl ? (
        <div className="bg-muted relative mb-8 aspect-video overflow-hidden rounded-lg border">
          <Image
            src={asset.mediaUrl}
            alt={`${asset.title} preview`}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{asset.prompt}</p>
        </CardContent>
      </Card>

      {asset.status === "FAILED" ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardXIcon className="size-4" />
              Generation failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No error details recorded.</p>
            ) : (
              errors.map((entry, index) => (
                <div
                  key={`${entry.action}-${entry.at}-${index}`}
                  className="bg-destructive/5 border-destructive/20 rounded-lg border p-3"
                >
                  <p className="text-muted-foreground text-sm">{entry.message}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(new Date(entry.at))}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Generation history</h2>
        <Button variant="outline" size="sm" render={<Link href="/dashboard/media/history" />}>
          View all history
        </Button>
      </div>

      <div className="space-y-4">
        {asset.runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No generations yet.</p>
        ) : (
          asset.runs.map((run) => (
            <RunCard
              key={run.id}
              assetId={asset.id}
              assetTitle={asset.title}
              prompt={run.prompt}
              status={run.status}
              provider={run.provider}
              model={run.model}
              errorLog={run.errorLog}
              startedAt={run.startedAt}
              finishedAt={run.finishedAt}
              createdAt={run.createdAt}
            />
          ))
        )}
      </div>
    </div>
  );
}
