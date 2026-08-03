"use client";

import { useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { deleteChannel } from "@/features/channels/actions";

type DeleteChannelFormProps = {
  channelId: string;
  channelName: string;
};

export function DeleteChannelForm({ channelId, channelName }: DeleteChannelFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteChannel(channelId);
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Are you sure you want to delete{" "}
        <span className="text-foreground font-semibold">{channelName}</span>? This action cannot be
        undone.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" disabled={isPending} render={<Link href="/dashboard/channels" />}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? "Deleting..." : "Delete channel"}
        </Button>
      </div>
    </div>
  );
}
