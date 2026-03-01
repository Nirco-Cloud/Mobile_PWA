import { useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { useAppStore } from './store/appStore.js'
import { CATEGORIES, ALL_CATEGORY_KEYS } from './config/categories.js'
import { initializeData, initializePlan } from './db/sync.js'
import { readAllLocations } from './db/locations.js'
import { readAllImportedLocations, deleteImportedLocation, updateImportedLocation } from './db/importedLocations.js'
import { readAllPlanEntries, enrichPlanEntries } from './db/plannerDb.js'
import { getGithubConfig, setGithubConfig, getLastSyncTime } from './db/githubSync.js'
import { useGithubSync } from './hooks/useGithubSync.js'
import { toDateInput, fromDateInput } from './config/trip.js'
import { decryptValue, isEncrypted } from './utils/crypto.js'
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
import ImportSheet from './components/ImportSheet.jsx'
import PlannerOverlay from './components/PlannerOverlay.jsx'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function isGoogleMapsUrl(text) {
  return (
    text.includes('maps.app.goo.gl') ||
    text.includes('google.com/maps') ||
    text.includes('goo.gl/maps') ||
    text.includes('share.google/')
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('map')
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importInitialUrl, setImportInitialUrl] = useState('')
  const [importAutoResolve, setImportAutoResolve] = useState(false)
  const [qrConfigReceived, setQrConfigReceived] = useState(false)
  const setLocations = useAppStore((s) => s.setLocations)
  const setSyncStatus = useAppStore((s) => s.setSyncStatus)
  const batteryLevel = useAppStore((s) => s.batteryLevel)
  const position = useAppStore((s) => s.position)
  const setActiveCategories = useAppStore((s) => s.setActiveCategories)
  const setDefaultCategories = useAppStore((s) => s.setDefaultCategories)
  const setImportedLocations = useAppStore((s) => s.setImportedLocations)
  const setPlanEntries   = useAppStore((s) => s.setPlanEntries)
  const isPlannerOpen    = useAppStore((s) => s.isPlannerOpen)
  const setIsPlannerOpen = useAppStore((s) => s.setIsPlannerOpen)
  const setPlannerPanelH = useAppStore((s) => s.setPlannerPanelH)
  const setTripDates       = useAppStore((s) => s.setTripDates)
  const setGithubConfigured = useAppStore((s) => s.setGithubConfigured)
  const setGithubLastSync   = useAppStore((s) => s.setGithubLastSync)

  // Restore persisted active category filter on mount
  useEffect(() => {
    idbGet('activeCategories').then((saved) => {
      const cats = saved ?? ALL_CATEGORY_KEYS
      // Ensure newly added keys (e.g. 'custom') are always valid
      const valid = cats.filter((k) => ALL_CATEGORY_KEYS.includes(k))
      const restored = valid.length > 0 ? valid : ALL_CATEGORY_KEYS
      setActiveCategories(restored)
      setDefaultCategories(ALL_CATEGORY_KEYS)
    })
  }, [setActiveCategories, setDefaultCategories])

  // Load persisted encryption passphrase
  const setEncPassphrase = useAppStore((s) => s.setEncPassphrase)

  // Load persisted dark mode preference (default OFF)
  const setIsDark = useAppStore((s) => s.setIsDark)
  useEffect(() => {
    idbGet('darkMode').then((saved) => {
      if (saved === true) setIsDark(true)
    })
  }, [setIsDark])

  // Load persisted trip dates — clear stale values where start === end
  useEffect(() => {
    idbGet('tripDates').then((saved) => {
      if (saved?.start && saved?.end) {
        if (saved.start === saved.end) {
          idbDel('tripDates') // stale/identical dates — clear and use defaults
          return
        }
        setTripDates(new Date(saved.start), new Date(saved.end))
      }
    })
  }, [setTripDates])

  // Detect Web Share Target — browser navigates to /share-target?url=... or ?text=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url') || params.get('text') || ''
    if (sharedUrl && isGoogleMapsUrl(sharedUrl)) {
      window.history.replaceState({}, '', window.location.pathname)
      setImportInitialUrl(sharedUrl)
      setImportAutoResolve(true)
      setShowImport(true)
    }
  }, [])

  // Detect QR config share — URL fragment #ghsync=BASE64_JSON
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#ghsync=')) return
    try {
      const b64 = hash.slice('#ghsync='.length)
      const json = decodeURIComponent(escape(atob(b64)))
      const cfg = JSON.parse(json)
      if (!cfg.token) return
      const full = {
        token: cfg.token,
        owner: cfg.owner || 'Nirco-Cloud',
        repo: cfg.repo || 'trip-data',
        branch: cfg.branch || 'main',
        filePath: cfg.filePath || 'plan.json',
      }
      setGithubConfig(full).then(() => {
        setGithubConfigured(true)
        setQrConfigReceived(true)
        setShowSettings(true)
      })
    } catch (e) {
      console.error('QR config parse error:', e)
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [setGithubConfigured])

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
        await initializePlan()
        const [records, importedRecords, planRecords] = await Promise.all([
          readAllLocations(),
          readAllImportedLocations(),
          readAllPlanEntries(),
        ])
        setImportedLocations(importedRecords)
        const allLocs = [...records, ...importedRecords]
        setLocations(allLocs)
        setPlanEntries(enrichPlanEntries(planRecords, allLocs))
        // Validate saved passphrase against encrypted data
        const savedPass = await idbGet('encPassphrase')
        if (savedPass) {
          const testEntry = planRecords.find((e) => isEncrypted(e.meta?.confirmationNumber))
          if (testEntry) {
            const result = await decryptValue(testEntry.meta.confirmationNumber, savedPass)
            if (result !== null) {
              setEncPassphrase(savedPass)
            } else {
              await idbSet('encPassphrase', null)
            }
          } else {
            setEncPassphrase(savedPass)
          }
        }
        // Load GitHub sync config
        const ghConfig = await getGithubConfig()
        if (ghConfig.token) setGithubConfigured(true)
        const ghLastSync = await getLastSyncTime()
        if (ghLastSync) setGithubLastSync(ghLastSync)

        setSyncStatus('done')
      } catch (err) {
        console.error('Boot error:', err)
        try {
          const [records, importedRecords, planRecords] = await Promise.all([
            readAllLocations(),
            readAllImportedLocations(),
            readAllPlanEntries(),
          ])
          setImportedLocations(importedRecords)
          const allLocs = [...records, ...importedRecords]
          setLocations(allLocs)
          setPlanEntries(enrichPlanEntries(planRecords, allLocs))
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
  }, [setLocations, setSyncStatus, setImportedLocations, setPlanEntries])

  function handleTabChange(tab) {
    if (tab === 'plan') {
      const opening = !isPlannerOpen
      setIsPlannerOpen(opening)
      if (opening) setPlannerPanelH(85)
      setShowSettings(false)
    } else if (tab === 'settings') {
      setShowSettings(true)
      setIsPlannerOpen(false)
    } else {
      setActiveTab(tab)
      setShowSettings(false)
      setIsPlannerOpen(false)
    }
  }

  async function handleImportFAB() {
    setImportAutoResolve(false)
    setImportInitialUrl('')
    // Try to read clipboard for a maps URL
    try {
      const text = await navigator.clipboard.readText()
      if (isGoogleMapsUrl(text)) {
        setImportInitialUrl(text)
        setImportAutoResolve(true)
      }
    } catch {
      // Clipboard access denied or unavailable — open empty sheet
    }
    setShowImport(true)
  }

  async function handleResync() {
    setSyncStatus('syncing')
    await resetSync()
    try {
      await initializeData()
      await initializePlan()
      const [records, planRecords] = await Promise.all([
        readAllLocations(),
        readAllPlanEntries(),
      ])
      setLocations(records)
      setPlanEntries(enrichPlanEntries(planRecords, records))
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
          listSlot={isPlannerOpen ? null : <ListComponent />}
        />
      ) : (
        <SettingsPanel
          batteryLevel={batteryLevel}
          position={position}
          onResync={handleResync}
          onClose={() => setShowSettings(false)}
          bottomNavHeight={BOTTOM_NAV_HEIGHT}
          qrConfigReceived={qrConfigReceived}
          onDismissQrBanner={() => setQrConfigReceived(false)}
          onSaveTripDates={async (start, end) => {
            setTripDates(start, end)
            await idbSet('tripDates', { start: start.toISOString(), end: end.toISOString() })
          }}
        />
      )}

      <PlannerOverlay onImportLink={handleImportFAB} />


      <ImportSheet
        open={showImport}
        onClose={() => {
          setShowImport(false)
          setImportInitialUrl('')
          setImportAutoResolve(false)
        }}
        initialUrl={importInitialUrl}
        autoResolve={importAutoResolve}
      />

      <BottomNav activeTab={showSettings ? 'settings' : activeTab} onTabChange={handleTabChange} />
    </APIProvider>
  )
}

