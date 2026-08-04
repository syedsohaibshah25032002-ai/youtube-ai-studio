import type { AiMessage } from "@/lib/ai/types";
import type { PipelineContext, PipelineSection, SectionContent } from "./types";

const SYSTEM_PROMPT =
  "You are an expert YouTube content strategist and scriptwriter. Respond with only the requested content in the requested format. Use no preamble, no commentary and no markdown code fences.";

const SECTION_INSTRUCTIONS: Record<PipelineSection, string> = {
  topic:
    "Propose 5 distinct, clickable topic ideas related to the given topic. One idea per line. Do not number them. Each idea must be a complete phrase.",
  research:
    "Provide concise research notes as a bulleted list. Include an opening line, then bullet points covering audience interest, what performs well, common questions and differentiation angles.",
  outline:
    "Provide a numbered outline with 7 sections. Each line must start with a number followed by a dash, describing the section and its purpose.",
  script:
    "Write a complete spoken script for a YouTube video using markdown headings: ## Hook, ## Intro, ## Body, ## Recap, ## Call to action. Write naturally, in the first person, and reference the channel name when provided.",
  title:
    "Propose 5 title options for the video. One per line, no numbering. Each title must be under 60 characters and imply a concrete outcome.",
  description:
    "Write a YouTube video description of 3 short paragraphs. Include a bulleted list of what the viewer will learn, a polite call to action and 3 hashtags on the final line.",
  tags: "Propose 8 searchable tags. One per line, no numbering, no hashtags, each under 40 characters. Include one tag derived from the main topic.",
  thumbnailPrompt:
    "Write a detailed image-generation prompt for a YouTube thumbnail. Describe the style, focal subject, facial expression, colors, text overlay options and composition.",
};

function renderPrior(prior: Partial<Record<PipelineSection, SectionContent>>): string {
  const entries = Object.entries(prior).filter(([, content]) => Boolean(content));
  if (entries.length === 0) {
    return "None yet.";
  }

  return entries
    .map(([section, content]) => {
      const body = Array.isArray(content) ? content.join("\n") : (content as string);
      return `[${section}]\n${body}`;
    })
    .join("\n\n");
}

/**
 * Builds the chat messages used to generate one pipeline section. The prompt
 * contract is stable so that the mock provider can produce deterministic
 * output and real providers can be swapped in without changes.
 */
export function buildSectionPrompt(
  section: PipelineSection,
  context: PipelineContext
): AiMessage[] {
  const channelLine = context.channelName
    ? `CHANNEL: ${context.channelName}`
    : "CHANNEL: a general YouTube channel";

  const user = [
    `TASK: Generate the "${section}" for a YouTube video.`,
    `TOPIC: ${context.topic}`,
    channelLine,
    "",
    "PRIOR CONTENT:",
    renderPrior(context.prior),
    "",
    "INSTRUCTIONS:",
    SECTION_INSTRUCTIONS[section],
  ].join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
  ];
}
