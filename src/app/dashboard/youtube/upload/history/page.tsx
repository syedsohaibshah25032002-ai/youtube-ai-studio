import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { UploadManagementActions } from "@/components/youtube/upload-management-actions";
import { UploadStatusBadge } from "@/components/youtube/upload-status-badge";
import { readErrorLog, toUploadDisplay } from "@/features/youtube-upload/engine";
import { formatDate, formatInTimeZone, formatRetryIn } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Upload History",
  description: "Every YouTube upload from this account, with actions to manage it.",
};

export default async function YoutubeUploadHistoryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const uploads = await prisma.youtubeUpload.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      renderId: true,
      videoJobId: true,
      title: true,
      description: true,
      tags: true,
      categoryId: true,
      visibility: true,
      status: true,
      progress: true,
      stage: true,
      videoId: true,
      videoUrl: true,
      scheduledAt: true,
      timezone: true,
      errorLog: true,
      startedAt: true,
      finishedAt: true,
      attempts: true,
      nextAttemptAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload History</h1>
          <p className="text-muted-foreground mt-1">
            Every YouTube upload from this account. Cancel scheduled uploads, publish them now, or
            retry failures.
          </p>
        </div>
        <Button render={<Link href="/dashboard/youtube/upload" />}>New upload</Button>
      </div>

      {uploads.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No uploads yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Once you publish a render, it will be recorded here.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/youtube/upload" />}>
            Publish a video
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {uploads.map((raw) => {
            const upload = toUploadDisplay(raw);
            const errors = readErrorLog(raw.errorLog);
            const scheduled =
              upload.status === "SCHEDULED" && upload.scheduledAt
                ? formatInTimeZone(upload.scheduledAt, upload.timezone || "UTC")
                : null;
            return (
              <div
                key={upload.id}
                className="border-border flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{upload.title}</p>
                    <UploadStatusBadge status={upload.status} />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {scheduled
                      ? `Scheduled for ${scheduled}`
                      : `Queued ${formatDate(upload.createdAt)}`}
                    {upload.status === "COMPLETED" && upload.videoUrl
                      ? ` · Published ${formatDate(upload.finishedAt)}`
                      : ""}
                  </p>
                  {upload.status === "PENDING" ||
                  upload.status === "PROCESSING" ||
                  upload.status === "UPLOADING" ? (
                    <p className="text-muted-foreground text-xs">
                      {upload.stage || "Queued"} ({upload.progress}%)
                    </p>
                  ) : null}
                  {upload.attempts > 0 && upload.nextAttemptAt ? (
                    <p className="text-muted-foreground text-xs">
                      Retrying in ~{formatRetryIn(upload.nextAttemptAt)} (attempt {upload.attempts})
                    </p>
                  ) : null}
                  {upload.status === "COMPLETED" && upload.videoUrl ? (
                    <a
                      href={upload.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary block truncate text-xs hover:underline"
                    >
                      {upload.videoUrl}
                    </a>
                  ) : null}
                  {upload.status === "FAILED" && errors.length > 0 ? (
                    <p className="text-destructive text-xs">{errors[errors.length - 1]?.message}</p>
                  ) : null}
                  {errors.length > 1 ? (
                    <p className="text-muted-foreground text-xs">
                      {errors.length} attempt{errors.length === 1 ? "" : "s"} logged.
                    </p>
                  ) : null}
                </div>
                <UploadManagementActions uploadId={upload.id} status={upload.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
