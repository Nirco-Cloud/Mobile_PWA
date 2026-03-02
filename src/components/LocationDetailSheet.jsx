import { useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { haversine, formatDistance } from '../utils/haversine.js'
import DayPicker from './DayPicker.jsx'

export default function LocationDetailSheet() {
  const locations          = useAppStore((s) => s.locations)
  const detailLocationId   = useAppStore((s) => s.detailLocationId)
  const clearDetailLocation = useAppStore((s) => s.clearDetailLocation)
  const position           = useAppStore((s) => s.position)
  const [showDayPicker, setShowDayPicker]   = useState(false)
  const [openingHoursOpen, setOpeningHoursOpen] = useState(false)

  const location = locations.find((l) => l.id === detailLocationId)

  if (!location) return null

  const hasCoords = location.lat != null && location.lng != null
  const distance  = hasCoords && position
    ? formatDistance(haversine(position.lat, position.lng, location.lat, location.lng))
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={clearDetailLocation}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
        style={{ maxHeight: '85dvh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2 pt-1 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {location.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {location.category && location.category !== 'location' && (
                  <span className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full px-2 py-0.5 font-medium">
                    {location.category}
                  </span>
                )}
                {location.rating != null && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5 font-medium">
                    ⭐ {location.rating}
                  </span>
                )}
                {distance && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{distance} away</span>
                )}
              </div>
            </div>
            <button
              onClick={clearDetailLocation}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-lg leading-none mt-0.5"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="space-y-3 pt-3">

            {/* Personal notes */}
            {location.notes && (
              <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2" dir="auto">
                ✍️ {location.notes}
              </p>
            )}

            {/* Description */}
            {location.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                "{location.description}"
              </p>
            )}

            {/* Address */}
            {location.address && (
              <div className="flex gap-2 items-start">
                <span className="text-base shrink-0">📍</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">{location.address}</p>
              </div>
            )}

            {/* Phone */}
            {location.phone && (
              <div className="flex gap-2 items-center">
                <span className="text-base shrink-0">📞</span>
                <a
                  href={`tel:${location.phone}`}
                  className="text-sm text-sky-600 dark:text-sky-400"
                >
                  {location.phone}
                </a>
              </div>
            )}

            {/* Website */}
            {location.website && (
              <div className="flex gap-2 items-center">
                <span className="text-base shrink-0">🌐</span>
                <a
                  href={location.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-sky-600 dark:text-sky-400 truncate"
                >
                  {location.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            {/* Opening hours */}
            {location.openingHours?.length > 0 && (
              <div>
                <button
                  onClick={() => setOpeningHoursOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>🕐</span>
                  <span>Opening hours</span>
                  <span className="text-gray-400">{openingHoursOpen ? '▲' : '▼'}</span>
                </button>
                {openingHoursOpen && (
                  <ul className="mt-2 space-y-0.5 pl-6">
                    {location.openingHours.map((h, i) => (
                      <li key={i} className="text-xs text-gray-500 dark:text-gray-400">{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Coordinates */}
            {hasCoords && (
              <p className="text-xs font-mono text-gray-400 dark:text-gray-600">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pt-3 pb-2 border-t border-gray-100 dark:border-gray-800 shrink-0 flex gap-2">
          <a
            href={hasCoords ? `https://www.google.com/maps/dir/?api=1${position ? `&origin=${position.lat},${position.lng}` : ''}&destination=${location.lat},${location.lng}` : undefined}
            target={hasCoords ? '_blank' : undefined}
            rel="noreferrer"
            className={`flex-1 text-center py-3 text-sm font-semibold bg-sky-500 text-white rounded-xl active:bg-sky-600 ${!hasCoords ? 'opacity-50 pointer-events-none' : ''}`}
          >
            Open Maps
          </a>
          <a
            href={hasCoords ? `https://wa.me/?text=${encodeURIComponent(`${location.name}\nhttps://www.google.com/maps?q=${location.lat},${location.lng}`)}` : undefined}
            target={hasCoords ? '_blank' : undefined}
            rel="noreferrer"
            className={`flex-1 text-center py-3 text-sm font-semibold bg-green-500 text-white rounded-xl active:bg-green-600 ${!hasCoords ? 'opacity-50 pointer-events-none' : ''}`}
          >
            Share
          </a>
          <button
            onClick={() => setShowDayPicker(true)}
            className="flex-1 py-3 text-sm font-semibold bg-indigo-500 text-white rounded-xl active:bg-indigo-600"
          >
            + Plan
          </button>
        </div>
      </div>

      {showDayPicker && (
        <DayPicker location={location} onClose={() => setShowDayPicker(false)} />
      )}
    </>
  )
}
