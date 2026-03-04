# Changelog — Nirco PWA

Two products are tracked here:
- **Mobile PWA** — the React progressive web app (deployed to GitHub Pages)
- **Builder PWA** — standalone desktop admin panel (`builder.html`, local-only, gitignored)

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

# Mobile PWA

## [Unreleased]

---

## [2.22.8] — 2026-03-04 22:15

### Fixed
- **Planner drag performance** — Bypass React state during drag by mutating DOM height directly; add `will-change: height` GPU hint during drag; wrap FullTripView and TodayView in `React.memo`; add CSS `contain: layout style` to panel

---

## [2.22.7] - 2026-03-04 Israel Time

### Fixed
- Tapping "Day #" label in TodayView header no longer opens the DayPicker; label converted to non-interactive span

---

## [2.22.6] — 2026-03-04 18:15

### Fixed
- **Planner scroll** — Added `min-h-0` to all `flex-1 overflow-y-auto` containers in `PlannerOverlay` (FullTripView and TodayView). Without this, flex children never shrank below their content size, so `overflow-y-auto` never activated and the list couldn't be scrolled.

---

## [2.22.5] — 2026-03-04 17:45

### Changed
- **DayPicker cell redesign** — D# moves to the top as a bold solid pill (accent color per state: indigo/sky/amber/gray). Date number remains the dominant element below. Day name and month are smaller muted supporting text. Removed old absolute-positioned text badges (HERE/STAY/TODAY) — cell color communicates the state.

---

## [2.22.4] — 2026-03-04 17:30

### Fixed
- **GitHub sync — pull-side encoding repair** — Added `fixGarbledString()` applied to every entry pulled from GitHub. Detects and reverses multi-level UTF-8 double-encoding (caused by old push code) so that Hebrew, Japanese, and other non-ASCII names are always decoded correctly regardless of how they were encoded when pushed. Prevents garbled names on mobile even if an old service worker on desktop pushes incorrectly encoded data.

---

## [2.22.3] — 2026-03-04 13:20

### Fixed
- **GitHub sync encoding — proper fix** — `pushToGithub` now escapes all non-ASCII characters as `\uXXXX` before base64 encoding. This makes the sync file purely ASCII so `atob()` + `JSON.parse()` decode it correctly on all devices without encoding tricks. Hebrew names, arrows, and other Unicode characters now survive the sync round-trip correctly. GitHub plan.json re-patched with ASCII-safe encoding.

---

## [2.22.2] — 2026-03-04 13:00

### Fixed
- **GitHub sync encoding bug** — non-ASCII characters (Hebrew, arrows) were garbled on devices that pulled data from GitHub. `pullFromGithub` now uses `decodeURIComponent(escape(atob(...)))` to correctly reverse the `btoa(unescape(encodeURIComponent(...)))` push encoding. After syncing on mobile, all Hebrew location names will display correctly.

---

## [2.22.1] — 2026-03-04 12:10

### Fixed
- **Navigate origin picker in My Bookings** — the Navigate button on booking cards (hotel, activity, etc. with coordinates) now shows the origin picker sheet instead of navigating directly. Day 1 or no previous entries still navigates directly.

---

## [2.22.0] — 2026-03-04 11:56

### Added
- **Navigate origin picker** — tapping Navigate on a planner entry now shows a bottom sheet asking where to navigate from: "From last stop" (last geo-tagged entry of the previous day, sky blue) or "From last hotel" (most recent hotel booking before this day, violet). On Day 1 or when no options exist, navigates directly using current GPS. Removed the previous tap-card-to-navigate shortcut in favor of the explicit Navigate button.

---

## [2.21.1] — 2026-03-04 11:41

### Added
- **Stay dropdown auto-navigates Trip Planner** — switching stays in the dropdown (e.g. Tokyo → Kyoto) automatically updates `planFocusDay` to the hotel's arrival day, so the planner jumps to the correct day without manual scrolling.

---

## [2.21.0] — 2026-03-04 10:40

### Added
- **DayPicker suggests stay's arrival day** — when adding a location to the plan, the day picker automatically highlights (sky blue, "stay" badge) and scrolls to the first day of the currently selected stay, derived from the hotel booking plan entry for that stay. No manual config — follows the itinerary automatically.

---

## [2.20.2] — 2026-03-04 10:35

### Fixed
- **DayPicker highlights current day** — when moving an entry to a different day, the entry's current day is marked with an indigo border and "here" badge so the user knows where they're moving from

---

## [2.20.1] — 2026-03-04 09:55

### Changed
- **Demo mode on by default** — GPS locked to stay hotel on first launch; toggle off in Settings to use real GPS

---

## [2.20.0] — 2026-03-04 09:40

### Fixed
- **Share target now shows Day Plan picker** — after saving a place from a shared Google Maps link, a DayPicker sheet appears so you can immediately assign it to a trip day (same flow as manual paste via Plan tab)
- **Imported place markers now interactive** — tapping a saved place marker on the map opens the detail sheet with Open Maps / Share / + Plan buttons; `LocationDetailSheet` now searches both built-in locations and user POIs

