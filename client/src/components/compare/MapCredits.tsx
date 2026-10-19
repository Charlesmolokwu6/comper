import { cn } from "@/lib/utils";

const link = "underline-offset-2 hover:underline";

/** The map data and tiles licences ask for this credit wherever the map shows. */
export function MapCredits({ className }: { className?: string }) {
  return (
    <span className={cn("text-[11px] text-muted-foreground/70", className)}>
      Map ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        OpenStreetMap
      </a>{" "}
      contributors ·{" "}
      <a
        href="https://www.openmaptiles.org/"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        © OpenMapTiles
      </a>{" "}
      ·{" "}
      <a
        href="https://openfreemap.org"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        OpenFreeMap
      </a>
    </span>
  );
}
