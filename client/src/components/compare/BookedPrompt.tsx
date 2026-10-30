import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { useLocation } from "wouter";
import { track } from "@/lib/analytics";
import { formatDay, formatTime } from "@/lib/format";
import {
  clearPendingBooking,
  pendingBooking,
  saveTrip,
  type PendingBooking,
} from "@/lib/trips";

type Step = "ask" | "offer" | "saving" | "failed";

/**
 * "Did you book?" when someone comes back to Compare after tapping Book on a bus. A yes is
 * counted (anonymously) and leads to saving the trip for offline use; no data leaves the
 * phone except the count.
 */
export function BookedPrompt() {
  const [, navigate] = useLocation();
  const [booking, setBooking] = useState<PendingBooking | null>(null);
  const [step, setStep] = useState<Step>("ask");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const p = pendingBooking();
      if (p) {
        setBooking(b => b ?? p);
        setStep(s => s);
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!booking) return null;
  const close = () => {
    clearPendingBooking();
    setBooking(null);
    setStep("ask");
  };
  const answer = (yes: boolean) => {
    track("Booked?", {
      answer: yes ? "Yes" : "Not yet",
      company: booking.operatorName,
    });
    if (yes) setStep("offer");
    else close();
  };
  const save = () => {
    setStep("saving");
    setProgress(0);
    // Load the trip map now so the page itself is kept for offline (sw.js).
    import("./TripTracker").catch(() => {});
    saveTrip(booking, setProgress)
      .then(trip => {
        track("Trip saved", {
          company: trip.operatorName,
          km: Math.round(trip.km),
        });
        clearPendingBooking();
        setBooking(null);
        setStep("ask");
        navigate(`/trip/${trip.id}`);
      })
      .catch(() => setStep("failed"));
  };

  const trip = `${booking.from.name} → ${booking.to.name}, ${formatDay(
    booking.departure.slice(0, 10)
  )} ${formatTime(booking.departure)}`;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4">
      <section
        role="dialog"
        aria-label="Did you book?"
        className="mx-auto max-w-lg rounded-2xl border border-border bg-popover p-4 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {step === "ask" && (
              <p className="font-bold">
                Did you book your {booking.operatorName} ticket?
              </p>
            )}
            {step === "offer" && (
              <p className="font-bold">Save your trip for offline?</p>
            )}
            {step === "saving" && (
              <p className="font-bold">Saving your trip…</p>
            )}
            {step === "failed" && (
              <p className="font-bold">Couldn't save the trip</p>
            )}
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {trip}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {step === "ask" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => answer(true)}
              className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
            >
              Yes, I booked
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              className="h-11 rounded-xl border border-border text-sm font-semibold"
            >
              Not yet
            </button>
          </div>
        )}

        {step === "offer" && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll keep the map of your route on this phone, so on the road you
              can see where you are and how far is left, even without network.
              About 5–15 MB.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={save}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
              >
                <Download aria-hidden className="size-4" />
                Save trip
              </button>
              <button
                type="button"
                onClick={close}
                className="h-11 rounded-xl border border-border text-sm font-semibold"
              >
                No thanks
              </button>
            </div>
          </>
        )}

        {step === "saving" && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.08]">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Downloading the map along your route… {Math.round(progress * 100)}
              %
            </p>
          </div>
        )}

        {step === "failed" && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              Saving needs an internet connection. Try again when you have one.
            </p>
            <button
              type="button"
              onClick={save}
              className="mt-2 h-10 rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
}