---

## [2.19.0] — 2026-03-04 09:25

### Fixed
- **`?q=...&ftid=...` link format now resolves correctly** — added name extraction from `q=` query parameter (used by iOS share links with `g_st=iw`)
- **Wrong coordinates from body `@lat,lng` matching** — moved `og:image center=` and `APP_INITIALIZATION_STATE` body strategies before the generic `@lat,lng` body scan to prevent spurious matches

---

## [2.18.0] — 2026-03-04 09:10

### Fixed
- **`maps.app.goo.gl` links no longer fail** — added two new coordinate extraction strategies from the HTML body: `og:image center=lat%2Clng` and `APP_INITIALIZATION_STATE=[[[scale,lng,lat`. Also switched to desktop User-Agent for `maps.app.goo.gl` fetches (smaller 168KB body vs 780KB mobile, more reliable coordinate embedding).

---

## [2.17.0] — 2026-03-04 01:47

### Changed
- **Single source of truth for category colors** — `color` field added to each entry in `categories.js`; `getCategoryColor()` helper exported and used by `ListComponent`, `LocationRow`, and `PlannerOverlay` — no more duplicated color maps
- **Category chips now match canonical order exactly** — `CHIP_GROUPS` derived directly from `CATEGORIES` (one chip per category, same order); previously combined chips (Sushi×2, Attractions×3) are now split into individual chips

---

## [2.16.0] — 2026-03-04 01:39

### Changed
- **Category chip order** — Restaurant moved to #1, Izakaya to #7, Activity to #12, Hotel to #15
- **Location row button** — renamed "Edit" → "Expand" / "Close" to better reflect its toggle behaviour

---

## [2.15.0] — 2026-03-04 01:19

### Added
- **Hebrew name shown in Save Place sheet** — when `nameHe` is returned by the resolver, it appears above the editable English name as a right-aligned RTL secondary line.

---

## [2.14.0] — 2026-03-04 01:12

### Added
- **Hebrew name (`nameHe`)** — resolver now fetches the Hebrew display name in parallel alongside English for every resolved place. Included in the JSON response as `nameHe` (omitted if not available or identical to English name).

---

## [2.13.0] — 2026-03-04 01:05

### Fixed
- **`maps.app.goo.gl` place name resolution** — when a URL contains both a place name (from `/place/NAME/` path) and exact pin coordinates (`!3d!4d`), now uses Text Search with 500m `locationBias` instead of blind Nearby Search. This fixes cases like "Portobello Two" where Nearby Search was returning the wrong nearby business (e.g. Layla Bakery 30m away).

---

## [2.6.0] — 2026-03-03

### Changed
- **"Add from Maps link" moved to Plan tab** — small `[🔗 Maps]` button inline with Trip Planner heading; removed from Settings tab
- **DayPicker shown after saving POI** — after resolving and saving a Maps link, user is prompted to add it to a plan day; "Save POI only" skips adding to plan

---

## [2.5.0] — 2026-03-03

### Fixed
- **`share.google` links now resolve correctly** — fetches HTML body, extracts place name from embedded `/search?q=` href, uses Places Text Search with country name appended to query for correct geographic anchoring
- **Wrong country results** — `rlz` parameter parsed for sharer's country code (e.g. IL=Israel, JP=Japan); country name appended to query ("Village Steakhouse Israel") prevents cross-country false matches
- **`maps/search?query=TOKEN`** — opaque tokens now fall back to `share.google/TOKEN` resolution pipeline
- **Premature `share_google_unsupported` rejection** removed — all link formats now attempt full resolution before returning an error

---

## [2.4.0] — 2026-03-03

### Fixed
- **`demoMode` default `false`** — GPS was permanently locked to Shinjuku hotel for all users; real GPS distances now work out of the box
- **"Open in Maps" deep link** — changed from `https://www.google.com/maps/dir/` web URL to `google.navigation:q=LAT,LNG`, which launches Google Maps turn-by-turn navigation directly
- **Map re-centers on stay hotel after data loads** — stay-centering effect now fires when locations load from IndexedDB, not only on `selectedStay` change; hotel coordinates are used instead of the region fallback
- **List → map pan for user-saved POIs** — clicking a userPoi row now correctly pans the map; previously only JSON locations were searched
- **Category labels in Planner location picker** — raw Hebrew category keys (e.g. `מסעדות ואוכל רחוב`) replaced with human-readable English labels (e.g. "Street Food")
- **Query filtering consistency** — `ListComponent` now uses a single trimmed `q` variable for both regular locations and userPois

### Added
- **Opening hours** — today's opening hours shown inline in expanded location rows (sourced from Places API)
- **`share.google` link support** — new Google share format detected; returns actionable error: "tap ··· → Share → Copy link" instead of a generic 422
- **Places Text Search** — `google.com/maps/search/?api=1&query=PLACE+NAME` URLs now resolved via Places API text search
- **`?ll=lat,lng` coordinate extraction** — Strategy 5 in the resolver covers older `goo.gl/maps` redirect targets
- **`maps.google.` domain** — added to `isMapsUrl()` regex for full coverage
- **Opaque token detection** — `looksLikeToken()` distinguishes real place-name queries from share tokens; tokens return the `share_google_unsupported` error with guidance

