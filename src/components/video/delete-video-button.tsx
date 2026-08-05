"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteVideoJob } from "@/features/video-engine/actions";
import { Trash2Icon } from "lucide-react";

type DeleteVideoButtonProps = {
  jobId: string;
};

export function DeleteVideoButton({ jobId }: DeleteVideoButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteVideoJob(jobId);
      router.push("/dashboard/video");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      <Trash2Icon className="size-4" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
