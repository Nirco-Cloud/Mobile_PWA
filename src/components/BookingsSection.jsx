import { useState } from 'react'
import { ENTRY_TYPES } from '../config/entryTypes.js'
import { useAppStore } from '../store/appStore.js'
import { deletePlanEntry } from '../db/plannerDb.js'
import { useDecrypt } from '../hooks/useDecrypt.js'

function NavigateFromSheet({ entry, onClose }) {
  const planEntries = useAppStore((s) => s.planEntries)
  const dest = `${entry.lat},${entry.lng}`

  const prevDayGeoEntries = planEntries
    .filter((e) => e.day === entry.day - 1 && !e.deletedAt && e.lat != null && e.lng != null)
    .sort((a, b) => a.order - b.order)
  const lastStop = prevDayGeoEntries[prevDayGeoEntries.length - 1] ?? null

  const lastHotel = planEntries
    .filter((e) => e.type === 'hotel' && e.day < entry.day && !e.deletedAt && e.lat != null && e.lng != null)
    .sort((a, b) => b.day - a.day)[0] ?? null

  function navigate(origin) {
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`
    window.open(url, '_blank')
    navigator.vibrate?.(15)
    onClose()
  }

  if (entry.day <= 1 || (!lastStop && !lastHotel)) {
    navigate(null)
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-70 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="px-5 pb-3">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Navigate to</p>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{entry.name}</p>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {lastStop && (
            <button
              onClick={() => navigate(`${lastStop.lat},${lastStop.lng}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 active:bg-sky-100 text-left transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-sky-500 shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">From last stop</p>
                <p className="text-xs text-sky-500 dark:text-sky-400 truncate">{lastStop.name} · Day {lastStop.day}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-sky-400 shrink-0">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {lastHotel && (
            <button
              onClick={() => navigate(`${lastHotel.lat},${lastHotel.lng}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 active:bg-violet-100 text-left transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-violet-500 shrink-0">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">From last hotel</p>
                <p className="text-xs text-violet-500 dark:text-violet-400 truncate">{lastHotel.name} · Day {lastHotel.day}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-violet-400 shrink-0">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 mt-1">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 rounded-2xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

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

function BookingCard({ entry, onDelete, travelTime }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showNavigateSheet, setShowNavigateSheet] = useState(false)
  const hasCoords = entry.lat != null && entry.lng != null
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  const meta = entry.meta
  const tt = travelTime

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}
    >
      <div className="flex items-start gap-2">
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
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
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">
              {entry.name}
            </span>
            {tt?.walk && (
              <span className="text-[12px] font-medium text-green-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 inline -mt-0.5 mr-0.5"><path d="M13 4v3l-2 4-3 1v4l2 4M15 4a1 1 0 100-2 1 1 0 000 2zM12 18l-1 4M17 7l2 4h-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {tt.walk}
              </span>
            )}
            {tt?.drive && (
              <span className="text-[12px] font-medium text-sky-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 inline -mt-0.5 mr-0.5"><path d="M5 17h14M5 17a2 2 0 01-2-2V9l2-4h14l2 4v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {tt.drive}
              </span>
            )}
            {tt?.driveKm && <span className="text-[12px] text-gray-400">{tt.driveKm} km</span>}
          </div>
          <p className="text-[11px] text-amber-500 font-medium mt-0.5">
            {typeDef.label}
          </p>

          {/* Action row — Confirmation + Navigate */}
          {(hasCoords || meta?.confirmationNumber) && (
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {meta?.confirmationNumber && (
                <CopyBadge value={meta.confirmationNumber} />
              )}
              {hasCoords && (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(entry.name)}/@${entry.lat},${entry.lng},17z`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 text-white text-[12px] font-semibold shadow-sm active:bg-sky-600 transition-colors min-h-[36px]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 9m0 8V9m0 0L9 7" />
                  </svg>
                  Maps
                </a>
              )}
            </div>
          )}

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
        </div>

        {/* Delete */}
        <button
          onClick={() => setConfirmingDelete(true)}
          className="shrink-0 p-2 text-gray-300 dark:text-gray-600 active:text-red-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Delete booking"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmingDelete && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <span className="text-xs text-red-600 dark:text-red-400 flex-1">Delete this booking?</span>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 active:bg-gray-100 min-h-[36px]"
          >
            Cancel
          </button>
          <button
            onClick={() => { setConfirmingDelete(false); onDelete() }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg active:bg-red-600 min-h-[36px]"
          >
            Delete
          </button>
        </div>
      )}

      {showNavigateSheet && (
        <NavigateFromSheet entry={entry} onClose={() => setShowNavigateSheet(false)} />
      )}
    </div>
  )
}

export default function BookingsSection({ dayNumber, travelTimes }) {
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
              travelTime={travelTimes?.[entry.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
