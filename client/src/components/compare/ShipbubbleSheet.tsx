import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import { CardLoader } from "./Loader";

export const SHIPBUBBLE_CALCULATOR = "https://shipbubble.com/rates-calculator";

/**
 * Shipbubble's own rates calculator, shown inside Compare. It's their page, running on their
 * site with their own address search, framed here so people don't leave Compare. If it
 * ever won't load (they can stop framing at any time), "Open in browser" still works.
 */
export function ShipbubbleSheet({ onClose }: { onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shipbubble rates calculator"
      className="fixed inset-0 z-[60] flex flex-col bg-background"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close and go back to Compare"
          className="flex size-10 items-center justify-center rounded-full hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Shipbubble</p>
          <p className="truncate text-xs text-muted-foreground">
            Their prices · book with them
          </p>
        </div>
        <a
          href={SHIPBUBBLE_CALCULATOR}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          Open in browser
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      </header>
      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <CardLoader size="lg" />
            Opening Shipbubble…
          </div>
        )}
        <iframe
          src={SHIPBUBBLE_CALCULATOR}
          title="Shipbubble rates calculator"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 size-full border-0 bg-white"
        />
      </div>
    </div>,
    document.body
  );
}
