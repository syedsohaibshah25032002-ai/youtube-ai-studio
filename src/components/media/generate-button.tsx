"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Wand2Icon } from "lucide-react";

type GenerateButtonProps = {
  assetId: string;
  label?: string;
};

export function GenerateButton({ assetId, label = "Generate again" }: GenerateButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/media/assets/${assetId}/run`, {
          method: "POST",
        });

        if (response.status === 409) {
          setError("This asset is already being generated.");
          return;
        }
        if (!response.ok) {
          setError("The generation could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the media engine. Please try again.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleGenerate} disabled={isPending}>
        <Wand2Icon className={isPending ? "size-4 animate-pulse" : "size-4"} />
        {isPending ? "Starting..." : label}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
