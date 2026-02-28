import { useState } from 'react'
import { ENTRY_TYPES } from '../config/entryTypes.js'

// SVG icon for an entry type — inline path
function TypeIcon({ type, size = 16, className = '', style }) {
  const def = ENTRY_TYPES[type] ?? ENTRY_TYPES.location
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      style={style}
    >
      <path d={def.icon} />
    </svg>
  )
}

// Tap-to-copy badge for confirmation numbers
function ConfirmationBadge({ value }) {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // fallback — select text
    }
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy() }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[11px] font-mono text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
    >
      {copied ? (
        <span className="text-green-500 font-sans font-medium">Copied!</span>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {value}
        </>
      )}
    </button>
  )
}

// Format datetime strings for display
function formatTime(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return val
  }
}

function formatDate(val) {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  } catch {
    return val
  }
}

// ─── Meta detail renderers per type ─────────────────────────────────────────

function FlightMeta({ meta }) {
  if (!meta) return null
  return (
    <div className="mt-1 space-y-0.5">
      {(meta.departureStation || meta.arrivalStation) && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          {meta.departureStation || '?'} → {meta.arrivalStation || '?'}
        </p>
      )}
      {(meta.departureTime || meta.arrivalTime) && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatTime(meta.departureTime)}{meta.arrivalTime ? ` — ${formatTime(meta.arrivalTime)}` : ''}
        </p>
      )}
      {meta.airline && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{meta.airline}</p>
      )}
      <ConfirmationBadge value={meta.confirmationNumber} />
    </div>
  )
}

function HotelMeta({ meta }) {
  if (!meta) return null
  return (
    <div className="mt-1 space-y-0.5">
      {(meta.checkIn || meta.checkOut) && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          {formatDate(meta.checkIn)}{meta.checkOut ? ` — ${formatDate(meta.checkOut)}` : ''}
          {meta.nights ? ` (${meta.nights}N)` : ''}
        </p>
      )}
      {meta.roomType && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{meta.roomType}</p>
      )}
      <ConfirmationBadge value={meta.confirmationNumber} />
    </div>
  )
}

function CarRentalMeta({ meta }) {
  if (!meta) return null
  return (
    <div className="mt-1 space-y-0.5">
      {meta.company && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400">{meta.company}</p>
      )}
      {(meta.pickupLocation || meta.dropoffLocation) && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {meta.pickupLocation || '?'} → {meta.dropoffLocation || meta.pickupLocation || '?'}
        </p>
      )}
      {(meta.pickupTime || meta.dropoffTime) && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatTime(meta.pickupTime)}{meta.dropoffTime ? ` — ${formatTime(meta.dropoffTime)}` : ''}
        </p>
      )}
      <ConfirmationBadge value={meta.confirmationNumber} />
    </div>
  )
}

function TrainMeta({ meta }) {
  if (!meta) return null
  return (
    <div className="mt-1 space-y-0.5">
      {(meta.departureStation || meta.arrivalStation) && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          {meta.departureStation || '?'} → {meta.arrivalStation || '?'}
        </p>
      )}
      {(meta.departureTime || meta.arrivalTime) && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatTime(meta.departureTime)}{meta.arrivalTime ? ` — ${formatTime(meta.arrivalTime)}` : ''}
        </p>
      )}
      {meta.operator && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{meta.operator}</p>
      )}
    </div>
  )
}

function ActivityMeta({ meta }) {
  if (!meta) return null
  return (
    <div className="mt-1 space-y-0.5">
      {meta.venue && (
        <p className="text-[12px] text-gray-500 dark:text-gray-400">{meta.venue}</p>
      )}
      {meta.time && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(meta.time)}</p>
      )}
      <ConfirmationBadge value={meta.confirmationNumber} />
    </div>
  )
}

const META_RENDERERS = {
  flight: FlightMeta,
  hotel: HotelMeta,
  car_rental: CarRentalMeta,
  train: TrainMeta,
  activity: ActivityMeta,
}

// ─── Compact card for ThreeDayView ──────────────────────────────────────────

