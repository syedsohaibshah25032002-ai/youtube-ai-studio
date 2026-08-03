import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteChannelForm } from "@/components/channels/delete-channel-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Delete channel",
  description: "Remove a connected YouTube channel.",
};

export default async function DeleteChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const channel = await prisma.channel.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!channel) {
    redirect("/dashboard/channels");
  }

  return (
    <div className="container mx-auto max-w-lg flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Delete channel</CardTitle>
          <CardDescription>
            This will permanently remove the channel from your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteChannelForm channelId={channel.id} channelName={channel.name} />
        </CardContent>
      </Card>
    </div>
  );
}
