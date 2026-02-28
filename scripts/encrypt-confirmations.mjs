import { webcrypto } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const crypto = webcrypto
const PASSPHRASE = process.argv[2]
if (!PASSPHRASE) {
  console.error('Usage: node scripts/encrypt-confirmations.mjs <passphrase>')
  process.exit(1)
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64')
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
    ['encrypt'],
  )
}

async function encryptValue(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return 'enc:' + toBase64(salt) + '.' + toBase64(iv) + '.' + toBase64(ciphertext)
}

const planPath = 'public/data/plan.json'
const plan = JSON.parse(readFileSync(planPath, 'utf-8'))

let count = 0
for (const entry of plan.entries) {
  const conf = entry.meta?.confirmationNumber
  if (conf && !conf.startsWith('enc:')) {
    entry.meta.confirmationNumber = await encryptValue(conf, PASSPHRASE)
    count++
    console.log(`Encrypted: ${entry.name} (${conf.slice(0, 3)}...)`)
  }
}

writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n')
console.log(`Done. ${count} confirmation numbers encrypted.`)
