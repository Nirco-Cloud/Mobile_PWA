import { forwardRef, useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { formatDistance } from '../utils/haversine.js'
import DayPicker from './DayPicker.jsx'

const LocationRow = forwardRef(function LocationRow({ location, distance, isSelected, isExpanded, onToggle }, ref) {
  const setSelection  = useAppStore((s) => s.setSelection)
  const position      = useAppStore((s) => s.position)
  const [showDayPicker, setShowDayPicker] = useState(false)

  function handleFocus() {
    setSelection(location.id, 'list')
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
            className="flex-1 truncate text-base font-medium text-gray-800 dark:text-gray-100 cursor-pointer active:text-sky-600"
            onClick={handleFocus}
          >
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
            Edit
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
            {location.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {location.description}
              </p>
            )}
            {location.address && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {location.address}
              </p>
            )}
            <div className="flex gap-2">
              {(() => {
                const hasCoords = location.lat != null && location.lng != null
                return (
                  <>
                    <a
                      href={hasCoords ? `https://www.google.com/maps/dir/?api=1${position ? `&origin=${position.lat},${position.lng}` : ''}&destination=${location.lat},${location.lng}` : undefined}
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
  const colors = {
    'Izakaya': 'bg-amber-500',
    'Ramen': 'bg-orange-500',
    'איזורים ואתרים': 'bg-blue-500',
    'חטיפים ומלוחים': 'bg-yellow-500',
    'חנויות': 'bg-pink-400',
    'מסעדות גבוהות / הזמנה': 'bg-purple-500',
    'מסעדות ואוכל רחוב': 'bg-red-500',
    'סושי יקר ומוקפד': 'bg-teal-500',
    'סושי עממי ולא יקר': 'bg-teal-400',
    'קפה/תה/אלכוהול': 'bg-rose-400',
    default: 'bg-gray-400',
  }
  const color = colors[category] ?? colors.default
  return <span className={`w-2 h-2 rounded-full shrink-0 cursor-pointer ${color}`} onClick={onClick} />
}

export default LocationRow
