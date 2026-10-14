# GUO Transport live prices

**Result: live GUO fares work over plain HTTP. No browser is needed, so this runs on Render's free tier.**

## How GUO's search actually works

Found by reading GUO's own JS bundle (`BookingBar-*.js` → `apiservice-*.js`) and confirmed by
driving the real booking UI in headless Chromium (`scripts/guo_ui_check.py`) while capturing the
network traffic.

1. `GET https://guotransport.com/` sets two Laravel cookies, `XSRF-TOKEN` and
   `guo_transport_session`. The page also embeds every departure terminal and the destinations
   it serves in the Inertia `data-page` attribute (`props.allRoutes`: 37 terminals, 939
   terminal→destination pairs).
2. The search button sends `POST https://guotransport.com/itinerary` with JSON and the header
   `X-XSRF-TOKEN: <decoded cookie>`:
   ```json
   {"one_way":true,"selectedTerminal":"84","selectedDestination":"3","selectedTripDate":"2026-10-21",
    "selectedReturnTerminal":"","selectedReturnDestination":"","selectedReturnTripDate":"","isInterRoute":false}
   ```
   It returns `schedule.BusList[]`, where each bus has `FareAmount`, `VehicleGroupTag_Name`,
   `Departure_Time`, `AvailableSeat` and `BlockedSeat`. The response also includes
   `bookingSettings.couponDiscount`, GUO's default online discount (currently `GUOGoesOnline`,
   2%).
3. The browser then navigates to `/booking_result`, which only renders the Vuex store that
   step 2 filled.

The earlier dead end (`/api/alloptions` returning empty bodies) was the wrong endpoint. The
search never calls it.

### Evidence

| Check | Result |
|---|---|
| Plain HTTP replay (`requests` / Node `fetch`), Jibowu(84) → Abuja(3), 2026-10-21 | HTTP 200, 1 bus, HIACE ULTRA, `FareAmount` 56000 |
| Real UI in Playwright, same search | Browser sent the same `/itinerary` request. Page showed "Bus Fare: 56,000", "Adult 54,880" |
| Scheduled scrape, 16 Lagos/PH routes × 1 day | 16 ok, 0 failed, about 1.6 s per request with a 1.5 s gap |

The ₦54,880 shown on GUO's site is ₦56,000 less the 2% coupon. The API returns it as `onlineFare`.

### Things to know about the data

- **Buses passing through.** A search returns buses that pass through the destination, not only
  buses that end there. For example, Maza Maza → Onitsha returns buses bound for Uyo and Ogoja.
  `FareAmount` is the fare to the destination you searched. The same Maza Maza Uyo-bound bus is
  ₦42,500 searched to Onitsha, ₦43,500 to Owerri and ₦45,500 to Aba. Each trip has
  `busFinalDestination` and `passesThrough` so the UI can show this.
- **Seat count.** Free seats = `AvailableSeat` minus `BlockedSeat`. This matches the
  "10 Seats Available" GUO's UI showed for a 12-seat bus.
- **Departure date.** `Departure_Time` sometimes has a stale date part. The client takes the
  date from `Trip_Date` and the time from `Departure_Time`.
- **Bad IDs.** Unknown terminal or destination IDs make GUO return HTTP 500 with a Laravel
  stack trace, because debug mode is on in production. `/api/guo/fares` checks the pair against
  `allRoutes` first so we never send one.
- **Server-side record.** Each `/itinerary` call creates a `RefCode` ("lockedby") record on
  GUO's side, which is their schedule lock for the session. It doesn't lock seats, since seat
  locks are a separate `activateSeatLock` call. Still, keep the scrape volume modest. The
  default is 16 routes × 7 days every 6 h, about 450 requests a day, 3 s apart.

## What was built

