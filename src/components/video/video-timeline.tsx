import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRANSITION_LABELS } from "@/features/video-engine/types";
import type { Scene } from "@/lib/video/types";
import { CaptionsIcon, ImageOffIcon, MusicIcon, PlayIcon } from "lucide-react";

type VideoTimelineProps = {
  scenes: Scene[];
  musicEnabled: boolean;
};

export function VideoTimeline({ scenes, musicEnabled }: VideoTimelineProps) {
  if (scenes.length === 0) {
    return <p className="text-muted-foreground text-sm">No timeline has been built yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {scenes.map((scene) => (
        <li key={scene.id}>
          <Card>
            <CardHeader className="gap-1 py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
                    {scene.index + 1}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <PlayIcon className="size-3.5" />
                    {scene.durationSeconds}s
                  </span>
                  <Badge variant="outline">{TRANSITION_LABELS[scene.transition]}</Badge>
                  {scene.captions.length > 0 ? (
                    <Badge variant="outline" className="gap-1">
                      <CaptionsIcon className="size-3" />
                      Captions
                    </Badge>
                  ) : null}
                </CardTitle>
                <span className="text-muted-foreground text-xs">
                  Scene {scene.index + 1} of {scenes.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 py-3">
              {scene.mediaUrl ? (
                <div className="bg-muted relative aspect-video overflow-hidden rounded-md border">
                  <Image
                    src={scene.mediaUrl}
                    alt={`Scene ${scene.index + 1} image`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-md border">
                  <ImageOffIcon className="size-6" />
                </div>
              )}
              <p className="text-muted-foreground line-clamp-3 text-sm">{scene.text}</p>
            </CardContent>
          </Card>
        </li>
      ))}
      {musicEnabled ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MusicIcon className="size-3.5" />
          Background music will be mixed across all scenes.
        </p>
      ) : null}
    </ol>
  );
}
