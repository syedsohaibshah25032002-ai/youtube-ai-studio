"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteMediaAsset } from "@/features/media-engine/actions";
import { Trash2Icon } from "lucide-react";

type DeleteAssetButtonProps = {
  assetId: string;
};

export function DeleteAssetButton({ assetId }: DeleteAssetButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMediaAsset(assetId);
      router.push("/dashboard/media");
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}>
      <Trash2Icon className="size-4" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