### Changed
- Netlify function URL hardcoded in `ShareConfirmSheet` — no env var or GitHub Secret required
- `netlify.toml` build command changed from `ignore = "exit 0"` (which blocked all deploys) to `echo 'functions-only deploy'`

---

## [2.3.0] — 2026-03-03 (New_With_Import branch)

### Added
- **User-Added POI system** — save personal places from Google Maps links directly into the app
- **Web Share Target** — app registers as a share target in the PWA manifest; sharing a Google Maps link from the Android share sheet opens the app and auto-resolves the place
- **ShareConfirmSheet** — bottom sheet that resolves a Maps URL via the Netlify function, shows place details (name, address, rating, phone, website), allows name edit and personal note, saves to IndexedDB on confirm
- **Netlify function `resolve-maps-link.js`** — server-side resolver: follows redirects, extracts coordinates/place_id from URL, calls Google Places API, returns `{name, lat, lng, address, category, placeId, phone, website, rating, openingHours}` with approved type→category mapping
- **`userPoisStore`** — new IndexedDB store (`nirco-user-pois`) for personal places
- **`userPoisDb.js`** — CRUD helpers: `saveUserPoi`, `readAllUserPois`, `deleteUserPoi`, `updateUserPoi`, `clearAllUserPois`, `getUserPoiByPlaceId`
- **Personal Places section** in Settings — shows saved count, "+ Add from Maps link" button, "Clear All" destructive button
- **userPois merged into map markers** — personal places appear on the map with a gold ★ badge overlay (always visible in explore mode, regardless of stay/category filter)
- **userPois merged into list** — personal places appear in the location list with a gold ★ prefix, sorted by distance alongside regular POIs
- **Duplicate detection** — checks `placeId` before saving; shows "Already saved as …" error if duplicate
- **Restaurant category** — new category with orange icon (`restaurant.svg`)
- **PascalCase category keys** — `hotel→Hotel`, `train→Train`, `location→Location`, `activity→Activity`; migration on boot for backward compatibility

### Changed
- `appStore.js` — added `userPois[]`, `setUserPois`, `addUserPoi`, `removeUserPoi`, `updateUserPoi`, `shareTargetPayload`, `setShareTargetPayload`, `clearShareTargetPayload`
- Boot sequence now loads userPois in parallel with locations and plan entries
- `vite.config.js` manifest now includes `share_target` registration

---

## [2.2.0] — 2026-03-03 (PWA_V2 branch)

### Added
- **Stay architecture** — `src/config/stays.js` defines 7 stays (Tokyo Shinjuku, Hakone, Nakatsugawa, Takayama, Kanazawa, Kyoto, Tokyo Daiba) each with `hotelId`, fallback center coordinates, radius, and zoom level
- **TopBar** — replaces category chip panel at the top; contains a stay selector dropdown (chronological order) and an Explore / Overview mode toggle
- **MapBottomControls** — replaces dense filter panel at the bottom of the map; three quick-access buttons: Nearby (slide-up list overlay), Walking (1.5 km radius filter), Hotels (hotel-only quick filter)
- **Stay-based POI filtering** — pipeline: All POIs → stay radius filter → walking filter → quick filter → category filter; applied in both MapComponent and ListComponent
- **Animated stay transitions** — selecting a new stay triggers `map.panTo()` + `map.setZoom(regionZoom)` without recreating the map instance
- **Overview mode** — hides all POIs; renders numbered hotel markers for each stay and draws a connecting polyline in chronological order across Japan
- **Walking mode** — filters map markers and list rows to POIs within 1.5 km of the user's current GPS position (applied after stay filter)
- **Nearby list overlay** — slide-up bottom sheet (55 % of map height) with full ListComponent inside, triggered by the Nearby control; closes on X or tab switch
- **New state slices** — `selectedStay`, `mode`, `walkingMode`, `quickFilter`, `showNearbyList` in appStore

### Changed
- **Layout** — replaced split map+list with map-dominant layout: TopBar (48 px) + full-screen map + MapBottomControls (52 px) + BottomNav; list is now an optional overlay rather than a persistent panel
- **ListComponent** — stay filter and walking filter applied before category filter in `sortedLocations` memo

### Fixed
- Removed stale `setImportedLocations` from `useEffect` dependency array in App.jsx (leftover from v1.9.0 import-feature removal)

---

## [1.9.0] — 2026-03-03

### Removed
- **Google Maps link import feature** — removed ImportSheet, LocationImportEditSheet, resolveMapLink utility, importedLocations DB/store, InlineImport component in PlannerOverlay, Web Share Target manifest registration, Netlify resolver function and netlify.toml. The app now shows only builder-defined locations; users cannot add new locations via link import.
- Removed `VITE_NETLIFY_RESOLVER_URL` environment variable from build pipeline

