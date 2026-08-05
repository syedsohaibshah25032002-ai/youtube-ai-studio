import type { Metadata } from "next";

import { MediaForm } from "@/components/media/media-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New media asset",
  description: "Create a new AI-generated media asset.",
};

export default function NewMediaAssetPage() {
  return (
    <div className="container mx-auto max-w-2xl flex-1 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>New media asset</CardTitle>
          <CardDescription>
            Describe the image you want and the media engine will generate it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaForm />
        </CardContent>
      </Card>
    </div>
  );
}
