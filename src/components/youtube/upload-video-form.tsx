"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { createYoutubeUploadAction } from "@/features/youtube-upload/actions";
import { UploadProgress } from "@/components/youtube/upload-progress";
import { YOUTUBE_CATEGORIES, YOUTUBE_TIMEZONES } from "@/features/youtube-upload/types";
import type { YoutubeUploadDisplay } from "@/features/youtube-upload/types";
import { ClockIcon, Loader2Icon, UploadCloudIcon } from "lucide-react";

type UploadableRender = {
  id: string;
  videoJobId: string;
  videoJobTitle: string | null;
  resolution: string;
  finishedAt: Date | null;
};

type UploadVideoFormProps = {
  renders: UploadableRender[];
  connected: boolean;
};

const VISIBILITY_LABELS = {
  public: "Public — visible to everyone",
  unlisted: "Unlisted — only people with the link",
  private: "Private — only you",
} as const;

export function UploadVideoForm({ renders, connected }: UploadVideoFormProps) {
  const router = useRouter();
  const [renderId, setRenderId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [categoryId, setCategoryId] = useState("22");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("private");
  const [thumbnailPath, setThumbnailPath] = useState("");
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upload, setUpload] = useState<YoutubeUploadDisplay | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRenderChange(value: string) {
    setRenderId(value);
    const render = renders.find((item) => item.id === value);
    if (render && render.videoJobTitle) {
      setTitle(render.videoJobTitle);
    }
  }

  async function handleThumbnailChange(file: File | null) {
    setThumbnailError(null);
    if (!file) {
      setThumbnailPath("");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/youtube/uploads/thumbnail", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setThumbnailError(data?.error ?? "The thumbnail could not be uploaded.");
        return;
      }
      const data = (await response.json()) as { path: string };
      setThumbnailPath(data.path);
    } catch {
      setThumbnailError("Could not reach the upload endpoint. Please try again.");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setUpload(null);

    if (scheduleMode && !scheduledAt) {
      setError("Choose a date and time to schedule the publish.");
      return;
    }

    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createYoutubeUploadAction({
        renderId,
        title,
        description,
        tags,
        categoryId,
        visibility,
        thumbnailPath,
        scheduledAt: scheduleMode ? scheduledAt : "",
        timezone,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.duplicate) {
        setUpload(result.upload);
        setNotice("This render was already published to YouTube. Showing the existing upload.");
        return;
      }

      if (result.upload.status === "SCHEDULED") {
        setUpload(result.upload);
        setNotice("Video scheduled. The queue will publish it at the chosen time.");
        router.refresh();
        return;
      }

      try {
        const runResponse = await fetch(`/api/youtube/uploads/${result.upload.id}/run`, {
          method: "POST",
        });
        if (!runResponse.ok) {
          setError("The upload could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the YouTube upload engine. Please try again.");
        return;
      }

      router.refresh();
      window.setTimeout(() => {
        setUpload(result.upload);
      }, 400);
    });
  }

  const uploading =
    upload !== null &&
    (upload.status === "PENDING" ||
      upload.status === "SCHEDULED" ||
      upload.status === "PROCESSING" ||
      upload.status === "UPLOADING");

  const submitLabel = isPending
    ? "Preparing upload..."
    : uploading
      ? "Uploading..."
      : scheduleMode
        ? "Schedule publish"
        : "Upload to YouTube";

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="render">Completed video to upload</Label>
          {renders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No completed renders available to publish. Render a video first.
            </p>
          ) : (
            <Select value={renderId} onValueChange={(value) => handleRenderChange(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a completed render" />
              </SelectTrigger>
              <SelectContent>
                {renders.map((render) => (
                  <SelectItem key={render.id} value={render.id}>
                    {render.videoJobTitle ?? render.id} · {render.resolution}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="My first published video"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={10000}
            rows={4}
            placeholder="What is this video about?"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="tutorial, youtube, studio"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "22")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOUTUBE_CATEGORIES.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as "public" | "private" | "unlisted")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VISIBILITY_LABELS) as Array<keyof typeof VISIBILITY_LABELS>).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {VISIBILITY_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
          <Input
            id="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void handleThumbnailChange(event.target.files?.[0] ?? null);
            }}
          />
          {thumbnailError ? <p className="text-destructive text-xs">{thumbnailError}</p> : null}
          {thumbnailPath ? (
            <p className="text-muted-foreground text-xs">Thumbnail ready to upload.</p>
          ) : null}
        </div>

        <div className="rounded-md border p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={scheduleMode}
              onChange={(event) => setScheduleMode(event.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <ClockIcon className="size-4" /> Schedule this publish
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                Pick a future date and time. The queue uploads the video no earlier than this
                instant.
              </span>
            </span>
          </label>

          {scheduleMode ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Publish date and time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  step={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(value) => setTimezone(value ?? "UTC")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YOUTUBE_TIMEZONES.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

        <Button
          type="submit"
          disabled={isPending || uploading || !connected || renders.length === 0 || !renderId}
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadCloudIcon className="size-4" />
          )}
          {submitLabel}
        </Button>
      </form>

      {upload ? (
        <div className="rounded-md border p-3">
          <UploadProgress
            uploadId={upload.id}
            initialStatus={upload.status}
            initialProgress={upload.progress}
          />
        </div>
      ) : null}
    </div>
  );
}
