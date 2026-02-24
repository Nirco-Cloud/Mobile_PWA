import { useEffect, useRef } from 'react'
import SunCalc from 'suncalc'
import { useAppStore } from '../store/appStore.js'

export function useDarkMode() {
  const lat = useAppStore((s) => s.position?.lat)
  const lng = useAppStore((s) => s.position?.lng)
  const setIsDark = useAppStore((s) => s.setIsDark)
  const timerRef = useRef(null)

  useEffect(() => {
    if (lat == null || lng == null) return

    function applyAndSchedule() {
      const now = new Date()
      const times = SunCalc.getTimes(now, lat, lng)

      if (isNaN(times.sunrise.getTime()) || isNaN(times.sunset.getTime())) return

      const isNight = now < times.sunrise || now > times.sunset
      document.documentElement.classList.toggle('dark', isNight)
      setIsDark(isNight)

      // Schedule next toggle
      let nextToggle
      if (now < times.sunrise) {
        nextToggle = times.sunrise.getTime() - now.getTime()
      } else if (now < times.sunset) {
        nextToggle = times.sunset.getTime() - now.getTime()
      } else {
        // After sunset — schedule tomorrow's sunrise
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lng)
        nextToggle = tomorrowTimes.sunrise.getTime() - now.getTime()
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(applyAndSchedule, nextToggle + 1000)
    }

    applyAndSchedule()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lat, lng, setIsDark])
}
