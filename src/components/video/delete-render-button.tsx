"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteVideoRender } from "@/features/render-engine/actions";
import { Trash2Icon } from "lucide-react";

type DeleteRenderButtonProps = {
  renderId: string;
};

export function DeleteRenderButton({ renderId }: DeleteRenderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteVideoRender(renderId);
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      <Trash2Icon className={isPending ? "size-4 animate-pulse" : "size-4"} />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
