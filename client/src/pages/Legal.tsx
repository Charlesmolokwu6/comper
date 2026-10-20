import type { ReactNode } from "react";
import { Link } from "wouter";
import { SiteShell } from "@/components/compare/SiteShell";

const UPDATED = "20 October 2026";
/** Shown when set at build time; until then the pages say how to reach us through the site. */
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SiteShell>
      <article className="mx-auto max-w-2xl py-8 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_li]:mt-1.5 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm">Last updated {UPDATED}</p>
        {children}
        <h2>Contact</h2>
        <p>
          {CONTACT ? (
            <>
              Questions or requests about this page:{" "}
              <a
                href={`mailto:${CONTACT}`}
                className="font-medium text-primary-ink underline underline-offset-4"
              >
                {CONTACT}
              </a>
              .
            </>
          ) : (
            "Contact details for questions and data requests will be listed here."
          )}
        </p>
        <p className="mt-8">
          <Link
            href="/"
            className="font-medium text-primary-ink underline underline-offset-4"
          >
            Back to Compare
          </Link>
        </p>
      </article>
    </SiteShell>
  );
}

/** Privacy notice, written for Nigeria's Data Protection Act 2023 (NDPA). */
export function PrivacyPage() {
  return (
    <Page title="Privacy">
      <p className="mt-6">
        Compare shows live bus, flight and delivery prices from Nigerian
        operators side by side. There are no accounts and no payments on
        Compare, so we collect very little. This page explains what, why, and
        who else sees it.
      </p>

      <h2>What we use, and why</h2>
      <ul>
        <li>
          <strong>Your searches</strong> (cities, terminals, dates, parcel
          weight and value). We send these to the operators' own booking or
          price systems to get today's prices, and keep the answers for up to 6
          hours so repeat searches are fast. Searches aren't linked to you.
        </li>
        <li>
          <strong>Addresses you type</strong> (cab and delivery). We look them
          up on OpenStreetMap's address services (Nominatim and Photon) to show
          suggestions and the route. Lookups are kept for a day so the same
          address isn't looked up twice.
        </li>
        <li>
          <strong>Your location</strong>, only when you tap "Use my current
          location" and your phone allows it. We send the point to the same
          address services to name the street, keep that answer for a day, and
          use it for the route. We never track your location in the background.
        </li>
        <li>
          <strong>Basic technical data</strong> (IP address, browser type) that
          every website receives, used to run and protect the service. Our host
          keeps server logs for a short time.
        </li>
        <li>
          <strong>Visit counts</strong>, if enabled: page views and taps such as
          "Book" counted without cookies and without identifying you, to see
          which routes people use.
        </li>
      </ul>

      <h2>Stored on your phone</h2>
      <p>
        Your browser remembers your last search and your chosen area so the form
        is filled in next time. This stays on your device; clear it any time by
        clearing this site's data in your browser.
      </p>

      <h2>Who else sees data</h2>
      <ul>
        <li>
          The operators whose prices we show (bus companies, airlines, couriers)
          receive the route and date of searches, not who you are.
        </li>
        <li>
          OpenStreetMap address services and the OpenFreeMap map tiles receive
          the addresses or areas being looked up or shown.
        </li>
        <li>Our hosting provider (Render) runs the site and its logs.</li>
        <li>
          When you tap Book, you leave Compare for the operator's site; their
          own privacy policy applies there.
        </li>
      </ul>
      <p className="mt-3">
        Some of these services are outside Nigeria. We only send them what's
        needed to answer your search. We don't sell data or use it for ads.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the Nigeria Data Protection Act 2023 you can ask what personal
        data we hold about you, ask us to correct or delete it, and object to
        its use. As we don't keep accounts, there is usually nothing tied to
        you, but contact us and we'll check. You can also complain to the
        Nigeria Data Protection Commission (NDPC).
      </p>
    </Page>
  );
}

export function TermsPage() {
  return (
    <Page title="Terms of use">
      <p className="mt-6">
        By using Compare you agree to these terms. If you don't agree, please
        don't use the site.
      </p>

      <h2>What Compare is</h2>
      <p>
        Compare is a price comparison service. It shows prices from each
        operator's own booking or price system and links you to that operator to
        book. Compare isn't affiliated with any operator unless we say so, and
        we don't sell tickets, take payments or carry passengers or parcels.
      </p>

      <h2>Prices and availability</h2>
      <ul>
        <li>
          Prices are fetched from operators and may be up to 6 hours old.
          Operators can change prices, seats and times at any time.
        </li>
        <li>
          The price on the operator's site when you book is the one that counts.
          Always check it before you pay.
        </li>
        <li>
          Distances and drive times on maps come from OpenStreetMap and don't
          allow for traffic.
        </li>
        <li>
          If an operator doesn't answer, its prices may be missing. Missing
          results don't mean there are no trips.
        </li>
      </ul>

      <h2>Booking</h2>
      <p>
        Bookings are made with the operator on their site, under their terms.
        Refunds, changes, delays, luggage and complaints are between you and the
        operator.
      </p>

      <h2>Fair use</h2>
      <p>
        Don't use Compare to overload operators' systems, copy our data in bulk,
        or break the law. We may limit access to protect the service and the
        operators.
      </p>

      <h2>Liability</h2>
      <p>
        We work to keep prices accurate but provide Compare "as is". As far as
        the law allows, we aren't responsible for losses from relying on prices
        or information shown, or from bookings made with operators.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms; the date at the top shows the latest version.
        These terms are governed by the laws of the Federal Republic of Nigeria.
      </p>
    </Page>
  );
}
