"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMediaProvider } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { mediaAssetSchema, type MediaAssetInput } from "@/lib/validations/media";

export type CreateAssetResult = { assetId: string } | { error: string };

export async function createMediaAsset(input: MediaAssetInput): Promise<CreateAssetResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = mediaAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the asset details." };
  }

  const { title, type, prompt, width, height } = parsed.data;
  const provider = getMediaProvider();

  const asset = await prisma.mediaAsset.create({
    data: {
      userId: session.user.id,
      title,
      type,
      prompt,
      status: "PENDING",
      provider: provider.id,
      model: provider.defaultModel,
      width: width ?? null,
      height: height ?? null,
      errorLog: [],
    },
  });

  revalidatePath("/dashboard/media");

  return { assetId: asset.id };
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await prisma.mediaAsset.deleteMany({
    where: { id: assetId, userId: session.user.id },
  });

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard/media/history");
  redirect("/dashboard/media");
}
