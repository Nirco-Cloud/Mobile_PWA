/**
 * ShareConfirmSheet.jsx
 * Bottom sheet shown when a Google Maps URL is shared / pasted into the app.
 * Resolves the URL → shows place details → user confirms to save as a personal POI.
 */

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { saveUserPoi, getUserPoiByPlaceId } from '../db/userPoisDb.js'
import { CATEGORIES } from '../config/categories.js'

const RESOLVER_URL = 'https://deft-lollipop-820a72.netlify.app/.netlify/functions/resolve-maps-link'

function isMapsUrl(str) {
  return /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/i.test(str)
}

function extractUrlFromText(text) {
  if (!text) return null
  // Find first URL-like token
  const m = text.match(/https?:\/\/\S+/)
  return m ? m[0] : null
}

export default function ShareConfirmSheet({ onClose }) {
  const addUserPoi         = useAppStore((s) => s.addUserPoi)
  const shareTargetPayload = useAppStore((s) => s.shareTargetPayload)
  const clearShareTargetPayload = useAppStore((s) => s.clearShareTargetPayload)

  const [inputUrl, setInputUrl]       = useState('')
  const [status, setStatus]           = useState('idle') // idle | resolving | resolved | error | duplicate | saved
  const [resolved, setResolved]       = useState(null)
  const [editName, setEditName]       = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [errorMsg, setErrorMsg]       = useState('')
  const inputRef = useRef(null)

  // Pre-fill URL from share target payload
  useEffect(() => {
    if (!shareTargetPayload) return
    const { url, text } = shareTargetPayload
    const candidate = url || extractUrlFromText(text)
    if (candidate) {
      setInputUrl(candidate)
      // Auto-resolve if it looks like a Maps URL
      if (isMapsUrl(candidate)) {
        resolveUrl(candidate)
      }
    }
  }, [shareTargetPayload])

  // Focus input on mount if no payload
  useEffect(() => {
    if (!shareTargetPayload) {
      inputRef.current?.focus()
    }
  }, [])

  async function resolveUrl(url) {
    const trimmed = url?.trim()
    if (!trimmed) return
    if (!RESOLVER_URL) {
      setErrorMsg('Resolver URL not configured (VITE_NETLIFY_RESOLVER_URL)')
      setStatus('error')
      return
    }
    setStatus('resolving')
    setErrorMsg('')
    try {
      const endpoint = `${RESOLVER_URL}?url=${encodeURIComponent(trimmed)}`
      const res = await fetch(endpoint)
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to resolve URL')
        setStatus('error')
        return
      }
      // Check for duplicate by place_id
      if (data.placeId) {
        const existing = await getUserPoiByPlaceId(data.placeId)
        if (existing) {
          setErrorMsg(`Already saved as "${existing.name}"`)
          setStatus('duplicate')
          return
        }
      }
      setResolved(data)
      setEditName(data.name ?? '')
      setEditNotes('')
      setStatus('resolved')
    } catch (err) {
      setErrorMsg('Network error — are you online?')
      setStatus('error')
    }
  }

  async function handleSave() {
    if (!resolved) return
    const poi = await saveUserPoi({
      ...resolved,
      name: editName.trim() || resolved.name,
      notes: editNotes.trim() || null,
    })
    addUserPoi(poi)
    setStatus('saved')
    clearShareTargetPayload()
    setTimeout(onClose, 800)
  }

  function handleClose() {
    clearShareTargetPayload()
    onClose()
  }

  const categoryLabel = resolved
    ? (CATEGORIES.find((c) => c.key === resolved.category)?.label ?? resolved.category)
    : ''

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
        style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Save Place from Google Maps
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* URL input */}
          <div className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              type="url"
              value={inputUrl}
              onChange={(e) => { setInputUrl(e.target.value); setStatus('idle'); setResolved(null) }}
              placeholder="Paste Google Maps link…"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
              dir="ltr"
            />
            <button
              onClick={() => resolveUrl(inputUrl)}
              disabled={!inputUrl.trim() || status === 'resolving'}
              className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 active:bg-sky-600 shrink-0"
            >
              {status === 'resolving' ? '…' : 'Go'}
            </button>
          </div>

          {/* Resolving spinner */}
          {status === 'resolving' && (
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
              <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Resolving place…
            </div>
          )}

          {/* Error / duplicate */}
          {(status === 'error' || status === 'duplicate') && (
            <p className="mt-3 text-sm text-red-500 dark:text-red-400">{errorMsg}</p>
          )}

          {/* Success saved */}
          {status === 'saved' && (
            <p className="mt-4 text-sm text-green-500 font-medium">Saved!</p>
          )}

          {/* Resolved place card */}
          {status === 'resolved' && resolved && (
            <div className="mt-4 space-y-3">
              {/* Category badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full px-2 py-0.5 font-medium">
                  {categoryLabel}
                </span>
                {resolved.rating != null && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                    ⭐ {resolved.rating}
                  </span>
                )}
              </div>

              {/* Editable name */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-semibold"
                />
              </div>

              {/* Address */}
              {resolved.address && (
                <div className="flex gap-2 items-start">
                  <span className="text-base shrink-0">📍</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{resolved.address}</p>
                </div>
              )}

              {/* Phone */}
              {resolved.phone && (
                <div className="flex gap-2 items-center">
                  <span className="text-base shrink-0">📞</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{resolved.phone}</p>
                </div>
              )}

              {/* Website */}
              {resolved.website && (
                <div className="flex gap-2 items-center">
                  <span className="text-base shrink-0">🌐</span>
                  <p className="text-sm text-sky-600 dark:text-sky-400 truncate">
                    {resolved.website.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              )}

              {/* Personal note */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Personal note (optional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  dir="auto"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — only shown when resolved */}
        {status === 'resolved' && (
          <div className="px-4 pt-3 pb-2 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-indigo-500 text-white active:bg-indigo-600"
            >
              Save Place
            </button>
          </div>
        )}
      </div>
    </>
  )
}
