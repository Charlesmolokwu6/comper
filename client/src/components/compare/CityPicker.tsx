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
import { cn } from "@/lib/utils";

export interface CityOption {
  city: string;
  name: string;
  /** Number of operators serving it, shown as a hint. */
  operators: number;
  /** Shown as a short warning next to the name, e.g. only reachable via Mararaba. */
  hint?: string;
}

interface Props {
  label: string;
  value: string | null;
  options: CityOption[];
  onChange: (city: string) => void;
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
  const selected = options.find(o => o.city === value);
  const id = `picker-${label.toLowerCase()}`;

  return (
    <div className="min-w-0">
      <span
        id={`${id}-label`}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
              "flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 text-left text-base transition-colors",
              "hover:border-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
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
              {selected?.name ?? placeholder}
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
              placeholder={`Search ${label.toLowerCase()} city…`}
              className="h-12 text-base"
            />
            <CommandList className="max-h-72">
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup>
                {options.map(o => (
                  <CommandItem
                    key={o.city}
                    value={o.name}
                    onSelect={() => {
                      onChange(o.city);
                      setOpen(false);
                    }}
                    className="flex min-h-11 items-center gap-2 px-3 text-base data-[selected=true]:bg-accent"
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        "size-4 text-primary",
                        o.city === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{o.name}</span>
                    {o.hint && (
                      <span className="text-xs text-muted-foreground">
                        {o.hint}
                      </span>
                    )}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {o.operators}{" "}
                      {o.operators === 1 ? "operator" : "operators"}
                    </span>
                  </CommandItem>
                ))}
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
