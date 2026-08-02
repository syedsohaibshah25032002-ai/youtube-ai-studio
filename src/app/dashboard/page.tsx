import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.name ?? user.email}. Your workspace is ready.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your profile</CardTitle>
            <CardDescription>Signed in as</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{user.name ?? "No name set"}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            YouTube integration and AI tools are on the way.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
