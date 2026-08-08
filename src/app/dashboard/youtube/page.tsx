import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { toConnectionDisplay } from "@/features/youtube-connection/engine";
import { YoutubeConnectionCard } from "@/components/youtube/youtube-connection-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "YouTube connection",
  description: "Connect your YouTube channel securely to publish videos later.",
};

export default async function YoutubeConnectionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const connection = await prisma.youtubeConnection.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">YouTube connection</h1>
        <p className="text-muted-foreground mt-2">
          Securely connect your own YouTube channel. Publishing arrives in a later phase.
        </p>
      </div>

      <div className="max-w-2xl">
        <YoutubeConnectionCard connection={toConnectionDisplay(connection)} />
      </div>
    </div>
  );
}
