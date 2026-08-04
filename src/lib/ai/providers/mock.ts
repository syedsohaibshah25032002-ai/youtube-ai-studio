import { hashString } from "../util";
import type { AiCompletion, AiMessage, AiProvider, AiProviderError } from "../types";

const MOCK_MODEL = "mock-1";

/**
 * Deterministic provider used when no external AI provider is configured.
 * It understands the prompt contract produced by the content pipeline
 * (embedded `TASK` and `TOPIC` markers) so switching to a real provider is a
 * drop-in change.
 */
export class MockAiProvider implements AiProvider {
  readonly id = "mock";
  readonly label = "Mock (no API key)";
  readonly defaultModel = MOCK_MODEL;

  isConfigured(): boolean {
    return true;
  }

  async complete(messages: AiMessage[]): Promise<AiCompletion> {
    const userMessage = messages.find((message) => message.role === "user");
    const prompt = userMessage?.content ?? "";

    const taskMatch = prompt.match(/TASK:\s*Generate the "([^"]+)"/i);
    const topicMatch = prompt.match(/TOPIC:\s*(.+)/i);
    const channelMatch = prompt.match(/CHANNEL:\s*(.+)/i);

    const section = (taskMatch?.[1] ?? "script").toLowerCase();
    const topic = (topicMatch?.[1] ?? "a YouTube video").trim();
    const channel = (channelMatch?.[1] ?? "").trim();

    const hash = hashString(topic.toLowerCase());

    return {
      content: this.generate(section, topic, channel, hash),
      model: MOCK_MODEL,
      provider: this.id,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  private generate(section: string, topic: string, channel: string, hash: number): string {
    switch (section) {
      case "topic":
        return this.topics(topic, hash);
      case "research":
        return this.research(topic, hash);
      case "outline":
        return this.outline(topic);
      case "script":
        return this.script(topic, channel);
      case "title":
        return this.titles(topic, hash);
      case "description":
        return this.description(topic, channel);
      case "tags":
        return this.tags(topic, hash);
      case "thumbnailprompt":
        return this.thumbnailPrompt(topic);
      default:
        return `Generated content for "${section}" about: ${topic}`;
    }
  }

  private topics(topic: string, hash: number): string {
    const angles = [
      "The complete beginner's guide",
      "What I learned after years of practice",
      "Common mistakes and how to avoid them",
      "A step-by-step blueprint",
      "Tools and techniques that actually work",
    ];

    return Array.from(
      { length: 5 },
      (_, index) => `${angles[(hash + index) % angles.length]}: ${topic}`
    ).join("\n");
  }

  private research(topic: string, hash: number): string {
    const stat = 1000 + (hash % 9000);
    const insight =
      hash % 2 === 0
        ? `Search interest for "${topic}" has grown steadily over the past year.`
        : `Viewers searching for "${topic}" tend to prefer practical, step-by-step content.`;

    return [
      `Research notes for: ${topic}`,
      "",
      `- ${insight}`,
      `- Top-performing videos on this topic share a clear, single-focused hook in the first 15 seconds.`,
      `- An estimated ${stat}+ creators currently target this topic, so differentiation matters.`,
      `- Audience questions center on getting started, common pitfalls, and recommended tools.`,
      `- Retention is strongest when the video promises one concrete outcome.`,
    ].join("\n");
  }

  private outline(topic: string): string {
    return [
      "1. Hook — Open with the result viewers can expect from this video.",
      `2. Context — Why "${topic}" matters right now and who it is for.`,
      "3. Core steps — Walk through the main process in logical order.",
      "4. Common mistakes — What to avoid and how to recover quickly.",
      "5. Tools & resources — Concrete recommendations viewers can use today.",
      "6. Recap — Summarize the key takeaways in under 30 seconds.",
      "7. Call to action — Ask viewers to subscribe and share their results.",
    ].join("\n");
  }

  private script(topic: string, channel: string): string {
    const host = channel || "your host";

    return [
      "## Hook",
      `"If you have been struggling with ${topic}, today is the day everything changes."`,
      "",
      "## Intro",
      `Welcome back to the channel! I'm ${host}, and in this video I'm going to break down ${topic} step by step, so you can start getting results right away.`,
      "",
      "## Body",
      `First, let's talk about why ${topic} matters. The biggest mistake most people make is jumping in without a plan, so I'll walk you through the exact process I use.`,
      "",
      `Next, we'll cover the practical side. I'll share the tools and techniques that work best, what the common pitfalls look like, and how to fix them quickly. Take notes, because these tips are the ones I wish someone had told me when I started.`,
      "",
      `Finally, I'll show you how to put everything together into a repeatable system that works even when you're short on time.`,
      "",
      "## Recap",
      `To recap: start with a clear goal, follow the step-by-step process, avoid the common mistakes, and stay consistent.`,
      "",
      "## Call to action",
      `If this helped, smash that like button and subscribe — I drop new videos every week. Let me know in the comments what part of ${topic} you want to dive deeper into next!`,
    ].join("\n");
  }

  private titles(topic: string, hash: number): string {
    const templates = [
      `How to Master ${topic} in 2026`,
      `${topic}: The Ultimate Step-by-Step Guide`,
      `Stop Doing ${topic} Wrong — Here's the Fix`,
      `${topic} Made Simple (for Busy Creators)`,
      `The Only ${topic} Guide You'll Ever Need`,
    ];

    return Array.from(
      { length: 5 },
      (_, index) => templates[(hash + index) % templates.length]
    ).join("\n");
  }

  private description(topic: string, channel: string): string {
    const host = channel || "this channel";

    return [
      `In this video, ${host} walks you through everything you need to know about ${topic}. Whether you're brand new or looking to level up, you'll leave with a clear, actionable plan.`,
      "",
      "In this video you'll learn:",
      "- The fundamentals of " + topic,
      "- Common mistakes and how to avoid them",
      "- Tools and techniques that actually work",
      "- A repeatable process you can start using today",
      "",
      "Resources and timestamps are listed below. If you found this helpful, please like, subscribe, and share it with someone who needs it.",
      "",
      `#${topic.replace(/\s+/g, "")} #YouTube #ContentCreation`,
    ].join("\n");
  }

  private tags(topic: string, hash: number): string {
    const base = topic.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const generic = [
      "content creation",
      "youtube tips",
      "tutorial",
      "how to",
      "video ideas",
      "creator guide",
      "beginner friendly",
    ];

    const picked = Array.from(
      { length: 5 },
      (_, index) => generic[(hash + index) % generic.length]
    );

    return [base, ...picked].join("\n");
  }

  private thumbnailPrompt(topic: string): string {
    return [
      `Create a bold YouTube thumbnail for a video about "${topic}".`,
      "",
      `Style: high contrast, vibrant colors, a single clear focal subject with a surprised or excited expression, short 3-4 word text overlay that teases the outcome.`,
      "",
      `Include: a face reacting to the result, a visual metaphor related to ${topic}, and a bright accent color (yellow or orange) for the text.`,
      "",
      `Text options: "IT WORKS", "FULL GUIDE", "DON'T MISS THIS".`,
    ].join("\n");
  }
}

export function isAiProviderError(error: unknown): error is AiProviderError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as AiProviderError).message === "string"
  );
}