export function EntryCardCompact({ entry, onDelete, onMoveLeft, onMoveRight }) {
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  const isLocation = entry.type === 'location'

  return (
    <div
      className="mx-1 mb-1 p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
      style={!isLocation ? { borderLeftWidth: 3, borderLeftColor: typeDef.accentColor } : undefined}
    >
      <div className="flex items-start gap-1">
        {!isLocation && (
          <TypeIcon type={entry.type} size={12} className="shrink-0 mt-0.5" style={{ color: typeDef.accentColor }} />
        )}
        <p className="text-[10px] font-medium text-gray-700 dark:text-gray-200 leading-tight mb-1 line-clamp-2 flex-1">
          {entry.name}
        </p>
      </div>
      <div className="flex gap-1">
        {onMoveLeft && (
          <button
            onClick={onMoveLeft}
            className="flex-1 py-0.5 text-[9px] text-sky-500 bg-sky-50 dark:bg-sky-900/30 rounded active:bg-sky-100"
          >
            ← Move
          </button>
        )}
        {onMoveRight && (
          <button
            onClick={onMoveRight}
            className="flex-1 py-0.5 text-[9px] text-sky-500 bg-sky-50 dark:bg-sky-900/30 rounded active:bg-sky-100"
          >
            Move →
          </button>
        )}
        <button
          onClick={onDelete}
          className="py-0.5 px-1 text-[9px] text-red-400 bg-red-50 dark:bg-red-900/20 rounded active:bg-red-100"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Full card for TodayView ────────────────────────────────────────────────

export default function EntryCard({
  entry,
  index,
  color,
  travelTime,
  mapsUrl,
  transitFromLabel,
  transitLegsOpen,
  editMode,
  onDelete,
  onToTomorrow,
  onSwapUp,
  onSwapDown,
  isFirst,
  isLast,
}) {
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  const isLocation = entry.type === 'location'
  const MetaRenderer = META_RENDERERS[entry.type]
  const tt = travelTime

  const rowContent = (
    <div className="flex gap-3 items-center">
      {editMode && (
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onSwapUp}
            disabled={isFirst}
            className="p-1 text-gray-400 disabled:opacity-20 active:text-gray-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 5.293l4.354 4.354-1.414 1.414L10 8.12 7.06 11.06 5.646 9.647 10 5.293z" clipRule="evenodd"/></svg>
          </button>
          <button
            onClick={onSwapDown}
            disabled={isLast}
            className="p-1 text-gray-400 disabled:opacity-20 active:text-gray-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 14.707l-4.354-4.354 1.414-1.414L10 11.88l2.94-2.94 1.414 1.414L10 14.707z" clipRule="evenodd"/></svg>
          </button>
        </div>
      )}

      {/* Numbered circle (locations) or type icon (non-geo) */}
      {isLocation ? (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color || '#0ea5e9' }}
        >
          <span className="text-white text-xs font-bold">{index + 1}</span>
        </div>
      ) : (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: typeDef.accentColor + '20' }}
        >
          <TypeIcon type={entry.type} size={15} style={{ color: typeDef.accentColor }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">
            {entry.name}
          </span>
          {!editMode && !transitLegsOpen && isLocation && tt?.walk && (
            <span className="text-[13px] font-medium text-green-500 dark:text-green-400 whitespace-nowrap">🚶 {tt.walk}</span>
          )}
          {!editMode && !transitLegsOpen && isLocation && tt?.drive && (
            <span className="text-[13px] font-medium text-sky-500 dark:text-sky-400 whitespace-nowrap">🚗 {tt.drive}</span>
          )}
          {!editMode && !transitLegsOpen && isLocation && tt?.driveKm && (
            <span className="text-[13px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{tt.driveKm} km</span>
          )}
          {!editMode && transitLegsOpen && transitFromLabel && (
            <span className="text-[13px] font-medium text-purple-500 dark:text-purple-400 whitespace-nowrap">🚇 from {transitFromLabel}</span>
          )}
        </div>
        {/* Meta details for non-location types */}
        {!editMode && MetaRenderer && <MetaRenderer meta={entry.meta} />}
        {/* Note text */}
        {!editMode && entry.type === 'note' && entry.note && (
          <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400 line-clamp-3">{entry.note}</p>
        )}
      </div>
    </div>
  )

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border p-3 shadow-sm ${
        editMode ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-700'
      }`}
      style={!isLocation && !editMode ? { borderLeftWidth: 3, borderLeftColor: typeDef.accentColor } : undefined}
    >
      {!editMode && mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block active:opacity-70">
          {rowContent}
        </a>
      ) : rowContent}
      {!editMode && (
        <div className="flex gap-2 mt-1.5">
          <button
            onClick={onToTomorrow}
            className="flex-1 py-1 text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg active:bg-indigo-100"
          >
            → Tomorrow
          </button>
          <button
            onClick={onDelete}
            className="py-1 px-2 text-xs font-medium text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg active:bg-red-100"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
