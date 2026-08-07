"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createVideoRender } from "@/features/render-engine/actions";
import { RENDER_RESOLUTION_LABELS } from "@/features/render-engine/types";
import type { RenderResolution } from "@/lib/render/types";
import { Loader2Icon, MonitorPlayIcon } from "lucide-react";

type RenderJobFormProps = {
  videoJobId: string;
};

export function RenderJobForm({ videoJobId }: RenderJobFormProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState<RenderResolution>("1080p");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createVideoRender({ videoJobId, resolution });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        const response = await fetch(`/api/video/renders/${result.renderId}/run`, {
          method: "POST",
        });
        if (!response.ok) {
          setError("The render could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the render engine. Please try again.");
        return;
      }

      router.push(`/dashboard/video/${videoJobId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <div className="space-y-2">
        <Label>Resolution</Label>
        <Select
          value={resolution}
          onValueChange={(value) => setResolution((value as RenderResolution) ?? "1080p")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(RENDER_RESOLUTION_LABELS).map((option) => (
              <SelectItem key={option} value={option}>
                {RENDER_RESOLUTION_LABELS[option as RenderResolution]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          The final MP4 is rendered locally with FFmpeg at your chosen resolution.
        </p>
      </div>

      {isPending ? <ProgressBar indeterminate /> : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <MonitorPlayIcon className="size-4" />
              Render MP4
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
