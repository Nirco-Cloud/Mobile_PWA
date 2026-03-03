import { useAppStore } from '../store/appStore.js'

export default function MapBottomControls() {
  const mapFilter        = useAppStore((s) => s.mapFilter)
  const setMapFilter     = useAppStore((s) => s.setMapFilter)
  const showNearbyList   = useAppStore((s) => s.showNearbyList)
  const setShowNearbyList = useAppStore((s) => s.setShowNearbyList)

  function toggle(filter) {
    setMapFilter(mapFilter === filter ? 'all' : filter)
  }

  return (
    <div
      className="flex-shrink-0 flex items-stretch bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{ height: 52 }}
    >
      {/* Nearby — controls list overlay only, no map filter */}
      <button
        onClick={() => setShowNearbyList(!showNearbyList)}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${
          showNearbyList ? 'text-sky-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
          <line x1="4" y1="12" x2="16" y2="12" strokeLinecap="round" />
          <line x1="4" y1="18" x2="12" y2="18" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium">Nearby</span>
      </button>

      <div className="self-stretch my-2 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Walking — mutually exclusive map filter */}
      <button
        onClick={() => toggle('walking')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${
          mapFilter === 'walking' ? 'text-sky-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
          <path d="M9 17l1-5 2 2 1-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 9l-2 3h4l-1 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 22l1-3" strokeLinecap="round" />
          <path d="M14 22l-1-3" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium">Walking</span>
        {mapFilter === 'walking' && (
          <span style={{ fontSize: 9, marginTop: -2, color: '#38bdf8' }}>1.5 km</span>
        )}
      </button>

      <div className="self-stretch my-2 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Hotels — mutually exclusive map filter */}
      <button
        onClick={() => toggle('hotels')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-gray-50 dark:active:bg-gray-800/60 ${
          mapFilter === 'hotels' ? 'text-sky-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M3 22V8l9-6 9 6v14" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 22V16h6v6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 10h6" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium">Hotels</span>
      </button>
    </div>
  )
}
