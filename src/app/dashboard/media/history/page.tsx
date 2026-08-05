import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RunCard } from "@/components/media/run-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Asset History",
  description: "History of every media generation attempt.",
};

export default async function MediaHistoryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const runs = await prisma.mediaGenerationRun.findMany({
    where: { asset: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: { asset: { select: { id: true, title: true } } },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset History</h1>
          <p className="text-muted-foreground mt-1">
            Every media generation attempt, including failures.
          </p>
        </div>
        <Button render={<Link href="/dashboard/media" />}>Media library</Button>
      </div>

      {runs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No generations yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Once you generate media, every attempt will be recorded here.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/media/new" />}>
            Create an asset
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {runs.map((run) => (
            <RunCard
              key={run.id}
              assetId={run.asset.id}
              assetTitle={run.asset.title}
              prompt={run.prompt}
              status={run.status}
              provider={run.provider}
              model={run.model}
              errorLog={run.errorLog}
              startedAt={run.startedAt}
              finishedAt={run.finishedAt}
              createdAt={run.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
