import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { deleteImportedLocation } from '../db/importedLocations.js'
import { deletePlanEntry } from '../db/plannerDb.js'
import DayPicker from './DayPicker.jsx'

const RESOLVER_URL = import.meta.env.VITE_NETLIFY_RESOLVER_URL

function isGoogleMapsUrl(text) {
  return (
    text.includes('maps.app.goo.gl') ||
    text.includes('google.com/maps') ||
    text.includes('goo.gl/maps') ||
    text.includes('share.google/')
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ImportSheet({ open, onClose, initialUrl = '', autoResolve = false, onResolved }) {
  const [url, setUrl]               = useState('')
  const [status, setStatus]         = useState('idle') // 'idle' | 'loading' | 'error'
  const [error, setError]           = useState(null)
  const [pickerLocation, setPickerLocation] = useState(null)
  const inputRef = useRef(null)

  const importedLocations      = useAppStore((s) => s.importedLocations)
  const removeImportedLocation = useAppStore((s) => s.removeImportedLocation)
  const setSelection           = useAppStore((s) => s.setSelection)
  const planEntries         = useAppStore((s) => s.planEntries)
  const removePlanEntry     = useAppStore((s) => s.removePlanEntry)

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
      setError(null)
      setPickerLocation(null)
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
    setPickerLocation(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)
      let res
      try {
        res = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      } finally {
        clearTimeout(timeoutId)
      }
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

          // Now that we have coords, enrich via Places API with location bias
          try {
            const enrichRes = await fetch(
              `${RESOLVER_URL}?mode=enrich&name=${encodeURIComponent(data.name || data.address)}&lat=${data.lat}&lng=${data.lng}`,
              { signal: AbortSignal.timeout(6000) }
            )
            if (enrichRes.ok) {
              const enrichData = await enrichRes.json()
              if (enrichData.enriched) {
                data.enriched = enrichData.enriched
                if (enrichData.enriched.displayName) data.name = enrichData.enriched.displayName
              }
            }
          } catch { /* non-critical — continue without enrichment */ }
        } else {
          throw new Error('Could not find coordinates for this place')
        }
      } else if (data.needsGeocode) {
        throw new Error('Could not extract coordinates from this link')
      }

      // Hand off to full-screen editor overlay
      const resolvedUrl = url.trim()
      setUrl('')
      setStatus('idle')
      onResolved?.(data, resolvedUrl)
      onClose()
    } catch (err) {
      setError(err.name === 'AbortError' ? 'Request timed out — try again' : err.message)
      setStatus('error')
    }
  }

  async function handleDelete(id) {
    await deleteImportedLocation(id)
    removeImportedLocation(id)
    const linked = planEntries.filter((e) => e.locationId === id && !e.deletedAt)
    for (const e of linked) {
      await deletePlanEntry(e.id)
      removePlanEntry(e.id)
    }
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
            aria-label="Close"
            className="p-1.5 rounded-full text-gray-500 active:bg-gray-100 dark:active:bg-gray-800"
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
                setError(null)
                setPickerLocation(null)
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

          {/* Saved imports list */}
          {importedLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                      <p className="text-xs text-gray-500 font-mono">
                        {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                      </p>
                    </button>
                    {/* Add to day from saved list */}
                    <button
                      onClick={() => setPickerLocation(loc)}
                      className="shrink-0 px-2 py-1 text-xs font-medium text-indigo-500 border border-indigo-200 dark:border-indigo-800 rounded-lg active:bg-indigo-50 dark:active:bg-indigo-900/20"
                    >
                      + Plan
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

      {/* DayPicker overlay — slides over ImportSheet */}
      {pickerLocation && (
        <DayPicker
          location={pickerLocation}
          onClose={() => setPickerLocation(null)}
          onDone={() => setPickerLocation(null)}
        />
      )}
    </>
  )
}
