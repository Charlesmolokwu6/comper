import { useState } from "react";
import type { VehicleKind } from "@/lib/vehicles";
import { cn } from "@/lib/utils";
import coachPng from "@/assets/vehicles/coach.webp";
import minibusPng from "@/assets/vehicles/minibus.webp";
import siennaPng from "@/assets/vehicles/sienna.webp";

/**
 * Unbranded pictures of each vehicle type (background removed), shown when the operator
 * sends no photo of its own. They show the type of vehicle, not an operator's own fleet.
 */
export const VEHICLE_ART: Record<VehicleKind, string> = {
  car: siennaPng,
  minibus: minibusPng,
  coach: coachPng,
};

/** The operator's own photo when it sent one, otherwise a picture of the vehicle type. */
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
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.05] text-soft",
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
