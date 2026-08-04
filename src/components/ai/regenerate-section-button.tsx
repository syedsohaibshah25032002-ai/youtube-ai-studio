"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { regenerateSection } from "@/features/content-generator/actions";
import { RefreshCwIcon } from "lucide-react";

type RegenerateSectionButtonProps = {
  jobId: string;
  section: string;
};

export function RegenerateSectionButton({ jobId, section }: RegenerateSectionButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateSection(jobId, section);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleRegenerate}
        disabled={isPending}
      >
        <RefreshCwIcon className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
        {isPending ? "Regenerating..." : "Regenerate"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
