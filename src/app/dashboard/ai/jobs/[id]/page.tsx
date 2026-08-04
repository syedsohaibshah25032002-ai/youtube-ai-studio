import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteJobButton } from "@/components/ai/delete-job-button";
import { JobProgress } from "@/components/ai/job-progress";
import { JobStatusBadge } from "@/components/ai/job-status-badge";
import { RetryJobButton } from "@/components/ai/retry-job-button";
import { SectionBlock } from "@/components/ai/section-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readErrorLog } from "@/features/content-generator/pipeline";
import {
  PIPELINE_SECTIONS,
  SECTION_LABELS,
  type SectionContent,
} from "@/features/content-generator/types";
import { formatDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon, ClipboardXIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Generation details",
  description: "Review an AI content generation.",
};

export default async function AiJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const job = await prisma.aiJob.findFirst({
    where: { id, userId: session.user.id },
    include: {
      results: true,
      channel: { select: { name: true } },
    },
  });

  if (!job) {
    redirect("/dashboard/ai");
  }

  const resultsBySection = new Map(job.results.map((result) => [result.section, result]));
  const errorLog = readErrorLog(job.errorLog);
  const completedSections = job.results.length;

  return (
    <div className="container mx-auto max-w-4xl flex-1 px-4 py-10">
      <Link
        href="/dashboard/ai"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-4" />
        Back to AI engine
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span className="text-muted-foreground text-xs">
              {job.provider} / {job.model}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.topic}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Created {formatDate(job.createdAt)}
            {job.channel ? ` · for ${job.channel.name}` : ""} · {completedSections}/
            {PIPELINE_SECTIONS.length} sections generated
          </p>
        </div>
        <DeleteJobButton jobId={job.id} />
      </div>

      <div className="mb-8">
        <JobProgress jobId={job.id} initialStatus={job.status} initialProgress={job.progress} />
      </div>

      {job.status === "FAILED" ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardXIcon className="size-4" />
              Generation failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {errorLog.length === 0 ? (
                <p className="text-muted-foreground text-sm">No error details recorded.</p>
              ) : (
                errorLog.map((entry) => (
                  <div
                    key={`${entry.section}-${entry.at}`}
                    className="bg-destructive/5 border-destructive/20 rounded-lg border p-3"
                  >
                    <p className="text-sm font-semibold">
                      {SECTION_LABELS[entry.section as keyof typeof SECTION_LABELS] ??
                        entry.section}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">{entry.message}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatDate(new Date(entry.at))}
                    </p>
                  </div>
                ))
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Retry will regenerate only the sections that are still missing, keeping any content
              that was already generated.
            </p>
            <RetryJobButton jobId={job.id} />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {PIPELINE_SECTIONS.map((section) => {
          const result = resultsBySection.get(section);

          if (!result) {
            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle className="text-base">{SECTION_LABELS[section]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {job.status === "FAILED"
                      ? "Not generated — this section failed."
                      : "Not generated yet."}
                  </p>
                </CardContent>
              </Card>
            );
          }

          return (
            <SectionBlock
              key={section}
              jobId={job.id}
              section={section}
              content={result.content as SectionContent}
              version={result.version}
              updatedAt={result.updatedAt}
              provider={result.provider}
              model={result.model}
            />
          );
        })}
      </div>
    </div>
  );
}
