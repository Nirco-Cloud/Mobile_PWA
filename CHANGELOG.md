# Changelog — Nirco PWA

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [1.2.1] — 2026-03-01

### Changed
- Trip Planner opens at 85% screen height by default (was 65%)

---

## [1.2.0] — 2026-03-01

### Changed
- Drag handles (map/list divider and planner panel) now animate smoothly to snap point on release
  - `transition: none` during drag — panel follows finger instantly with zero lag
  - `transition: height 200ms ease-out` activates only at finger lift — glides to snap point
  - Tap-to-cycle also animates smoothly

---

## [1.1.0] — 2026-03-01

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
