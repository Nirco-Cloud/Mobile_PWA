import { useEffect } from 'react'
import { useAppStore } from '../store/appStore.js'

export function useDarkMode() {
  const isDark = useAppStore((s) => s.isDark)

  // Sync the dark class to <html> whenever isDark changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // When "Use device theme" is ON, follow OS preference changes in real time
  useEffect(() => {
    if (!isDark) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    // Apply current system state immediately
    document.documentElement.classList.toggle('dark', mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [isDark])
}
