# Changelog — Nirco PWA

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

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

[Unreleased]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Nirco-Cloud/Mobile_PWA/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Nirco-Cloud/Mobile_PWA/releases/tag/v1.0.0
