import { useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useAppStore } from './store/appStore.js'
import { CATEGORIES, ALL_CATEGORY_KEYS } from './config/categories.js'
import { initializeData } from './db/sync.js'
import { readAllLocations } from './db/locations.js'
import { resetSync } from './db/sync.js'
import { useGPS } from './hooks/useGPS.js'
import { useBattery } from './hooks/useBattery.js'
import { useDarkMode } from './hooks/useDarkMode.js'
import { useServiceWorker } from './workers/swRegistration.js'
import SplashScreen from './components/SplashScreen.jsx'
import SplitLayout from './components/SplitLayout.jsx'
import MapComponent from './components/MapComponent.jsx'
import ListComponent from './components/ListComponent.jsx'
import BottomNav, { BOTTOM_NAV_HEIGHT } from './components/BottomNav.jsx'
import CategoryFilter from './components/CategoryFilter.jsx'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('map')
  const [showSettings, setShowSettings] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const setLocations = useAppStore((s) => s.setLocations)
  const setSyncStatus = useAppStore((s) => s.setSyncStatus)
  const batteryLevel = useAppStore((s) => s.batteryLevel)
  const position = useAppStore((s) => s.position)
  const setActiveCategories = useAppStore((s) => s.setActiveCategories)
  const setDefaultCategories = useAppStore((s) => s.setDefaultCategories)

  // Load persisted default categories on mount
  useEffect(() => {
    idbGet('defaultCategories').then((saved) => {
      const cats = saved ?? ALL_CATEGORY_KEYS
      setDefaultCategories(cats)
      setActiveCategories(cats)
    })
  }, [setActiveCategories, setDefaultCategories])

  // Top-level hooks
  useServiceWorker()
  useGPS()
  useBattery()
  useDarkMode()

  useEffect(() => {
    async function boot() {
      const startTime = Date.now()
      setSyncStatus('syncing')
      try {
        await initializeData()
        const records = await readAllLocations()
        setLocations(records)
        setSyncStatus('done')
      } catch (err) {
        console.error('Boot error:', err)
        try {
          const records = await readAllLocations()
          setLocations(records)
        } catch {
          // Nothing we can do
        }
        setSyncStatus('error')
      }
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 2000 - elapsed)
      setTimeout(() => setShowSplash(false), remaining)
    }
    boot()
  }, [setLocations, setSyncStatus])

  function handleTabChange(tab) {
    if (tab === 'settings') {
      setShowSettings(true)
      setShowFilter(false)
    } else if (tab === 'filter') {
      setShowFilter((prev) => !prev)
    } else {
      setActiveTab(tab)
      setShowSettings(false)
      setShowFilter(false)
    }
  }

  async function handleResync() {
    setSyncStatus('syncing')
    await resetSync()
    try {
      await initializeData()
      const records = await readAllLocations()
      setLocations(records)
      setSyncStatus('done')
    } catch (err) {
      console.error('Resync error:', err)
      setSyncStatus('error')
    }
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={['marker']}>
      <SplashScreen visible={showSplash} />

      {!showSettings ? (
        <SplitLayout
          bottomNavHeight={BOTTOM_NAV_HEIGHT}
          mapSlot={<MapComponent />}
          listSlot={<ListComponent />}
        />
      ) : (
        <SettingsPanel
          batteryLevel={batteryLevel}
          position={position}
          onResync={handleResync}
          onClose={() => setShowSettings(false)}
          bottomNavHeight={BOTTOM_NAV_HEIGHT}
        />
      )}

      {showFilter && <CategoryFilter onClose={() => setShowFilter(false)} />}
      <BottomNav activeTab={showSettings ? 'settings' : activeTab} onTabChange={handleTabChange} />
    </APIProvider>
  )
}

function SettingsPanel({ batteryLevel, position, onResync, onClose, bottomNavHeight }) {
  const syncStatus = useAppStore((s) => s.syncStatus)
  const demoMode = useAppStore((s) => s.demoMode)
  const setDemoMode = useAppStore((s) => s.setDemoMode)

  return (
    <div
      className="flex flex-col bg-white dark:bg-gray-900"
      style={{
        height: `calc(100dvh - ${bottomNavHeight}px - env(safe-area-inset-bottom))`,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Settings</h2>

        {/* Sync */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Data Sync
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Status:{' '}
            <span className={syncStatus === 'done' ? 'text-green-500' : syncStatus === 'error' ? 'text-red-500' : 'text-yellow-500'}>
              {syncStatus}
            </span>
          </p>
          <button
            onClick={onResync}
            disabled={syncStatus === 'syncing'}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 active:bg-sky-600"
          >
            {syncStatus === 'syncing' ? 'Syncing...' : 'Re-sync Data'}
          </button>
        </section>

        {/* Demo Mode */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Demo Mode
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Lock GPS to Tokyo
            </p>
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                demoMode ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  demoMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {demoMode && (
            <p className="text-xs text-sky-500">
              Showing locations relative to Tokyo
            </p>
          )}
        </section>

        {/* GPS */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            GPS Status
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {position
              ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              : 'Waiting for GPS...'}
          </p>
        </section>

        {/* Battery */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Battery
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Level: {Math.round(batteryLevel * 100)}%
            {batteryLevel < 0.2 && (
              <span className="ml-2 text-orange-500 text-xs font-medium">Low — GPS polling at 60s</span>
            )}
          </p>
        </section>
      </div>
    </div>
  )
}
