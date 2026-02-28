import { useState } from 'react'
import { ENTRY_TYPES } from '../config/entryTypes.js'
import { useAppStore } from '../store/appStore.js'
import { deletePlanEntry } from '../db/plannerDb.js'
import { useDecrypt } from '../hooks/useDecrypt.js'

// Tap-to-copy for confirmation numbers (auto-decrypts encrypted values)
function CopyBadge({ value }) {
  const [copied, setCopied] = useState(false)
  const decrypted = useDecrypt(value)
  if (!decrypted) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(decrypted)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[12px] font-mono text-amber-700 dark:text-amber-300 active:bg-amber-100 dark:active:bg-amber-800/30 transition-colors"
    >
      {copied ? (
        <span className="text-green-500 font-sans font-medium">Copied!</span>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {decrypted}
        </>
      )}
    </button>
  )
}

function formatTime(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return val }
}

function formatDate(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  } catch { return val }
}

function BookingCard({ entry, onDelete }) {
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  const meta = entry.meta

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}
    >
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{ backgroundColor: typeDef.accentColor + '20' }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={typeDef.accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d={typeDef.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">
            {entry.name}
          </p>
          <p className="text-[11px] text-amber-500 font-medium mt-0.5">
            {typeDef.label}
          </p>

          {/* Meta details */}
          {meta && entry.type === 'flight' && (
            <div className="mt-1.5 space-y-0.5">
              {(meta.departureStation || meta.arrivalStation) && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  {meta.departureStation || '?'} → {meta.arrivalStation || '?'}
                </p>
              )}
              {meta.departureTime && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(meta.departureTime)}</p>
              )}
            </div>
          )}
          {meta && entry.type === 'hotel' && (
            <div className="mt-1.5 space-y-0.5">
              {(meta.checkIn || meta.checkOut) && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  {formatDate(meta.checkIn)}{meta.checkOut ? ` — ${formatDate(meta.checkOut)}` : ''}
                  {meta.nights ? ` (${meta.nights}N)` : ''}
                </p>
              )}
            </div>
          )}
          {meta && entry.type === 'car_rental' && meta.company && (
            <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{meta.company}</p>
          )}
          {meta && entry.type === 'activity' && meta.venue && (
            <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{meta.venue}</p>
          )}
          {entry.type === 'note' && entry.note && (
            <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2">{entry.note}</p>
          )}

          {/* Confirmation number — prominent tap-to-copy */}
          {meta?.confirmationNumber && (
            <div className="mt-2">
              <CopyBadge value={meta.confirmationNumber} />
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="shrink-0 p-1 text-gray-300 dark:text-gray-600 active:text-red-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function BookingsSection({ dayNumber }) {
  const [isOpen, setIsOpen]   = useState(true)
  const planEntries           = useAppStore((s) => s.planEntries)
  const encPassphrase         = useAppStore((s) => s.encPassphrase)
  const removePlanEntry       = useAppStore((s) => s.removePlanEntry)

  // Hide entire section when locked
  if (!encPassphrase) return null

  const bookings = planEntries
    .filter((e) => e.day === dayNumber && e.owner === 'nirco')
    .sort((a, b) => a.order - b.order)

  if (bookings.length === 0) return null

  async function handleDelete(id) {
    await deletePlanEntry(id)
    removePlanEntry(id)
  }

  return (
    <div className="mb-2">
      {/* Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 py-2 active:opacity-70"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-amber-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          My Bookings
        </span>
        <span className="text-[11px] font-medium text-amber-500 bg-amber-100 dark:bg-amber-900/30 rounded-full px-1.5 py-0.5">
          {bookings.length}
        </span>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="space-y-2 pb-2">
          {bookings.map((entry) => (
            <BookingCard
              key={entry.id}
              entry={entry}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
