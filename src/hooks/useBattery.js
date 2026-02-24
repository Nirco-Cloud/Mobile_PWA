import { useEffect } from 'react'
import { useAppStore } from '../store/appStore.js'

export function useBattery() {
  const setBatteryLevel = useAppStore((s) => s.setBatteryLevel)
  const setPollInterval = useAppStore((s) => s.setPollInterval)

  useEffect(() => {
    let battery = null

    function updateInterval(b) {
      const level = b.level
      setBatteryLevel(level)
      setPollInterval(level < 0.2 ? 60000 : 15000)
    }

    async function init() {
      battery = await navigator.getBattery?.()
      if (!battery) return

      updateInterval(battery)
      battery.addEventListener('levelchange', () => updateInterval(battery))
      battery.addEventListener('chargingchange', () => updateInterval(battery))
    }

    init()

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', () => updateInterval(battery))
        battery.removeEventListener('chargingchange', () => updateInterval(battery))
      }
    }
  }, [setBatteryLevel, setPollInterval])
}
