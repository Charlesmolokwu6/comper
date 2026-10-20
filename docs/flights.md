# Domestic flights

Live fares from airlines' own booking sites, fetched with plain HTTP (no browser, no login),
cached for 2 hours (`FLIGHT_TTL_HOURS`), with failed searches cached for 5 minutes.
Requests to each host are spaced at least 2 s apart (`FARE_REQUEST_GAP_MS`).

## Included

| Airline | System | How the search works |
|---|---|---|
| United Nigeria | Videcom VARS | `booking.flyunitednigeria.com/VARS/Public/shallowlink.aspx?orig=&dest=&departs=24oct2026&ad=1…` redirects to a server-rendered results page. Each fare class carries its price in `data-original-amount`. |
| Max Air | Videcom VARS | Same, at `customer2.videcom.com/MaxAir`. |
| Rano Air | Videcom VARS | Same, at `customer3.videcom.com/RanoAir`. Lagos departures are from MMA2; the card says so. |
| ValueJet | Own JSON API | `api.flyvaluejet.com/ibe/flight/routes` lists routes and the dates each is sold. `/ibe/flight/search?from=&to=&on=` returns one journey per fare class with `amount.total` (taxes included) and seats (`count`). A class with no seats is left out. Dates not in the route's list are "no flights" without a request (the API answers 400 for them). |
| Umza Air | Hitit Crane | `book-umz.crane.aero/ibe/availability?depPort=&arrPort=&departureDate=DD.MM.YYYY…` is server-rendered; fare families sit in `branded-fare-modal-*` blocks ("All taxes included"). |

Prices shown are the airline's own total for one adult, taxes included. Book links open the
same search on the airline's site (deep link) except ValueJet, which opens its homepage.
Seats-left counts are never shown ("Only 4 seats left" urgency is dropped).

The results page (`/flights/<from>/<to>/<date>`) has **Economy** and **Premium & Business**
tabs. A fare goes to Premium & Business only when its name says Premium, Business or First.
When the other tab is cheaper on a date, a note says so.

## Not included (and why)

| Airline | Reason |
|---|---|
| Air Peace, Ibom Air, Arik | Hitit Crane like Umza, but every search returns a Cloudflare captcha (HTTP 403). |
| Overland Airways | AeroCRS site behind Incapsula bot protection. |
| Green Africa | Domain is parked; not selling online. |

Getting past captchas or bot protection would mean working around the airline's defences,
which we don't do without permission. The route to these airlines is a partner feed: see
`docs/partner-applications.md` (Skyscanner, Wakanow).

## Code

`server/flights/`: `types.ts`, `airports.ts` (IATA codes → cities), `videcom.ts`, `valuejet.ts`,
`crane.ts`, `airlines.ts` (registry + not-included list), `store.ts` (cache), `compare.ts`,
`router.ts` (`/api/flights/compare`, `/api/flights/network`). Parser tests run against saved
results pages in `server/flights/fixtures/` (excluded from Prettier: the parsers match the
airlines' exact markup).
