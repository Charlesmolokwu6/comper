import { useEffect, useId, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { fetchPlaces, type Place } from "@/lib/api";
import type { CabPoint } from "@/lib/cab";
import { cn } from "@/lib/utils";

/** Address box with suggestions from /api/places (OpenStreetMap, Nigeria only). */
export function PlaceInput({
  label,
  value,
  onChange,
  placeholder,
  extra,
  compact = false,
}: {
  label: string;
  value: CabPoint | null;
  onChange: (p: CabPoint | null) => void;
  placeholder: string;
  extra?: React.ReactNode;
  /** Shorter field for long forms (delivery). */
  compact?: boolean;
}) {
  const [text, setText] = useState(value?.name ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setText(value?.name ?? ""), [value]);

  // An address the map search can't find (a house number, a small street) is still usable
  // as typed: the ride apps get it to paste in.
  const useTyped = () => {
    const t = text.trim();
    if (t.length >= 3 && !value) onChange({ name: t });
    setOpen(false);
  };

  useEffect(() => {
    clearTimeout(timer.current);
    if (!open || text.trim().length < 3 || text === value?.name) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    timer.current = setTimeout(() => {
      setState("loading");
      fetchPlaces(text.trim(), ctrl.signal)
        .then(r => {
          setResults(r.places);
          setState("idle");
        })
        .catch(() => !ctrl.signal.aborted && setState("error"));
    }, 450);
    return () => {
      ctrl.abort();
      clearTimeout(timer.current);
    };
  }, [text, open, value]);

  return (
    <div className="relative min-w-0">
      <label
        className={cn(
          "block font-medium uppercase tracking-wide text-muted-foreground",
          compact ? "mb-1 text-[11px]" : "mb-1.5 text-xs"
        )}
      >
        {label}
      </label>
      <div
        className={cn(
          "flex items-center rounded-xl border border-border bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
          compact ? "h-12 gap-2.5 px-3.5" : "h-14 gap-3 px-4"
        )}
      >
        <MapPin aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <input
          role="combobox"
          aria-expanded={open && text.trim().length >= 3 && !value}
          aria-controls={listId}
          aria-autocomplete="list"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(useTyped, 150)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              useTyped();
            }
          }}
          onChange={e => {
            setText(e.target.value);
            if (value) onChange(null);
          }}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        {text && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setText("");
              onChange(null);
            }}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {value && (value.address || value.gps || value.name.length > 24) && (
        <p
          className={cn(
            "px-1 text-muted-foreground",
            compact ? "mt-1 text-[13px]" : "mt-1.5 text-sm"
          )}
        >
          {[value.name, value.address].filter(Boolean).join(", ")}
          {value.lat == null && " · as typed"}
          {value.gps && value.address && " · your current location"}
        </p>
      )}
      {extra}
      {open && text.trim().length >= 3 && !value && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute inset-x-0 z-20 max-h-72 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-xl",
            compact ? "top-[4.5rem]" : "top-[5.25rem]"
          )}
        >
          {state === "loading" && !results.length && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              Searching…
            </li>
          )}
          {state === "error" && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              Address search isn't available right now.
            </li>
          )}
          {state === "idle" && !results.length && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              No match on the map.
            </li>
          )}
          <li role="option" aria-selected={false}>
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={useTyped}
              className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span className="block text-sm font-semibold text-foreground">
                Use “{text.trim()}”
              </span>
              <span className="block text-xs text-muted-foreground">
                Exactly as you typed it
              </span>
            </button>
          </li>
          {results.map(p => (
            <li key={`${p.lat},${p.lon}`} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onChange({
                    name: p.name,
                    address: p.address,
                    lat: p.lat,
                    lon: p.lon,
                  });
                  setText(p.name);
                  setOpen(false);
                }}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                )}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {p.name}
                </span>
                {p.address && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.address}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
