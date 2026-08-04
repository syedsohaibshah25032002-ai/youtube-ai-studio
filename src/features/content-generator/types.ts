export const PIPELINE_SECTIONS = [
  "topic",
  "research",
  "outline",
  "script",
  "title",
  "description",
  "tags",
  "thumbnailPrompt",
] as const;

export type PipelineSection = (typeof PIPELINE_SECTIONS)[number];

export const ARRAY_SECTIONS: ReadonlySet<string> = new Set(["topic", "title", "tags"]);

export const SECTION_LABELS: Record<PipelineSection, string> = {
  topic: "Topic ideas",
  research: "Research",
  outline: "Outline",
  script: "Script",
  title: "Title options",
  description: "Description",
  tags: "Tags",
  thumbnailPrompt: "Thumbnail prompt",
};

/** Content stored per section: plain text or a list of items. */
export type SectionContent = string | string[];

export type ErrorLogEntry = {
  section: string;
  message: string;
  at: string;
};

export type PipelineContext = {
  topic: string;
  channelName?: string;
  prior: Partial<Record<PipelineSection, SectionContent>>;
};
