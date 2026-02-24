import { useState, useRef, useCallback } from 'react'

const MIN_PERCENT = 20
const MAX_PERCENT = 80
const DEFAULT_MAP_PERCENT = 45

export default function SplitLayout({ mapSlot, listSlot, bottomNavHeight = 56 }) {
  const [mapPercent, setMapPercent] = useState(DEFAULT_MAP_PERCENT)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const handlePointerDown = useCallback((e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percent = (y / rect.height) * 100
    setMapPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent)))
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

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
        className="overflow-hidden"
        style={{ height: `${mapPercent}%`, minHeight: 0 }}
      >
        {mapSlot}
      </div>

      {/* Divider */}
      <div
        className="relative flex items-center justify-center bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 z-10"
        style={{
          height: 20,
          cursor: 'row-resize',
          touchAction: 'none',
          flexShrink: 0,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-12 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
      </div>

      {/* List panel */}
      <div
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      >
        {listSlot}
      </div>
    </div>
  )
}
