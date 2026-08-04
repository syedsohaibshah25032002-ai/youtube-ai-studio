"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAiProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { generationJobSchema, type GenerationJobInput } from "@/lib/validations/ai";
import { executeJob, runSection, toErrorMessage } from "./pipeline";
import { PIPELINE_SECTIONS, type PipelineSection } from "./types";

export type GenerationResult = { jobId: string } | { error: string };

export type SectionResult = { ok: true } | { ok: false; error: string };

function isPipelineSection(value: string): value is PipelineSection {
  return (PIPELINE_SECTIONS as readonly string[]).includes(value);
}

async function loadOwnedJob(jobId: string, userId: string) {
  const job = await prisma.aiJob.findFirst({
    where: { id: jobId, userId },
    include: { channel: { select: { name: true } } },
  });
  return job;
}

export async function createGenerationJob(input: GenerationJobInput): Promise<GenerationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = generationJobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the topic." };
  }

  const { topic, channelId } = parsed.data;

  if (channelId) {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, userId: session.user.id },
      select: { id: true },
    });

    if (!channel) {
      return { error: "Channel not found." };
    }
  }

  const provider = getAiProvider();

  const job = await prisma.aiJob.create({
    data: {
      userId: session.user.id,
      topic,
      channelId: channelId || null,
      provider: provider.id,
      model: provider.defaultModel,
      status: "PENDING",
      progress: 0,
      errorLog: [],
    },
  });

  revalidatePath("/dashboard/ai");

  return { jobId: job.id };
}

export async function regenerateSection(jobId: string, section: string): Promise<SectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!isPipelineSection(section)) {
    return { ok: false, error: "Unknown section." };
  }

  const job = await loadOwnedJob(jobId, session.user.id);
  if (!job) {
    return { ok: false, error: "Job not found." };
  }

  const provider = getAiProvider();

  try {
    const prior = await prisma.aiSectionResult.findMany({
      where: { jobId },
      select: { section: true, content: true },
    });

    const priorMap = Object.fromEntries(prior.map((result) => [result.section, result.content]));

    const result = await runSection(provider, section, {
      topic: job.topic,
      channelName: job.channel?.name ?? undefined,
      prior: priorMap,
    });

    await prisma.aiSectionResult.upsert({
      where: { jobId_section: { jobId, section } },
      create: {
        jobId,
        section,
        content: result.content,
        provider: result.provider,
        model: result.model,
        version: 1,
      },
      update: {
        content: result.content,
        provider: result.provider,
        model: result.model,
        version: { increment: 1 },
      },
    });

    revalidatePath(`/dashboard/ai/jobs/${jobId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function retryJob(jobId: string): Promise<SectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const job = await loadOwnedJob(jobId, session.user.id);
  if (!job) {
    return { ok: false, error: "Job not found." };
  }

  if (job.status !== "FAILED") {
    return { ok: false, error: "Only failed jobs can be retried." };
  }

  try {
    await executeJob(jobId, "retry");
    revalidatePath(`/dashboard/ai/jobs/${jobId}`);
    revalidatePath("/dashboard/ai");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.aiJob.deleteMany({
    where: { id: jobId, userId: session.user.id },
  });

  revalidatePath("/dashboard/ai");
  revalidatePath("/dashboard/ai/jobs");
  redirect("/dashboard/ai");
}
