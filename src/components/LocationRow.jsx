import { forwardRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { formatDistance } from '../utils/haversine.js'

const LocationRow = forwardRef(function LocationRow({ location, distance, isSelected, isExpanded, onToggle }, ref) {
  const setSelection  = useAppStore((s) => s.setSelection)
  const position      = useAppStore((s) => s.position)

  function handleClick() {
    setSelection(location.id, 'list')
    onToggle(location.id)
  }

  return (
    <>
    <div
      ref={ref}
      onClick={handleClick}
      className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none transition-colors ${
        isSelected
          ? 'bg-sky-50 dark:bg-sky-900/30'
          : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
    >
      {/* Compact row */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <CategoryDot category={location.category} />
        <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
          {location.name}
        </span>
        {distance != null && (
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {formatDistance(distance)}
          </span>
        )}
        <span className="text-xs text-gray-300 dark:text-gray-600 shrink-0">
          {isExpanded ? '▲' : '▼'}
        </span>
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
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              {location.address}
            </p>
          )}
          <div className="flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1${position ? `&origin=${position.lat},${position.lng}` : ''}&destination=${location.lat},${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 px-2 text-xs font-medium bg-sky-500 text-white rounded active:bg-sky-600"
              onClick={(e) => e.stopPropagation()}
            >
              Open in Maps
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `${location.name}\nhttps://www.google.com/maps?q=${location.lat},${location.lng}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-1.5 px-2 text-xs font-medium bg-green-500 text-white rounded active:bg-green-600"
              onClick={(e) => e.stopPropagation()}
            >
              Share on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
</>
  )
})

function CategoryDot({ category }) {
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
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
}

export default LocationRow
