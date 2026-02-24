import { useRegisterSW } from 'virtual:pwa-register/react'

export function useServiceWorker() {
  useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered:', r)
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error)
    },
  })
}
