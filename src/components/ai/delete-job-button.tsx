"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteJob } from "@/features/content-generator/actions";
import { Trash2Icon } from "lucide-react";

type DeleteJobButtonProps = {
  jobId: string;
};

export function DeleteJobButton({ jobId }: DeleteJobButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteJob(jobId);
      router.push("/dashboard/ai");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      <Trash2Icon className="size-4" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
