import { useState, useEffect, useRef } from 'react'
import { BOTTOM_NAV_HEIGHT } from './BottomNav.jsx'

export default function OfflineToast() {
  const [status, setStatus] = useState(null) // null | 'offline' | 'online'
  const dismissTimer = useRef(null)

  useEffect(() => {
    function handleOffline() {
      clearTimeout(dismissTimer.current)
      setStatus('offline')
    }

    function handleOnline() {
      clearTimeout(dismissTimer.current)
      setStatus('online')
      dismissTimer.current = setTimeout(() => setStatus(null), 4000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!status) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg whitespace-nowrap ${
        status === 'offline'
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-500 text-white'
      }`}
      style={{ bottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom) + 12px)` }}
    >
      {status === 'offline' ? 'You\'re offline' : 'Back online'}
    </div>
  )
}
