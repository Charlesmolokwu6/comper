import type { ReactNode } from "react";
import { Link } from "wouter";
import { InstallButton } from "./InstallButton";
import { FeedbackLink } from "./Feedback";
import { LogoMark } from "./Logo";
import { savedTrips } from "@/lib/trips";

export function SiteShell({
  children,
  hero,
}: {
  children: ReactNode;
  /** Full-width top of a results page (MapHero), in place of the header. */
  hero?: ReactNode;
}) {
  const hasTrips = savedTrips().length > 0;
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
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight">Compare</span>
        </Link>
        <div className="flex items-center gap-2">
          {hasTrips && (
            <Link
              href="/trips"
              className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm font-semibold hover:bg-accent"
            >
              My trips
            </Link>
          )}
          <InstallButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 pt-6 pb-3 text-xs text-muted-foreground sm:px-6">
          Fares are fetched from each operator's booking site and cached for up
          to 6 hours. Operators can change prices — always check the final price
          when you book. Compare isn't affiliated with any operator.
        </p>
        <nav
          aria-label="Legal"
          className="mx-auto flex max-w-5xl gap-4 px-4 pb-6 text-xs sm:px-6"
        >
          <Link
            href="/privacy"
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Terms
          </Link>
          <FeedbackLink className="text-muted-foreground">
            Feedback
          </FeedbackLink>
        </nav>
      </footer>
    </div>
  );
}
