import { useAppStore } from '../store/appStore.js'

// Active state: subtle dark rather than bright blue
const ACTIVE_CLS   = 'text-gray-800 dark:text-gray-100'
const INACTIVE_CLS = 'text-gray-400 dark:text-gray-500'

export default function MapBottomControls() {
  const mapFilter         = useAppStore((s) => s.mapFilter)
  const setMapFilter      = useAppStore((s) => s.setMapFilter)
  const showNearbyList    = useAppStore((s) => s.showNearbyList)
  const setShowNearbyList = useAppStore((s) => s.setShowNearbyList)

  function toggle(filter) {
    setMapFilter(mapFilter === filter ? 'all' : filter)
  }

  const nearbyActive  = showNearbyList
  const walkingActive = mapFilter === 'walking'
  const hotelsActive  = mapFilter === 'hotels'

  return (
    <div
      className="flex-shrink-0 flex items-stretch bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{ height: 52 }}
    >
      {/* Nearby */}
      <button
        onClick={() => setShowNearbyList(!showNearbyList)}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${nearbyActive ? ACTIVE_CLS : INACTIVE_CLS}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
          <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
          <line x1="4" y1="12" x2="16" y2="12" strokeLinecap="round" />
          <line x1="4" y1="18" x2="12" y2="18" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: nearbyActive ? 500 : 400 }}>Nearby</span>
      </button>

      <div className="self-stretch my-3 w-px bg-gray-150 dark:bg-gray-800" />

      {/* Walking */}
      <button
        onClick={() => toggle('walking')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${walkingActive ? ACTIVE_CLS : INACTIVE_CLS}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
          <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
          <path d="M9 17l1-5 2 2 1-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 9l-2 3h4l-1 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 22l1-3" strokeLinecap="round" />
          <path d="M14 22l-1-3" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: walkingActive ? 500 : 400 }}>
          {walkingActive ? 'Walking · 1.5km' : 'Walking'}
        </span>
      </button>

      <div className="self-stretch my-3 w-px bg-gray-150 dark:bg-gray-800" />

      {/* Hotels */}
      <button
        onClick={() => toggle('hotels')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${hotelsActive ? ACTIVE_CLS : INACTIVE_CLS}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
          <path d="M3 22V8l9-6 9 6v14" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 22V16h6v6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 10h6" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: hotelsActive ? 500 : 400 }}>Hotels</span>
      </button>
    </div>
  )
}
