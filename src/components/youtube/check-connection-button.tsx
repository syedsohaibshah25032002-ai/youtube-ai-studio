"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { refreshYoutubeConnectionAction } from "@/features/youtube-connection/actions";
import { RefreshCwIcon } from "lucide-react";

export function CheckYoutubeConnectionButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheck() {
    setError(null);
    startTransition(async () => {
      const result = await refreshYoutubeConnectionAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={handleCheck} disabled={isPending}>
        <RefreshCwIcon className={isPending ? "size-4 animate-spin" : "size-4"} />
        {isPending ? "Checking..." : "Check status"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
