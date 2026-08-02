import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
