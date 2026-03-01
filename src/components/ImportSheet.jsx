import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { saveImportedLocation, deleteImportedLocation } from '../db/importedLocations.js'
import { savePlanEntry } from '../db/plannerDb.js'
import { useTripConfig } from '../hooks/useTripConfig.js'

// Import categories — unified with entry types + new place types
const IMPORT_CATEGORIES = [
  {
    key: 'restaurant',
    label: 'Restaurant',
    color: '#f97316',
    icon: 'M3 3h18M3 9h18M9 3v18M15 3v6M3 15h6M15 15h6M3 21h6M15 21h6',
  },
  {
    key: 'cafe',
    label: 'Cafe',
    color: '#8b5cf6',
    icon: 'M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  },
  {
    key: 'attraction',
    label: 'Attraction',
    color: '#ec4899',
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2 2 2 0 010 4 2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2 2 2 0 010-4 2 2 0 002-2V7a2 2 0 00-2-2H5z',
  },
  {
    key: 'shop',
    label: 'Shop',
    color: '#10b981',
    icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  },
  {
    key: 'hotel',
    label: 'Hotel',
    color: '#8b5cf6',
    icon: 'M3 7v11m0-7h18m0 0V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4h18zm0 0v7m-9-4h.01',
  },
  {
    key: 'train',
    label: 'Train',
    color: '#f97316',
    icon: 'M12 4v16m-4-4l4 4 4-4M8 4h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z',
  },
  {
    key: 'location',
    label: 'Place',
    color: '#6b7280',
    icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
]

// Types that map directly to plan entry types (others → 'location')
const ENTRY_TYPE_KEYS = ['hotel', 'train']

function detectCategory(name) {
  if (!name) return 'location'
  const n = name.toLowerCase()
  if (/hotel|inn|hostel|ryokan|lodge|resort|guesthouse|guest house|motel/.test(n)) return 'hotel'
  if (/cafe|coffee|kissaten|tearoom|tea room|bakery|patisserie/.test(n))           return 'cafe'
  if (/bar|pub|brewery|winery|sake/.test(n))                                       return 'cafe'
  if (/store|shop|market|mall|boutique|department|supermarket|drugstore|pharmacy/.test(n)) return 'shop'
  if (/shrine|jinja|temple|park|garden|museum|castle|tower|palace|onsen|hot spring|waterfall/.test(n)) return 'attraction'
  if (/station|railway|terminal/.test(n))                                          return 'train'
  if (/ramen|noodle|soba|udon|sushi|sashimi|izakaya|yakitori|omakase|kaiseki|restaurant|diner|eatery|bbq|grill|curry|tempura|tonkatsu|yakiniku/.test(n)) return 'restaurant'
  return 'location'
}

const RESOLVER_URL = import.meta.env.VITE_NETLIFY_RESOLVER_URL

function isGoogleMapsUrl(text) {
  return (
    text.includes('maps.app.goo.gl') ||
    text.includes('google.com/maps') ||
    text.includes('goo.gl/maps') ||
    text.includes('share.google/')
  )
}

// ─── Inline day picker (no separate overlay) ────────────────────────────────

function InlineDayPicker({ locationName, onSelectDay, onCancel }) {
  const planEntries = useAppStore((s) => s.planEntries)
  const { tripDays, formatDayLabel, getTodayDayNumber } = useTripConfig()
  const todayDay = getTodayDayNumber()
  const days = Array.from({ length: tripDays }, (_, i) => i + 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add to Day</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{locationName}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pb-1">
        {days.map((day) => {
          const count = planEntries.filter((e) => e.day === day).length
          const isToday = todayDay === day
          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`relative flex flex-col items-center justify-center rounded-xl py-2.5 text-center border transition-colors active:scale-95 ${
                isToday
                  ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {isToday && (
                <span className="absolute top-1 right-1 text-[9px] font-bold text-sky-500 leading-none">TODAY</span>
              )}
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Day {day}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                {formatDayLabel(day).split(' · ')[0]}
              </span>
              {count > 0 && (
                <span className="mt-1 text-[10px] font-medium text-sky-500">
                  {count} stop{count > 1 ? 's' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ImportSheet({ open, onClose, initialUrl = '', autoResolve = false }) {
  const [url, setUrl]               = useState('')
  const [status, setStatus]         = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult]         = useState(null)
  const [customName, setCustomName] = useState('')
  const [category, setCategory]     = useState('location')
  const [error, setError]           = useState(null)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const inputRef = useRef(null)

  const importedLocations   = useAppStore((s) => s.importedLocations)
  const addImportedLocation = useAppStore((s) => s.addImportedLocation)
  const removeImportedLocation = useAppStore((s) => s.removeImportedLocation)
  const addPlanEntry        = useAppStore((s) => s.addPlanEntry)
  const planEntries         = useAppStore((s) => s.planEntries)
  const setSelection        = useAppStore((s) => s.setSelection)

  // Sync initialUrl when sheet opens with a pre-filled URL
  useEffect(() => {
    if (open && initialUrl) {
      setUrl(initialUrl)
      if (autoResolve) resolve(initialUrl)
    }
  }, [open, initialUrl, autoResolve])

  // Reset form state when sheet closes
  useEffect(() => {
    if (!open) {
      setUrl('')
      setStatus('idle')
      setResult(null)
      setError(null)
      setCustomName('')
      setCategory('location')
      setShowDayPicker(false)
    }
  }, [open])

  // Focus input when sheet opens (no pre-filled URL)
  useEffect(() => {
    if (open && !initialUrl && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, initialUrl])

  async function resolve(resolveUrl) {
    let trimmed = (resolveUrl ?? url).trim()
    if (!trimmed) return
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed
    }
    if (!RESOLVER_URL) {
      setStatus('error')
      setError('VITE_NETLIFY_RESOLVER_URL is not set in .env')
      return
    }

    setStatus('loading')
    setError(null)
    setResult(null)
    setShowDayPicker(false)

    try {
      const res = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resolve')

      if (data.needsGeocode && data.address && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder()
        const geoResult = await geocoder.geocode({ address: data.address })
        if (geoResult.results?.[0]) {
          const loc = geoResult.results[0].geometry.location
          data.lat = loc.lat()
          data.lng = loc.lng()
          delete data.needsGeocode
        } else {
          throw new Error('Could not find coordinates for this place')
        }
      } else if (data.needsGeocode) {
        throw new Error('Could not extract coordinates from this link')
      }

      const detectedCategory = detectCategory(data.name || '')
      setResult(data)
      setCustomName(data.name || '')
      setCategory(detectedCategory)
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  // Save location to imported list and return the saved object
  async function saveLocation() {
    if (!result) return null
    const alreadySaved = importedLocations.find((loc) => loc.sourceUrl === url.trim())
    if (alreadySaved) return alreadySaved // already saved, reuse it

    const loc = {
      id: `imported_${Date.now()}`,
      name: customName.trim() || `Imported ${new Date().toLocaleDateString()}`,
      lat: result.lat,
      lng: result.lng,
      category,
      importedAt: new Date().toISOString(),
      sourceUrl: url,
    }
    await saveImportedLocation(loc)
    addImportedLocation(loc)
    return loc
  }

  // "Add to Day" tapped — show inline day picker
  function handleAddToDay() {
    setShowDayPicker(true)
  }

  // Day selected — save location + create plan entry
  async function handleSelectDay(day) {
    const loc = await saveLocation()
    if (!loc) return

    // hotel/train → their own entry type; everything else → 'location'
    const entryType = ENTRY_TYPE_KEYS.includes(category) ? category : 'location'

    const dayEntries = planEntries.filter((e) => e.day === day)
    const entry = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day,
      order: dayEntries.length + 1,
      type: entryType,
      locationId: loc.id,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      note: null,
      owner: 'shared',
      meta: entryType !== 'location' ? { category } : null,
      createdAt: new Date().toISOString(),
    }
    await savePlanEntry(entry)
    addPlanEntry(entry)
    onClose()
  }

  // "Save only" — save to list without planning
  async function handleSaveOnly() {
    const loc = await saveLocation()
    if (!loc) { setError('This location is already saved.'); return }
    setStatus('idle')
    setResult(null)
    setUrl('')
    setCustomName('')
    setCategory('location')
    setShowDayPicker(false)
    setError(null)
  }

  async function handleDelete(id) {
    await deleteImportedLocation(id)
    removeImportedLocation(id)
  }

  function handleSelectImported(loc) {
    setSelection(loc.id, 'list')
    onClose()
  }

  function handlePaste(e) {
    const text = e.clipboardData?.getData('text') || ''
    if (isGoogleMapsUrl(text)) {
      setTimeout(() => resolve(text), 0)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Import from Google Maps
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

          {/* URL input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="url"
              inputMode="url"
              placeholder="Paste Google Maps link…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setStatus('idle')
                setResult(null)
                setError(null)
                setShowDayPicker(false)
              }}
              onPaste={handlePaste}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              onClick={() => resolve()}
              disabled={!url.trim() || status === 'loading'}
              className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-xl disabled:opacity-40 active:bg-sky-600 shrink-0"
            >
              {status === 'loading' ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : 'Go'}
            </button>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Success: resolved preview */}
          {status === 'success' && result && !showDayPicker && (
            <div className="border border-sky-200 dark:border-sky-800 rounded-xl overflow-hidden">
              {/* Coords bar */}
              <div className="px-3 py-2 bg-sky-50 dark:bg-sky-900/20 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sky-500 shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-mono">
                  {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                </p>
              </div>

              <div className="px-3 py-3 space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter a name…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                {/* Category chips */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {IMPORT_CATEGORIES.map((c) => {
                      const selected = category === c.key
                      return (
                        <button
                          key={c.key}
                          onClick={() => setCategory(c.key)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                            selected
                              ? 'border-transparent text-white'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-700'
                          }`}
                          style={selected ? { backgroundColor: c.color, borderColor: c.color } : {}}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            className="w-3.5 h-3.5 shrink-0"
                            style={selected ? {} : { color: c.color }}
                          >
                            <path d={c.icon} />
                          </svg>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Primary action: Add to Day */}
                <button
                  onClick={handleAddToDay}
                  className="w-full py-3 bg-sky-500 text-white text-sm font-semibold rounded-xl active:bg-sky-600 flex items-center justify-center gap-2"
                >
                  Add to Day
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Secondary action: Save only */}
                <button
                  onClick={handleSaveOnly}
                  className="w-full py-2 text-sm text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300"
                >
                  Save to list only
                </button>
              </div>
            </div>
          )}

          {/* Inline day picker (shown after tapping "Add to Day") */}
          {status === 'success' && result && showDayPicker && (
            <div className="border border-sky-200 dark:border-sky-800 rounded-xl px-3 py-3">
              <InlineDayPicker
                locationName={customName || result.name || 'Location'}
                onSelectDay={handleSelectDay}
                onCancel={() => setShowDayPicker(false)}
              />
            </div>
          )}

          {/* Saved imports list */}
          {importedLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Saved imports
              </p>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                {importedLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center gap-2 px-3 py-2">
                    <button
                      onClick={() => handleSelectImported(loc)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{loc.name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="p-1.5 text-gray-300 dark:text-gray-600 active:text-red-400 shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
