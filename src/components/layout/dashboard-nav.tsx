import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { APP_NAME } from "@/lib/constants";

export function DashboardNav() {
  return (
    <header className="bg-background/95 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/channels"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Channels
          </Link>
          <Link
            href="/dashboard/videos"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Videos
          </Link>
          <Link
            href="/dashboard/ai"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            AI Engine
          </Link>
          <Link
            href="/dashboard/media"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Media
          </Link>
          <Link
            href="/dashboard/video"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Video Studio
          </Link>
          <Link
            href="/dashboard/video/renders"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Renders
          </Link>
          <Link
            href="/dashboard/youtube"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            YouTube
          </Link>
          <Link
            href="/dashboard/youtube/upload"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Publish
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
