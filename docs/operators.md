# Live fares: operator findings

Every operator below was investigated the same way. First I read its booking-form JavaScript to
find the real search call. Then I replayed that call with plain HTTP. For GUO, ABC and Okeyson I
also checked the result against the operator's own results page in a headless browser; for
Chisco I read which field its results page renders as the price. No browser is used in
production, so everything runs on Render's free tier.

| Operator              | Live fares      | Search call                                                                | Auth needed                                         |
| --------------------- | --------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| GUO Transport         | ✅              | `POST guotransport.com/itinerary` (JSON)                                   | Laravel session cookie + `X-XSRF-TOKEN` (anonymous) |
| ABC Transport         | ✅              | `POST www.abctransport.com/api/cms_booking_engine.json` `{query:"q2"}`     | none                                                |
| Chisco Transport      | ✅              | `POST chiscotransport.com.ng/api/bookings/search-buses`                    | none                                                |
| Peace Mass Transit    | ✅              | `GET pmt.ng/booking/workspace/search`                                      | Laravel session cookie + `X-CSRF-TOKEN` (anonymous) |
| Okeyson Transports    | ✅              | Next.js Server Action `getAvailabilityQuery` (POST + `Next-Action` header) | anonymous `app_session_token` cookie                |
| Libra Motors (LIBMOT) | ⛔ not included | `POST api.libmot.com/api/booking/searchdetails`                            | bearer token from a credential login, see below     |
| GIGM                  | ⛔ not included | `POST booking.gigmobility2.com/apiV2/Booking/availabletripdetails`         | bearer token from a credential login, see below     |

"Anonymous" means the session comes from simply loading the homepage, the same as any visitor.
No account is involved.

## Proof: real fares returned (Oct 2026)

| Operator | Route                                                   | Date      | Fare (1 adult)                            | Cross-check                                                          |
| -------- | ------------------------------------------------------- | --------- | ----------------------------------------- | -------------------------------------------------------------------- |
| GUO      | Jibowu → Abuja, Hiace Ultra 06:00                       | 21 Oct    | ₦54,880 (₦56,000 before 2% online coupon) | Site showed "Bus Fare 56,000 / Adult 54,880"                         |
| ABC      | Lagos Jibowu → Abuja, Sprinter 06:00                    | 21 Oct    | ₦54,000, 8 seats                          | Site showed "₦ 54000/-", 8 seats available                           |
| ABC      | Lagos Jibowu → Port Harcourt, Sprinter 06:30            | 21 Oct    | ₦48,000                                   | —                                                                    |
| Chisco   | Jibowu (am) → Abuja Utako, 06:00                        | 21 Oct    | ₦47,500 (₦50,000 crossed out)             | Results page renders `adultFare` bold and `farePrice` struck through |
| Chisco   | Jibowu (am) → Enugu, 06:00                              | 21 Oct    | ₦47,500                                   | —                                                                    |
| PMT      | Lagos Mazamaza → Abuja Mararaba, Kinglong 06:30         | 16 Oct    | ₦42,000, 16 seats                         | —                                                                    |
| PMT      | Lagos Mazamaza → Port Harcourt, Kinglong 06:30          | 15/17 Oct | ₦40,000                                   | —                                                                    |
| PMT      | Lagos Mazamaza → Benin, Kinglong 06:30                  | 16 Oct    | ₦25,000                                   | —                                                                    |
| Okeyson  | Jibowu → Enugu, Super Executive 06:00 / Luxurious 18:00 | 15 Oct    | ₦44,000 / ₦33,000                         | Site showed "Super Executive ₦ 44,000", "Luxurious ₦ 33,000"         |

Prices move. ABC's Jibowu → Abuja was ₦51,000 for 16 Oct when the compare endpoint was tested.

## Per operator

### ABC Transport, on Bitla's TicketSimply platform

- **Routes:** `GET /cms_js_content.json` returns all 179 origin→destination pairs, and
  `GET /api/cities.json` returns 29 cities.
- **Search:** `POST /api/cms_booking_engine.json` with
  `{"from":"56","to":"2","depart":"YYYY-MM-DD","triptype":"oneway","query":"q2"}`. The trips are
  in `reservations[]`: `fare_amt`, `available_seats`, `dept_date_num`, `coach_title` and
  `via_route`.
