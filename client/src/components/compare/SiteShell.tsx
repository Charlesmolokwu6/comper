import type { ReactNode } from "react";
import { Link } from "wouter";
import { InstallButton } from "./InstallButton";

export function SiteShell({
  children,
  hero,
}: {
  children: ReactNode;
  /** Full-width top of a results page (MapHero), in place of the header. */
  hero?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {hero}
      <header
        hidden={!!hero}
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-6 sm:px-6 sm:pt-8"
      >
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span aria-hidden className="size-3 rounded-sm bg-primary" />
          <span className="text-lg font-extrabold tracking-tight">Compare</span>
        </Link>
        <InstallButton />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          Fares are fetched from each operator's booking site and cached for up
          to 6 hours. Operators can change prices — always check the final price
          when you book. Compare isn't affiliated with any operator.
        </p>
      </footer>
    </div>
  );
}
