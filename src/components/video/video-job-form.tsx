"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { createVideoJob } from "@/features/video-engine/actions";
import {
  CAPTION_STYLE_LABELS,
  MUSIC_TRACKS,
  TRANSITION_LABELS,
} from "@/features/video-engine/types";
import { CAPTION_STYLES, TRANSITIONS, type CaptionStyle, type Transition } from "@/lib/video/types";
import { ClapperboardIcon, Loader2Icon } from "lucide-react";

type CompletedJobOption = {
  id: string;
  topic: string;
};

type VideoJobFormProps = {
  completedJobs: CompletedJobOption[];
};

export function VideoJobForm({ completedJobs }: VideoJobFormProps) {
  const router = useRouter();
  const [aiJobId, setAiJobId] = useState("");
  const [title, setTitle] = useState("");
  const [imageDurationSeconds, setImageDurationSeconds] = useState("4");
  const [transition, setTransition] = useState<Transition>("fade");
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>("lower-third");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicTrack, setMusicTrack] = useState("ambient");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topicsByJob = useMemo(
    () => new Map(completedJobs.map((job) => [job.id, job.topic])),
    [completedJobs]
  );

  function handleJobChange(value: string | null) {
    const next = !value || value === "none" ? "" : value;
    setAiJobId(next);
    if (next) {
      setTitle(topicsByJob.get(next) ?? "");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createVideoJob({
        aiJobId,
        title,
        config: {
          imageDurationSeconds: imageDurationSeconds === "" ? 4 : Number(imageDurationSeconds),
          transition,
          captions: { enabled: captionsEnabled, style: captionStyle },
          music: { enabled: musicEnabled, track: musicTrack, volume: 0.7 },
        },
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        const response = await fetch(`/api/video/jobs/${result.videoJobId}/run`, {
          method: "POST",
        });
        if (!response.ok) {
          setError("The video generation could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the video engine. Please try again.");
        return;
      }

      router.push(`/dashboard/video/${result.videoJobId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <div className="space-y-2">
        <Label>Source content</Label>
        <Select value={aiJobId || "none"} onValueChange={handleJobChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a completed content job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No content job</SelectItem>
            {completedJobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          The engine collects the generated script and your media assets to build the video.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Video title</Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="My generated video"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="imageDurationSeconds">Image duration (seconds)</Label>
          <Input
            id="imageDurationSeconds"
            type="number"
            min={2}
            max={15}
            value={imageDurationSeconds}
            onChange={(event) => setImageDurationSeconds(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Transition</Label>
          <Select
            value={transition}
            onValueChange={(value) => setTransition((value as Transition) ?? "fade")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {TRANSITION_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Captions</p>
            <p className="text-muted-foreground text-xs">Overlay narration text on each scene.</p>
          </div>
          <Switch
            checked={captionsEnabled}
            onCheckedChange={(checked) => setCaptionsEnabled(Boolean(checked))}
          />
        </div>
        {captionsEnabled ? (
          <div className="mt-4 space-y-2">
            <Label>Caption style</Label>
            <Select
              value={captionStyle}
              onValueChange={(value) => setCaptionStyle((value as CaptionStyle) ?? "lower-third")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_STYLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {CAPTION_STYLE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Background music</p>
            <p className="text-muted-foreground text-xs">Mix an audio track under the narration.</p>
          </div>
          <Switch
            checked={musicEnabled}
            onCheckedChange={(checked) => setMusicEnabled(Boolean(checked))}
          />
        </div>
        {musicEnabled ? (
          <div className="mt-4 space-y-2">
            <Label>Music track</Label>
            <Select value={musicTrack} onValueChange={(value) => setMusicTrack(value || "ambient")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUSIC_TRACKS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {isPending ? <ProgressBar indeterminate /> : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending || completedJobs.length === 0}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ClapperboardIcon className="size-4" />
              Generate video
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
