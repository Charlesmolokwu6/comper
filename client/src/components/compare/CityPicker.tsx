import { useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
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
import type { NetworkTerminal } from "@/lib/api";
import { parsePlace, placeString } from "@/lib/places";
import { cn } from "@/lib/utils";

export interface CityOption {
  city: string;
  name: string;
  /** Shown as a short warning next to the name, e.g. only reachable via Mararaba. */
  hint?: string;
  /** The city's terminals; listed under it when there's more than one to choose from. */
  terminals?: NetworkTerminal[];
}

interface Props {
  label: string;
  /** A place: "lagos" or "lagos~ajah" (lib/places.ts). */
  value: string | null;
  options: CityOption[];
  onChange: (place: string) => void;
  disabled?: boolean;
  placeholder: string;
  /** Shown under the list, e.g. "More routes loading…". */
  footer?: string;
}

export function CityPicker({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  footer,
}: Props) {
  const [open, setOpen] = useState(false);
  const place = parsePlace(value);
  const selected = options.find(o => o.city === place?.city);
  const selectedTerminal = selected?.terminals?.find(
    t => t.key === place?.terminal
  );
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const id = `picker-${label.toLowerCase()}`;

  return (
    <div className="min-w-0">
      <span
        id={`${id}-label`}
        className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-labelledby={`${id}-label`}
            className={cn(
              "flex h-12 w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-left text-[15px] transition-colors",
              "hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <MapPin
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                selected
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {selected ? (
                <>
                  {selected.name}
                  {selectedTerminal && (
                    <span className="font-medium text-muted-foreground">
                      {" "}
                      · {selectedTerminal.name}
                    </span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] border-border bg-popover p-0"
        >
          <Command
            className="bg-popover"
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput
              placeholder="Search a city or terminal…"
              className="h-12 text-base"
            />
            <CommandList className="max-h-72">
              <CommandEmpty>No city or terminal found.</CommandEmpty>
              <CommandGroup>
                {options.map(o => {
                  const terminals =
                    o.terminals && o.terminals.length > 1 ? o.terminals : [];
                  const cityOnly = o.city === place?.city && !place?.terminal;
                  return (
                    <div key={o.city}>
                      <CommandItem
                        value={o.name}
                        onSelect={() => pick(o.city)}
                        className="flex min-h-11 items-center gap-2 px-3 text-base data-[selected=true]:bg-accent"
                      >
                        <Check
                          aria-hidden
                          className={cn(
                            "size-4 text-primary-ink",
                            cityOnly ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex-1 truncate">{o.name}</span>
                        {o.hint ? (
                          <span className="text-xs text-muted-foreground">
                            {o.hint}
                          </span>
                        ) : (
                          terminals.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              All terminals
                            </span>
                          )
                        )}
                      </CommandItem>
                      {terminals.map(t => {
                        const v = placeString(o.city, t.key);
                        return (
                          <CommandItem
                            key={v}
                            value={`${o.name} ${t.name}`}
                            onSelect={() => pick(v)}
                            className="flex min-h-10 items-center gap-2 py-1.5 pl-9 pr-3 text-sm data-[selected=true]:bg-accent"
                          >
                            <Check
                              aria-hidden
                              className={cn(
                                "size-3.5 text-primary-ink",
                                value === v ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="flex-1 truncate">
                              <span className="text-muted-foreground">
                                {o.name} ·{" "}
                              </span>
                              {t.name}
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {t.operators.length}{" "}
                              {t.operators.length === 1
                                ? "company"
                                : "companies"}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </div>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {footer && (
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                {footer}
              </p>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
