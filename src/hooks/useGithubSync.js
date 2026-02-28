import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { syncPlanEntries } from '../db/githubSync.js'

function enrichWithCoords(entries, locations) {
  const locMap = new Map(locations.map((l) => [l.id, l]))
  return entries.map((e) => {
    if (e.lat == null && e.lng == null && e.locationId) {
      const loc = locMap.get(e.locationId)
      if (loc?.lat != null && loc?.lng != null) return { ...e, lat: loc.lat, lng: loc.lng }
    }
    return e
  })
}

export function useGithubSync() {
  const setPlanEntries      = useAppStore((s) => s.setPlanEntries)
  const locations           = useAppStore((s) => s.locations)
  const setGithubSyncStatus = useAppStore((s) => s.setGithubSyncStatus)
  const setGithubSyncError  = useAppStore((s) => s.setGithubSyncError)
  const setGithubLastSync   = useAppStore((s) => s.setGithubLastSync)
  const status              = useAppStore((s) => s.githubSyncStatus)
  const error               = useAppStore((s) => s.githubSyncError)
  const lastSync            = useAppStore((s) => s.githubLastSync)
  const configured          = useAppStore((s) => s.githubConfigured)

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const resetTimer = useRef(null)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const triggerSync = useCallback(async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)

    setGithubSyncStatus('syncing')
    setGithubSyncError(null)

    try {
      const result = await syncPlanEntries()
      setPlanEntries(enrichWithCoords(result.entries, locations))
      setGithubLastSync(result.syncedAt)
      setGithubSyncStatus('success')
    } catch (err) {
      const msg = err.message === 'OFFLINE'
        ? 'You are offline'
        : err.message === 'NO_TOKEN'
        ? 'No GitHub token configured'
        : err.message === 'CONFLICT'
        ? 'Conflict — tap sync again'
        : err.message
      setGithubSyncError(msg)
      setGithubSyncStatus('error')
    }

    // Auto-reset status after 4 seconds
    resetTimer.current = setTimeout(() => {
      setGithubSyncStatus('idle')
      setGithubSyncError(null)
    }, 4000)
  }, [setPlanEntries, setGithubSyncStatus, setGithubSyncError, setGithubLastSync, locations])

  return { triggerSync, status, error, lastSync, configured, isOnline }
}