| File | Purpose |
|---|---|
| `server/guo/client.ts` | Session handling, `/itinerary` replay, parsing |
| `server/guo/fareStore.ts` | Cache, background refresh, scheduled scrape, single request queue to GUO |
| `server/guo/router.ts` | `/api/guo/*` endpoints |
| `server/guo/terminals.ts` + `data/terminals.json` | Terminal locations and nearest-terminal lookup |
| `server/guo/terminalFixes.ts`, `scripts/guo-terminals.ts` | Regenerate the terminal snapshot (`pnpm guo:terminals`) |
| `scripts/guo_ui_check.py` | Playwright diagnostic, used if GUO changes its frontend |

### API

- `GET /api/guo/fares?from=84&to=3&date=2026-10-21` returns live trips with `fare`,
  `onlineFare`, seats, vehicle, departure, `fetchedAt` and `stale`.
- `GET /api/guo/routes` returns the bookable terminals and their destinations, with IDs.
- `GET /api/guo/terminals` returns 44 Nigerian terminals with address, phone, lat/lon and
  `bookable`.
- `GET /api/guo/terminals/nearest?lat=6.52&lon=3.37&limit=5` returns them sorted by
  straight-line distance (`distanceKm`).
- `GET /api/guo/status` returns the cache size and the last scrape result.

### Caching

User requests are served from the store. GUO is contacted only in three cases:

- **Scheduled scrape.** Popular routes for the next 7 days, every 6 h, first run 10 s after
  boot.
- **Uncached route or date.** The first request fetches once, and concurrent identical requests
  share that fetch.
- **Stale entry.** After 6 h the cached answer is served immediately with `stale: true` and
  refreshed in the background. After 48 h it is refetched before answering.

All tuning is via env vars listed at the top of `fareStore.ts`, for example
`GUO_SCRAPE_ROUTES="84:3,40:18"`.

### Render free tier caveats

- **Spin-down.** Free web services sleep after 15 min idle, so the 6-hourly timer only runs
  while the service is awake. On wake the scrape runs again and uncached requests fetch on
  demand (about 1.5 s), so it degrades gracefully.
- **Ephemeral cache file.** The free tier's disk doesn't survive restarts, so
  `.cache/guo-fares.json` is lost on restart or redeploy. If that matters, point the store at
  Render Key Value or keep the service warm with an external pinger.
- **Untested from Render's IPs.** This was tested from a cloud container, not from Render.
  GUO doesn't appear to sit behind a bot challenge, but check `/api/guo/status` after the first
  deploy.

## Terminal coordinates

GUO's `/terminals` page publishes address, phone, Google Maps link and Latitude/Longitude for
each terminal, so no geocoding is needed for most of them. Several entries are wrong. These were
corrected from OpenStreetMap/Nominatim and marked `coordSource: "osm"`:

| ID | Terminal | GUO's data | Fix |
|---|---|---|---|
| 113 | Uyo | Aba's coordinates | Ikot Ekpene Road, Uyo |
| 106 | Benin | Asaba's coordinates | Ugbowo, Benin City |
| 114 | Ikorodu | Lagos Island coordinates | Sagamu Road, Ikorodu |
| 117 | Ikosi-Ketu | Lagos Island coordinates | Ketu, Lagos |
| 70 | Ogoja | 0,0 | Ogoja town |
| 100 | Afikpo | 0,0 | Afikpo town |
| 13 | Gombe | missing from `/terminals` (bookable) | Gombe town |

`pnpm guo:terminals` regenerates the snapshot and prints a warning for any new coordinates that
fall outside Nigeria or duplicate another city's terminal.

## Not done yet

- **Frontend.** `client/src/pages/ComparisonApp.tsx` still shows mock bus results from
  free-text From/To fields. Using the live API needs a terminal/destination picker, since GUO
  IDs are required. A good default is to prefill the departure from
  `/terminals/nearest` using the GPS fix.
- **Other operators.** GIGM, Libra, Okeyson and the rest aren't done. The same method is worth
  trying on each: read the site's JS for the search call before reaching for a browser.
