/**
 * PinLock.jsx
 * Full-screen PIN entry gate. Hashes the entered PIN client-side using
 * SubtleCrypto and compares against the build-time injected hash.
 * On success, writes a flag to localStorage so the user isn't asked again.
 */

import { useState, useEffect } from 'react'

const STORED_KEY = 'pwa_unlocked'
const PIN_HASH   = import.meta.env.VITE_PIN_HASH

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked() {
  return localStorage.getItem(STORED_KEY) === '1'
}

export default function PinLock({ onUnlock }) {
  const [digits, setDigits]   = useState('')
  const [shake, setShake]     = useState(false)
  const [checking, setChecking] = useState(false)

  // If no hash is configured (dev without secret), pass through immediately
  useEffect(() => {
    if (!PIN_HASH) onUnlock()
  }, [])

  async function handleDigit(d) {
    if (checking) return
    const next = digits + d
    setDigits(next)

    if (next.length >= 9) {
      setChecking(true)
      const hash = await sha256(next)
      if (hash === PIN_HASH) {
        localStorage.setItem(STORED_KEY, '1')
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setDigits(''); setChecking(false) }, 600)
      }
    }
  }

  function handleDelete() {
    setDigits(d => d.slice(0, -1))
  }

  const dots = Array.from({ length: 9 }, (_, i) => i < digits.length)

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Icon */}
      <div className="mb-6 text-sky-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      <p className="text-gray-400 text-sm mb-6 tracking-widest uppercase">Enter PIN</p>

      {/* Dots */}
      <div className={`flex gap-3 mb-10 transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {dots.map((filled, i) => (
          <div key={i} className={`w-3 h-3 rounded-full border-2 transition-colors ${filled ? 'bg-sky-400 border-sky-400' : 'border-gray-600'}`} />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button
            key={n}
            onClick={() => handleDigit(String(n))}
            className="h-16 rounded-2xl bg-gray-800 text-white text-2xl font-light active:bg-gray-700 select-none"
          >
            {n}
          </button>
        ))}
        {/* empty, 0, delete */}
        <div />
        <button onClick={() => handleDigit('0')} className="h-16 rounded-2xl bg-gray-800 text-white text-2xl font-light active:bg-gray-700 select-none">
          0
        </button>
        <button onClick={handleDelete} className="h-16 rounded-2xl bg-gray-800 text-gray-400 text-xl active:bg-gray-700 flex items-center justify-center select-none">
          ⌫
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-8px) }
          40%      { transform: translateX(8px) }
          60%      { transform: translateX(-6px) }
          80%      { transform: translateX(6px) }
        }
      `}</style>
    </div>
  )
}
