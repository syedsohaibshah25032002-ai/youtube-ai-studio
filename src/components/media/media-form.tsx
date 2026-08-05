"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createMediaAsset } from "@/features/media-engine/actions";
import { MEDIA_TYPE_LABELS } from "@/features/media-engine/types";
import { MEDIA_TYPES } from "@/lib/media/types";
import { Loader2Icon, Wand2Icon } from "lucide-react";

export function MediaForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof MEDIA_TYPES)[number]>("thumbnail");
  const [prompt, setPrompt] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createMediaAsset({
        title,
        type,
        prompt,
        width: width === "" ? undefined : Number(width),
        height: height === "" ? undefined : Number(height),
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        const response = await fetch(`/api/media/assets/${result.assetId}/run`, {
          method: "POST",
        });
        if (!response.ok) {
          setError("The generation could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the media engine. Please try again.");
        return;
      }

      router.push(`/dashboard/media/${result.assetId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="My channel thumbnail"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Asset type</Label>
        <Select
          value={type}
          onValueChange={(value) => setType((value as (typeof MEDIA_TYPES)[number]) ?? "thumbnail")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {MEDIA_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the image you want to generate..."
          rows={5}
          required
        />
        <p className="text-muted-foreground text-xs">
          A detailed prompt produces a better result. Include style, subject, colors and
          composition.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="width">Width (optional)</Label>
          <Input
            id="width"
            type="number"
            min={1}
            max={8192}
            value={width}
            onChange={(event) => setWidth(event.target.value)}
            placeholder="Auto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Height (optional)</Label>
          <Input
            id="height"
            type="number"
            min={1}
            max={8192}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="Auto"
          />
        </div>
      </div>

      {isPending ? <ProgressBar indeterminate /> : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2Icon className="size-4" />
              Generate asset
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
