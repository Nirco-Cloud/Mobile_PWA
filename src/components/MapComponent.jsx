import { useEffect, useRef, useState, useCallback } from 'react'
import { Map, useMap, useApiIsLoaded, AdvancedMarker } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import MapMarker from './MapMarker.jsx'
import { useTripConfig } from '../hooks/useTripConfig.js'
import { getRouteColor } from '../config/routeColors.js'

const DEFAULT_ZOOM = 12

function MapMarkers({ locations, selectedLocationId }) {
  const map = useMap()
  if (!map) return null
  return locations.map((loc) => (
    <MapMarker
      key={loc.id}
      location={loc}
      isSelected={selectedLocationId === loc.id}
    />
  ))
}

function MapController() {
  const map           = useMap()
  const position      = useAppStore((s) => s.position)
  const isPlannerOpen = useAppStore((s) => s.isPlannerOpen)
  const planFocusDay  = useAppStore((s) => s.planFocusDay)
  const plannerView   = useAppStore((s) => s.plannerView)
  const planEntries   = useAppStore((s) => s.planEntries)
  const { getTodayDayNumber } = useTripConfig()
  const userHasPanned = useRef(false)

  // Fit map to planned stops when planner opens or focused day changes
  useEffect(() => {
    if (!map || !isPlannerOpen) return
    const todayDay   = getTodayDayNumber()
    const displayDay = plannerView === 'today' ? (todayDay ?? planFocusDay) : planFocusDay
    const stops      = planEntries.filter(
      (e) => e.day === displayDay && e.lat != null && e.lng != null,
    )
    if (stops.length === 0) return
    if (stops.length === 1) {
      map.panTo({ lat: stops[0].lat, lng: stops[0].lng })
      if (map.getZoom() < 15) map.setZoom(15)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
    map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 })
  }, [map, isPlannerOpen, planFocusDay, plannerView, planEntries, getTodayDayNumber])

  // Auto-center when position updates (unless user has panned)
  useEffect(() => {
    if (!map || !position || userHasPanned.current) return
    map.panTo(position)
  }, [map, position])

  // Pan to selected location when selection comes from list
  useEffect(() => {
    if (!map) return
    const unsub = useAppStore.subscribe(
      (s) => ({ id: s.selectedLocationId, source: s.selectionSource }),
      ({ id, source }) => {
        if (source !== 'list' || !id) return
        const loc = useAppStore.getState().locations.find((l) => l.id === id)
        if (loc) {
          map.panTo({ lat: loc.lat, lng: loc.lng })
          if (map.getZoom() < 17) map.setZoom(17)
        }
      },
      { equalityFn: (a, b) => a.id === b.id && a.source === b.source },
    )
    return unsub
  }, [map])

  // Detect user pan
  useEffect(() => {
    if (!map) return
    const listener = map.addListener('dragstart', () => {
      userHasPanned.current = true
    })
    return () => listener.remove()
  }, [map])

  return null
}

