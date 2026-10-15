import { useRef, useState } from "react";
import { Bus, CarTaxiFront, Plane } from "lucide-react";
import { BusPanel } from "@/components/compare/BusPanel";
import { ComingSoonPanel } from "@/components/compare/ComingSoonPanel";
import { SiteShell } from "@/components/compare/SiteShell";
import { cn } from "@/lib/utils";

type Mode = "bus" | "cab" | "flight";

const MODES: {
  id: Mode;
  label: string;
  short: string;
  icon: typeof Bus;
  live: boolean;
}[] = [
  { id: "bus", label: "Inter-State Bus", short: "Bus", icon: Bus, live: true },
  {
    id: "cab",
    label: "Intra-City Cab",
    short: "Cab",
    icon: CarTaxiFront,
    live: false,
  },
  {
    id: "flight",
    label: "Domestic Flight",
    short: "Flight",
    icon: Plane,
    live: false,
  },
];

function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="tablist"
      aria-label="Transport mode"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1"
      onKeyDown={e => {
        const i = MODES.findIndex(m => m.id === mode);
        const next =
          e.key === "ArrowRight"
            ? (i + 1) % 3
            : e.key === "ArrowLeft"
              ? (i + 2) % 3
              : -1;
        if (next < 0) return;
        e.preventDefault();
        onChange(MODES[next].id);
        refs.current[next]?.focus();
      }}
    >
      {MODES.map((m, i) => {
        const active = m.id === mode;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            ref={el => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${m.id}`}
            aria-selected={active}
            aria-controls={`panel-${m.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon aria-hidden className="size-4.5 shrink-0" />
            <span className="sm:hidden">{m.short}</span>
            <span className="hidden sm:inline">{m.label}</span>
            {!m.live && (
              <span
                className={cn(
                  "hidden rounded px-1.5 py-0.5 text-[10px] uppercase md:inline",
                  active ? "bg-black/15" : "bg-white/[0.06]"
                )}
              >
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ComparePage() {
  const [mode, setMode] = useState<Mode>("bus");

  return (
    <SiteShell>
      <div className="pb-6 pt-6 sm:pt-10">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Live bus fares across Nigeria,{" "}
          <span className="text-primary">side by side.</span>
        </h1>
        <p className="mt-3 max-w-prose text-base text-muted-foreground">
          Every price comes straight from the operator's own booking system — no
          estimates.
        </p>
      </div>

      <ModeTabs mode={mode} onChange={setMode} />

      <div className="mt-6">
        {MODES.map(m => (
          <div
            key={m.id}
            role="tabpanel"
            id={`panel-${m.id}`}
            aria-labelledby={`tab-${m.id}`}
            hidden={mode !== m.id}
          >
            {m.id === "bus" && <BusPanel />}
            {m.id === "cab" && (
              <ComingSoonPanel
                mode="Cab"
                examples="Uber, Bolt, inDrive or the other ride-hailing apps"
              />
            )}
            {m.id === "flight" && (
              <ComingSoonPanel
                mode="Flight"
                examples="the domestic airlines we've looked at"
              />
            )}
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
