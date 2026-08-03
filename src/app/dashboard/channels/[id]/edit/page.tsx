import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChannelForm } from "@/components/channels/channel-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { channelFormSchema, type ChannelFormInput } from "@/lib/validations/channel";

export const metadata: Metadata = {
  title: "Edit channel",
  description: "Update your connected YouTube channel.",
};

export default async function EditChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const channel = await prisma.channel.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!channel) {
    redirect("/dashboard/channels");
  }

  const initial: ChannelFormInput = {
    name: channel.name,
    channelId: channel.channelId,
    thumbnailUrl: channel.thumbnailUrl ?? "",
    subscriberCount: channel.subscriberCount,
    uploadDefaults: channelFormSchema.shape.uploadDefaults.parse(channel.uploadDefaults),
    settings: channelFormSchema.shape.settings.parse(channel.settings),
  };

  return (
    <div className="container mx-auto max-w-3xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit channel</CardTitle>
          <CardDescription>Update the details for {channel.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelForm mode="edit" channelId={channel.id} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
