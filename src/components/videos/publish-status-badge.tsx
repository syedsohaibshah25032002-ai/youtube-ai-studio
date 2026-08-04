import { Badge } from "@/components/ui/badge";
import { publishStatuses } from "@/lib/validations/video";

export function PublishStatusBadge({ status }: { status: string }) {
  const variant: Record<(typeof publishStatuses)[number], "default" | "secondary" | "outline"> = {
    published: "default",
    scheduled: "secondary",
    draft: "outline",
  };

  const fallback: (typeof publishStatuses)[number] = publishStatuses.includes(
    status as (typeof publishStatuses)[number]
  )
    ? (status as (typeof publishStatuses)[number])
    : "draft";

  return (
    <Badge variant={variant[fallback]}>
      {fallback.charAt(0).toUpperCase() + fallback.slice(1)}
    </Badge>
  );
}
