import { useEffect, useState, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import {
  deletePlanEntry,
  savePlanEntry,
  updatePlanEntry as dbUpdatePlanEntry,
} from '../db/plannerDb.js'
import { writeLocation } from '../db/locations.js'
import { updateImportedLocation } from '../db/importedLocations.js'
import { useTripConfig } from '../hooks/useTripConfig.js'
import { BOTTOM_NAV_HEIGHT } from './BottomNav.jsx'
import { getRouteColor, getDayColor } from '../config/routeColors.js'
import EntryCard from './EntryCard.jsx'
import EntryCreatorSheet from './EntryCreatorSheet.jsx'
import BookingsSection from './BookingsSection.jsx'
import { ENTRY_TYPES } from '../config/entryTypes.js'
import { useVisiblePlanEntries } from '../hooks/useVisiblePlanEntries.js'
import { useGithubSync } from '../hooks/useGithubSync.js'

// ─── View switcher tabs ──────────────────────────────────────────────────────

function ViewTabs({ view, onSet, tripDays, focusDayLabel }) {
  const tabs = [
    { id: 'full',  label: `${tripDays} Days` },
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
    const saved = await savePlanEntry(entry)
    addPlanEntry(saved)
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

// Small inline type badge with icon + label for FullTripView
function TypeBadge({ type }) {
  const def = ENTRY_TYPES[type]
  if (!def) return null
  return (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: def.accentColor + '18' }}
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke={def.accentColor}
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="w-3 h-3"
      >
        <path d={def.icon} />
      </svg>
      <span className="text-[9px] font-semibold" style={{ color: def.accentColor }}>{def.label}</span>
    </div>
  )
}

function FullTripView() {
  const { tripDays, formatDayLabel, getTodayDayNumber } = useTripConfig()
  const planEntries     = useVisiblePlanEntries()
  const setPlanFocusDay = useAppStore((s) => s.setPlanFocusDay)
  const setPlannerView  = useAppStore((s) => s.setPlannerView)
  const todayDay        = getTodayDayNumber()
  const days            = Array.from({ length: tripDays }, (_, i) => i + 1)
  const todayRef        = useRef(null)
  const plannedCount    = days.filter((d) => planEntries.some((e) => e.day === d)).length

  function handleDayPress(day) {
    setPlanFocusDay(day)
    setPlannerView('today')
  }

  function scrollToToday() {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto relative">
      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all"
            style={{ width: `${(plannedCount / tripDays) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {plannedCount}/{tripDays} days
        </span>
        {todayDay >= 1 && todayDay <= tripDays && (
          <button
            onClick={scrollToToday}
            className="text-[11px] font-semibold text-sky-500 whitespace-nowrap active:text-sky-600 px-2 py-1 rounded-lg active:bg-sky-50 dark:active:bg-sky-900/20"
          >
            Today
          </button>
        )}
      </div>
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
            ref={isToday ? todayRef : undefined}
            onClick={() => handleDayPress(day)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-left active:bg-gray-50 dark:active:bg-gray-800 transition-colors ${
              isToday
                ? 'bg-sky-50 dark:bg-sky-900/20'
                : !hasEntries ? 'opacity-60' : ''
            }`}
          >
            {/* Day number circle */}
            <div
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                isToday
                  ? 'bg-sky-500 text-white'
                  : hasEntries
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
              }`}
            >
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
  const allPlanEntries       = useAppStore((s) => s.planEntries)
  const planEntries          = useVisiblePlanEntries()
  const position             = useAppStore((s) => s.position)
  const locations            = useAppStore((s) => s.locations)
  const importedLocations    = useAppStore((s) => s.importedLocations)
  const removePlanEntry      = useAppStore((s) => s.removePlanEntry)
  const updatePlanEntryStore = useAppStore((s) => s.updatePlanEntry)
  const updateLocationStore  = useAppStore((s) => s.updateLocation)
  const travelMode           = useAppStore((s) => s.plannerTravelMode)
  const setPlannerTravelMode = useAppStore((s) => s.setPlannerTravelMode)
  const setRouteLines        = useAppStore((s) => s.setRouteLines)
  const clearRouteLines      = useAppStore((s) => s.clearRouteLines)
  const planFocusDay         = useAppStore((s) => s.planFocusDay)
  const setPlanFocusDay      = useAppStore((s) => s.setPlanFocusDay)
  const planRecapDay         = useAppStore((s) => s.planRecapDay)
  const planRecapMode        = useAppStore((s) => s.planRecapMode)
  const setPlanRecap         = useAppStore((s) => s.setPlanRecap)

  const [travelTimes, setTravelTimes]     = useState({})
  const [travelLoading, setTravelLoading] = useState(false)
  const [travelError, setTravelError]     = useState(null)
  const [entryCreatorOpen, setEntryCreatorOpen]   = useState(false)
  const [transitLegsOpen, setTransitLegsOpen]     = useState(false)
  const [editMode, setEditMode]                   = useState(false)
  const lastFetchPos = useRef(null)
  const inJapan      = position ? isInJapan(position) : true // default Japan for this trip
  const activeDay    = planFocusDay ?? 1

  // Default to single-day recap when entering TodayView or switching days
  useEffect(() => {
    setPlanRecap(activeDay, 'single')
  }, [activeDay, setPlanRecap])

  const todayEntries = planEntries
    .filter((e) => e.day === activeDay)
    .sort((a, b) => a.order - b.order)
  const todayEntryIds = todayEntries.map((e) => e.id).join(',')

  function navDay(delta) {
    const next = activeDay + delta
    if (next >= 1 && next <= tripDays) {
      setPlanFocusDay(next)
      lastFetchPos.current = null
      setTravelTimes({})
      setTravelError(null)
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
  }, [routesLib, position, travelMode, todayEntryIds, activeDay]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    await deletePlanEntry(id)
    removePlanEntry(id)
  }

  async function handleEdit(entry, updates) {
    const updated = {
      ...entry,
      ...updates,
      meta: updates.meta !== undefined ? updates.meta : entry.meta,
    }
    const saved = await dbUpdatePlanEntry(updated)
    updatePlanEntryStore(saved)

    // Sync description to the linked location so it appears in Map view search
    if (updates.note !== undefined && entry.locationId) {
      const loc = locations.find((l) => l.id === entry.locationId)
      if (loc) {
        const updatedLoc = { ...loc, description: updates.note || '' }
        const isImported = importedLocations.some((l) => l.id === entry.locationId)
        if (isImported) {
          await updateImportedLocation(updatedLoc)
        } else {
          await writeLocation(updatedLoc)
        }
        updateLocationStore(updatedLoc)
      }
    }
  }

  async function handleMoveToDay(entry, day) {
    if (day === entry.day) return
    const dayCount = allPlanEntries.filter((e) => e.day === day && !e.deletedAt).length
    const updated = { ...entry, day, order: dayCount + 1 }
    const saved = await dbUpdatePlanEntry(updated)
    updatePlanEntryStore(saved)
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
    const savedA = await dbUpdatePlanEntry(updA)
    const savedB = await dbUpdatePlanEntry(updB)
    updatePlanEntryStore(savedA)
    updatePlanEntryStore(savedB)
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Day {activeDay}
            </span>
            <button
              onClick={() => {
                if (planRecapMode === 'onward' && planRecapDay === activeDay) {
                  setPlanRecap(activeDay, 'single')
                } else {
                  setPlanRecap(activeDay, 'onward')
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors text-white shadow-md min-h-[32px]"
              style={{ backgroundColor: planRecapMode === 'onward' && planRecapDay === activeDay ? '#0ea5e9' : getDayColor(activeDay) }}
              aria-label={planRecapMode === 'onward' && planRecapDay === activeDay ? 'Showing all days from today onward' : 'Show this day route on map'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M3 6l3-3 3 3M6 3v12" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 18l-3 3-3-3M18 21V9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {planRecapMode === 'onward' && planRecapDay === activeDay
                ? `Day ${activeDay}+ onward`
                : `Day ${activeDay} route`}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center -mt-0.5">
            {formatDayLabel(activeDay)}
          </p>
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
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors min-h-[40px] inline-flex items-center justify-center gap-1.5 ${
                  travelMode === mode && !transitLegsOpen
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                }`}
                aria-label={mode === 'WALKING' ? 'Walking mode' : 'Driving mode'}
              >
                {mode === 'WALKING' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M13 4v3l-2 4-3 1v4l2 4M15 4a1 1 0 100-2 1 1 0 000 2zM12 18l-1 4M17 7l2 4h-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 17h14M5 17a2 2 0 01-2-2V9l2-4h14l2 4v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
                {mode === 'WALKING' ? 'Walk' : 'Drive'}
              </button>
            ))}
            <button
              onClick={() => handleModeSwitch('TRANSIT')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors min-h-[40px] inline-flex items-center justify-center gap-1.5 ${
                transitLegsOpen
                  ? 'border-purple-500 bg-purple-500 text-white'
                  : 'border-purple-400 text-purple-500 dark:text-purple-400 active:bg-purple-50 dark:active:bg-purple-900/30'
              }`}
              aria-label="Transit mode"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M8 6v12M4 10h8M18 12v6M15 15h6M12 6a4 4 0 018 0" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Transit
            </button>
            <button
              onClick={() => setEditMode((prev) => !prev)}
              className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors min-h-[40px] inline-flex items-center justify-center gap-1 ${
                editMode
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              aria-label={editMode ? 'Done reordering' : 'Reorder entries'}
            >
              {editMode ? 'Done' : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Edit
                </>
              )}
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
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {/* My Bookings (private entries) */}
          <BookingsSection dayNumber={activeDay} travelTimes={travelTimes} travelMode={travelMode} transitLegsOpen={transitLegsOpen} />

          {sharedEntries.length === 0 && todayEntries.filter((e) => e.owner === 'nirco').length === 0 && (
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
                onMoveToDay={(day) => handleMoveToDay(entry, day)}
                onEdit={(updates) => handleEdit(entry, updates)}
                onSwapUp={() => handleSwapOrder(entry, sharedEntries[idx - 1])}
                onSwapDown={() => handleSwapOrder(entry, sharedEntries[idx + 1])}
                isFirst={idx === 0}
                isLast={idx === sharedEntries.length - 1}
              />
            )
          })}

          {/* Add entry button */}
          <button
            onClick={() => setEntryCreatorOpen(true)}
            className="w-full py-3 text-sm font-medium text-violet-500 border border-dashed border-violet-300 dark:border-violet-700 rounded-xl active:bg-violet-50 dark:active:bg-violet-900/20"
          >
            + Entry (flight, hotel, train…)
          </button>
        </div>
      </div>

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

export default function PlannerOverlay({ onImportLink }) {
  const { tripDays }     = useTripConfig()
  const isPlannerOpen    = useAppStore((s) => s.isPlannerOpen)
  const setIsPlannerOpen = useAppStore((s) => s.setIsPlannerOpen)
  const plannerView      = useAppStore((s) => s.plannerView)
  const setPlannerView_  = useAppStore((s) => s.setPlannerView)
  const planFocusDay     = useAppStore((s) => s.planFocusDay)
  const setPlanRecap     = useAppStore((s) => s.setPlanRecap)
  const { triggerSync, status: ghStatus, configured: ghConfigured } = useGithubSync()

  // Clear recap when switching views
  function setPlannerView(v) { setPlanRecap(null, null); setPlannerView_(v) }

  // ── Drag-to-resize panel ────────────────────────────────────────────────────
  const PLANNER_SNAPS = [35, 65, 85]
  const [panelH, setPanelH] = useState(85)       // % of viewport
  const panelRef      = useRef(null)
  const dragging      = useRef(false)
  const didMove       = useRef(false)
  const rafRef        = useRef(null)
  const pendingPanelH = useRef(65)

  function snapPanelTo(rawH) {
    let closest = PLANNER_SNAPS[0]
    let minDist = Math.abs(rawH - closest)
    for (const sp of PLANNER_SNAPS) {
      const d = Math.abs(rawH - sp)
      if (d < minDist) { closest = sp; minDist = d }
    }
    return closest
  }

  // Stable move handler (all state via refs)
  const plannerMoveHandler = useCallback((e) => {
    if (!dragging.current) return
    didMove.current = true
    const available = window.innerHeight
    const newH = ((available - e.clientY) / available) * 100
    pendingPanelH.current = Math.min(90, Math.max(20, newH))
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setPanelH(pendingPanelH.current)
    })
  }, [])

  const plannerUpRef = useRef(null)
  const stablePlannerUp = useCallback((e) => plannerUpRef.current(e), [])

  plannerUpRef.current = () => {
    if (!dragging.current) return
    dragging.current = false
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    if (!didMove.current) {
      // Tap → cycle snap points
      setPanelH((h) => {
        const idx = PLANNER_SNAPS.indexOf(snapPanelTo(h))
        return PLANNER_SNAPS[(idx + 1) % PLANNER_SNAPS.length]
      })
    } else {
      setPanelH((h) => snapPanelTo(h))
    }

    didMove.current = false
    // Enable transition for the snap animation, then restore touch action
    if (panelRef.current) panelRef.current.style.transition = 'height 200ms ease-out'
    if (panelRef.current) panelRef.current.style.touchAction = ''
    window.removeEventListener('pointermove',   plannerMoveHandler)
    window.removeEventListener('pointerup',     stablePlannerUp)
    window.removeEventListener('pointercancel', stablePlannerUp)
  }

  const handleDragPointerDown = useCallback((e) => {
    dragging.current = true
    didMove.current  = false
    e.preventDefault()
    e.stopPropagation()
    // Disable transition so panel follows finger instantly during drag
    if (panelRef.current) panelRef.current.style.transition = 'none'
    if (panelRef.current) panelRef.current.style.touchAction = 'none'
    window.addEventListener('pointermove',   plannerMoveHandler)
    window.addEventListener('pointerup',     stablePlannerUp)
    window.addEventListener('pointercancel', stablePlannerUp)
  }, [plannerMoveHandler, stablePlannerUp])

  useEffect(() => () => {
    window.removeEventListener('pointermove',   plannerMoveHandler)
    window.removeEventListener('pointerup',     stablePlannerUp)
    window.removeEventListener('pointercancel', stablePlannerUp)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [plannerMoveHandler, stablePlannerUp])
  // ────────────────────────────────────────────────────────────────────────────

  if (!isPlannerOpen) return null

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
      style={{
        height: `${panelH}dvh`,
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Drag handle — 48px hit target, tap cycles snap points */}
      <div
        className="relative flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl z-10 select-none"
        style={{ height: 48, cursor: 'row-resize', touchAction: 'none', flexShrink: 0 }}
        onPointerDown={handleDragPointerDown}
      >
        <div className="w-10 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
        <div className="w-6 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => { setPlanRecap(null, null); setIsPlannerOpen(false) }}
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
        {ghConfigured && (
          <button
            onClick={triggerSync}
            disabled={ghStatus === 'syncing'}
            className={`p-1.5 rounded-lg active:bg-gray-100 dark:active:bg-gray-800 ${
              ghStatus === 'success' ? 'text-emerald-500'
                : ghStatus === 'error' ? 'text-red-500'
                : 'text-emerald-500'
            }`}
            aria-label="Sync plan entries"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-5 h-5 ${ghStatus === 'syncing' ? 'animate-spin' : ''}`}
            >
              <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {onImportLink && (
          <button
            onClick={onImportLink}
            className="p-1.5 -mr-1.5 rounded-lg text-sky-500 active:bg-gray-100 dark:active:bg-gray-800"
            aria-label="Import Google Maps link"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* View tabs */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <ViewTabs view={plannerView} onSet={setPlannerView} tripDays={tripDays} focusDayLabel={planFocusDay ? `Day ${planFocusDay}` : 'Day'} />
      </div>

      {/* Content */}
      {plannerView === 'full'  && <FullTripView />}
      {plannerView === 'today' && <TodayView />}
    </div>
  )
}