- **Firewall:** ModSecurity blocks the bare `abctransport.com` (406) and headless-browser user
  agents. `www.` with a normal browser user agent works.
- **Terminals as cities:** ABC models each Lagos terminal as its own "city": Lagos Jibowu, Ajah,
  Amuwo, Bolade Oshodi, Okota and Mazamaza.

### Chisco Transport, a Next.js site

- **Routes:** `GET /api/terminals` returns 51 terminals with no coordinates (0,0).
  `GET /api/terminals/{id}` returns the destinations from one terminal.
- **Search:** `POST /api/bookings/search-buses` with
  `{tripType:0, departureDate, departureTerminalId, destinationTerminalId, numberOfAdults:1, numberOfChildren:0, client:"web"}`.
  Code `"200"` means trips; code `"202"` means no trip that day.
- **Am/pm terminals:** each terminal appears twice, once for morning and once for evening
  departures. Lagos alone has 17 entries.
- **Vehicle name:** `vehicleName` holds a luggage note ("LUGGAGE ALLOWED PER PAX (0 -10kg)"), not
  a bus type, so the API reports the seat count as the vehicle instead.

### Peace Mass Transit, a Laravel site

- **Routes:** the homepage embeds `destinationsByOrigin = {...}`, the full route map for its 21
  departure terminals.
- **Search:** `GET /booking/workspace/search?trip_type=one_way&from=&to=&date=&passengers=1`,
  sent with the session cookie, `X-CSRF-TOKEN` from the meta tag, and `X-Requested-With`.
