import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_PERCENT = 20
const MAX_PERCENT = 80
const DEFAULT_MAP_PERCENT = 45
const SNAP_POINTS = [30, 50, 70]

function snapTo(raw) {
  let closest = SNAP_POINTS[0]
  let minDist = Math.abs(raw - closest)
  for (const sp of SNAP_POINTS) {
    const d = Math.abs(raw - sp)
    if (d < minDist) { closest = sp; minDist = d }
  }
  return closest
}

export default function SplitLayout({ mapSlot, listSlot, bottomNavHeight = 56 }) {
  const [mapPercent, setMapPercent] = useState(DEFAULT_MAP_PERCENT)
  const containerRef  = useRef(null)
  const mapPanelRef   = useRef(null)
  const dragging      = useRef(false)
  const didMove       = useRef(false)
  const rafRef        = useRef(null)
  const pendingPct    = useRef(DEFAULT_MAP_PERCENT)

  // Stable move handler — all state via refs, no deps needed
  const moveHandler = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return
    didMove.current = true
    const rect    = containerRef.current.getBoundingClientRect()
    const y       = e.clientY - rect.top
    const percent = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, (y / rect.height) * 100))
    pendingPct.current = percent
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setMapPercent(pendingPct.current)
    })
  }, [])

  // Stable up handler via indirection so it can remove itself
  const upHandlerRef = useRef(null)
  const stableUpHandler = useCallback((e) => upHandlerRef.current(e), [])

  upHandlerRef.current = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    // Enable transition for the snap animation
    if (mapPanelRef.current) mapPanelRef.current.style.transition = 'height 200ms ease-out'

    if (!didMove.current) {
      // Tap → cycle to next snap point
      setMapPercent((h) => {
        const idx = SNAP_POINTS.indexOf(snapTo(h))
        return SNAP_POINTS[(idx + 1) % SNAP_POINTS.length]
      })
    } else {
      setMapPercent((h) => snapTo(h))
    }

    didMove.current = false
    if (containerRef.current) containerRef.current.style.touchAction = ''
    window.removeEventListener('pointermove', moveHandler)
    window.removeEventListener('pointerup',     stableUpHandler)
    window.removeEventListener('pointercancel', stableUpHandler)
  }, [moveHandler, stableUpHandler])

  const handlePointerDown = useCallback((e) => {
    dragging.current = true
    didMove.current  = false
    e.preventDefault()
    e.stopPropagation()
    // Disable transition so panel follows finger instantly during drag
    if (mapPanelRef.current) mapPanelRef.current.style.transition = 'none'
    // Block scroll on the whole container while dragging
    if (containerRef.current) containerRef.current.style.touchAction = 'none'
    window.addEventListener('pointermove',   moveHandler)
    window.addEventListener('pointerup',     stableUpHandler)
    window.addEventListener('pointercancel', stableUpHandler)
  }, [moveHandler, stableUpHandler])

  // Cleanup on unmount
  useEffect(() => () => {
    window.removeEventListener('pointermove',   moveHandler)
    window.removeEventListener('pointerup',     stableUpHandler)
    window.removeEventListener('pointercancel', stableUpHandler)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [moveHandler, stableUpHandler])

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full"
      style={{
        height: `calc(100dvh - ${bottomNavHeight}px - env(safe-area-inset-bottom))`,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Map panel */}
      <div
        ref={mapPanelRef}
        className="overflow-hidden"
        style={{ height: listSlot ? `${mapPercent}%` : '100%', minHeight: 0 }}
      >
        {mapSlot}
      </div>

      {listSlot && (
        <>
          {/* Divider — 48px hit target, visual bar centered, tap cycles snap points */}
          <div
            className="relative flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 z-10 select-none"
            style={{ height: 48, cursor: 'row-resize', flexShrink: 0, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
          >
            <div className="w-12 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
          </div>

          {/* List panel */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {listSlot}
          </div>
        </>
      )}
    </div>
  )
}
