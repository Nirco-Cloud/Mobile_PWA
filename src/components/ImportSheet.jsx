import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { saveImportedLocation, deleteImportedLocation } from '../db/importedLocations.js'
import { CATEGORIES } from '../config/categories.js'

function detectCategory(name) {
  if (!name) return 'custom'
  const n = name.toLowerCase()
  if (/hotel|inn|hostel|ryokan|lodge|resort|guesthouse|guest house|motel/.test(n)) return 'מלונות'
  if (/ramen|noodle|soba|udon/.test(n))                                           return 'Ramen'
  if (/izakaya|yakitori|robata/.test(n))                                           return 'Izakaya'
  if (/omakase|kaiseki|teppanyaki/.test(n))                                        return 'מסעדות גבוהות / הזמנה'
  if (/sushi|sashimi/.test(n))                                                     return 'סושי עממי ולא יקר'
  if (/cafe|coffee|kissaten|tearoom|tea room/.test(n))                             return 'קפה/תה/אלכוהול'
  if (/bar|pub|brewery|winery|sake/.test(n))                                       return 'קפה/תה/אלכוהול'
  if (/bakery|patisserie|cake|donut|sweet|candy|ice cream|crepe|wagashi|mochi|dessert/.test(n)) return 'חטיפים ומלוחים'
  if (/store|shop|market|mall|boutique|department|supermarket|drugstore|pharmacy/.test(n))      return 'חנויות'
  if (/shrine|jinja|temple|park|garden|museum|castle|tower|palace|onsen|hot spring|waterfall/.test(n)) return 'איזורים ואתרים'
  if (/restaurant|diner|eatery|bbq|grill|curry|tempura|tonkatsu|yakiniku/.test(n)) return 'מסעדות ואוכל רחוב'
  return 'custom'
}

const RESOLVER_URL = import.meta.env.VITE_NETLIFY_RESOLVER_URL

function isGoogleMapsUrl(text) {
  return (
    text.includes('maps.app.goo.gl') ||
    text.includes('google.com/maps') ||
    text.includes('goo.gl/maps')
  )
}

export default function ImportSheet({ open, onClose, initialUrl = '', autoResolve = false }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null)
  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState('custom')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const importedLocations = useAppStore((s) => s.importedLocations)
  const addImportedLocation = useAppStore((s) => s.addImportedLocation)
  const removeImportedLocation = useAppStore((s) => s.removeImportedLocation)
  const setSelection = useAppStore((s) => s.setSelection)

  // Sync initialUrl when sheet opens with a pre-filled URL
  useEffect(() => {
    if (open && initialUrl) {
      setUrl(initialUrl)
      if (autoResolve) {
        resolve(initialUrl)
      }
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
      setCategory('custom')
    }
  }, [open])

  // Focus input when sheet opens (no pre-filled URL)
  useEffect(() => {
    if (open && !initialUrl && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, initialUrl])

  async function resolve(resolveUrl) {
    const trimmed = (resolveUrl ?? url).trim()
    if (!trimmed) return

    if (!RESOLVER_URL) {
      setStatus('error')
      setError('VITE_NETLIFY_RESOLVER_URL is not set in .env')
      return
    }

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resolve')

      // Android GPS share links have no coords in URL/HTML — geocode client-side
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

      setResult(data)
      setCustomName(data.name || '')
      setCategory(detectCategory(data.name || ''))
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  async function handleSave() {
    if (!result) return
    const alreadySaved = importedLocations.some((loc) => loc.sourceUrl === url.trim())
    if (alreadySaved) {
      setError('This location is already saved.')
      return
    }
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
    setStatus('idle')
    setResult(null)
    setUrl('')
    setCustomName('')
    setCategory('custom')
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
      // Auto-resolve on paste if it's a maps URL
      setTimeout(() => resolve(text), 0)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: '80dvh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
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
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* URL input + resolve */}
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
              ) : (
                'Go'
              )}
            </button>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Success preview */}
          {status === 'success' && result && (
            <div className="border border-sky-200 dark:border-sky-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-sky-50 dark:bg-sky-900/20 flex items-start gap-2">
                <span className="text-sky-500 mt-0.5 shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-mono">
                    {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                  </p>
                </div>
              </div>
              <div className="px-3 py-2 space-y-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter a name for this location"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  className="w-full py-2 bg-sky-500 text-white text-sm font-medium rounded-lg active:bg-sky-600"
                >
                  Save to list
                </button>
              </div>
            </div>
          )}

          {/* Saved imports */}
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
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {loc.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 active:text-red-500 shrink-0"
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
