import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { syncPlanEntries } from '../db/githubSync.js'

export function useGithubSync() {
  const setPlanEntries      = useAppStore((s) => s.setPlanEntries)
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
      setPlanEntries(result.entries)
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
  }, [setPlanEntries, setGithubSyncStatus, setGithubSyncError, setGithubLastSync])

  return { triggerSync, status, error, lastSync, configured, isOnline }
}
