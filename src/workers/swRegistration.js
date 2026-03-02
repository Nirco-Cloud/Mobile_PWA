import { useRegisterSW } from 'virtual:pwa-register/react'

export function useServiceWorker() {
  const { updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (!r) {
        console.warn('[SW] Registration returned undefined — service worker may not be active')
        return
      }
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