---

## [1.8.4] — 2026-03-02

### Added
- **LocationImportEditSheet** — full-screen editor that opens after a Google Maps link is resolved; pre-fills all Places API enrichment data (name, description, address, phone, rating, website, opening hours) as editable fields; includes amber ✍️ Personal Notes textarea (`dir="auto"` for Hebrew) and an inline day grid to assign the location to a trip day in one step
- **Inline day picker in import flow** — 5-column grid showing all trip days; selecting a day creates a plan entry alongside saving the imported location

### Changed
- **ImportSheet** — no longer shows an inline success card after link resolution; hands off to `LocationImportEditSheet` and closes itself; now focused on URL input + saved imports list only

---

## [1.8.3] — 2026-03-02

### Fixed
- **Netlify resolver URL** — `VITE_NETLIFY_RESOLVER_URL` was pointing to the stale `japanguide.netlify.app` site which lacked the `?mode=enrich` handler; corrected to `deft-lollipop-820a72.netlify.app` so Places API enrichment (address, rating, phone, opening hours, description) now works in the mobile app import flow

---

## [1.8.0] — 2026-03-02

### Added
- **LocationDetailSheet** — bottom sheet that slides up when tapping a location name in the list or a map marker; shows all rich data: notes (amber), description, address, phone, website, opening hours, rating, distance, coordinates
- **Map marker → detail sheet** — tapping a map marker now opens the detail sheet AND still scrolls+highlights the list row
- **Opening hours** — preserved through `normalizeRecord()` and displayed collapsibly in the detail sheet

---

## [1.7.9] — 2026-03-02

### Added
- **Personal Hebrew notes field** — locations now support a free-text `notes` field for personal comments in Hebrew (or any language); searchable in the mobile app list alongside name and description
- **Notes display in LocationRow** — expanded row shows notes in an amber-styled block with `✍️` prefix and `dir="auto"` for correct RTL rendering

### Changed
- **Search now includes notes** — typing in the location search bar matches against `notes` in addition to `name` and `description`

---

## [1.7.7] — 2026-03-02

### Fixed
- **GPS denial** — `PERMISSION_DENIED` error now stops polling immediately and shows "GPS access denied — enable location in browser settings" in the Settings GPS section instead of silently waiting forever
- **GitHub token whitespace** — whitespace-only tokens are now correctly treated as unconfigured in both boot and `syncPlanEntries` (was being accepted as a valid token)
- **Plan import LWW merge** — `initializePlan` (baseline `plan.json` load) now applies Last-Write-Wins per entry instead of blindly overwriting local edits; user changes to plan entries survive app reinstalls and first-launch reloads
- **Duplicate plan entry order** — replaced `dayEntries.length + 1` order assignment with `Date.now()` in both `EntryCreatorSheet` and `DayPicker`; concurrent saves no longer produce duplicate order values
- **Required meta field gate** — `canSave` in `EntryCreatorSheet` now also checks that the first (primary) meta field is non-empty before enabling Save; prevents saving flights without airline, hotels without confirmation number, etc.
- **Battery event listener leak** — `useBattery` now correctly removes the same function references it added, preventing accumulation of orphaned listeners
- **GitHub sync: concurrent calls** — `syncInProgress` ref guard prevents a second `triggerSync()` from overlapping a running sync
- **GitHub sync: IDB data loss** — replaced destructive `clear→setMany` with safe `setMany→delMany(staleKeys)` so a write failure mid-sync no longer empties the plan store
- **GitHub sync: corrupt file** — `atob`/`JSON.parse` in pull is now wrapped in try/catch; a corrupted remote file throws a clean error instead of crashing the sync
- **GitHub sync: 401/403/429** — explicit error codes surfaced as human-readable messages: "token invalid or expired" and "rate limit exceeded — try again later"
- **Plan file partial failure** — `initializeData` switched from `Promise.all` to `Promise.allSettled`; a single JSON file failing no longer blocks successfully-fetched files from loading
- **Netlify resolver timeout** — `resolve-maps-link` function now aborts after 8 s with a 504 and clear user message instead of hanging until Netlify's 10 s hard limit
- **Import sheet timeout** — Google Maps link resolver fetch in `ImportSheet` now aborts after 12 s with a "Request timed out" message
- **Location row missing coords** — Maps and WhatsApp links in `LocationRow` are now disabled (greyed out) when lat/lng are absent, preventing broken deep-links
- **planFocusDay bounds** — `setPlanFocusDay` and `setTripDates` now clamp the focused day to `[1, tripDays]`; changing trip length can no longer leave the planner on a non-existent day
- **Maps API key missing** — `MapComponent` now renders a friendly error overlay when `VITE_GOOGLE_MAPS_API_KEY` is absent instead of crashing with a blank map
- **Builder: duplicate location IDs** — new locations whose generated ID collides with an existing one now get a numeric suffix (`-2`, `-3`, …) instead of silently overwriting
- **Builder: null-island coordinates** — saving a location at (0, 0) now prompts for confirmation; out-of-range lat/lng values are rejected before save
- **Builder: invalid plan entries on file load** — entries with `day < 1` are now filtered out when opening a plan file in the builder
- **Builder: unsaved edit guard** — clicking Edit or New while another location is being edited now shows a confirmation dialog instead of silently discarding changes
- **`parsePlanFile` day filter** — entries with `day < 1` are filtered in `parsePlanFile` (matches `initializePlan` validation)
- **Service worker null guard** — `onRegistered` now guards against `r === undefined` before logging
- **Boot fallback empty IDB** — boot error path now explicitly logs when the IDB fallback also returns 0 records, distinguishing "served from cache" from "truly empty"

