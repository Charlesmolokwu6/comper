import { cn } from "@/lib/utils";

/** Where reports go, set at build time. Without either, no feedback link is shown. */
const WHATSAPP = (
  import.meta.env.VITE_FEEDBACK_WHATSAPP as string | undefined
)?.replace(/\D/g, "");
const EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

/**
 * "Wrong price or missing route? Tell us": opens WhatsApp (or email) with the page
 * address filled in, so a report says which search it's about.
 */
export function FeedbackLink({
  className,
  children = "Wrong price or missing route? Tell us",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  if (!WHATSAPP && !EMAIL) return null;
  const text = `Compare feedback about ${window.location.href}\n\n`;
  // encodeURIComponent, not URLSearchParams: WhatsApp and mail apps show "+" literally.
  const href = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`
    : `mailto:${EMAIL}?subject=${encodeURIComponent("Compare feedback")}&body=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-umami-event="Feedback"
      className={cn(
        "underline underline-offset-4 hover:text-foreground",
        className
      )}
    >
      {children}
    </a>
  );
}
