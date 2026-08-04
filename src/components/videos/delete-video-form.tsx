"use client";

import { useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { deleteVideo } from "@/features/videos/actions";

type DeleteVideoFormProps = {
  videoId: string;
  videoTitle: string;
};

export function DeleteVideoForm({ videoId, videoTitle }: DeleteVideoFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteVideo(videoId);
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Are you sure you want to delete{" "}
        <span className="text-foreground font-semibold">{videoTitle}</span>? This action cannot be
        undone.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" disabled={isPending} render={<Link href="/dashboard/videos" />}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? "Deleting..." : "Delete video"}
        </Button>
      </div>
    </div>
  );
}
