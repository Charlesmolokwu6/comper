import { cn } from "@/lib/utils";

/** The logo's two squares shuffling like cards (index.css). Decorative unless labelled. */
export function CardLoader({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span aria-hidden data-size={size} className={cn("card-loader", className)}>
      <span />
      <span />
    </span>
  );
}

/** Shown in place of results while the first live prices are on their way. */
export function LoadingResults({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-10 text-center"
    >
      <CardLoader size="lg" />
      <p className="mt-5 font-semibold text-foreground">{title}</p>
      {detail && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
