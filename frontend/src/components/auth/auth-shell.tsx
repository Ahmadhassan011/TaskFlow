import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Logo } from "@/components/shared/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-violet-500/[0.06] blur-3xl" />
      </div>

      <header className="flex items-center justify-between p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to site
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex justify-center"
            aria-label="Back to home"
          >
            <Logo size="lg" className="size-12" />
          </Link>
          {children}
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TaskFlow. All rights reserved.
      </footer>
    </div>
  );
}
