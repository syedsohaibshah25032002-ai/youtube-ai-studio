"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createChannel, fetchChannelInfoAction, updateChannel } from "@/features/channels/actions";
import { YOUTUBE_CATEGORIES, YOUTUBE_LANGUAGES } from "@/lib/constants";
import {
  type ChannelFormInput,
  type ChannelSettings,
  type UploadDefaults,
  visibilityOptions,
} from "@/lib/validations/channel";

type ChannelFormProps = {
  mode: "create" | "edit";
  channelId?: string;
  initial?: ChannelFormInput;
};

const defaultUploadDefaults: UploadDefaults = {
  titleTemplate: "",
  descriptionTemplate: "",
  tags: [],
  categoryId: "",
  visibility: "public",
  language: "en",
};

const defaultSettings: ChannelSettings = {
  defaultLanguage: "en",
  notifyOnPublish: true,
  autoPublish: false,
};

export function ChannelForm({ mode, channelId, initial }: ChannelFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [channelIdValue, setChannelIdValue] = useState(initial?.channelId ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? "");
  const [subscriberCount, setSubscriberCount] = useState(String(initial?.subscriberCount ?? 0));
  const [uploadDefaults, setUploadDefaults] = useState<UploadDefaults>(
    initial?.uploadDefaults ?? defaultUploadDefaults
  );
  const [settings, setSettings] = useState<ChannelSettings>(initial?.settings ?? defaultSettings);
  const [tagsInput, setTagsInput] = useState(initial?.uploadDefaults.tags.join(", ") ?? "");

  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFetchInfo() {
    setError(null);
    if (!channelIdValue.trim()) {
      setError("Enter a channel ID first.");
      return;
    }

    setFetching(true);
    const result = await fetchChannelInfoAction(channelIdValue.trim());
    setFetching(false);

    if (result.ok) {
      setName(result.channelInfo.name);
      setThumbnailUrl(result.channelInfo.thumbnailUrl);
      setSubscriberCount(String(result.channelInfo.subscriberCount));
    } else {
      setError(result.error);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input: ChannelFormInput = {
      name,
      channelId: channelIdValue,
      thumbnailUrl,
      subscriberCount: Number(subscriberCount || 0),
      uploadDefaults: {
        ...uploadDefaults,
        tags: tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      settings,
    };

    startTransition(async () => {
      const result =
        mode === "create" ? await createChannel(input) : await updateChannel(channelId!, input);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Channel details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Channel name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My YouTube channel"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channelId">Channel ID</Label>
            <div className="flex gap-2">
              <Input
                id="channelId"
                value={channelIdValue}
                onChange={(event) => setChannelIdValue(event.target.value)}
                placeholder="UC..."
                required
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
              Fetch channel info from YouTube (mock data is used when no API key is configured).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
            <Input
              id="thumbnailUrl"
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscriberCount">Subscriber count</Label>
            <Input
              id="subscriberCount"
              type="number"
              min={0}
              value={subscriberCount}
              onChange={(event) => setSubscriberCount(event.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Upload defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="titleTemplate">Title template</Label>
            <Input
              id="titleTemplate"
              value={uploadDefaults.titleTemplate}
              onChange={(event) =>
                setUploadDefaults((prev) => ({
                  ...prev,
                  titleTemplate: event.target.value,
                }))
              }
              placeholder="My Video: {title}"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="descriptionTemplate">Description template</Label>
            <Textarea
              id="descriptionTemplate"
              value={uploadDefaults.descriptionTemplate}
              onChange={(event) =>
                setUploadDefaults((prev) => ({
                  ...prev,
                  descriptionTemplate: event.target.value,
                }))
              }
              placeholder="Thanks for watching! Subscribe for more..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="vlog, tutorial, youtube"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={uploadDefaults.categoryId || "none"}
              onValueChange={(value) =>
                setUploadDefaults((prev) => ({
                  ...prev,
                  categoryId: !value || value === "none" ? "" : value,
                }))
              }
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
              value={uploadDefaults.visibility}
              onValueChange={(value) =>
                setUploadDefaults((prev) => ({
                  ...prev,
                  visibility: (value as (typeof visibilityOptions)[number]) ?? "public",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Video language</Label>
            <Select
              value={uploadDefaults.language}
              onValueChange={(value) =>
                setUploadDefaults((prev) => ({
                  ...prev,
                  language: value ?? "en",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOUTUBE_LANGUAGES.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Default language</Label>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultLanguage: value ?? "en",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YOUTUBE_LANGUAGES.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="block">Notify on publish</Label>
              <p className="text-muted-foreground text-sm">
                Send a notification when a video is published.
              </p>
            </div>
            <Switch
              checked={settings.notifyOnPublish}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, notifyOnPublish: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="block">Auto publish</Label>
              <p className="text-muted-foreground text-sm">
                Automatically publish videos using the defaults above.
              </p>
            </div>
            <Switch
              checked={settings.autoPublish}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoPublish: checked }))
              }
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => (window.location.href = "/dashboard/channels")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? mode === "create"
              ? "Adding channel..."
              : "Saving changes..."
            : mode === "create"
              ? "Add channel"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