function SettingsPanel({ batteryLevel, position, onResync, onClose, bottomNavHeight, qrConfigReceived, onDismissQrBanner, onSaveTripDates }) {
  const syncStatus = useAppStore((s) => s.syncStatus)
  const locations  = useAppStore((s) => s.locations)
  const demoMode   = useAppStore((s) => s.demoMode)
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const isDark     = useAppStore((s) => s.isDark)
  const setIsDark  = useAppStore((s) => s.setIsDark)
  const showTripConnectors    = useAppStore((s) => s.showTripConnectors)
  const setShowTripConnectors = useAppStore((s) => s.setShowTripConnectors)
  const planEntries    = useAppStore((s) => s.planEntries)
  const setPlanEntries = useAppStore((s) => s.setPlanEntries)
  const encPassphrase    = useAppStore((s) => s.encPassphrase)
  const setEncPassphrase = useAppStore((s) => s.setEncPassphrase)
  const setGithubConfigured = useAppStore((s) => s.setGithubConfigured)
  const [passInput, setPassInput] = useState('')
  const [passSaved, setPassSaved] = useState(false)
  const [passError, setPassError] = useState('')
  const [passShow, setPassShow] = useState(false)
  const [ghToken, setGhToken] = useState('')
  const [ghShowToken, setGhShowToken] = useState(false)
  const [ghSaveMsg, setGhSaveMsg] = useState('')
  const { triggerSync, status: ghStatus, error: ghError, lastSync: ghLastSync, isOnline } = useGithubSync()

  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)

  // Load saved token on mount
  useEffect(() => {
    getGithubConfig().then((cfg) => { if (cfg.token) setGhToken(cfg.token) })
  }, [])

  // Auto-dismiss QR config banner after 8s
  useEffect(() => {
    if (!qrConfigReceived) return
    const t = setTimeout(onDismissQrBanner, 8000)
    return () => clearTimeout(t)
  }, [qrConfigReceived, onDismissQrBanner])
  const tripStart  = useAppStore((s) => s.tripStart)
  const tripEnd    = useAppStore((s) => s.tripEnd)
  const [startVal, setStartVal] = useState(() => toDateInput(tripStart))
  const [endVal,   setEndVal]   = useState(() => toDateInput(tripEnd))
  const [dateError, setDateError] = useState('')
  function handleSaveDates() {
    const s = fromDateInput(startVal)
    const e = fromDateInput(endVal)
    if (isNaN(s) || isNaN(e)) { setDateError('Invalid date'); return }
    if (e < s) { setDateError('End must be after start'); return }
    setDateError('')
    onSaveTripDates(s, e)
  }

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

        {qrConfigReceived && (
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <span className="text-sm text-emerald-700 dark:text-emerald-300">Sync configured via QR code!</span>
            <button onClick={onDismissQrBanner} className="text-emerald-400 hover:text-emerald-600 ml-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Encryption Passphrase */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Bookings Key
          </h3>
          {encPassphrase ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-500">Unlocked</span>
              <button
                onClick={async () => {
                  setEncPassphrase(null)
                  await idbSet('encPassphrase', null)
                }}
                className="text-xs text-red-400 underline"
              >
                Lock
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type={passShow ? 'text' : 'password'}
                value={passInput}
                onChange={(e) => { setPassInput(e.target.value); setPassSaved(false); setPassError('') }}
                placeholder="Enter passphrase"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                onClick={() => setPassShow(!passShow)}
                className="px-2 py-1.5 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {passShow ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={async () => {
                  if (!passInput) return
                  setPassError('')
                  // Find an encrypted confirmation to test against
                  const testEntry = planEntries.find((e) => isEncrypted(e.meta?.confirmationNumber))
                  if (testEntry) {
                    const result = await decryptValue(testEntry.meta.confirmationNumber, passInput)
                    if (result === null) {
                      setPassError('Wrong passphrase')
                      return
                    }
                  }
                  setEncPassphrase(passInput)
                  await idbSet('encPassphrase', passInput)
                  setPassInput('')
                  setPassSaved(true)
                  setTimeout(() => setPassSaved(false), 2000)
                }}
                className="px-4 py-1.5 bg-sky-500 text-white rounded-lg text-sm font-medium active:bg-sky-600"
              >
                Unlock
              </button>
            </div>
          )}
          {passError && <p className="text-xs text-red-500">{passError}</p>}
          {passSaved && <p className="text-xs text-green-500">Saved!</p>}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Unlocks encrypted confirmation numbers in bookings
          </p>
        </section>

        {/* GitHub Sync */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            GitHub Sync
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type={ghShowToken ? 'text' : 'password'}
                value={ghToken}
                onChange={(e) => { setGhToken(e.target.value); setGhSaveMsg('') }}
                placeholder="GitHub PAT"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
              />
              <button
                onClick={() => setGhShowToken(!ghShowToken)}
                className="px-2 py-1.5 text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {ghShowToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const config = await getGithubConfig()
                  await setGithubConfig({ ...config, token: ghToken.trim() })
                  setGithubConfigured(!!ghToken.trim())
                  setGhSaveMsg('Saved!')
                  setTimeout(() => setGhSaveMsg(''), 2000)
                }}
                className="px-4 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium active:bg-gray-700"
              >
                Save Token
              </button>
              <button
                onClick={triggerSync}
                disabled={ghStatus === 'syncing' || !isOnline || !ghToken.trim()}
                className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 active:bg-emerald-600 flex items-center justify-center gap-2"
              >
                {ghStatus === 'syncing' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Syncing…
                  </>
                ) : 'Sync Now'}
              </button>
            </div>
            {ghSaveMsg && <p className="text-xs text-green-500">{ghSaveMsg}</p>}
            {ghStatus === 'success' && <p className="text-xs text-emerald-500">Sync complete!</p>}
            {ghStatus === 'error' && <p className="text-xs text-red-500">{ghError}</p>}
            {!isOnline && <p className="text-xs text-orange-400">Offline — sync unavailable</p>}
            {ghLastSync && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Last sync: {new Date(ghLastSync).toLocaleString()}
              </p>
            )}
            {ghToken.trim() && (
              <button
                onClick={async () => {
                  setQrLoading(true)
                  try {
                    const config = await getGithubConfig()
                    const payload = { token: config.token, owner: config.owner, repo: config.repo, branch: config.branch, filePath: config.filePath }
                    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
                    const url = `https://nirco-cloud.github.io/Mobile_PWA/#ghsync=${b64}`
                    const QRCode = (await import('qrcode')).default
                    const dataUrl = await QRCode.toDataURL(url, { width: 768, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
                    setQrDataUrl(dataUrl)
                    setShowQrModal(true)
                  } catch (e) {
                    console.error('QR generation error:', e)
                  }
                  setQrLoading(false)
                }}
                disabled={qrLoading}
                className="w-full py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 active:bg-indigo-600 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <rect x="3" y="3" width="3" height="3" /><rect x="9" y="3" width="3" height="3" />
                  <rect x="3" y="9" width="3" height="3" /><rect x="6" y="6" width="3" height="3" />
                  <rect x="18" y="3" width="3" height="3" /><rect x="15" y="6" width="3" height="3" />
                  <rect x="3" y="18" width="3" height="3" /><rect x="6" y="15" width="3" height="3" />
                  <rect x="15" y="15" width="3" height="3" /><rect x="18" y="18" width="3" height="3" />
                </svg>
                {qrLoading ? 'Generating...' : 'Share Setup (QR)'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Two-way sync plan entries via Nirco-Cloud/trip-data
          </p>
        </section>

        {/* Trip Dates */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Trip Dates
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-10 shrink-0">Start</label>
              <input
                type="date"
                value={startVal}
                onChange={(e) => setStartVal(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-10 shrink-0">End</label>
              <input
                type="date"
                value={endVal}
                onChange={(e) => setEndVal(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            {dateError && (
              <p className="text-xs text-red-500">{dateError}</p>
            )}
            <button
              onClick={handleSaveDates}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium active:bg-sky-600 self-start"
            >
              Save Dates
            </button>
          </div>
        </section>

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
            {syncStatus === 'done' && (
              <span className="text-gray-400 dark:text-gray-500"> ({locations.length} locations{encPassphrase ? `, ${planEntries.length} plan entries` : ''})</span>
            )}
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
              Lock GPS to Shinjuku Hotel
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
              GPS locked to Hotel Sunroute Plaza Shinjuku
            </p>
          )}
        </section>

        {/* Appearance */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Use device theme
            </p>
            <button
              onClick={async () => {
                const next = !isDark
                setIsDark(next)
                await idbSet('darkMode', next)
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDark ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Trip Planner Map */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Trip Planner
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Show connector lines on map
            </p>
            <button
              onClick={() => setShowTripConnectors(!showTripConnectors)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showTripConnectors ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  showTripConnectors ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {showTripConnectors && (
            <p className="text-xs text-red-400">
              Red lines connect planned stops in order
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

        {/* Location Manager */}
        <LocationManager />

        {/* Version */}
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center pt-2 pb-1">
          v{__APP_VERSION__}
        </p>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-xs w-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800">Scan to Configure Sync</h3>
            <div className="bg-white p-2 rounded-xl">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-xs text-gray-400 text-center">Scan with phone camera to auto-configure GitHub sync</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium active:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LocationManager() {
  const importedLocations = useAppStore((s) => s.importedLocations)
  const removeImportedLocation = useAppStore((s) => s.removeImportedLocation)
  const updateImportedLocationStore = useAppStore((s) => s.updateImportedLocation)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('custom')

  function startEdit(loc) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditCategory(loc.category)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSaveEdit(loc) {
    const updated = { ...loc, name: editName.trim() || loc.name, category: editCategory }
    await updateImportedLocation(updated)
    updateImportedLocationStore(updated)
    setEditingId(null)
  }

  async function handleDelete(id) {
    await deleteImportedLocation(id)
    removeImportedLocation(id)
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Imported Locations
      </h3>
      {importedLocations.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No imported locations</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          {importedLocations.map((loc) => {
            const cat = CATEGORIES.find((c) => c.key === loc.category)
            const isEditing = editingId === loc.id
            return (
              <div key={loc.id} className="px-3 py-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(loc)}
                        className="flex-1 py-1.5 bg-sky-500 text-white text-sm font-medium rounded-lg active:bg-sky-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg active:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-400">{cat ? cat.label : loc.category}</p>
                    </div>
                    <button
                      onClick={() => startEdit(loc)}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-sky-400 active:text-sky-500 shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 active:text-red-500 shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
