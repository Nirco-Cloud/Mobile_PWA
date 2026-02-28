import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore.js'
import { decryptValue, isEncrypted } from '../utils/crypto.js'

export function useDecrypt(value) {
  const passphrase = useAppStore((s) => s.encPassphrase)
  const [decrypted, setDecrypted] = useState(isEncrypted(value) ? null : value)

  useEffect(() => {
    if (!value || !isEncrypted(value)) {
      setDecrypted(value ?? null)
      return
    }
    if (!passphrase) {
      setDecrypted(null)
      return
    }
    let cancelled = false
    decryptValue(value, passphrase).then((result) => {
      if (!cancelled) setDecrypted(result)
    })
    return () => { cancelled = true }
  }, [value, passphrase])

  return decrypted
}
