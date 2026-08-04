"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/ai/progress-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGenerationJob } from "@/features/content-generator/actions";
import { Loader2Icon, SparklesIcon } from "lucide-react";

type ChannelOption = {
  id: string;
  name: string;
};

type GenerationFormProps = {
  channelOptions: ChannelOption[];
};

export function GenerationForm({ channelOptions }: GenerationFormProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [channelId, setChannelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createGenerationJob({ topic, channelId });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      try {
        const response = await fetch(`/api/ai/jobs/${result.jobId}/run`, { method: "POST" });
        if (!response.ok) {
          setError("The generation job could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the generation service. Please try again.");
        return;
      }

      router.push(`/dashboard/ai/jobs/${result.jobId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Textarea
          id="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. How to grow a YouTube channel from zero"
          rows={3}
          required
        />
        <p className="text-muted-foreground text-xs">
          The engine will generate research, outline, script, titles, description, tags and a
          thumbnail prompt for this topic.
        </p>
      </div>

      {channelOptions.length > 0 ? (
        <div className="space-y-2">
          <Label>Channel (optional)</Label>
          <Select
            value={channelId || "none"}
            onValueChange={(value) => setChannelId(!value || value === "none" ? "" : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No channel</SelectItem>
              {channelOptions.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            When selected, the engine tailors the content to your channel.
          </p>
        </div>
      ) : null}

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
              <SparklesIcon className="size-4" />
              Generate content
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
