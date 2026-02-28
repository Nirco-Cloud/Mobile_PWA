import { useRegisterSW } from 'virtual:pwa-register/react'

export function useServiceWorker() {
  const { updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered:', r)
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error)
    },
    onNeedRefresh() {
      // Auto-apply new service worker so users always get latest code
      updateServiceWorker(true)
    },
  })
}
