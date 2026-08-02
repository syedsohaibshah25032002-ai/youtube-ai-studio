import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-6xl">
          {APP_NAME}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          AI-powered tools to help you create, optimize, and grow on YouTube.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/signup" />}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
