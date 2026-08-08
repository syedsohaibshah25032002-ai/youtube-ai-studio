"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { disconnectYoutubeConnectionAction } from "@/features/youtube-connection/actions";
import { UnplugIcon } from "lucide-react";

export function DisconnectYoutubeButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectYoutubeConnectionAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={isPending}>
        <UnplugIcon className={isPending ? "size-4 animate-pulse" : "size-4"} />
        {isPending ? "Disconnecting..." : "Disconnect"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
