/**
 * Visit counts with Umami (umami.is): no cookies, nothing that identifies a person. Off
 * unless VITE_UMAMI_WEBSITE_ID is set at build time. Page views are counted automatically,
 * and taps on elements marked data-umami-event="…" (searches, Book buttons) as events.
 */
export function startAnalytics() {
  const id = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
  if (!id || typeof document === "undefined") return;
  const s = document.createElement("script");
  s.defer = true;
  s.src =
    (import.meta.env.VITE_UMAMI_SCRIPT as string | undefined) ??
    "https://cloud.umami.is/script.js";
  s.dataset.websiteId = id;
  // Count the page, not the search text in it: routes are in the path already.
  s.dataset.excludeSearch = "true";
  document.head.appendChild(s);
}
