import { cn } from "@/lib/utils";

/**
 * The Compare mark, drawn like the app icon (public/icons): two lime squares on a black tile.
 * The black tile keeps the lime readable on the light theme too.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden
      className={cn("size-7 shrink-0", className)}
    >
      <rect width="512" height="512" rx="112" fill="#000" />
      <rect
        x="215"
        y="119"
        width="178"
        height="178"
        rx="40"
        fill="none"
        stroke="#c0f11c"
        strokeWidth="23"
      />
      <rect x="108" y="200" width="204" height="204" rx="46" fill="#c0f11c" />
    </svg>
  );
}
