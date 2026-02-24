import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'

const TOKYO = { lat: 35.6762, lng: 139.6503 }

export function useGPS() {
  const setPosition = useAppStore((s) => s.setPosition)
  const pollInterval = useAppStore((s) => s.pollInterval)
  const demoMode = useAppStore((s) => s.demoMode)
  const pollIntervalRef = useRef(pollInterval)
  const timerRef = useRef(null)

  useEffect(() => {
    pollIntervalRef.current = pollInterval
  }, [pollInterval])

  // Demo mode: immediately set Tokyo and stop real GPS
  useEffect(() => {
    if (demoMode) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPosition(TOKYO)
    }
  }, [demoMode, setPosition])

  useEffect(() => {
    if (demoMode || !navigator.geolocation) return

    function poll() {
      if (document.visibilityState === 'hidden') {
        timerRef.current = setTimeout(poll, pollIntervalRef.current)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => console.warn('GPS error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
      timerRef.current = setTimeout(poll, pollIntervalRef.current)
    }

    poll()

    // Resume immediately when app comes back to foreground
    function onVisible() {
      if (document.visibilityState === 'visible') {
        if (timerRef.current) clearTimeout(timerRef.current)
        poll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [setPosition, demoMode])
}
