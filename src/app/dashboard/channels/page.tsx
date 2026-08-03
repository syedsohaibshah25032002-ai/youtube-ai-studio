import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChannelCard } from "@/components/channels/channel-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Channels",
  description: "Manage the YouTube channels connected to your account.",
};

export default async function ChannelsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const channels = await prisma.channel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      channelId: true,
      thumbnailUrl: true,
      subscriberCount: true,
    },
  });

  return (
    <div className="container mx-auto flex flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground mt-1">
            Manage the YouTube channels connected to your account.
          </p>
        </div>
        <Button render={<Link href="/dashboard/channels/new" />}>Add channel</Button>
      </div>

      {channels.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No channels yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Connect your first YouTube channel to start managing it from your dashboard.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/channels/new" />}>
            Add your first channel
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} {...channel} />
          ))}
        </div>
      )}
    </div>
  );
}
