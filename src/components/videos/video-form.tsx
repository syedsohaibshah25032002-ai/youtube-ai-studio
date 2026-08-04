"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createVideo, fetchVideoInfoAction, updateVideo } from "@/features/videos/actions";
import { YOUTUBE_CATEGORIES } from "@/lib/constants";
import { visibilityOptions } from "@/lib/validations/channel";
import { publishStatuses, type VideoFormInput } from "@/lib/validations/video";

type ChannelOption = {
  id: string;
  name: string;
};

type VideoFormProps = {
  mode: "create" | "edit";
  videoId?: string;
  channelOptions: ChannelOption[];
  initial?: VideoFormInput;
};

export function VideoForm({ mode, videoId, channelOptions, initial }: VideoFormProps) {
  const [channelId, setChannelId] = useState(initial?.channelId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>(
    initial?.visibility ?? "public"
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [publishStatus, setPublishStatus] = useState<(typeof publishStatuses)[number]>(
    initial?.publishStatus ?? "draft"
  );
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduledAt ?? "");
  const [videoIdInput, setVideoIdInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFetchInfo() {
    setError(null);
    if (!videoIdInput.trim()) {
      setError("Enter a video ID first.");
      return;
    }

    setFetching(true);
    const result = await fetchVideoInfoAction(videoIdInput.trim());
    setFetching(false);

    if (result.ok) {
      setTitle(result.videoInfo.title);
      setDescription(result.videoInfo.description);
      setThumbnailUrl(result.videoInfo.thumbnailUrl);
    } else {
      setError(result.error);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input: VideoFormInput = {
      channelId,
      title,
      description,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      categoryId,
      visibility,
      thumbnailUrl,
      publishStatus,
      scheduledAt,
    };

    startTransition(async () => {
      const result =
        mode === "create" ? await createVideo(input) : await updateVideo(videoId!, input);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Video details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Channel</Label>
            <Select
              value={channelId || "none"}
              onValueChange={(value) => setChannelId(!value || value === "none" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a channel</SelectItem>
                {channelOptions.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My amazing video"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your video..."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="tutorial, ai, youtube"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId || "none"}
              onValueChange={(value) => setCategoryId(!value || value === "none" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {YOUTUBE_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility((value as (typeof visibilityOptions)[number]) ?? "public")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
            <Input
              id="thumbnailUrl"
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Publishing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Publish status</Label>
            <Select
              value={publishStatus}
              onValueChange={(value) =>
                setPublishStatus((value as (typeof publishStatuses)[number]) ?? "draft")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {publishStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {publishStatus === "scheduled" ? (
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Schedule date</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
              />
              <p className="text-muted-foreground text-xs">
                The video will be published at this date and time.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Fetch from YouTube</h2>
        <div className="flex gap-2">
          <Input
            id="videoId"
            value={videoIdInput}
            onChange={(event) => setVideoIdInput(event.target.value)}
            placeholder="YouTube video ID"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchInfo}
            disabled={fetching || isPending}
          >
            {fetching ? "Fetching..." : "Fetch info"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Fill in the details from a YouTube video (mock data is used when no API key is
          configured). This does not save the video ID.
        </p>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = "/dashboard/videos")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Adding video..."
              : "Saving changes..."
            : mode === "create"
              ? "Add video"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