### Added
- **Trip-ended banner** — TodayView shows an amber info banner ("The trip has ended — viewing past itinerary") when the current date is past the trip end date

---

## [1.7.6] — 2026-03-02

### Fixed
- **`custom.svg` / `train.svg` icons** — `custom.svg` was malformed (24×24 bare path, no circle background); replaced with proper 40×40 amber circle + pin icon; created new `train.svg` (orange circle + train icon); updated `categories.js` so `train` category uses `train.svg`

### Changed
- **Location row tap behavior** — tapping the location name or category dot now zooms the map to that location without opening the detail panel; a dedicated **Edit** button (highlights sky-blue when open) replaces the old expand-on-tap behavior; `+ Plan` button is unchanged

---

## [1.7.5] — 2026-03-02 01:15

### Added
- **Jump to day** — tap the "Day X" label in TodayView to open a day picker sheet showing all 17 trip days; instant navigation with no toast delay
- **Empty day CTA** — days with no stops now show "+ Location" (sky filled) and "+ Entry" (violet outlined) action buttons instead of plain text
- **LocationPickerSheet wired** — "+ Location" button is now functional; previously the sheet existed but was never rendered
- **Category dot in location picker** — each location row in the picker shows a colored dot matching its category (consistent with the main list view)

### Changed
- **TypeBadge sizes** (FullTripView row) — icon `w-3→w-3.5`, text `text-[9px]→text-[11px]`, padding `px-1.5→px-2`; badges are now properly legible at arm's length
- **FullTripView empty days** — faint `+` hint appears before the chevron on days with no entries to communicate tap affordance
- **DayPicker** — new `jumpMode` prop shows all trip days (not just future), closes instantly on selection

### Fixed
- **Cascade delete** — deleting a location now also removes all linked plan entries (`locationId` match) from both IndexedDB and Zustand store; applies in both `LocationManager` (main locations) and `ImportSheet` (imported locations). Deletion in the other direction (removing a plan entry) leaves the location untouched
- **Category migration on boot** — all legacy category keys (`מלונות`, `custom`, `restaurant`, `cafe`, `shop`, `attraction`) are transparently remapped to canonical keys at load time via `migrateLocations()`

### Changed
- **Category system aligned with Builder PWA** — 14 canonical categories in `src/config/categories.js` (Hebrew food categories + English hotel/train/location/activity); `migrateCategoryLegacy()` and `migrateLocations()` exported for boot-time migration
- **`ImportSheet` IMPORT_CATEGORIES** updated to canonical keys (`מסעדות ואוכל רחוב`, `קפה/תה/אלכוהול`, `איזורים ואתרים`, `חנויות`, `location`)
- **`ListComponent` CHIP_GROUPS** — removed obsolete aliases (`restaurant`, `cafe`, `shop`, `attraction`, `custom`, `מלונות`) from group mappings; `activity` added to sights group
- **`PlannerOverlay` CATEGORY_COLORS** — removed obsolete alias keys; added `activity: '#ec4899'`
- **Default edit category** in LocationManager changed from `'custom'` → `'location'`

---

## [1.7.4] — 2026-03-01 16:00

### Added
- **List virtualization** (`@tanstack/react-virtual`) — only visible rows + 5-row overscan are in the DOM; dynamic height measurement handles expanded rows automatically; map→list scroll uses `scrollToIndex` instead of `scrollIntoView`
- **Haptic feedback** — `navigator.vibrate(15)` on successful "Add to Day" (DayPicker) and "Save entry" (EntryCreatorSheet)
- **M3 active pill** — sky-100/sky-900 pill indicator behind active tab icon in BottomNav (Material Design 3 pattern)
- **Re-center FAB now works** — was previously a no-op; now pans map to GPS position and resets zoom ≥15 if needed

### Changed
- **Re-center FAB color** — sky-500 when auto-centered on GPS, gray-400 when user has panned away; tap restores centering and color
- **CSS `contain: layout style paint`** added to each LocationRow for faster scroll paint
- **Dark mode transition** — `body` background color transitions in 200ms when switching modes

---

## [1.7.3] — 2026-03-01 15:30

