import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { ALL_CATEGORY_KEYS } from '../config/categories.js'
import { DEFAULT_TRIP_START, DEFAULT_TRIP_END } from '../config/trip.js'

export const useAppStore = create(
  subscribeWithSelector((set) => ({
    // GPS
    position: null,
    setPosition: (position) => set({ position }),

    // Battery
    batteryLevel: 1,
    setBatteryLevel: (batteryLevel) => set({ batteryLevel }),

    // GPS poll interval (ms)
    pollInterval: 15000,
    setPollInterval: (pollInterval) => set({ pollInterval }),

    // Map ↔ List selection sync
    selectedLocationId: null,
    selectionSource: null, // 'map' | 'list' | null
    setSelection: (id, source) =>
      set({ selectedLocationId: id, selectionSource: source }),
    clearSelection: () =>
      set({ selectedLocationId: null, selectionSource: null }),

    // Dark mode
    isDark: false,
    setIsDark: (isDark) => set({ isDark }),

    // Location data
    locations: [],
    setLocations: (locations) => set({ locations }),

    // Sync status: 'idle' | 'syncing' | 'done' | 'error'
    syncStatus: 'idle',
    setSyncStatus: (syncStatus) => set({ syncStatus }),

    // Demo mode (GPS locked to Tokyo)
    demoMode: true,
    setDemoMode: (demoMode) => set({ demoMode }),

    // Category filter
    activeCategories: ALL_CATEGORY_KEYS,
    defaultCategories: ALL_CATEGORY_KEYS,
    setActiveCategories: (activeCategories) => set({ activeCategories }),
    setDefaultCategories: (defaultCategories) => set({ defaultCategories }),
    toggleCategory: (key) =>
      set((s) => ({
        activeCategories: s.activeCategories.includes(key)
          ? s.activeCategories.filter((k) => k !== key)
          : [...s.activeCategories, key],
      })),

    // Trip dates (user-configurable)
    tripStart: DEFAULT_TRIP_START,
    tripEnd:   DEFAULT_TRIP_END,
    setTripDates: (start, end) => set({ tripStart: start, tripEnd: end }),

    // Planner
    planEntries: [],
    setPlanEntries: (entries) => set({ planEntries: entries }),
    addPlanEntry: (entry) =>
      set((s) => ({ planEntries: [...s.planEntries, entry] })),
    removePlanEntry: (id) =>
      set((s) => ({ planEntries: s.planEntries.filter((e) => e.id !== id) })),
    updatePlanEntry: (updated) =>
      set((s) => ({
        planEntries: s.planEntries.map((e) => (e.id === updated.id ? updated : e)),
      })),
    isPlannerOpen: false,
    setIsPlannerOpen: (v) => set({ isPlannerOpen: v }),
    plannerView: 'full',    // 'full' | '3day' | 'today'
    setPlannerView: (v) => set({ plannerView: v }),
    planFocusDay: 1,
    setPlanFocusDay: (d) => set({ planFocusDay: d }),
    plannerTravelMode: 'DRIVING',  // 'DRIVING' | 'WALKING' | 'TRANSIT'
    setPlannerTravelMode: (m) => set({ plannerTravelMode: m }),
    routeLines: [],  // [{ entryId, color, path: [{lat,lng}], duration }]
    setRouteLines: (lines) => set({ routeLines: lines }),
    clearRouteLines: () => set({ routeLines: [] }),
    showTripConnectors: true,
    setShowTripConnectors: (v) => set({ showTripConnectors: v }),

    // Imported locations (from Google Maps links)
    importedLocations: [],
    addImportedLocation: (loc) =>
      set((s) => ({
        importedLocations: [...s.importedLocations, loc],
        locations: [...s.locations, loc],
      })),
    removeImportedLocation: (id) =>
      set((s) => ({
        importedLocations: s.importedLocations.filter((l) => l.id !== id),
        locations: s.locations.filter((l) => l.id !== id),
      })),
    setImportedLocations: (importedLocations) => set({ importedLocations }),
    updateImportedLocation: (updated) =>
      set((s) => ({
        importedLocations: s.importedLocations.map((l) => l.id === updated.id ? updated : l),
        locations: s.locations.map((l) => l.id === updated.id ? updated : l),
      })),
  })),
)
