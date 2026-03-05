import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { set as idbSet } from 'idb-keyval'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../store/appStore.js'
import { CATEGORIES, ALL_CATEGORY_KEYS } from '../config/categories.js'
import { haversine } from '../utils/haversine.js'
import { getPOIsForStay } from '../config/stays.js'
import LocationRow from './LocationRow.jsx'
import SkeletonList from './SkeletonList.jsx'

// ── Chip groups — one chip per category, order mirrors categories.js ──────────
const CHIP_GROUPS = CATEGORIES.map((c) => ({
  id:    c.key,
  label: c.label,
  keys:  [c.key],
  color: c.color,
}))

export default function ListComponent() {
  const locations           = useAppStore((s) => s.locations)
  const syncStatus          = useAppStore((s) => s.syncStatus)
  const position            = useAppStore((s) => s.position)
  const selectedLocationId  = useAppStore((s) => s.selectedLocationId)
  const activeCategories    = useAppStore((s) => s.activeCategories)
  const setActiveCategories = useAppStore((s) => s.setActiveCategories)
  const selectedStay        = useAppStore((s) => s.selectedStay)
  const mapFilter           = useAppStore((s) => s.mapFilter)
  const userPois            = useAppStore((s) => s.userPois)
  const favorites           = useAppStore((s) => s.favorites)
  const [query, setQuery]   = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
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
    // 1. Stay-based filter
    let list = getPOIsForStay(selectedStay, locations, locations)

    // 2. Map filter mode (mutually exclusive, mirrors MapComponent)
    if (mapFilter === 'walking' && position) {
      list = list.filter((l) => {
        if (l.lat == null || l.lng == null) return false
        return haversine(l.lat, l.lng, position.lat, position.lng) <= 1500
      })
    } else if (mapFilter === 'hotels') {
      list = list.filter((l) => l.category === 'Hotel')
    }

    // 3. Category filter
    list = list.filter((l) => activeCategories.includes(l.category))

    // 4. Favorites filter
    if (showFavoritesOnly) {
      list = list.filter((l) => favorites.has(l.id))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q)),
      )
    }
    // Merge user-added POIs (always included, filtered by query + favorites)
    const userPoisFiltered = userPois
      .filter((p) => {
        if (showFavoritesOnly && !favorites.has(p.id)) return false
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q)) ||
          (p.address && p.address.toLowerCase().includes(q))
        )
      })
      .map((p) => ({ ...p, isUserPoi: true }))

    const combined = [...list, ...userPoisFiltered]

    if (position) {
      return combined
        .map((l) => ({ ...l, _dist: l.lat != null ? haversine(position.lat, position.lng, l.lat, l.lng) : Infinity }))
        .sort((a, b) => a._dist - b._dist)
    }
    return combined
  }, [locations, position, query, activeCategories, selectedStay, mapFilter, userPois, showFavoritesOnly, favorites])

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
          onClick={() => { setActiveCategories(ALL_CATEGORY_KEYS); setShowFavoritesOnly(false) }}
          className={`shrink-0 px-3 py-1.5 min-h-[44px] rounded-full text-sm font-semibold border transition-colors ${
            isAllActive && !showFavoritesOnly
              ? 'bg-sky-500 text-white border-sky-500'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
          }`}
        >
          All
        </button>

        {/* Favorites chip */}
        {favorites.size > 0 && (
          <button
            onClick={() => setShowFavoritesOnly((v) => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-sm font-semibold border transition-colors"
            style={
              showFavoritesOnly
                ? { backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                : { backgroundColor: 'transparent', borderColor: '#d1d5db', color: '#6b7280' }
            }
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={showFavoritesOnly ? '#fff' : '#ef4444'} stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Favorites
          </button>
        )}

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