### Added
- **Skeleton loading screens** — list panel shows 8 shimmer placeholder rows while location data loads from IndexedDB (visible during explicit re-sync)
- **Offline/online toast** — amber toast when going offline, green toast (4 s auto-dismiss) when connection returns; floats above bottom nav
- **Google Maps dark mode** — map renders in dark style when dark mode is active: uses `colorScheme` API when `mapId` is configured; falls back to a custom 19-rule dark styles array otherwise

### Changed
- **Category chips** — `min-h-[44px]` ensures all chips meet WCAG 2.5.5 tap target minimum
- **Re-center FAB** — bumped from 40 × 40 px to **48 × 48 px**
- **Map markers** — invisible padding wrapper extends tappable area to 48 × 48 dp for both normal (28 px) and selected (40 px) icons
- **CSS shimmer animation** added (`@keyframes shimmer`) for skeleton rows, with dark mode variant
- **`prefers-reduced-motion`** media query added globally — disables all transitions and animations for users who opt out of motion

---

## [1.7.2] — 2026-03-01 14:30

### Changed
- Trip Planner panel always opens at **85%** (maximum height) when switching to the Plan tab — regardless of where the user last left it
- GitHub Actions workflow now displays the app version number in the deploy step name (`Deploy v1.7.2 to GitHub Pages`)

---

## [1.7.1] — 2026-03-01 13:45

