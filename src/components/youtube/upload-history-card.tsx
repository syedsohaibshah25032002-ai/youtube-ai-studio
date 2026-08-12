import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadStatusBadge } from "@/components/youtube/upload-status-badge";
import { readErrorLog } from "@/features/youtube-upload/engine";
import { formatDate, formatInTimeZone } from "@/lib/date";
import { prisma } from "@/lib/prisma";

/**
 * Shows the current user's recent YouTube uploads with their status and a link
 * to the published video. Sanitized records only; no token material is read or
 * displayed.
 */
export async function UploadHistoryCard() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const uploads = await prisma.youtubeUpload.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      progress: true,
      stage: true,
      videoId: true,
      videoUrl: true,
      scheduledAt: true,
      timezone: true,
      errorLog: true,
      createdAt: true,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload history</CardTitle>
        <CardDescription>Recent uploads to YouTube from this account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {uploads.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing published yet. Choose a completed render to upload.
          </p>
        ) : (
          uploads.map((upload) => {
            const errors = readErrorLog(upload.errorLog);
            return (
              <div
                key={upload.id}
                className="border-border flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{upload.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {upload.status === "SCHEDULED" && upload.scheduledAt
                      ? `Scheduled for ${formatInTimeZone(
                          upload.scheduledAt,
                          upload.timezone || "UTC"
                        )}`
                      : formatDate(upload.createdAt)}
                    {upload.status === "UPLOADING" ||
                    upload.status === "PROCESSING" ||
                    upload.status === "PENDING"
                      ? ` · ${upload.stage || "Queued"} (${upload.progress}%)`
                      : ""}
                  </p>
                  {upload.status === "COMPLETED" && upload.videoUrl ? (
                    <a
                      href={upload.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mt-1 block truncate text-xs hover:underline"
                    >
                      {upload.videoUrl}
                    </a>
                  ) : null}
                  {upload.status === "FAILED" && errors.length > 0 ? (
                    <p className="text-destructive mt-1 text-xs">
                      {errors[errors.length - 1]?.message}
                    </p>
                  ) : null}
                </div>
                <UploadStatusBadge
                  status={
                    upload.status as
                      | "PENDING"
                      | "SCHEDULED"
                      | "PROCESSING"
                      | "UPLOADING"
                      | "COMPLETED"
                      | "FAILED"
                      | "DUPLICATE"
                  }
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
