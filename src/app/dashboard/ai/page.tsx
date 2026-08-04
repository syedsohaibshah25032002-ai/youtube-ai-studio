import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GenerationForm } from "@/components/ai/generation-form";
import { JobCard } from "@/components/ai/job-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "AI Content Engine",
  description: "Generate complete YouTube content with AI.",
};

export default async function AiEnginePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [channels, recentJobs, jobCount] = await Promise.all([
    prisma.channel.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.aiJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        topic: true,
        status: true,
        progress: true,
        provider: true,
        createdAt: true,
      },
    }),
    prisma.aiJob.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Content Engine</h1>
        <p className="text-muted-foreground mt-1">
          From a single topic, generate research, outline, script, titles, description, tags and a
          thumbnail prompt.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>New generation</CardTitle>
            <CardDescription>
              {isAiConfigured()
                ? "Content is generated with your configured AI provider."
                : "No AI provider configured — deterministic mock content is generated so you can explore the pipeline."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerationForm channelOptions={channels} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent generations</CardTitle>
            <CardDescription>Your most recent jobs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No generations yet. Enter a topic to create your first one.
              </p>
            ) : (
              recentJobs.map((job) => <JobCard key={job.id} {...job} />)
            )}
          </CardContent>
          {jobCount > 0 ? (
            <div className="p-4 pt-0">
              <Button variant="outline" size="sm" render={<Link href="/dashboard/ai/jobs" />}>
                View all history ({jobCount})
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
