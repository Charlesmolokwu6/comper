import { useState } from "react";
import type { VehicleKind } from "@/lib/vehicles";
import { cn } from "@/lib/utils";

/** Side-view line drawings: an illustration of the vehicle type, never a photo of the fleet. */
const PATHS: Record<VehicleKind | "generic", string> = {
  car: "M6 25h-2v-6l5-6c1-1 2-2 4-2h20c2 0 3 .5 4 1.5l6 5.5 6 1.5c1 .3 2 1 2 2.5V25h-3 M14 25h18 M10 17h13v-4 M27 13v4h12",
  minibus:
    "M6 25H4V12c0-2 1-3 3-3h36c2 0 3 1 4 3l4 7v6h-3 M14 25h20 M8 13h8v5H8z M19 13h8v5h-8z M30 13h8v5h-8z M41 13h3l3 5h-6z",
  coach:
    "M6 25H3V9c0-2 1-3 3-3h43c2 0 3 1 3 3v16h-3 M15 25h22 M6 10h7v6H6z M16 10h7v6h-7z M26 10h7v6h-7z M36 10h7v6h-7z M46 10h3v10h-3z",
  generic:
    "M6 25H4V11c0-2 1-3 3-3h38c2 0 3 1 3 3v14h-3 M14 25h20 M8 12h9v6H8z M20 12h9v6h-9z M32 12h9v6h-9z",
};

const WHEELS: Record<VehicleKind | "generic", [number, number]> = {
  car: [10, 41],
  minibus: [10, 41],
  coach: [11, 41],
  generic: [10, 39],
};

export function VehicleIcon({
  kind,
  className,
}: {
  kind: VehicleKind | null;
  className?: string;
}) {
  const k = kind ?? "generic";
  return (
    <svg
      viewBox="0 0 56 30"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={PATHS[k]} />
      {WHEELS[k].map(x => (
        <circle key={x} cx={x} cy={25} r={3.2} />
      ))}
    </svg>
  );
}

/** The operator's own photo when it sent one, otherwise the line drawing. */
export function VehicleThumb({
  kind,
  image,
  alt,
  className,
}: {
  kind: VehicleKind | null;
  image: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.05] text-neutral-300",
        className
      )}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <VehicleIcon kind={kind} className="w-4/5" />
      )}
    </span>
  );
}
