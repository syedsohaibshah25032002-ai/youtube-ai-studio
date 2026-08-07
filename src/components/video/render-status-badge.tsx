import { Badge } from "@/components/ui/badge";
import { RENDER_STATUS_LABELS, type RenderStatus } from "@/features/render-engine/types";
import { Loader2Icon } from "lucide-react";

const STATUS_VARIANT: Record<RenderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  RUNNING: "secondary",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function RenderStatusBadge({ status }: { status: string }) {
  const normalized = RENDER_STATUS_LABELS[status as RenderStatus]
    ? (status as RenderStatus)
    : "PENDING";

  return (
    <Badge variant={STATUS_VARIANT[normalized]} className="gap-1.5">
      {normalized === "RUNNING" ? <Loader2Icon className="size-3 animate-spin" /> : null}
      {RENDER_STATUS_LABELS[normalized]}
    </Badge>
  );
}
