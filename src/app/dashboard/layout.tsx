import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <DashboardNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
