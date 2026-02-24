import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/appStore.js'
import { haversine } from '../utils/haversine.js'
import LocationRow from './LocationRow.jsx'

export default function ListComponent() {
  const locations = useAppStore((s) => s.locations)
  const position = useAppStore((s) => s.position)
  const activeCategories = useAppStore((s) => s.activeCategories)
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const rowRefs = useRef({})
  const containerRef = useRef(null)

  // Filter + sort
  const sortedLocations = useMemo(() => {
    let list = locations.filter(
      (l) => activeCategories.includes(l.category),
    )
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)),
      )
    }
    if (position) {
      list = list
        .map((l) => ({
          ...l,
          _dist: haversine(position.lat, position.lng, l.lat, l.lng),
        }))
        .sort((a, b) => a._dist - b._dist)
    }
    return list
  }, [locations, position, query, activeCategories])

  // Scroll to selected row when selection comes from the map
  useEffect(() => {
    const unsub = useAppStore.subscribe(
      (s) => ({ id: s.selectedLocationId, source: s.selectionSource }),
      ({ id, source }) => {
        if (source !== 'map' || !id) return
        setExpandedId(id)
        const el = rowRefs.current[id]
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      },
      { equalityFn: (a, b) => a.id === b.id && a.source === b.source },
    )
    return unsub
  }, [])

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Search bar */}
      <div className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <input
          type="search"
          placeholder="Search locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {sortedLocations.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-600 mt-8">
            No locations found
          </p>
        )}
        {sortedLocations.map((loc) => {
          const selectedId = useAppStore.getState().selectedLocationId
          return (
            <LocationRow
              key={loc.id}
              ref={(el) => {
                if (el) rowRefs.current[loc.id] = el
                else delete rowRefs.current[loc.id]
              }}
              location={loc}
              distance={loc._dist}
              isSelected={selectedId === loc.id}
              isExpanded={expandedId === loc.id}
              onToggle={handleToggle}
            />
          )
        })}
      </div>
    </div>
  )
}