- **Booking window:** PMT sells only **4 days ahead**. Later dates return 422 ("Selected date must
  be between …"), so the compare endpoint reports `not_on_sale` for them.
- **Time zone:** `departure_at` carries a `+00:00` offset but holds local time, so we use the
  `departure_label` the site displays instead.
- **Bot check:** the homepage loads Cloudflare Turnstile, but only the account forms use it. The
  search doesn't.

### Okeyson Transports: Next.js App Router, Apollo GraphQL, Strapi CMS

The GraphQL endpoint is never called from the browser, so it isn't exposed. Instead the search form
calls **Next.js Server Actions**. Each one is `POST /en/availability` with a
`Next-Action: <40-hex id>` header and a JSON array of arguments as the body. The reply is React's
`text/x-component` format, where one line holds `{"data":…,"error":…}`.

- **Terminals:** 19 terminals come embedded in the homepage's RSC payload (`getTerminals`).
- **Routes:** `findTerminalQuery(terminalId)` returns the routes from a terminal.
- **Search:** `getAvailabilityQuery({segments:[{adult,child,infant,terminalId,routeId,date}]})`.
- **Session:** without the `app_session_token` cookie, which any page visit sets, the search
  answers `"Forbidden resource"`.
- **Action IDs change on every Okeyson deploy.** The adapter finds them at runtime by scanning the
  page's JS chunks for `createServerReference("<id>", …, "getAvailabilityQuery")`, and rescans
  automatically when an ID stops working.
- **Data quirk:** Okeyson shows identical buses and fares for Jibowu → Enugu and Jibowu → Owerri.
  Its own website shows the same, so this isn't a parsing error.

### Libra Motors and GIGM: stopped, need your decision

Both sites get their API token by **logging in with a username and password hardcoded in their
public JavaScript**. Every visitor's browser does this silently, but it is still a credential
login to the operator's backend with an account that was never issued to us. You asked me to stop
at anything that looks like login or needs their permission, so neither was used, and neither
operator appears in results.

- **Libra:** `POST api.libmot.com/api/Token` with a hardcoded service account. Without the token,
  `api/booking/searchdetails` returns 401. The terminal list (`api/Terminal/Get/`) is public.
- **GIGM:** login payloads are AES-CBC encrypted with a key in the JS. Without a token,
  `Booking/availabletripdetails` returns 401. `settings…/Terminal/list` is public.

The clean way in is to ask each operator for API access or written permission. Both clearly run
an API for their own apps.

## How results are combined

### Normalising city names

`server/fares/cities.ts` maps every stop label to a canonical city and records how it matched:
`exact`, `area`, `approximate` (with a `note`) or `unlisted`. It was built from all 388 stop
names the five live operators actually use.

Cases it handles:

- **One terminal, many spellings:** "Lagos (Jibowu--am)", "LAGOS - JIBOWU", "JIBOWU",
  "Lagos Jibowu", "Lagos - Jibowu Terminal" and "Jibowu" are all Lagos.
- **Mararaba / Maraba:** it's in Nasarawa State but sold as Abuja, so it's flagged approximate
  even when the label says "ABUJA - MARARABA".
- **"Abuja (Lokoja)":** Okeyson's label, but Lokoja is in Kogi State. It's treated as Lokoja and
  flagged.
- **"Enugu (Awka)":** Chisco's state-plus-town format, resolved to Awka. Not flagged, because
  "Enugu" here is the state.
- **Look-alike names:** "AWKA-ETITI" is not Awka, "Benin Republic" is Cotonou rather than Benin
  City, and "Abakaliki" is not Aba.
- **State-name labels:** "Bayelsa" is a state, so it's mapped to Yenagoa and flagged.
- **Combined labels:** GUO destinations like "OWERRI-MBAISE" are flagged.
- **Unknown places in Lagos or the FCT** (e.g. Okeyson's "Anthony [Lagos]") fall back to their
  state and are flagged. Unknown places elsewhere stay their own town: "Awgu" is not Enugu city.

### The compare endpoint

`GET /api/compare?from=Lagos&to=Abuja&date=YYYY-MM-DD`

- **Which pairs it searches:** for each operator it finds every origin in the "from" city. For each
  origin it searches only the most central destination in the "to" city: the bare city name
  first, then central areas such as Utako, with approximate areas last. GUO lists 86
  Lagos→Abuja terminal/drop-off pairs, so searching all of them would mean about 86 requests per
  date. `COMPARE_DESTS_PER_ORIGIN` raises the limit. Every pair can still be searched through
  `/api/operators/:op/fares`.
- **Trips:** one list across all operators, with the same fields for every operator. They are
  sorted with bookable trips first, then by fare. The same bus reached via two drop-offs appears
  once. `approximate: true` and `matchNotes` mark any fuzzy city match.
- **`cheapest`:** the cheapest bookable trip, excluding approximate matches.
- **`coverage`:** one row per live operator with its status: `fares`, `no_trips`, `no_route`,
  `not_on_sale`, `pending` or `error`. Coverage carries no prices. An operator without live
  fares contributes no trips.
- **`unavailableOperators`:** Libra and GIGM, with the reason.
- **Partial answers:** the endpoint waits up to `COMPARE_WAIT_MS` (8 s). Operators still fetching
  are reported as `pending`, and their fares land in the cache for the next request.

### Rate limits and caching

- **Spacing:** requests to each operator host go one at a time, at least `FARE_REQUEST_GAP_MS`
  (2 s) apart. This is enforced in `server/operators/http.ts` and covers every call, including
  GUO's.
- **Fares:** cached for 6 h, then served stale while refreshing in the background, and dropped
  after 48 h (`FARE_TTL_HOURS`, `FARE_MAX_AGE_HOURS`).
- **Route lists:** cached for 24 h (`ROUTES_TTL_HOURS`). If an operator is down, yesterday's list
  is kept.
- **Persistence:** everything is saved to `.cache/fares.json` (`FARE_CACHE_FILE`).
- **Scheduled scrape:** runs every 6 h for six popular city pairs, 3 days ahead
  (`SCRAPE_CITY_PAIRS`, `SCRAPE_DAYS_AHEAD`, `SCRAPE_INTERVAL_HOURS`). The default is roughly
  50–70 requests per date per direction across all operators. Chisco, with its many Lagos am/pm
  terminals, is the largest share.

### API

| Endpoint                                               | Purpose                                               |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `GET /api/compare?from=&to=&date=`                     | Side-by-side fares                                    |
| `GET /api/cities`                                      | Canonical cities                                      |
| `GET /api/operators`                                   | Live and excluded operators                           |
| `GET /api/operators/:op/origins`                       | Each origin with its city match                       |
| `GET /api/operators/:op/origins/:id/destinations`      | Destinations from one origin                          |
| `GET /api/operators/:op/fares?from=&to=&date=`         | One operator, one pair (same shape for all operators) |
| `GET /api/fares/status`                                | Cache size and last scrape                            |
| `GET /api/guo/terminals`, `/api/guo/terminals/nearest` | GUO terminal locations (unchanged)                    |

`/api/guo/fares` now redirects to `/api/operators/guo/fares`.
