import { useEffect, useState, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import {
  deletePlanEntry,
  savePlanEntry,
  updatePlanEntry as dbUpdatePlanEntry,
} from '../db/plannerDb.js'
import { useTripConfig } from '../hooks/useTripConfig.js'
import { BOTTOM_NAV_HEIGHT } from './BottomNav.jsx'
import { getRouteColor } from '../config/routeColors.js'
import EntryCard, { EntryCardCompact } from './EntryCard.jsx'
import EntryCreatorSheet from './EntryCreatorSheet.jsx'
import BookingsSection from './BookingsSection.jsx'
import { ENTRY_TYPES } from '../config/entryTypes.js'

// ─── View switcher tabs ──────────────────────────────────────────────────────

function ViewTabs({ view, onSet, tripDays, focusDayLabel }) {
  const tabs = [
    { id: 'full',  label: `${tripDays} Days` },
    { id: '3day',  label: '3 Days'           },
    { id: 'today', label: focusDayLabel || 'Day' },
  ]
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSet(t.id)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            view === t.id
              ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Location picker sheet ────────────────────────────────────────────────────

function LocationPickerSheet({ targetDay, onClose }) {
  const locations    = useAppStore((s) => s.locations)
  const planEntries  = useAppStore((s) => s.planEntries)
  const addPlanEntry = useAppStore((s) => s.addPlanEntry)
  const [query, setQuery] = useState('')

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(query.toLowerCase()),
  )

  async function handlePick(loc) {
    const dayEntries = planEntries.filter((e) => e.day === targetDay)
    const entry = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day: targetDay,
      order: dayEntries.length + 1,
      type: 'location',
      locationId: loc.id ?? null,
      name: loc.name,
      lat: loc.lat ?? null,
      lng: loc.lng ?? null,
      note: null,
      owner: 'shared',
      meta: null,
      createdAt: new Date().toISOString(),
    }
    await savePlanEntry(entry)
    addPlanEntry(entry)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/40" onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-70 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl flex flex-col"
        style={{
          maxHeight: '75dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div className="px-4 pb-2 shrink-0">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Add to Day {targetDay}
          </h3>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
              No locations found
            </p>
          )}
          {filtered.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handlePick(loc)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left active:bg-gray-50 dark:active:bg-gray-800"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {loc.name}
                </p>
                {loc.category && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {loc.category}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 active:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Full trip view ──────────────────────────────────────────────────────────

// Small inline type icon for FullTripView badges
function TypeBadge({ type }) {
  const def = ENTRY_TYPES[type]
  if (!def) return null
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: def.accentColor + '20' }}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke={def.accentColor}
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="w-3 h-3"
      >
        <path d={def.icon} />
      </svg>
    </div>
  )
}

function FullTripView() {
  const { tripDays, formatDayLabel, getTodayDayNumber } = useTripConfig()
  const planEntries     = useAppStore((s) => s.planEntries)
  const setPlanFocusDay = useAppStore((s) => s.setPlanFocusDay)
  const setPlannerView  = useAppStore((s) => s.setPlannerView)
  const todayDay        = getTodayDayNumber()
  const days            = Array.from({ length: tripDays }, (_, i) => i + 1)

  function handleDayPress(day) {
    setPlanFocusDay(day)
    setPlannerView('today')
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {days.map((day) => {
        const dayEntries = planEntries.filter((e) => e.day === day)
        const count   = dayEntries.length
        const isToday = todayDay === day
        const hasEntries = count > 0

        // Collect unique non-location types for this day
        const typeSet = new Set(dayEntries.filter((e) => e.type !== 'location').map((e) => e.type))
        // Find hotel name if there's a hotel entry
        const hotelEntry = dayEntries.find((e) => e.type === 'hotel')

        return (
          <button
            key={day}
            onClick={() => handleDayPress(day)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left active:bg-gray-50 dark:active:bg-gray-800 transition-colors ${
              isToday
                ? 'bg-sky-50 dark:bg-sky-900/20'
                : !hasEntries ? 'opacity-60' : ''
            }`}
          >
            {/* Day number circle */}
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              isToday
                ? 'bg-sky-500 text-white'
                : hasEntries
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
            }`}>
              {day}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  hasEntries ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {formatDayLabel(day)}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold text-sky-500 leading-none">
                    TODAY
                  </span>
                )}
              </div>
              {/* Hotel name or entry summary */}
              {hotelEntry && (
                <p className="text-[11px] text-violet-500 dark:text-violet-400 truncate mt-0.5">
                  {hotelEntry.name}
                </p>
              )}
              {!hotelEntry && hasEntries && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {count} {count === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </div>

            {/* Type badges */}
            {typeSet.size > 0 && (
              <div className="flex gap-0.5 shrink-0">
                {[...typeSet].slice(0, 3).map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}

            {/* Count pill for locations */}
            {dayEntries.filter((e) => e.type === 'location').length > 0 && (
              <span className="shrink-0 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 rounded-full px-2 py-0.5">
                {dayEntries.filter((e) => e.type === 'location').length}
              </span>
            )}

            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

// ─── Three-day view ──────────────────────────────────────────────────────────

function ThreeDayView() {
  const { tripDays, formatDayLabel, getTodayDayNumber } = useTripConfig()
  const planEntries          = useAppStore((s) => s.planEntries)
  const planFocusDay         = useAppStore((s) => s.planFocusDay)
  const setPlanFocusDay      = useAppStore((s) => s.setPlanFocusDay)
  const removePlanEntry      = useAppStore((s) => s.removePlanEntry)
  const updatePlanEntryStore = useAppStore((s) => s.updatePlanEntry)
  const todayDay             = getTodayDayNumber()

  const [pickerDay, setPickerDay]             = useState(null) // null = closed
  const [entryCreatorDay, setEntryCreatorDay] = useState(null)

  const visibleDays = [planFocusDay - 1, planFocusDay, planFocusDay + 1]
    .filter((d) => d >= 1 && d <= tripDays)

  async function handleDelete(id) {
    await deletePlanEntry(id)
    removePlanEntry(id)
  }

  async function handleMove(entry, targetDay) {
    const targetCount = planEntries.filter((e) => e.day === targetDay).length
    const updated = { ...entry, day: targetDay, order: targetCount + 1 }
    await dbUpdatePlanEntry(updated)
    updatePlanEntryStore(updated)
  }

  function nav(delta) {
    const next = planFocusDay + delta
    if (next >= 1 && next <= tripDays) setPlanFocusDay(next)
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Day navigation arrows */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => nav(-1)}
            disabled={planFocusDay <= 1}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Days {visibleDays[0] ?? '—'} – {visibleDays[visibleDays.length - 1] ?? '—'}
          </span>
          <button
            onClick={() => nav(1)}
            disabled={planFocusDay >= tripDays}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* 3 columns */}
        <div className="flex-1 flex overflow-hidden">
          {visibleDays.map((day) => {
            const entries = planEntries
              .filter((e) => e.day === day)
              .sort((a, b) => a.order - b.order)
            const isToday = todayDay === day
            const isFocus = day === planFocusDay

            return (
              <div
                key={day}
                className={`flex-1 flex flex-col border-r last:border-r-0 border-gray-100 dark:border-gray-800 ${
                  isFocus ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''
                }`}
              >
                {/* Column header */}
                <div className={`px-2 py-2 border-b border-gray-100 dark:border-gray-800 ${
                  isToday ? 'bg-sky-500' : 'bg-white dark:bg-gray-900'
                }`}>
                  <p className={`text-[11px] font-bold leading-tight ${
                    isToday ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    Day {day}
                  </p>
                  <p className={`text-[9px] leading-tight ${
                    isToday ? 'text-sky-100' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatDayLabel(day).split(' · ')[0]}
                  </p>
                </div>

                {/* Entries */}
                <div className="flex-1 overflow-y-auto py-1">
                  {entries.map((entry) => (
                    <EntryCardCompact
                      key={entry.id}
                      entry={entry}
                      onDelete={() => handleDelete(entry.id)}
                      onMoveLeft={day > 1 ? () => handleMove(entry, day - 1) : null}
                      onMoveRight={day < tripDays ? () => handleMove(entry, day + 1) : null}
                    />
                  ))}

                  {/* + Add buttons */}
                  <div className="mx-1 mt-0.5 flex gap-1">
                    <button
                      onClick={() => setPickerDay(day)}
                      className="flex-1 py-1.5 text-[9px] font-medium text-sky-500 border border-dashed border-sky-300 dark:border-sky-700 rounded-lg active:bg-sky-50 dark:active:bg-sky-900/20"
                    >
                      + Loc
                    </button>
                    <button
                      onClick={() => setEntryCreatorDay(day)}
                      className="flex-1 py-1.5 text-[9px] font-medium text-violet-500 border border-dashed border-violet-300 dark:border-violet-700 rounded-lg active:bg-violet-50 dark:active:bg-violet-900/20"
                    >
                      + Entry
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {pickerDay != null && (
        <LocationPickerSheet
          targetDay={pickerDay}
          onClose={() => setPickerDay(null)}
        />
      )}
      {entryCreatorDay != null && (
        <EntryCreatorSheet
          targetDay={entryCreatorDay}
          onClose={() => setEntryCreatorDay(null)}
        />
      )}
    </>
  )
}

// ─── Today view ──────────────────────────────────────────────────────────────

// Distance threshold (meters) — only re-fetch routes when position moves more than this
const POSITION_DEBOUNCE_M = 100

// Japan bounding box — transit API doesn't work in Japan
function isInJapan(pos) {
  return pos.lat >= 24 && pos.lat <= 46 && pos.lng >= 122 && pos.lng <= 154
}

function haversineDistance(a, b) {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function TodayView() {
  const { tripDays, formatDayLabel } = useTripConfig()
  const routesLib            = useMapsLibrary('routes')
  const planEntries          = useAppStore((s) => s.planEntries)
  const position             = useAppStore((s) => s.position)
  const removePlanEntry      = useAppStore((s) => s.removePlanEntry)
  const updatePlanEntryStore = useAppStore((s) => s.updatePlanEntry)
  const travelMode           = useAppStore((s) => s.plannerTravelMode)
  const setPlannerTravelMode = useAppStore((s) => s.setPlannerTravelMode)
  const setRouteLines        = useAppStore((s) => s.setRouteLines)
  const clearRouteLines      = useAppStore((s) => s.clearRouteLines)
  const planFocusDay         = useAppStore((s) => s.planFocusDay)
  const setPlanFocusDay      = useAppStore((s) => s.setPlanFocusDay)

  const [travelTimes, setTravelTimes]     = useState({})
  const [travelLoading, setTravelLoading] = useState(false)
  const [travelError, setTravelError]     = useState(null)
  const [pickerOpen, setPickerOpen]               = useState(false)
  const [entryCreatorOpen, setEntryCreatorOpen]   = useState(false)
  const [transitLegsOpen, setTransitLegsOpen]     = useState(false)
  const [editMode, setEditMode]                   = useState(false)
  const lastFetchPos = useRef(null)
  const inJapan      = position ? isInJapan(position) : true // default Japan for this trip
  const activeDay    = planFocusDay ?? 1
  const todayEntries = planEntries
    .filter((e) => e.day === activeDay)
    .sort((a, b) => a.order - b.order)
  const todayEntryIds = todayEntries.map((e) => e.id).join(',')

  function navDay(delta) {
    const next = activeDay + delta
    if (next >= 1 && next <= tripDays) {
      setPlanFocusDay(next)
      lastFetchPos.current = null // re-fetch routes for new day
    }
  }

  // Clear routes on unmount
  useEffect(() => {
    return () => clearRouteLines()
  }, [clearRouteLines])

  // Helper: fetch routes for DRIVING via Route.computeRoutes
  function fetchDriving(validEntries, origin) {
    return Promise.all(
      validEntries.map(async (entry, idx) => {
        try {
          const response = await routesLib.Route.computeRoutes({
            origin,
            destination: { lat: entry.lat, lng: entry.lng },
            travelMode: 'DRIVING',
            fields: ['*'],
          })
          const route = response?.routes?.[0]
          if (!route) {
            const km = (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
            return { entryId: entry.id, color: getRouteColor(idx), path: [], duration: null, distanceKm: km, error: 'NO_ROUTE' }
          }
          const path = route?.path?.map((p) =>
            typeof p.lat === 'function'
              ? { lat: p.lat(), lng: p.lng() }
              : { lat: p.lat, lng: p.lng }
          ) ?? []
          const duration = route.localizedValues?.duration ?? null
          const distanceKm = route.distanceMeters
            ? (route.distanceMeters / 1000).toFixed(1)
            : (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
          return { entryId: entry.id, color: getRouteColor(idx), path, duration, distanceKm }
        } catch (err) {
          const code = err?.code || err?.message || 'UNKNOWN_ERROR'
          console.warn(`Route error (DRIVING) for ${entry.name}:`, code)
          const km = (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
          return { entryId: entry.id, color: getRouteColor(idx), path: [], duration: null, distanceKm: km, error: code }
        }
      }),
    )
  }

  // Helper: fetch transit routes via DirectionsService (works outside Japan)
  function fetchTransit(validEntries, origin) {
    const svc = new routesLib.DirectionsService()
    return Promise.all(
      validEntries.map((entry, idx) =>
        new Promise((resolve) => {
          svc.route(
            {
              origin,
              destination: { lat: entry.lat, lng: entry.lng },
              travelMode: routesLib.TravelMode.TRANSIT,
              transitOptions: { departureTime: new Date() },
            },
            (result, status) => {
              if (status === 'OK') {
                const leg = result.routes[0]?.legs[0]
                const path = result.routes[0]?.overview_path?.map((p) => ({
                  lat: p.lat(), lng: p.lng(),
                })) ?? []
                const duration = leg?.duration?.text ?? null
                const distanceKm = leg?.distance?.value
                  ? (leg.distance.value / 1000).toFixed(1)
                  : (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
                resolve({ entryId: entry.id, color: getRouteColor(idx), path, duration, distanceKm })
              } else {
                const km = (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
                resolve({ entryId: entry.id, color: getRouteColor(idx), path: [], duration: null, distanceKm: km, error: status })
              }
            },
          )
        }),
      ),
    )
  }

  // Helper: fetch walking routes via Route.computeRoutes
  function fetchWalking(validEntries, origin) {
    return Promise.all(
      validEntries.map(async (entry, idx) => {
        try {
          const response = await routesLib.Route.computeRoutes({
            origin,
            destination: { lat: entry.lat, lng: entry.lng },
            travelMode: 'WALKING',
            fields: ['*'],
          })
          const route = response?.routes?.[0]
          if (!route) {
            const km = (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
            return { entryId: entry.id, color: getRouteColor(idx), path: [], duration: null, distanceKm: km, error: 'NO_ROUTE' }
          }
          const path = route?.path?.map((p) =>
            typeof p.lat === 'function'
              ? { lat: p.lat(), lng: p.lng() }
              : { lat: p.lat, lng: p.lng }
          ) ?? []
          const duration = route.localizedValues?.duration ?? null
          const distanceKm = route.distanceMeters
            ? (route.distanceMeters / 1000).toFixed(1)
            : (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
          return { entryId: entry.id, color: getRouteColor(idx), path, duration, distanceKm }
        } catch (err) {
          const code = err?.code || err?.message || 'UNKNOWN_ERROR'
          console.warn(`Route error (WALKING) for ${entry.name}:`, code)
          const km = (haversineDistance(origin, { lat: entry.lat, lng: entry.lng }) / 1000).toFixed(1)
          return { entryId: entry.id, color: getRouteColor(idx), path: [], duration: null, distanceKm: km, error: code }
        }
      }),
    )
  }

  // Fetch routes for BOTH modes in parallel
  useEffect(() => {
    if (!routesLib || !position || todayEntries.length === 0) {
      clearRouteLines()
      return
    }

    // Position debounce — skip if moved less than threshold
    if (lastFetchPos.current &&
        haversineDistance(lastFetchPos.current, position) < POSITION_DEBOUNCE_M) {
      return
    }

    const validEntries = todayEntries.filter((e) => e.lat != null && e.lng != null)
    if (validEntries.length === 0) {
      clearRouteLines()
      return
    }

    let cancelled = false
    setTravelLoading(true)
    setTravelError(null)
    lastFetchPos.current = { lat: position.lat, lng: position.lng }

    const origin = { lat: position.lat, lng: position.lng }

    const secondaryFetch = inJapan
      ? fetchWalking(validEntries, origin)
      : fetchTransit(validEntries, origin)

    Promise.all([
      fetchDriving(validEntries, origin),
      secondaryFetch,
    ]).then(([driveResults, altResults]) => {
      if (cancelled) return
      setTravelLoading(false)

      // Pick the active mode's results for route lines on map
      const activeResults = travelMode === 'DRIVING' ? driveResults : altResults
      const errors = activeResults.filter((r) => r.error)
      if (errors.length > 0 && errors.length === activeResults.length) {
        setTravelError(errors[0].error)
      }
      setRouteLines(activeResults.filter((r) => r.path.length > 0))

      // Merge both modes
      const times = {}
      driveResults.forEach((r) => {
        if (!times[r.entryId]) times[r.entryId] = {}
        times[r.entryId].drive = r.duration
        times[r.entryId].driveKm = r.distanceKm
      })
      altResults.forEach((r) => {
        if (!times[r.entryId]) times[r.entryId] = {}
        if (inJapan) {
          times[r.entryId].walk = r.duration
          times[r.entryId].walkKm = r.distanceKm
        } else {
          times[r.entryId].transit = r.duration
          times[r.entryId].transitKm = r.distanceKm
        }
      })
      setTravelTimes(times)
    })

    return () => { cancelled = true; setTravelLoading(false) }
  }, [routesLib, position, travelMode, todayEntryIds]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    await deletePlanEntry(id)
    removePlanEntry(id)
  }

  async function handleToTomorrow(entry) {
    if (activeDay >= tripDays) return
    const tomorrowCount = planEntries.filter((e) => e.day === activeDay + 1).length
    const updated = { ...entry, day: activeDay + 1, order: tomorrowCount + 1 }
    await dbUpdatePlanEntry(updated)
    updatePlanEntryStore(updated)
  }

  function handleModeSwitch(mode) {
    if (mode === 'TRANSIT') {
      setTransitLegsOpen((prev) => !prev)
      return
    }
    setTransitLegsOpen(false)
    lastFetchPos.current = null  // reset so next GPS tick triggers fetch
    setPlannerTravelMode(mode)
    setTravelError(null)
  }

  const sharedEntries = todayEntries.filter((e) => e.owner !== 'nirco')

  async function handleSwapOrder(entryA, entryB) {
    if (!entryA || !entryB) return
    const updA = { ...entryA, order: entryB.order }
    const updB = { ...entryB, order: entryA.order }
    await dbUpdatePlanEntry(updA)
    await dbUpdatePlanEntry(updB)
    updatePlanEntryStore(updA)
    updatePlanEntryStore(updB)
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Day navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => navDay(-1)}
            disabled={activeDay <= 1}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Day {activeDay}
            </span>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {formatDayLabel(activeDay)}
            </p>
          </div>
          <button
            onClick={() => navDay(1)}
            disabled={activeDay >= tripDays}
            className="p-1.5 rounded-lg text-gray-400 disabled:opacity-30 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Transit / Drive toggle */}
        <div className="px-4 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800 space-y-1.5">
          <div className="flex gap-2">
            {['WALKING', 'DRIVING'].map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeSwitch(mode)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  travelMode === mode && !transitLegsOpen
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {mode === 'WALKING' ? '🚶 Walk' : '🚗 Drive'}
              </button>
            ))}
            <button
              onClick={() => handleModeSwitch('TRANSIT')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                transitLegsOpen
                  ? 'border-purple-500 bg-purple-500 text-white'
                  : 'border-purple-400 text-purple-500 dark:text-purple-400 active:bg-purple-50 dark:active:bg-purple-900/30'
              }`}
            >
              🚇 Transit
            </button>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-colors ${
                editMode
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {editMode ? 'Done' : '✏️'}
            </button>
          </div>
          {!position && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center pb-0.5">
              Enable GPS for travel times
            </p>
          )}
          {position && travelLoading && (
            <p className="text-[11px] text-sky-400 text-center pb-0.5">Calculating routes…</p>
          )}
          {position && !travelLoading && travelError && (
            <p className="text-[11px] text-orange-400 text-center pb-0.5">
              {travelError === 'ZERO_RESULTS' || travelError === 'NOT_FOUND' || travelError === 'NO_ROUTE'
                ? 'No routes found'
                : `Route unavailable (${travelError})`}
            </p>
          )}
        </div>

        {/* Stop list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {/* My Bookings (private entries) */}
          <BookingsSection dayNumber={activeDay} />

          {sharedEntries.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center pt-6">
              No stops for today yet.
            </p>
          )}
          {sharedEntries.map((entry, idx) => {
            // Color index is based on position among geo-valid entries
            const geoIdx = sharedEntries
              .filter((e) => e.lat != null && e.lng != null)
              .indexOf(entry)
            const color = geoIdx >= 0 ? getRouteColor(geoIdx) : null
            const origin = position ? `${position.lat},${position.lng}` : null
            const dest = entry.lat != null && entry.lng != null ? `${entry.lat},${entry.lng}` : null
            const tt = travelTimes[entry.id]

            let mapsUrl = null
            if (origin && dest) {
              if (transitLegsOpen) {
                const geoEntries = sharedEntries.filter((e) => e.lat != null && e.lng != null)
                const prevStop = geoEntries[geoIdx - 1]
                const transitOrigin = geoIdx === 0
                  ? `${position.lat},${position.lng}`
                  : prevStop ? `${prevStop.lat},${prevStop.lng}` : null
                if (transitOrigin) {
                  mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${transitOrigin}&destination=${dest}&travelmode=transit`
                }
              } else {
                const gmMode = travelMode === 'WALKING' ? 'walking' : 'driving'
                mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${gmMode}`
              }
            }

            let transitFromLabel = null
            if (transitLegsOpen && entry.lat != null && entry.lng != null) {
              const geoEntries = sharedEntries.filter((e) => e.lat != null && e.lng != null)
              const prevStop = geoEntries[geoIdx - 1]
              transitFromLabel = geoIdx === 0 ? 'Current location' : prevStop?.name
            }

            return (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                color={color}
                travelTime={tt}
                mapsUrl={mapsUrl}
                transitFromLabel={transitFromLabel}
                transitLegsOpen={transitLegsOpen}
                editMode={editMode}
                onDelete={() => handleDelete(entry.id)}
                onToTomorrow={() => handleToTomorrow(entry)}
                onSwapUp={() => handleSwapOrder(entry, sharedEntries[idx - 1])}
                onSwapDown={() => handleSwapOrder(entry, sharedEntries[idx + 1])}
                isFirst={idx === 0}
                isLast={idx === sharedEntries.length - 1}
              />
            )
          })}

          {/* Add buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              className="flex-1 py-3 text-sm font-medium text-sky-500 border border-dashed border-sky-300 dark:border-sky-700 rounded-xl active:bg-sky-50 dark:active:bg-sky-900/20"
            >
              + Location
            </button>
            <button
              onClick={() => setEntryCreatorOpen(true)}
              className="flex-1 py-3 text-sm font-medium text-violet-500 border border-dashed border-violet-300 dark:border-violet-700 rounded-xl active:bg-violet-50 dark:active:bg-violet-900/20"
            >
              + Entry
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <LocationPickerSheet
          targetDay={activeDay}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {entryCreatorOpen && (
        <EntryCreatorSheet
          targetDay={activeDay}
          onClose={() => setEntryCreatorOpen(false)}
        />
      )}

    </>
  )
}

// ─── Main overlay ────────────────────────────────────────────────────────────

export default function PlannerOverlay() {
  const { tripDays }     = useTripConfig()
  const isPlannerOpen    = useAppStore((s) => s.isPlannerOpen)
  const setIsPlannerOpen = useAppStore((s) => s.setIsPlannerOpen)
  const plannerView      = useAppStore((s) => s.plannerView)
  const setPlannerView   = useAppStore((s) => s.setPlannerView)
  const planFocusDay     = useAppStore((s) => s.planFocusDay)
  const [panelH, setPanelH] = useState(65)       // % of viewport
  const dragRef = useRef(null)

  function onDragStart(e) {
    e.preventDefault()
    const startY = e.touches ? e.touches[0].clientY : e.clientY
    const startH = panelH
    function onMove(ev) {
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY
      const delta = startY - y                    // positive = dragging up = taller
      const newH = startH + (delta / window.innerHeight) * 100
      setPanelH(Math.min(85, Math.max(20, newH)))
    }
    function onEnd() {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
  }

  if (!isPlannerOpen) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
      style={{
        height: `${panelH}dvh`,
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Drag handle — drag to resize */}
      <div
        ref={dragRef}
        className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-row-resize touch-none"
        onTouchStart={onDragStart}
        onMouseDown={onDragStart}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setIsPlannerOpen(false)}
          className="p-1.5 -ml-1.5 rounded-lg text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
          aria-label="Close planner"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex-1">
          Trip Planner
        </h2>
      </div>

      {/* View tabs */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <ViewTabs view={plannerView} onSet={setPlannerView} tripDays={tripDays} focusDayLabel={planFocusDay ? `Day ${planFocusDay}` : 'Day'} />
      </div>

      {/* Content */}
      {plannerView === 'full'  && <FullTripView />}
      {plannerView === '3day'  && <ThreeDayView />}
      {plannerView === 'today' && <TodayView />}
    </div>
  )
}
