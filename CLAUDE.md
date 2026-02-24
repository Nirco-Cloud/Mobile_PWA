# CLAUDE.md — Nirco_PWA Project Specification

This file provides Claude Code with the full context needed to build, extend, and maintain the Nirco_PWA project. Read this before making any changes.

---

## Project Identity

- **Name:** Nirco_PWA
- **Type:** Progressive Web App (PWA)
- **Purpose:** Offline-first travel companion for an 18-day trip to Japan
- **Language:** English
- **Offline Priority:** 10/10 — the app must be fully functional with zero internet connectivity

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React (Vite-based) |
| Styling | Tailwind CSS |
| Maps | Google Maps JS API |
| PWA Plugin | vite-plugin-pwa |
| Local Storage | IndexedDB |
| Deployment | GitHub Pages |

---

## Target Device

**Samsung Galaxy S21 Ultra** — all UI and performance decisions must account for this device.

- Apply `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` padding everywhere to respect the punch-hole camera and gesture navigation bar.
- Apply `will-change: transform` and `backface-visibility: hidden` on all list items for jitter-free scrolling at 120Hz.
- Implement the Battery Status API: if battery level drops below 20%, reduce GPS polling interval from **15 seconds → 60 seconds**.

---

## PWA Configuration (vite-plugin-pwa)

- **Caching Strategy:** Cache First (speed priority).
- **Service Worker:** Must cache all bundled assets and static images at build time.
- **Dynamic Image Caching:** On first launch, after writing JSON data to IndexedDB, extract all image URLs from the data and programmatically instruct the service worker to pre-cache them. These are runtime URLs, not build-time assets — they require a custom caching step.
- **Offline Fallback:** If JSON data fails to load from the network, automatically serve from cache or IndexedDB. Never show a broken state.
- **Splash Screen:** Display **"Welcome :-)"** during app load.

---

## UI / UX

- **Layout:** Vertical split-screen — Google Maps on top, location list on bottom, with a **draggable divider** between them.
- **Navigation:** Fixed bottom navigation bar.
- **Theme:** Light Blue base color.
- **Auto Dark Mode:** Automatically switch to dark mode at local sunset time (calculate based on user GPS coordinates and current date). Switch back to light mode at local sunrise.
- **Typography:** Modern and clean.

---

## Data Architecture

### JSON Data Files
- Location data is stored in JSON files split by city or day.
- All JSON files live in the `/public/data/` directory and are bundled with the app.

### First Launch Initialization Flow
1. Check IndexedDB for a `syncComplete` flag.
2. If flag is **absent**: fetch all JSON files → parse → write all records to IndexedDB → extract all image URLs → pre-cache images via service worker → set `syncComplete = true`.
3. If flag is **present**: skip fetch entirely, read directly from IndexedDB.
4. Manual re-sync: clear `syncComplete` flag and repeat from step 2.
5. **Default behavior: No auto-sync.** The app never re-fetches data unless the user explicitly triggers it.

### GPS & Location
- Request GPS permission **immediately on app launch** — do not defer.
- Use `enableHighAccuracy: true` at all times.
- Recalculate distances for the location list every **15 seconds** (or 60 seconds if battery < 20%).
- Re-sort the list by distance after every recalculation.

---

## Map Component

- **Disable all default Google Maps UI:** No zoom buttons, no compass, no street view pegman, no map type switcher.
- **Interaction mode:** Gestures only (pinch-to-zoom, drag to pan).
- **Auto-center:** Keep map centered on user's current GPS position by default.
- **Default zoom level:** Street level (detailed view).
- **Markers:** Use category-based custom icons. Categories include (at minimum): Shrines, Food, Train, and others as defined in the JSON data.
- **Clustering:** Enable marker clustering for high-density areas.
- **Sync behavior:** Clicking a map marker must scroll the bottom list to the corresponding row and highlight it.

---

## List Component

- **Density:** Compact rows. Minimize padding and whitespace. Maximize the number of visible rows on screen.
- **Default sort:** By distance from user's current GPS location (nearest first).
- **Search bar:** Persistent text input pinned to the top of the list. Filters locations by name in real-time.

### Row Interactions
- **Tap row:** Expand inline to show full details. Do not navigate to a new page or route.
- **"Open in Google Maps" button:** Deep link using `google.navigation:q=LAT,LNG` URI scheme to launch navigation directly in the Maps app.
- **WhatsApp share button:** Share coordinates via `https://wa.me/?text=ENCODED_TEXT`.

### Two-Way Map ↔ List Sync
- Clicking a map marker → scroll list to that row + highlight it.
- Clicking a list row → pan/center the map to that marker.
- Use a shared `selectedLocationId` state (React Context or Zustand) to manage sync. Implement guards to prevent infinite update loops between the two components.

---

## State Management Guidance

- Use a centralized `selectedLocationId` for map ↔ list sync.
- GPS position and battery level should be global state (Context or Zustand).
- IndexedDB is the source of truth for location data after first launch.
- `localStorage` or a dedicated IndexedDB key can store the `syncComplete` flag.

---

## File & Folder Conventions

```
/public
  /data          ← JSON location files (split by city/day)
  /icons         ← Category-based map marker icons
/src
  /components
    MapComponent.jsx
    ListComponent.jsx
    SplashScreen.jsx
    BottomNav.jsx
  /hooks
    useGPS.js
    useBattery.js
    useDarkMode.js   ← sunset/sunrise logic
  /store           ← Zustand or Context state
  /db              ← IndexedDB read/write helpers
  /workers         ← Service worker helpers
```

---

## Key Constraints & Reminders

- **Never break offline mode.** Every feature must degrade gracefully with no network.
- **No backend.** GitHub Pages is static only. All logic must run client-side.
- **External dependencies** (e.g., Cloudflare Workers for Maps short-link resolution) are separate services — do not attempt to replicate them here.
- **Do not add default Google Maps controls** — the UI spec explicitly disables them all.
- **Do not auto-sync data** unless the user manually triggers it.
- **Always test on a simulated S21 Ultra viewport** (412×915, 3x DPR) with safe area insets applied.
