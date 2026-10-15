import { useState } from "react";
import type { VehicleKind } from "@/lib/vehicles";
import { cn } from "@/lib/utils";
import coachPng from "@/assets/vehicles/coach.png";
import minibusPng from "@/assets/vehicles/minibus.png";
import siennaPng from "@/assets/vehicles/sienna.png";

/**
 * Our own unbranded illustrations (scripts/draw-vehicles.py), shown when the operator
 * sends no photo. They show the type of vehicle, not any operator's actual fleet.
 */
export const VEHICLE_ART: Record<VehicleKind, string> = {
  car: siennaPng,
  minibus: minibusPng,
  coach: coachPng,
};

/** The operator's own photo when it sent one, otherwise our illustration of the type. */
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
        <img
          src={VEHICLE_ART[kind ?? "coach"]}
          alt=""
          className="w-[92%] object-contain"
        />
      )}
    </span>
  );
}
