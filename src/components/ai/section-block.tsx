import { RegenerateSectionButton } from "@/components/ai/regenerate-section-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import {
  SECTION_LABELS,
  type PipelineSection,
  type SectionContent,
} from "@/features/content-generator/types";

type SectionBlockProps = {
  jobId: string;
  section: PipelineSection;
  content: SectionContent;
  version: number;
  updatedAt: Date;
  provider: string;
  model: string;
};

function ArrayContent({ section, items }: { section: PipelineSection; items: string[] }) {
  if (section === "tags") {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <ol className="space-y-1.5">
      {items.map((item, index) => (
        <li key={item} className="text-muted-foreground flex gap-2 text-sm">
          <span className="text-primary font-medium tabular-nums">{index + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function SectionBlock({
  jobId,
  section,
  content,
  version,
  updatedAt,
  provider,
  model,
}: SectionBlockProps) {
  const isArray = Array.isArray(content);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{SECTION_LABELS[section]}</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">
            v{version} · {provider} / {model} · {formatDate(updatedAt)}
          </p>
        </div>
        <RegenerateSectionButton jobId={jobId} section={section} />
      </CardHeader>
      <CardContent>
        {isArray ? (
          <ArrayContent section={section} items={content as string[]} />
        ) : (
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{content as string}</p>
        )}
      </CardContent>
    </Card>
  );
}