### Changed
- `area.svg` icon replaced: was a generic blue location pin (indistinguishable from Google Maps default); now a Japanese **torii gate** silhouette — distinctive, thematic, clearly marks tourist attractions
- Filter chip renamed "Sights" → **"Attractions"** so it matches the category label shown during Google Maps import (users imported places as "Attraction" but couldn't find the chip)

---

## [1.7.0] — 2026-03-01 13:20

### Changed
- Plan map markers redesigned (Option A):
  - Multi-day overview: first stop of each day shows a `D#` badge (top-left) + category icon inside colored ring — subsequent stops show icon + sequential number badge only, no redundant day label
  - Today view: each stop shows category icon inside colored ring + sequential number badge (bottom-right)
  - Category icon resolved from entry's linked location (`locationId → getCategoryIcon`); entries without a location (flight, hotel, note…) show their entry-type SVG icon
  - GPS origin marker (stop 0) kept as plain gray circle
- Tapping any plan stop marker on the map now expands the Trip Planner panel to 85% height and scrolls + highlights the corresponding entry card in the list (sky-blue glow ring, auto-clears after 2.5s)
- Highlighted marker shows a colored outer glow ring matching the day/route color
- Panel height is now synced via store so external commands (marker tap) and user drag always stay consistent

---

## [1.6.0] — 2026-03-01 12:35

### Changed
- "→ Tomorrow" button on EntryCard replaced with "📅 Day" — opens DayPicker overlay to move entry to any day (not just the next one)
- DayPicker gains `pickerOnly` prop: skips entry creation, fires `onDone(day)` with the chosen day number; header reads "Move to day"; toast reads "Moved to Day X ✓"
- Edit form now shows a Description / Note textarea for **all** entry types (was Note-only for `type='note'`)
  - Label shows "Description" for non-note types, "Note" for note type
  - Stored in `entry.note` field
  - Saved description is displayed as a small gray line below the entry name on the card
- Saving a description on a location entry that has a `locationId` also updates the linked location's `description` field in IndexedDB, making it findable in the Map view search bar

---

## [1.5.0] — 2026-03-01 11:54

### Changed
- Import flow now uses the same modern DayPicker sheet (5-col grid, amber today, past days hidden)
- "Add to Day →" in ImportSheet: saves location immediately, resets form, opens DayPicker as overlay
- Cancel DayPicker → location stays in saved list, no plan entry created
- Each saved import now has a "+ Plan" button to open DayPicker at any time without re-pasting
- DayPicker gains optional `onDone` prop (called after successful save, distinct from `onClose` cancel)

### Removed
- Old inline 3-column day picker inside ImportSheet (replaced by full DayPicker overlay)

---

## [1.4.0] — 2026-03-01 11:31

### Added
- "+ Plan" button in expanded LocationRow action row (alongside Open in Maps and Share)
- Modern day-picker bottom sheet: 5-column grid, blurred backdrop, rounded-3xl corners
- Each day cell shows: day-of-week, date number, month, day number (D3), green dot if already has entries
- Today highlighted with amber ring and "today" badge
- Hard cutoff: past days hidden — only today and future days shown
- If trip hasn't started yet, all days shown from Day 1
- Success toast "Added to Day X ✓" shown for 1.2s then sheet closes automatically

---

## [1.3.1] — 2026-03-01 11:09

### Changed
- Category chip tap from "All on" state now isolates to that chip only (no need to clear first)
- "All" chip always resets to show everything
- Active category filter persisted to IndexedDB — survives app crash, close, and phone restart

---

## [1.3.0] — 2026-03-01 10:35

### Added
- Horizontal scrollable category chip row pinned between search bar and location list
- 11 merged chip groups consolidate 16 raw categories into clean labels (Izakaya, Ramen, Sushi, Fine Dining, Street Food, Cafe, Snacks, Shopping, Sights, Hotels, Other)
- Each chip group maps multiple related internal keys (e.g. Sushi = both Hebrew sushi keys; Cafe = Hebrew + imported cafe keys)
- Active chip shows colored fill + white dot; "All" chip resets filter

### Removed
- Full-screen CategoryFilter overlay (replaced by chip row)
- "Categories" tab from bottom navigation bar (now 3 tabs: Map, Plan, Settings)

---

## [1.2.1] — 2026-03-01 10:22

### Changed
- Trip Planner opens at 85% screen height by default (was 65%)

---

## [1.2.0] — 2026-03-01 10:15

### Changed
- Drag handles (map/list divider and planner panel) now animate smoothly to snap point on release
  - `transition: none` during drag — panel follows finger instantly with zero lag
  - `transition: height 200ms ease-out` activates only at finger lift — glides to snap point
  - Tap-to-cycle also animates smoothly

---

## [1.1.0] — 2026-03-01 09:55

### Added
- Version number displayed at the bottom of the Settings tab (`v{version}`)
- Version injected at build time from `package.json` via Vite `define`
- Import categories refactored to entry-type system: Restaurant, Cafe, Attraction, Shop, Hotel, Train, Place
  - Hotel/Train imports create matching plan entry types (`type:'hotel'`, `type:'train'`)
  - All other import categories create `type:'location'` plan entries
  - Auto-detection maps place name keywords to the appropriate category
- Import-first add-to-planner flow: Google Maps link → resolve → pick category → pick day → saved directly as plan entry
- Inline day picker inside ImportSheet (no separate overlay)
- Tap-to-cycle on both drag handles: single tap cycles through snap points without dragging

### Changed
- Trip Planner drag handle: hit target increased from 32px → 48px
- Map/List divider drag handle: hit target increased from 20px → 48px
- Drag move/up listeners moved from handle element to `window` — no more lost touch when finger moves outside handle
- `touchAction: none` applied to outer container during drag to prevent scroll hijack
- `requestAnimationFrame` throttling on both drag handles for smooth 120Hz updates
- Snap points: Planner panel 35/65/85%, Map divider 30/50/70%
- Removed "+ Plan" button from LocationRow expanded section
- Removed "+ Location" button from TodayView in PlannerOverlay
- Import category chips replaced old Hebrew/Japanese food categories

### Fixed
- Trip dates showing 27/02→27/02 in Settings: stale IndexedDB value cleared automatically when start === end
- Category state reset bugs in ImportSheet (save-only and sheet-close handlers)

---

## [1.0.0] — 2026-02-28

### Added
- **Core PWA** — offline-first, installable, service worker with cache-first strategy
- **Google Maps integration** — custom markers, clustering, all default UI disabled
- **GPS tracking** — high-accuracy, adaptive polling (15s normal, 60s on battery < 20%)
- **Battery Status API** — reduces GPS polling when battery drops below 20%
- **Auto dark mode** — switches at local sunset/sunrise using SunCalc
- **Split-screen layout** — draggable divider between map (top) and location list (bottom)
- **Location list** — compact rows, sort by distance, real-time search filter
- **LocationRow** — tap to expand, inline thumbnail, address, Open in Maps, WhatsApp share
- **Map ↔ List sync** — clicking marker scrolls list; clicking row pans map. Source-guarded to prevent loops
- **IndexedDB persistence** — all location data, plan entries, settings stored locally
- **First-launch sync** — fetches JSON files, writes to IDB, pre-caches images via service worker
- **Manual re-sync** — clears `syncComplete` flag and re-fetches all data
- **Trip Planner** — full-screen overlay, TodayView and FullTripView
- **Plan entries** — types: location, flight, hotel, car_rental, train, activity, note
- **EntryCard** — universal card renderer with reorder, delete confirmation, inline edit, travel time
- **EntryCreatorSheet** — bottom sheet: type picker → dynamic form → save. Owner toggle (Shared/Private)
- **BookingsSection** — collapsible "My Bookings" for private (`owner:'nirco'`) entries with encryption gate
- **DayPicker** — 3-column 18-day grid bottom sheet for assigning entries to days
- **Soft delete** — tombstone pattern with `deletedAt` timestamp, syncs deletion across devices
- **GitHub two-way sync** — pull/push via GitHub Contents API, last-write-wins merge, 30-day tombstone purge
- **QR code sync config** — scan QR to auto-configure GitHub sync token on second device
- **Google Maps link import** — resolve short/long Maps URLs via Netlify function, extract coordinates
- **Web Share Target** — registered in PWA manifest; Maps links shared from other apps open ImportSheet
- **ImportSheet** — bottom sheet: paste/resolve link → preview → category → save or add to day
- **Encryption** — AES-GCM encryption for private booking confirmation numbers
- **Safe area insets** — `env(safe-area-inset-*)` applied throughout for punch-hole camera and gesture bar
- **PlanMapLayer** — polyline + numbered AdvancedMarkers on map when planner is open in TodayView
- **Routes API** — travel time estimates between consecutive plan stops (walk/drive/transit modes)
- **Route recap toggle** — show/hide day route on map with colored polylines
- **BottomNav** — fixed navigation bar with Map, Plan, Settings tabs

---

---

# Builder PWA

> Local-only desktop admin panel (`builder.html`). Not deployed — opened directly in Chrome via File System Access API. Version tracked here for reference; changes are not committed to git.

## [Unreleased]

---

## [1.8.5] — 2026-03-02

### Added
- **Enrichment fields in LocationEditPanel** — address, phone, website, rating now appear as editable inputs pre-filled from Places API data when importing a Maps link
- **Opening hours read-only display** — if Places API returned opening hours they appear as a read-only list in the form and are stored on save

---

## [1.8.4] — 2026-03-02

### Added
- **Personal Hebrew notes field** — LocationEditPanel now includes a `notes` textarea with `dir="auto"` and amber styling; optional, not required for save; pre-filled empty when importing from Maps

---

## [1.5.0] — 2026-03-02

### Fixed
- **Single commit on Save** — replaced two sequential Contents API calls (one per file) with a single Git Trees API commit; both `locations.json` and `plan.json` are now pushed atomically in one commit → one workflow run instead of two

---

## [1.4.0] — 2026-03-02

### Fixed
- **Day click always navigates to Plan tab** — clicking any day in the sidebar now switches `mainTab` to `'plan'` in addition to setting `activeDay`; previously clicking a day while on the Locations tab would silently update the active day with no visible effect

---

## [1.3.0] — 2026-03-02

### Changed
- **Day picker moved into the New Location form** — the `📅 Add to Day` pill and 7-column day grid now live inside the `+New Location` dialog alongside the Category picker (same row); selecting a day turns the button indigo and upgrades the label to "Add Location + Plan Day N"; the Maps importer panel itself is simplified back to a single "Add Location →" button that just prefills the form

---

## [1.2.0] — 2026-03-02

### Added
- **Cascade delete** — deleting a location from the locations list (or map view) now also removes all linked plan entries (`locationId` match); dirty flag is set so the user knows to save; status bar shows count of removed entries
- **Version number next to tool name** — `v{BUILDER_VERSION}` shown inline in the header next to "🔨 Builder_PWA"

### Changed
- **Categories as `{ key, label }` objects** — CATEGORIES array changed from plain strings to objects; both location and entry form dropdowns now show proper-cased labels (e.g. "Hotel", "Train", "Location") while storing canonical keys internally
- **Default category** in location form changed from `'custom'` → `'location'`

---

## [1.1.0] — 2026-03-02

### Added
- **Plan entry count in tab** — Days sidebar Plan tab label shows live count: `📅 Plan (N)`
- **Locations count in tab** — Locations sidebar tab shows `📍 Locations (N)` with live count
- **Version number in Setup modal** — footer of ⚙ Setup modal now displays `Builder_PWA v1.1.0`

---

## [1.0.0] — 2026-03-01

### Added
- **Single-file tool** — `builder.html` runs entirely in Chrome with no build step; React 18 UMD + Babel Standalone + Tailwind Play CDN + pdf.js 3.x via CDN
- **File System Access API** — "Open Folder" picks the project root; navigates to `public/data/` and reads `locations.json` + `plan.json` directly; "Save Files ●" writes both files back to disk; dirty indicator (orange ●) in header when unsaved changes
- **3-column layout** — Days sidebar (left) · Day editor (center) · Tools panel (right)
- **Days sidebar** — 17-day list with entry counts + type color dots; Locations tab for the full location list with search
- **Day editor** — selected day's entries with drag-to-reorder (HTML5 native), edit/delete per entry, `+ Location` and `+ Entry` add buttons
- **EntryEditPanel** — inline form for editing/creating entries: type picker grid (7 types), dynamic meta fields per type, day selector, owner toggle (Shared / Nirco / Bar)
- **LocationsList** — searchable list of all locations; edit form with name, category, lat/lng, description; hard-delete with confirmation
- **MapView** — Leaflet map showing all location pins; click pin to focus and edit; add new location by clicking map
- **Google Maps importer** — paste URL → POST to Netlify resolver → name + coordinates prefilled; add to Locations or to a specific Day as a plan entry
- **PDF digestor** — pick `.pdf` file → pdf.js text extraction → scrollable preview; buttons to assign text as Description or Note; "Load sample" shows a dummy hotel voucher
- **Email digestor** — paste confirmation email → regex detection for type, dates, times, confirmation numbers, airport codes; detected fields shown as editable inputs; date → day number conversion; "Load sample" with dummy Booking.com email; "Create Entry" adds to plan
- **Settings modal** — Netlify resolver URL input (saved to localStorage); trip start/end dates
- **Schema compatibility** — reads and writes the exact same `locations.json` (v1.0.0 wrapper) and `plan.json` (v2.0.0 wrapper) format as the Mobile PWA
- **Status bar** — bottom of window shows timestamped operation results

---

---

[1.7.5]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Nirco-Cloud/Mobile_PWA/releases/tag/v1.0.0
