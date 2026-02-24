import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { ALL_CATEGORY_KEYS } from '../config/categories.js'

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
  })),
)
