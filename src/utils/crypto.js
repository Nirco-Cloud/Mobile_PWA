const ENC_PREFIX = 'enc:'

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptValue(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return ENC_PREFIX + toBase64(salt) + '.' + toBase64(iv) + '.' + toBase64(ciphertext)
}

export async function decryptValue(encoded, passphrase) {
  if (!encoded || !encoded.startsWith(ENC_PREFIX)) return encoded
  try {
    const parts = encoded.slice(ENC_PREFIX.length).split('.')
    if (parts.length !== 3) return encoded
    const [saltB64, ivB64, ctB64] = parts
    const salt = fromBase64(saltB64)
    const iv = fromBase64(ivB64)
    const ciphertext = fromBase64(ctB64)
    const key = await deriveKey(passphrase, salt)
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
    return new TextDecoder().decode(plainBuffer)
  } catch {
    return null
  }
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}
