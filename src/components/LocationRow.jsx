import { forwardRef, useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { formatDistance } from '../utils/haversine.js'
import { getCategoryColor } from '../config/categories.js'
import DayPicker from './DayPicker.jsx'

const LocationRow = forwardRef(function LocationRow({ location, distance, isSelected, isExpanded, onToggle }, ref) {
  const setSelection       = useAppStore((s) => s.setSelection)
  const setDetailLocationId = useAppStore((s) => s.setDetailLocationId)
  const position           = useAppStore((s) => s.position)
  const [showDayPicker, setShowDayPicker] = useState(false)

  function handleFocus() {
    setSelection(location.id, 'list')
  }

  function handleNameTap() {
    setSelection(location.id, 'list')
    setDetailLocationId(location.id)
  }

  return (
    <>
      <div
        ref={ref}
        className={`border-b border-gray-200 dark:border-gray-700 select-none transition-colors ${
          isSelected
            ? 'bg-sky-50 dark:bg-sky-900/30'
            : 'bg-white dark:bg-gray-900'
        }`}
        style={{ willChange: 'transform', backfaceVisibility: 'hidden', contain: 'layout style paint' }}
      >
        {/* Compact row */}
        <div className="flex items-center gap-2 px-3 py-3 min-h-[56px]">
          <CategoryDot category={location.category} onClick={handleFocus} />
          <span
            className="flex-1 truncate text-base font-medium text-gray-800 dark:text-gray-100 cursor-pointer active:text-sky-600 inline-flex items-center gap-1"
            onClick={handleNameTap}
          >
            {location.isUserPoi && (
              <span className="text-amber-500 text-xs shrink-0">★</span>
            )}
            {location.name}
          </span>
          {distance != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {formatDistance(distance)}
            </span>
          )}
          <button
            onClick={() => onToggle(location.id)}
            className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              isExpanded
                ? 'text-sky-700 border-sky-300 bg-sky-50 dark:bg-sky-900/40 dark:border-sky-600 dark:text-sky-300'
                : 'text-gray-500 border-gray-200 dark:border-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {isExpanded ? 'Close' : 'Expand'}
          </button>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
            {location.thumbnailUrl && (
              <img
                src={location.thumbnailUrl}
                alt={location.name}
                className="w-full h-32 object-cover rounded mb-2"
                loading="lazy"
              />
            )}
            {location.notes && (
              <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 mb-2" dir="auto">
                ✍️ {location.notes}
              </p>
            )}
            {location.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {location.description}
              </p>
            )}
            {location.address && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {location.address}
              </p>
            )}
            {location.openingHours && location.openingHours.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                🕐 {location.openingHours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
              </p>
            )}
            {(location.rating != null || location.phone || location.website) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {location.rating != null && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5 font-medium">
                    ⭐ {location.rating}
                  </span>
                )}
                {location.phone && (
                  <a
                    href={`tel:${location.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded px-1.5 py-0.5"
                  >
                    📞 {location.phone}
                  </a>
                )}
                {location.website && (
                  <a
                    href={location.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded px-1.5 py-0.5"
                  >
                    🌐 Website
                  </a>
                )}
              </div>
            )}
            <div className="flex gap-2">
              {(() => {
                const hasCoords = location.lat != null && location.lng != null
                return (
                  <>
                    <a
                      href={hasCoords ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}` : undefined}
                      target={hasCoords ? '_blank' : undefined}
                      rel="noreferrer"
                      className={`flex-1 text-center py-2 px-2 text-sm font-medium bg-sky-500 text-white rounded active:bg-sky-600 ${!hasCoords ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open in Maps
                    </a>
                    <a
                      href={hasCoords ? `https://wa.me/?text=${encodeURIComponent(`${location.name}\nhttps://www.google.com/maps?q=${location.lat},${location.lng}`)}` : undefined}
                      target={hasCoords ? '_blank' : undefined}
                      rel="noreferrer"
                      className={`flex-1 text-center py-2 px-2 text-sm font-medium bg-green-500 text-white rounded active:bg-green-600 ${!hasCoords ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Share
                    </a>
                  </>
                )
              })()}
              <button
                onClick={(e) => { e.stopPropagation(); setShowDayPicker(true) }}
                className="flex-1 text-center py-2 px-2 text-sm font-medium bg-indigo-500 text-white rounded active:bg-indigo-600"
              >
                + Plan
              </button>
            </div>
          </div>
        )}
      </div>

      {showDayPicker && (
        <DayPicker location={location} onClose={() => setShowDayPicker(false)} />
      )}
    </>
  )
})

function CategoryDot({ category, onClick }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 cursor-pointer"
      style={{ backgroundColor: getCategoryColor(category) }}
      onClick={onClick}
    />
  )
}

export default LocationRow
