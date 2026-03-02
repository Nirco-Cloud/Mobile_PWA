import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore.js'
import { syncPlanEntries } from '../db/githubSync.js'
import { enrichPlanEntries } from '../db/plannerDb.js'

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
  const syncInProgress = useRef(false)

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
    if (syncInProgress.current) return
    syncInProgress.current = true
    if (resetTimer.current) clearTimeout(resetTimer.current)

    setGithubSyncStatus('syncing')
    setGithubSyncError(null)

    try {
      const result = await syncPlanEntries()
      setPlanEntries(enrichPlanEntries(result.entries, locations))
      setGithubLastSync(result.syncedAt)
      setGithubSyncStatus('success')
    } catch (err) {
      const msg = err.message === 'OFFLINE'
        ? 'You are offline'
        : err.message === 'NO_TOKEN'
        ? 'No GitHub token configured'
        : err.message === 'CONFLICT'
        ? 'Conflict — tap sync again'
        : err.message === 'AUTH_FAILED'
        ? 'GitHub token is invalid or expired — update in Settings'
        : err.message === 'RATE_LIMITED'
        ? 'GitHub API rate limit exceeded — try again later'
        : err.message
      setGithubSyncError(msg)
      setGithubSyncStatus('error')
    } finally {
      syncInProgress.current = false
    }

    // Auto-reset status after 4 seconds
    resetTimer.current = setTimeout(() => {
      setGithubSyncStatus('idle')
      setGithubSyncError(null)
    }, 4000)
  }, [setPlanEntries, setGithubSyncStatus, setGithubSyncError, setGithubLastSync, locations])

  return { triggerSync, status, error, lastSync, configured, isOnline }
}
