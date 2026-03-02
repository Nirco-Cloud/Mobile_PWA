import { useEffect } from 'react'
import { useAppStore } from '../store/appStore.js'

export function useBattery() {
  const setBatteryLevel = useAppStore((s) => s.setBatteryLevel)
  const setPollInterval = useAppStore((s) => s.setPollInterval)

  useEffect(() => {
    let battery = null
    let onLevelChange = null
    let onChargingChange = null

    function updateInterval(b) {
      const level = b.level
      setBatteryLevel(level)
      setPollInterval(level < 0.2 ? 60000 : 15000)
    }

    async function init() {
      battery = await navigator.getBattery?.()
      if (!battery) return

      updateInterval(battery)
      onLevelChange = () => updateInterval(battery)
      onChargingChange = () => updateInterval(battery)
      battery.addEventListener('levelchange', onLevelChange)
      battery.addEventListener('chargingchange', onChargingChange)
    }

    init()

    return () => {
      if (battery) {
        if (onLevelChange) battery.removeEventListener('levelchange', onLevelChange)
        if (onChargingChange) battery.removeEventListener('chargingchange', onChargingChange)
      }
    }
  }, [setBatteryLevel, setPollInterval])
}
