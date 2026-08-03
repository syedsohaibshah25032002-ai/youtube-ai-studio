import type { Metadata } from "next";

import { ChannelForm } from "@/components/channels/channel-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Add channel",
  description: "Connect a YouTube channel to your account.",
};

export default function NewChannelPage() {
  return (
    <div className="container mx-auto max-w-3xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Add a channel</CardTitle>
          <CardDescription>
            Connect a YouTube channel to your account. You can connect multiple channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
