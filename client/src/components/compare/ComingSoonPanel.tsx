import { CalendarDays, MapPin, Search, Sparkles } from "lucide-react";

interface Props {
  mode: string;
  examples: string;
}

/** Placeholder for modes with no live price source. Deliberately shows no numbers. */
export function ComingSoonPanel({ mode, examples }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary-ink">
          <Sparkles aria-hidden className="size-3.5" />
          Coming soon
        </span>
        <h2 className="mt-3 text-xl font-bold tracking-tight">
          {mode} comparison isn't live yet
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Compare only shows prices it gets live from the operators themselves.
          None of {examples} gives us live prices yet, so rather than show
          estimates, there's nothing here. Inter-state bus fares are live now.
        </p>
      </div>

      <fieldset
        disabled
        aria-label={`${mode} search (not available yet)`}
        className="rounded-2xl border border-border bg-card p-4 opacity-50 sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: MapPin, label: "From" },
            { icon: MapPin, label: "To" },
            { icon: CalendarDays, label: "Date" },
          ].map(({ icon: Icon, label }) => (
            <div key={label}>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-surface px-4 text-muted-foreground">
                <Icon aria-hidden className="size-5" />
                <span>—</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-14 items-center justify-center gap-2 rounded-xl bg-secondary text-base font-bold text-muted-foreground">
          <Search aria-hidden className="size-5" />
          Not available yet
        </div>
      </fieldset>
    </div>
  );
}
