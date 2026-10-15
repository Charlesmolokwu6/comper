import { useState } from "react";
import { Check, ChevronDown, LocateFixed, Navigation, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Place } from "@/lib/api";

export interface Near {
  name: string;
  lat: number;
  lon: number;
  /** Came from the device's location rather than an area picked from the list. */
  gps?: boolean;
}

interface Props {
  cityName: string;
  places: Place[];
  value: Near | null;
  onChange: (near: Near | null) => void;
}

/** "Boarding near …": lets each card show only the terminal closest to the traveller. */
export function NearPicker({ cityName, places, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const useLocation = () => {
    setGpsError(null);
    if (!("geolocation" in navigator)) {
      setGpsError(
        "This browser can't share your location. Pick your area instead."
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        onChange({
          name: "your location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          gps: true,
        });
        setOpen(false);
      },
      () => {
        setLocating(false);
        setGpsError("Couldn't get your location. Pick your area instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-muted-foreground">Boarding near</span>
      <Popover
        open={open}
        onOpenChange={o => {
          setOpen(o);
          if (o) setGpsError(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Boarding near: ${value ? value.name : "not set"}. Change`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 font-semibold text-foreground hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Navigation aria-hidden className="size-3.5 text-primary" />
            {value ? value.name : `Choose your area in ${cityName}`}
            <ChevronDown
              aria-hidden
              className="size-3.5 text-muted-foreground"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(20rem,calc(100vw-2rem))] p-0"
        >
          <Command>
            <CommandInput placeholder={`Search areas in ${cityName}`} />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value="__gps use my current location"
                  onSelect={useLocation}
                  disabled={locating}
                >
                  <LocateFixed aria-hidden className="size-4 text-primary" />
                  {locating ? "Finding you…" : "Use my current location"}
                </CommandItem>
                {value && (
                  <CommandItem
                    value="__clear"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <X aria-hidden className="size-4" />
                    Show all terminals
                  </CommandItem>
                )}
              </CommandGroup>
              {gpsError && (
                <p role="alert" className="px-3 pb-2 text-xs text-amber-200">
                  {gpsError}
                </p>
              )}
              <CommandEmpty>No area by that name.</CommandEmpty>
              <CommandGroup heading={`Areas in ${cityName}`}>
                {places.map(p => (
                  <CommandItem
                    key={p.name}
                    value={p.name}
                    onSelect={() => {
                      onChange({ name: p.name, lat: p.lat, lon: p.lon });
                      setOpen(false);
                    }}
                  >
                    {p.name}
                    {value && !value.gps && value.name === p.name && (
                      <Check
                        aria-hidden
                        className="ml-auto size-4 text-primary"
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!value && (
        <span className="text-xs text-muted-foreground">
          to see only the closest terminal
        </span>
      )}
    </div>
  );
}
