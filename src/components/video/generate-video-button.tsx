"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ClapperboardIcon } from "lucide-react";

type GenerateVideoButtonProps = {
  jobId: string;
  label?: string;
};

export function GenerateVideoButton({ jobId, label = "Generate again" }: GenerateVideoButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/video/jobs/${jobId}/run`, {
          method: "POST",
        });

        if (response.status === 409) {
          setError("This video is already being generated.");
          return;
        }
        if (!response.ok) {
          setError("The generation could not be started. Please try again.");
          return;
        }
      } catch {
        setError("Could not reach the video engine. Please try again.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleGenerate} disabled={isPending}>
        <ClapperboardIcon className={isPending ? "size-4 animate-pulse" : "size-4"} />
        {isPending ? "Starting..." : label}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
