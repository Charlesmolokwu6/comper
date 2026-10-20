import { useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GuideRow {
  label: string;
  value: string;
  /** What the operator's own site calls it, when that differs from our tidy name. */
  theirName?: string;
}

/**
 * Book button for operators whose site can't be opened on a specific trip by link
 * (the search lives inside their page). Shows exactly what to pick there, with a copy button,
 * then opens their site.
 */
export function BookingGuide({
  operatorName,
  url,
  rows,
  triggerClassName,
  triggerLabel = "Book",
  trackCompany,
  srLabel,
}: {
  operatorName: string;
  url: string;
  rows: GuideRow[];
  triggerClassName?: string;
  triggerLabel?: string;
  /** Counted as a "Book bus" tap for this company (analytics.ts). */
  trackCompany?: string;
  srLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = rows
    .map(r => `${r.label}: ${r.theirName ?? r.value}`)
    .join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${operatorName}\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          data-umami-event={trackCompany ? "Book bus" : undefined}
          data-umami-event-company={trackCompany}
        >
          {triggerLabel}
          <ArrowUpRight aria-hidden className="size-3.5" />
          <span className="sr-only">{srLabel}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book on {operatorName}'s site</DialogTitle>
          <DialogDescription>
            {operatorName}'s site doesn't let other sites fill in your search,
            so pick these there. Prices can change; check the final price before
            you pay.
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-xl border border-border">
          {rows.map(r => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-4 px-4 py-2.5"
            >
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="text-right text-sm font-semibold text-foreground">
                {r.value}
                {r.theirName &&
                  r.theirName.toLowerCase() !== r.value.toLowerCase() && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      listed as "{r.theirName}"
                    </span>
                  )}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copy}
            className={cn(
              "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
              copied
                ? "border-primary/50 text-primary-ink"
                : "border-border hover:bg-accent"
            )}
          >
            {copied ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copied ? "Copied" : "Copy trip details"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Continue to {operatorName}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
