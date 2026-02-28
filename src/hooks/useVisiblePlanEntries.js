import { useMemo } from 'react'
import { useAppStore } from '../store/appStore.js'

/** Returns plan entries with private (owner !== 'shared') entries hidden when locked. */
export function useVisiblePlanEntries() {
  const planEntries   = useAppStore((s) => s.planEntries)
  const encPassphrase = useAppStore((s) => s.encPassphrase)

  return useMemo(() => {
    if (encPassphrase) return planEntries
    return planEntries.filter((e) => !e.owner || e.owner === 'shared')
  }, [planEntries, encPassphrase])
}
