import type { AiProvider } from "@/lib/ai/types";
import { getAiProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { buildSectionPrompt } from "./prompts";
import {
  ARRAY_SECTIONS,
  PIPELINE_SECTIONS,
  type ErrorLogEntry,
  type PipelineContext,
  type PipelineSection,
  type SectionContent,
} from "./types";

export type RunSectionResult = {
  section: PipelineSection;
  content: SectionContent;
  provider: string;
  model: string;
};

export function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function readErrorLog(value: unknown): ErrorLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is ErrorLogEntry =>
      typeof entry === "object" && entry !== null && "section" in entry && "message" in entry
  );
}

function parseContent(section: PipelineSection, raw: string): SectionContent {
  if (ARRAY_SECTIONS.has(section)) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  return raw.trim();
}

/**
 * Runs a single pipeline section through the given provider and normalizes
 * the raw output into the shape stored in the database.
 */
export async function runSection(
  provider: AiProvider,
  section: PipelineSection,
  context: PipelineContext
): Promise<RunSectionResult> {
  const messages = buildSectionPrompt(section, context);
  const completion = await provider.complete(messages);

  return {
    section,
    content: parseContent(section, completion.content),
    provider: completion.provider,
    model: completion.model,
  };
}

async function upsertSectionResult(jobId: string, result: RunSectionResult): Promise<void> {
  const existing = await prisma.aiSectionResult.findUnique({
    where: { jobId_section: { jobId, section: result.section } },
    select: { id: true },
  });

  if (existing) {
    await prisma.aiSectionResult.update({
      where: { id: existing.id },
      data: {
        content: result.content,
        provider: result.provider,
        model: result.model,
        version: { increment: 1 },
      },
    });
    return;
  }

  await prisma.aiSectionResult.create({
    data: {
      jobId,
      section: result.section,
      content: result.content,
      provider: result.provider,
      model: result.model,
      version: 1,
    },
  });
}

async function resolveChannelName(channelId: string): Promise<string | undefined> {
  const channel = await prisma.channel.findFirst({
    where: { id: channelId },
    select: { name: true },
  });
  return channel?.name;
}

function buildContext(
  topic: string,
  channelName: string | undefined,
  prior: Map<PipelineSection, SectionContent>
): PipelineContext {
  return {
    topic,
    channelName,
    prior: Object.fromEntries(prior) as PipelineContext["prior"],
  };
}

/**
 * Executes the full content pipeline for a job, persisting every section and
 * updating status/progress as it goes.
 *
 * In `full` mode every section is generated. In `retry` mode sections that
 * already produced a result are kept and only the missing/failed ones are
 * regenerated.
 */
export async function executeJob(jobId: string, mode: "full" | "retry" = "full"): Promise<void> {
  const job = await prisma.aiJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error(`Job ${jobId} not found.`);
  }

  const provider = getAiProvider();

  if (!provider.isConfigured()) {
    console.warn(`[ai] Provider "${provider.id}" is not configured; using ${provider.label}.`);
  }

  const existingResults = await prisma.aiSectionResult.findMany({
    where: { jobId },
  });

  const prior = new Map<PipelineSection, SectionContent>();
  const done = new Set<PipelineSection>();

  for (const result of existingResults) {
    const section = result.section as PipelineSection;
    const content = result.content as SectionContent;
    prior.set(section, content);
    if (mode === "retry") {
      done.add(section);
    }
  }

  const channelName = job.channelId ? await resolveChannelName(job.channelId) : undefined;

  await prisma.aiJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", progress: 0 },
  });

  const total = PIPELINE_SECTIONS.length;
  let completed = 0;
  const errors: ErrorLogEntry[] = [];

  for (const section of PIPELINE_SECTIONS) {
    if (done.has(section)) {
      completed += 1;
      await prisma.aiJob.update({
        where: { id: jobId },
        data: { progress: Math.round((completed / total) * 100) },
      });
      continue;
    }

    try {
      const result = await runSection(
        provider,
        section,
        buildContext(job.topic, channelName, prior)
      );

      prior.set(section, result.content);
      await upsertSectionResult(jobId, result);
    } catch (error) {
      const message = toErrorMessage(error);
      console.error(`[ai] Job ${jobId} failed at section "${section}": ${message}`);
      errors.push({ section, message, at: new Date().toISOString() });
    }

    completed += 1;
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { progress: Math.round((completed / total) * 100) },
    });
  }

  if (errors.length > 0) {
    await prisma.aiJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorLog: [...readErrorLog(job.errorLog), ...errors],
      },
    });
    return;
  }

  await prisma.aiJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", progress: 100 },
  });
}
