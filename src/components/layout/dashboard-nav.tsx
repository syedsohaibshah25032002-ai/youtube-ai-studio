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
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
