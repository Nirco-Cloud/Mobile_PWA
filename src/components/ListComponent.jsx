import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { set as idbSet } from 'idb-keyval'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../store/appStore.js'
import { ALL_CATEGORY_KEYS } from '../config/categories.js'
import { haversine } from '../utils/haversine.js'
import LocationRow from './LocationRow.jsx'
import SkeletonList from './SkeletonList.jsx'

// ── Chip groups — each merges related category keys into one chip ─────────────
const CHIP_GROUPS = [
  { id: 'izakaya',    label: 'Izakaya',     keys: ['Izakaya'],                                         color: '#f59e0b' },
  { id: 'ramen',      label: 'Ramen',       keys: ['Ramen'],                                           color: '#ef4444' },
  { id: 'sushi',      label: 'Sushi',       keys: ['סושי יקר ומוקפד', 'סושי עממי ולא יקר'],           color: '#14b8a6' },
  { id: 'finedining', label: 'Fine Dining', keys: ['מסעדות גבוהות / הזמנה'],                          color: '#8b5cf6' },
  { id: 'street',     label: 'Street Food', keys: ['מסעדות ואוכל רחוב'],                              color: '#f97316' },
  { id: 'cafe',       label: 'Cafe',        keys: ['קפה/תה/אלכוהול'],                                  color: '#ec4899' },
  { id: 'snacks',     label: 'Snacks',      keys: ['חטיפים ומלוחים'],                                  color: '#eab308' },
  { id: 'shopping',   label: 'Shopping',    keys: ['חנויות'],                                          color: '#10b981' },
  { id: 'sights',     label: 'Attractions', keys: ['איזורים ואתרים', 'location', 'activity'],          color: '#3b82f6' },
  { id: 'hotels',     label: 'Hotels',      keys: ['hotel'],                                           color: '#6366f1' },
  { id: 'other',      label: 'Other',       keys: ['train'],                                           color: '#6b7280' },
]

export default function ListComponent() {
  const locations           = useAppStore((s) => s.locations)
  const syncStatus          = useAppStore((s) => s.syncStatus)
  const position            = useAppStore((s) => s.position)
  const selectedLocationId  = useAppStore((s) => s.selectedLocationId)
  const activeCategories    = useAppStore((s) => s.activeCategories)
  const setActiveCategories = useAppStore((s) => s.setActiveCategories)
  const [query, setQuery]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const containerRef        = useRef(null)

  // Stable ref to sorted list — used inside subscription without stale closure
  const sortedLocationsRef  = useRef([])

  const isAllActive = activeCategories.length === ALL_CATEGORY_KEYS.length

  // Persist filter to IDB on every change (survives crash/restart)
  useEffect(() => {
    idbSet('activeCategories', activeCategories)
  }, [activeCategories])

  function handleChipToggle(group) {
    let next
    if (isAllActive) {
      next = group.keys.filter((k) => ALL_CATEGORY_KEYS.includes(k))
    } else {
      const allOn = group.keys.every((k) => activeCategories.includes(k))
      if (allOn) {
        next = activeCategories.filter((k) => !group.keys.includes(k))
      } else {
        next = [...new Set([...activeCategories, ...group.keys])]
      }
    }
    setActiveCategories(next)
  }

  // Filter + sort
  const sortedLocations = useMemo(() => {
    let list = locations.filter((l) => activeCategories.includes(l.category))
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
        .map((l) => ({ ...l, _dist: haversine(position.lat, position.lng, l.lat, l.lng) }))
        .sort((a, b) => a._dist - b._dist)
    }
    return list
  }, [locations, position, query, activeCategories])

  // Keep stable ref in sync
  useEffect(() => {
    sortedLocationsRef.current = sortedLocations
  }, [sortedLocations])

  // Virtual list — dynamic row height (handles expanded rows automatically)
  const virtualizer = useVirtualizer({
    count: sortedLocations.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 56,
    overscan: 5,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 56,
  })

  // Map → list sync: expand + scroll to selected row
  useEffect(() => {
    const unsub = useAppStore.subscribe(
      (s) => ({ id: s.selectedLocationId, source: s.selectionSource }),
      ({ id, source }) => {
        if (source !== 'map' || !id) return
        setExpandedId(id)
        const idx = sortedLocationsRef.current.findIndex((l) => l.id === id)
        if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'start' })
      },
      { equalityFn: (a, b) => a.id === b.id && a.source === b.source },
    )
    return unsub
  }, [virtualizer])

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">

      {/* Search bar */}
      <div className="sticky top-0 z-10 px-3 pt-2 pb-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <input
          type="search"
          placeholder="Search locations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2.5 text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Category chips */}
      <div
        className="flex gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}
      >
        {/* All chip */}
        <button
          onClick={() => setActiveCategories(ALL_CATEGORY_KEYS)}
          className={`shrink-0 px-3 py-1.5 min-h-[44px] rounded-full text-sm font-semibold border transition-colors ${
            isAllActive
              ? 'bg-sky-500 text-white border-sky-500'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
          }`}
        >
          All
        </button>

        {CHIP_GROUPS.map((group) => {
          const isActive = group.keys.every((k) => activeCategories.includes(k))
          return (
            <button
              key={group.id}
              onClick={() => handleChipToggle(group)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-sm font-semibold border transition-colors"
              style={
                isActive
                  ? { backgroundColor: group.color, borderColor: group.color, color: '#fff' }
                  : { backgroundColor: 'transparent', borderColor: '#d1d5db', color: '#6b7280' }
              }
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
              )}
              {group.label}
            </button>
          )
        })}
      </div>

      {/* Virtual list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain">
        {locations.length === 0 && syncStatus === 'syncing' && <SkeletonList />}
        {locations.length > 0 && sortedLocations.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            No locations found
          </p>
        )}
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const loc = sortedLocations[virtualRow.index]
            return (
              <div
                key={loc.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{ position: 'absolute', top: virtualRow.start, left: 0, right: 0 }}
              >
                <LocationRow
                  location={loc}
                  distance={loc._dist}
                  isSelected={selectedLocationId === loc.id}
                  isExpanded={expandedId === loc.id}
                  onToggle={handleToggle}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