function PlanMapLayer() {
  const map           = useMap()
  const isPlannerOpen = useAppStore((s) => s.isPlannerOpen)
  const plannerView   = useAppStore((s) => s.plannerView)
  const planEntries   = useAppStore((s) => s.planEntries)
  const routeLines    = useAppStore((s) => s.routeLines)
  const { getTodayDayNumber } = useTripConfig()
  const planFocusDay  = useAppStore((s) => s.planFocusDay)
  const showConnectors = useAppStore((s) => s.showTripConnectors)
  const position      = useAppStore((s) => s.position)
  const seqPolyRef    = useRef(null)      // red connector polyline (all views)
  const routePolysRef = useRef([])         // colored route polylines (today view)

  const active     = isPlannerOpen
  const todayDay   = getTodayDayNumber()
  const isToday    = plannerView === 'today'
  const displayDay = isToday ? (todayDay ?? planFocusDay) : planFocusDay

  const stops = planEntries
    .filter((e) => e.day === displayDay && e.lat != null && e.lng != null)
    .sort((a, b) => a.order - b.order)
  const stopsKey = stops.map((e) => `${e.id}:${e.lat}:${e.lng}`).join('|')
  const routeKey = routeLines.map((r) => `${r.entryId}:${r.path.length}`).join('|')

  // Red connector lines between stops (all planner views)
  useEffect(() => {
    if (seqPolyRef.current) {
      seqPolyRef.current.setMap(null)
      seqPolyRef.current = null
    }
    if (!map || !active || !showConnectors || stops.length === 0) return
    if (!position && stops.length < 2) return

    const path = [
      ...(position ? [{ lat: position.lat, lng: position.lng }] : []),
      ...stops.map((e) => ({ lat: e.lat, lng: e.lng })),
    ]
    if (path.length < 2) return

    const dashSymbol = { path: 'M 0,-1 0,1', strokeOpacity: 0.75, scale: 2.4 }
    const polyline = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeOpacity: 0,
      strokeWeight: 2.4,
      icons: [{ icon: dashSymbol, offset: '0', repeat: '12px' }],
      strokeColor: '#ef4444',
    })
    polyline.setMap(map)
    seqPolyRef.current = polyline

    return () => {
      polyline.setMap(null)
      seqPolyRef.current = null
    }
  }, [map, active, showConnectors, stopsKey, position]) // eslint-disable-line react-hooks/exhaustive-deps

  // Colored route polylines for today view
  useEffect(() => {
    // Clean up previous route polylines
    routePolysRef.current.forEach((p) => p.setMap(null))
    routePolysRef.current = []

    if (!map || !active || !isToday || routeLines.length === 0) return

    const polys = routeLines.map((route) => {
      const polyline = new window.google.maps.Polyline({
        path: route.path,
        geodesic: true,
        strokeColor: route.color,
        strokeOpacity: 0.8,
        strokeWeight: 4,
      })
      polyline.setMap(map)
      return polyline
    })
    routePolysRef.current = polys

    return () => {
      polys.forEach((p) => p.setMap(null))
      routePolysRef.current = []
    }
  }, [map, active, isToday, routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null

  return (
    <>
      {/* Starting point marker (0) at GPS position */}
      {position && stops.length > 0 && (
        <AdvancedMarker
          key="origin-0"
          position={{ lat: position.lat, lng: position.lng }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: '#6b7280' }}
          >
            <span className="text-white text-xs font-bold leading-none">0</span>
          </div>
        </AdvancedMarker>
      )}
      {stops.map((entry, idx) => {
        const bgColor = isToday ? getRouteColor(idx) : '#0ea5e9'
        return (
          <AdvancedMarker
            key={entry.id}
            position={{ lat: entry.lat, lng: entry.lng }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: bgColor }}
            >
              <span className="text-white text-xs font-bold leading-none">{idx + 1}</span>
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}

export default function MapComponent() {
  const allLocations = useAppStore((s) => s.locations)
  const activeCategories = useAppStore((s) => s.activeCategories)
  const isPlannerOpen = useAppStore((s) => s.isPlannerOpen)
  const locations = isPlannerOpen
    ? []
    : allLocations.filter((l) => activeCategories.includes(l.category))
  const position = useAppStore((s) => s.position)
  const selectedLocationId = useAppStore((s) => s.selectedLocationId)
  const [mapReady, setMapReady] = useState(false)
  const setSelection = useAppStore((s) => s.setSelection)

  const handleRecenter = useCallback(() => {}, [])

  const initialCenter = position ?? { lat: 35.6762, lng: 139.6503 } // Tokyo default

  return (
    <div className="relative w-full h-full">
      <Map
        defaultCenter={initialCenter}
        defaultZoom={DEFAULT_ZOOM}
        mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
        disableDefaultUI
        gestureHandling="greedy"
        className="w-full h-full"
        onClick={() => setSelection(null, null)}
        onIdle={() => setMapReady(true)}
      >
        <MapController />
        {mapReady && (
          <MapMarkers locations={locations} selectedLocationId={selectedLocationId} />
        )}
        {mapReady && <PlanMapLayer />}
      </Map>

      {/* Re-center FAB */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-sky-500 active:scale-95 transition-transform"
        aria-label="Re-center on my location"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/>
        </svg>
      </button>
    </div>
  )
}
