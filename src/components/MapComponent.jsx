import { useEffect, useRef, useState, useCallback, Fragment } from 'react'
import { Map, useMap, useApiIsLoaded, AdvancedMarker } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import MapMarker from './MapMarker.jsx'
import { getRouteColor, getDayColor } from '../config/routeColors.js'
import { useVisiblePlanEntries } from '../hooks/useVisiblePlanEntries.js'
import { getCategoryIcon } from '../config/categories.js'
import { ENTRY_TYPES } from '../config/entryTypes.js'

// Return the category icon URL for a plan entry (via its linked location)
function getEntryIconSrc(entry, locations) {
  if (!entry.locationId) return null
  const loc = locations.find((l) => l.id === entry.locationId)
  return loc ? getCategoryIcon(loc.category) : null
}

// Renders the icon content (img or SVG) for a plan marker
function PlanMarkerIcon({ entry, locations, size = 16 }) {
  const iconSrc = getEntryIconSrc(entry, locations)
  if (iconSrc) {
    return <img src={iconSrc} style={{ width: size, height: size }} alt="" />
  }
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ width: size - 2, height: size - 2 }}>
      <path d={typeDef.icon} />
    </svg>
  )
}

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
  const planRecapDay  = useAppStore((s) => s.planRecapDay)
  const planRecapMode = useAppStore((s) => s.planRecapMode)
  const planEntries   = useVisiblePlanEntries()
  const userHasPanned = useRef(false)

  // Fit map to planned stops when planner opens or focused day changes
  useEffect(() => {
    if (!map || !isPlannerOpen) return
    let stops
    if (planRecapDay !== null && planRecapMode === 'single') {
      stops = planEntries.filter((e) => e.day === planRecapDay && e.lat != null && e.lng != null)
    } else if (planRecapDay !== null) {
      stops = planEntries.filter((e) => e.day >= planRecapDay && e.lat != null && e.lng != null)
    } else if (plannerView === 'full') {
      stops = planEntries.filter((e) => e.lat != null && e.lng != null)
    } else {
      stops = planEntries.filter((e) => e.day === (planFocusDay ?? 1) && e.lat != null && e.lng != null)
    }
    if (stops.length === 0) return
    if (stops.length === 1) {
      map.panTo({ lat: stops[0].lat, lng: stops[0].lng })
      if (map.getZoom() < 15) map.setZoom(15)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
    map.fitBounds(bounds, { top: 20, bottom: 20, left: 20, right: 20 })
  }, [map, isPlannerOpen, planFocusDay, plannerView, planEntries, planRecapDay, planRecapMode])

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
  const map                  = useMap()
  const isPlannerOpen        = useAppStore((s) => s.isPlannerOpen)
  const plannerView          = useAppStore((s) => s.plannerView)
  const planEntries          = useVisiblePlanEntries()
  const routeLines           = useAppStore((s) => s.routeLines)
  const planFocusDay         = useAppStore((s) => s.planFocusDay)
  const showConnectors       = useAppStore((s) => s.showTripConnectors)
  const position             = useAppStore((s) => s.position)
  const planRecapDay         = useAppStore((s) => s.planRecapDay)
  const planRecapMode        = useAppStore((s) => s.planRecapMode)
  const locations            = useAppStore((s) => s.locations)
  const setPlannerPanelH     = useAppStore((s) => s.setPlannerPanelH)
  const setPlanFocusEntryId  = useAppStore((s) => s.setPlanFocusEntryId)
  const planFocusEntryId     = useAppStore((s) => s.planFocusEntryId)

  function handleMarkerClick(entry) {
    setPlannerPanelH(85)
    setPlanFocusEntryId(entry.id)
  }
  const dayPolysRef    = useRef([])
  const seqPolyRef     = useRef(null)
  const routePolysRef  = useRef([])

  const active     = isPlannerOpen
  const isDayView  = plannerView === 'today'
  const displayDay = planFocusDay ?? 1
  const recapActive = planRecapDay !== null

  // Build day groups for multi-day views (full/3day) OR recap mode from any view
  function buildDayGroups() {
    const withCoords = planEntries.filter((e) => e.lat != null && e.lng != null)
    const grouped = {}
    withCoords.forEach((e) => {
      if (!grouped[e.day]) grouped[e.day] = []
      grouped[e.day].push(e)
    })
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order))
    let days = Object.keys(grouped).map(Number).sort((a, b) => a - b)
    // Recap filtering
    if (recapActive) {
      if (planRecapMode === 'single') {
        // "D9 Route" — only this day
        days = days.filter((d) => d === planRecapDay)
      } else {
        // "D9+ On Map" — from selected day onward
        days = days.filter((d) => d >= planRecapDay)
      }
    }
    return days.map((d) => ({ day: d, stops: grouped[d] }))
  }

  // Today view: single focused day stops (only when recap is NOT active)
  const showTodayView = isDayView && !recapActive
  const todayStops = showTodayView ? planEntries
    .filter((e) => e.day === displayDay && e.lat != null && e.lng != null)
    .sort((a, b) => a.order - b.order) : []

  // Multi-day groups: active for full/3day views OR when recap toggle is on
  const showMultiDay = !isDayView || recapActive
  const dayGroups = showMultiDay ? buildDayGroups() : []

  const todayKey  = todayStops.map((e) => `${e.id}:${e.lat}:${e.lng}`).join('|')
  const routeKey  = routeLines.map((r) => `${r.entryId}:${r.path.length}`).join('|')
  const multiKey  = dayGroups.map((g) => `${g.day}:${g.stops.length}`).join('|')

  // Multi-day solid polylines — chain across days (prev day's last stop → this day's stops)
  useEffect(() => {
    dayPolysRef.current.forEach((p) => p.setMap(null))
    dayPolysRef.current = []
    if (!map || !active || !showMultiDay || dayGroups.length === 0) return
    if (!window.google?.maps?.Polyline) return

    const polys = []
    let prevLastStop = null
    for (const g of dayGroups) {
      const path = []
      if (prevLastStop) path.push({ lat: prevLastStop.lat, lng: prevLastStop.lng })
      g.stops.forEach((e) => path.push({ lat: e.lat, lng: e.lng }))
      if (path.length >= 2) {
        const pl = new window.google.maps.Polyline({
          path, geodesic: true,
          strokeColor: getDayColor(g.day), strokeOpacity: 0.8, strokeWeight: 3,
        })
        pl.setMap(map)
        polys.push(pl)
      }
      prevLastStop = g.stops[g.stops.length - 1]
    }
    dayPolysRef.current = polys
    return () => { polys.forEach((p) => p.setMap(null)); dayPolysRef.current = [] }
  }, [map, active, showMultiDay, multiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Today view: dashed red connector from GPS to stops (hidden during recap)
  useEffect(() => {
    if (seqPolyRef.current) { seqPolyRef.current.setMap(null); seqPolyRef.current = null }
    if (!map || !active || !showTodayView || !showConnectors || todayStops.length === 0) return
    if (!window.google?.maps?.Polyline) return
    if (!position && todayStops.length < 2) return

    const path = [
      ...(position ? [{ lat: position.lat, lng: position.lng }] : []),
      ...todayStops.map((e) => ({ lat: e.lat, lng: e.lng })),
    ]
    if (path.length < 2) return

    const dashSymbol = { path: 'M 0,-1 0,1', strokeOpacity: 0.75, scale: 2.4 }
    const polyline = new window.google.maps.Polyline({
      path, geodesic: true, map, strokeOpacity: 0, strokeWeight: 2.4,
      icons: [{ icon: dashSymbol, offset: '0', repeat: '12px' }], strokeColor: '#ef4444',
    })
    seqPolyRef.current = polyline
    return () => { polyline.setMap(null); seqPolyRef.current = null }
  }, [map, active, showTodayView, showConnectors, todayKey, position]) // eslint-disable-line react-hooks/exhaustive-deps

  // Today view: colored route polylines from Google Directions API (hidden during recap)
  useEffect(() => {
    routePolysRef.current.forEach((p) => p.setMap(null))
    routePolysRef.current = []
    if (!map || !active || !showTodayView || routeLines.length === 0) return
    if (!window.google?.maps?.Polyline) return

    const polys = routeLines.map((route) =>
      new window.google.maps.Polyline({
        path: route.path, geodesic: true, map,
        strokeColor: route.color, strokeOpacity: 0.8, strokeWeight: 4,
      })
    )
    routePolysRef.current = polys
    return () => { polys.forEach((p) => p.setMap(null)); routePolysRef.current = [] }
  }, [map, active, showTodayView, routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null

  return (
    <>
      {/* === MULTI-DAY (Big Picture or Recap from day N onward) === */}
      {showMultiDay && dayGroups.map((group) => {
        const color = getDayColor(group.day)
        return (
          <Fragment key={`day-${group.day}`}>
            {group.stops.map((entry, idx) => {
              const isFirst = idx === 0
              const seqNum  = idx + 1
              const isHL    = entry.id === planFocusEntryId
              const ringSize = isFirst ? 34 : 28
              const iconSize = isFirst ? 18 : 15
              return (
                <AdvancedMarker
                  key={entry.id}
                  position={{ lat: entry.lat, lng: entry.lng }}
                  onClick={() => handleMarkerClick(entry)}
                >
                  <div style={{ position: 'relative', cursor: 'pointer' }}>
                    {/* Main ring */}
                    <div style={{
                      width: ringSize, height: ringSize, borderRadius: '50%',
                      border: '2.5px solid white', backgroundColor: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isHL
                        ? `0 0 0 3px ${color}90, 0 0 10px ${color}70`
                        : '0 2px 6px rgba(0,0,0,0.35)',
                    }}>
                      <PlanMarkerIcon entry={entry} locations={locations} size={iconSize} />
                    </div>
                    {/* D# badge — first stop of this day only */}
                    {isFirst && (
                      <div style={{
                        position: 'absolute', top: -7, left: -5,
                        backgroundColor: color, border: '1.5px solid white',
                        borderRadius: 5, padding: '1px 4px',
                        fontSize: 9, fontWeight: 'bold', color: 'white',
                        lineHeight: 1.2, whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}>
                        D{group.day}
                      </div>
                    )}
                    {/* Sequence number badge */}
                    <div style={{
                      position: 'absolute', bottom: -5, right: -5,
                      backgroundColor: 'white', border: `1.5px solid ${color}`,
                      borderRadius: 5, padding: '0 3px',
                      fontSize: 8, fontWeight: 'bold', color,
                      lineHeight: 1.5, minWidth: 12, textAlign: 'center',
                    }}>
                      {seqNum}
                    </div>
                  </div>
                </AdvancedMarker>
              )
            })}
          </Fragment>
        )
      })}

      {/* === TODAY VIEW (single day, hidden during recap) === */}
      {showTodayView && (
        <>
          {/* GPS origin dot */}
          {position && todayStops.length > 0 && (
            <AdvancedMarker key="origin-0" position={{ lat: position.lat, lng: position.lng }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2.5px solid white', backgroundColor: '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
              }}>
                <span style={{ color: 'white', fontSize: 11, fontWeight: 'bold', lineHeight: 1 }}>0</span>
              </div>
            </AdvancedMarker>
          )}
          {todayStops.map((entry, idx) => {
            const bgColor = getRouteColor(idx)
            const isHL    = entry.id === planFocusEntryId
            return (
              <AdvancedMarker
                key={entry.id}
                position={{ lat: entry.lat, lng: entry.lng }}
                onClick={() => handleMarkerClick(entry)}
              >
                <div style={{ position: 'relative', cursor: 'pointer' }}>
                  {/* Main ring */}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '2.5px solid white', backgroundColor: bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isHL
                      ? `0 0 0 3px ${bgColor}90, 0 0 10px ${bgColor}70`
                      : '0 2px 5px rgba(0,0,0,0.3)',
                  }}>
                    <PlanMarkerIcon entry={entry} locations={locations} size={16} />
                  </div>
                  {/* Sequence number badge */}
                  <div style={{
                    position: 'absolute', bottom: -5, right: -5,
                    backgroundColor: 'white', border: `1.5px solid ${bgColor}`,
                    borderRadius: 5, padding: '0 3px',
                    fontSize: 8, fontWeight: 'bold', color: bgColor,
                    lineHeight: 1.5, minWidth: 12, textAlign: 'center',
                  }}>
                    {idx + 1}
                  </div>
                </div>
              </AdvancedMarker>
            )
          })}
        </>
      )}
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
