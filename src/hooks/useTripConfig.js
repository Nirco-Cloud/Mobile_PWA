import { useMemo } from 'react'
import { useAppStore } from '../store/appStore.js'
import { makeTripHelpers } from '../config/trip.js'

export function useTripConfig() {
  const tripStart = useAppStore((s) => s.tripStart)
  const tripEnd   = useAppStore((s) => s.tripEnd)
  const helpers   = useMemo(() => makeTripHelpers(tripStart, tripEnd), [tripStart, tripEnd])
  return { tripStart, tripEnd, ...helpers }
}
