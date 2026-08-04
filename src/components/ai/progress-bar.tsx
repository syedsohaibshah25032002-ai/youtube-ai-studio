import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value?: number;
  indeterminate?: boolean;
  className?: string;
};

export function ProgressBar({ value = 0, indeterminate = false, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  if (indeterminate) {
    return (
      <div
        className={cn("bg-muted relative h-2 w-full overflow-hidden rounded-full", className)}
        role="progressbar"
        aria-label="Progress"
      >
        <div className="animate-progress-slide bg-primary absolute inset-y-0 w-1/3 rounded-full" />
      </div>
    );
  }

  return (
    <div
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
