import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { executeJob, toErrorMessage } from "@/features/content-generator/pipeline";
import { prisma } from "@/lib/prisma";

/**
 * Starts pipeline execution for a job. Execution is fired without blocking so
 * the client can navigate to the job page and observe live progress via the
 * status endpoint. Re-runs of already-running or completed jobs are no-ops.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.aiJob.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "RUNNING" || job.status === "COMPLETED") {
    return NextResponse.json({ ok: true, status: job.status });
  }

  void executeJob(id, job.status === "FAILED" ? "retry" : "full")
    .then(() => console.log(`[ai] Job ${id} finished.`))
    .catch((error) => console.error(`[ai] Job ${id} crashed: ${toErrorMessage(error)}`));

  return NextResponse.json({ ok: true, status: "RUNNING" });
}
