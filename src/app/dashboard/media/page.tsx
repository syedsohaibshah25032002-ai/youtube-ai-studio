import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MediaCard } from "@/components/media/media-card";
import { Button } from "@/components/ui/button";
import type { MediaType } from "@/lib/media/types";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Media Library",
  description: "Browse and manage your AI-generated media assets.",
};

export default async function MediaLibraryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Your AI-generated images, thumbnails, banners and avatars.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" render={<Link href="/dashboard/media/history" />}>
            Asset history
          </Button>
          <Button render={<Link href="/dashboard/media/new" />}>New asset</Button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No media yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Generate your first image, thumbnail or banner to start building your media library.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/media/new" />}>
            Create your first asset
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <MediaCard
              key={asset.id}
              id={asset.id}
              title={asset.title}
              type={asset.type as MediaType}
              prompt={asset.prompt}
              status={asset.status}
              mediaUrl={asset.mediaUrl}
              provider={asset.provider}
              createdAt={asset.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
