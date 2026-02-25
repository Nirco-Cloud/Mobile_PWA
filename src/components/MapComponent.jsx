import { useEffect, useRef, useState, useCallback } from 'react'
import { Map, useMap, useApiIsLoaded } from '@vis.gl/react-google-maps'
import { useAppStore } from '../store/appStore.js'
import MapMarker from './MapMarker.jsx'

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
  const map = useMap()
  const position = useAppStore((s) => s.position)
  const userHasPanned = useRef(false)

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

export default function MapComponent() {
  const allLocations = useAppStore((s) => s.locations)
  const activeCategories = useAppStore((s) => s.activeCategories)
  const locations = allLocations.filter((l) => activeCategories.includes(l.category))
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
