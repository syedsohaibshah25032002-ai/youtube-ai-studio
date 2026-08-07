import { RenderProgress } from "@/components/video/render-progress";
import { RenderStatusBadge } from "@/components/video/render-status-badge";
import { RetryRenderButton } from "@/components/video/retry-render-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RENDER_RESOLUTION_LABELS } from "@/features/render-engine/types";
import { readErrorLog, readPreviewImages } from "@/features/render-engine/engine";
import { formatDate } from "@/lib/date";
import { MonitorPlayIcon } from "lucide-react";

type VideoRenderRecord = {
  id: string;
  resolution: string;
  status: string;
  progress: number;
  stage: string;
  provider: string;
  model: string;
  outputPath: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  previewImages: unknown;
  errorLog: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

type RenderHistorySectionProps = {
  renders: VideoRenderRecord[];
};

export function RenderHistorySection({ renders }: RenderHistorySectionProps) {
  if (renders.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No renders yet. Start one with the form above.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {renders.map((render) => {
        const errors = readErrorLog(render.errorLog);
        const previews = readPreviewImages(render.previewImages);
        const active = render.status === "PENDING" || render.status === "RUNNING";

        return (
          <Card key={render.id}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">
                  {RENDER_RESOLUTION_LABELS[
                    render.resolution as keyof typeof RENDER_RESOLUTION_LABELS
                  ] ?? render.resolution}{" "}
                  render
                </CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {render.provider} / {render.model} · {formatDate(render.createdAt)}
                </p>
              </div>
              <RenderStatusBadge status={render.status} />
            </CardHeader>
            <CardContent className="space-y-2">
              {active ? (
                <RenderProgress
                  renderId={render.id}
                  initialStatus={render.status}
                  initialProgress={render.progress}
                />
              ) : null}

              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                {render.durationSeconds ? <span>{render.durationSeconds}s</span> : null}
                {render.width && render.height ? (
                  <span>
                    {render.width}×{render.height}
                  </span>
                ) : null}
                {render.finishedAt ? <span>Finished {formatDate(render.finishedAt)}</span> : null}
              </div>

              {previews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {previews.map((preview) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={preview}
                      src={preview}
                      alt="Render preview"
                      className="bg-muted size-28 rounded-lg border object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {render.outputPath ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground truncate text-xs">
                    Output: <span className="font-mono">{render.outputPath}</span>
                  </p>
                  <a
                    href={render.outputPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <MonitorPlayIcon className="size-3.5" />
                    Watch
                  </a>
                </div>
              ) : null}

              {errors.length > 0 ? (
                <div className="bg-destructive/5 border-destructive/20 rounded-lg border p-3">
                  {errors.map((entry, index) => (
                    <p
                      key={`${entry.action}-${entry.at}-${index}`}
                      className="text-destructive text-xs"
                    >
                      {entry.message}
                    </p>
                  ))}
                </div>
              ) : null}

              {render.status === "FAILED" ? <RetryRenderButton renderId={render.id} /> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
