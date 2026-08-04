import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { JobCard } from "@/components/ai/job-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Generation history",
  description: "All of your AI content generation jobs.",
};

export default async function AiJobsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const jobs = await prisma.aiJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      status: true,
      progress: true,
      provider: true,
      createdAt: true,
    },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generation history</h1>
          <p className="text-muted-foreground mt-1">Every AI content job you have run.</p>
        </div>
        <Button render={<Link href="/dashboard/ai" />}>New generation</Button>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No generations yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Start a new generation to build your first complete content package.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/ai" />}>
            Start generating
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} {...job} />
          ))}
        </div>
      )}
    </div>
  );
}
