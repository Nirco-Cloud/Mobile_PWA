import { useState } from 'react'
import { ENTRY_TYPES } from '../config/entryTypes.js'
import { useDecrypt } from '../hooks/useDecrypt.js'
import DayPicker from './DayPicker.jsx'

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

// Tap-to-copy badge for confirmation numbers (auto-decrypts encrypted values)
function ConfirmationBadge({ value }) {
  const [copied, setCopied] = useState(false)
  const decrypted = useDecrypt(value)

  if (!decrypted) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(decrypted)
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
          {decrypted}
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

// ─── Inline delete confirmation ─────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <span className="text-xs text-red-600 dark:text-red-400 flex-1">Delete this entry?</span>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 active:bg-gray-100 min-h-[36px]"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg active:bg-red-600 min-h-[36px]"
      >
        Delete
      </button>
    </div>
  )
}

// ─── Inline edit form ───────────────────────────────────────────────────────

function InlineEditForm({ entry, typeDef, onSave, onCancel }) {
  const [editName, setEditName] = useState(entry.name)
  const [editNote, setEditNote] = useState(entry.note || '')
  const [editMeta, setEditMeta] = useState(entry.meta ? { ...entry.meta } : {})

  const isNote = entry.type === 'note'

  function handleMetaChange(key, value) {
    setEditMeta((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const updates = {
      name: editName.trim() || entry.name,
      note: editNote.trim() || null,
    }
    if (!isNote && typeDef?.metaFields?.length > 0) {
      updates.meta = Object.keys(editMeta).length > 0 ? editMeta : null
    }
    onSave(updates)
  }

  return (
    <div className="mt-2 space-y-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Name field */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Name</label>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* Description / Note field (all types) */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
          {isNote ? 'Note' : 'Description'}
        </label>
        <textarea
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          rows={isNote ? 3 : 2}
          placeholder={isNote ? '' : 'Add notes in any language…'}
          className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      {/* Meta fields (for non-note types with defined schema) */}
      {!isNote && typeDef?.metaFields?.map((field) => (
        <div key={field.key}>
          <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">{field.label}</label>
          <input
            type={field.type === 'datetime' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'}
            value={editMeta[field.key] || ''}
            onChange={(e) => handleMetaChange(field.key, e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      ))}

      {/* Save/Cancel buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 active:bg-gray-100 min-h-[40px]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 text-xs font-medium text-white bg-sky-500 rounded-lg active:bg-sky-600 min-h-[40px]"
        >
          Save
        </button>
      </div>
    </div>
  )
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
  onMoveToDay,
  onSwapUp,
  onSwapDown,
  onEdit,
  isFirst,
  isLast,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const typeDef = ENTRY_TYPES[entry.type] ?? ENTRY_TYPES.location
  const isLocation = entry.type === 'location'
  const MetaRenderer = META_RENDERERS[entry.type]
  const tt = travelTime

  function handleDeleteClick(e) {
    e.stopPropagation()
    setConfirmingDelete(true)
  }

  function handleDeleteConfirm() {
    setConfirmingDelete(false)
    onDelete()
  }

  function handleEditSave(updates) {
    setEditing(false)
    if (onEdit) onEdit(updates)
  }

  const rowContent = (
    <div className="flex gap-3 items-center">
      {editMode && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onSwapUp}
            disabled={isFirst}
            className="p-2 text-gray-400 disabled:opacity-20 active:text-gray-700 dark:active:text-gray-200 rounded-lg active:bg-gray-100 dark:active:bg-gray-700 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Move up"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 5.293l4.354 4.354-1.414 1.414L10 8.12 7.06 11.06 5.646 9.647 10 5.293z" clipRule="evenodd"/></svg>
          </button>
          <button
            onClick={onSwapDown}
            disabled={isLast}
            className="p-2 text-gray-400 disabled:opacity-20 active:text-gray-700 dark:active:text-gray-200 rounded-lg active:bg-gray-100 dark:active:bg-gray-700 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Move down"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 14.707l-4.354-4.354 1.414-1.414L10 11.88l2.94-2.94 1.414 1.414L10 14.707z" clipRule="evenodd"/></svg>
          </button>
        </div>
      )}

      {/* Numbered circle (locations) or type icon (non-geo) */}
      {isLocation ? (
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color || '#0ea5e9' }}
        >
          <span className="text-white text-xs font-bold">{index + 1}</span>
        </div>
      ) : (
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: typeDef.accentColor + '20' }}
        >
          <TypeIcon type={entry.type} size={16} style={{ color: typeDef.accentColor }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 leading-snug">
            {entry.name}
          </span>
          {!editMode && !transitLegsOpen && isLocation && tt?.walk && (
            <span className="text-[13px] font-medium text-green-500 dark:text-green-400 whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5"><path d="M13 4v3l-2 4-3 1v4l2 4M15 4a1 1 0 100-2 1 1 0 000 2zM12 18l-1 4M17 7l2 4h-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {tt.walk}
            </span>
          )}
          {!editMode && !transitLegsOpen && isLocation && tt?.drive && (
            <span className="text-[13px] font-medium text-sky-500 dark:text-sky-400 whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5"><path d="M5 17h14M5 17a2 2 0 01-2-2V9l2-4h14l2 4v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {tt.drive}
            </span>
          )}
          {!editMode && !transitLegsOpen && isLocation && tt?.driveKm && (
            <span className="text-[13px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{tt.driveKm} km</span>
          )}
          {!editMode && transitLegsOpen && transitFromLabel && (
            <span className="text-[13px] font-medium text-purple-500 dark:text-purple-400 whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5"><path d="M8 6v12M4 10h8M18 12v6M15 15h6M12 6a4 4 0 018 0" strokeLinecap="round" strokeLinejoin="round"/></svg>
              from {transitFromLabel}
            </span>
          )}
        </div>
        {/* Meta details for non-location types */}
        {!editMode && !editing && MetaRenderer && <MetaRenderer meta={entry.meta} />}
        {/* Note / description text (note type = full note; all others = description) */}
        {!editMode && !editing && entry.note && (
          <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400 line-clamp-3">{entry.note}</p>
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

      {/* Inline edit form */}
      {editing && !editMode && (
        <InlineEditForm
          entry={entry}
          typeDef={typeDef}
          onSave={handleEditSave}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Delete confirmation */}
      {confirmingDelete && !editMode && (
        <DeleteConfirm
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {/* Action buttons */}
      {!editMode && !confirmingDelete && !editing && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setShowDayPicker(true)}
            className="flex-1 py-2 text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg active:bg-indigo-100 min-h-[40px] inline-flex items-center justify-center gap-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Day
          </button>
          <button
            onClick={() => setEditing(true)}
            className="py-2 px-3 text-xs font-medium text-sky-500 bg-sky-50 dark:bg-sky-900/20 rounded-lg active:bg-sky-100 min-h-[40px]"
            aria-label="Edit entry"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline -mt-0.5 mr-1"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="py-2 px-3 text-xs font-medium text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg active:bg-red-100 min-h-[40px]"
            aria-label="Remove entry"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline -mt-0.5 mr-1"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Remove
          </button>
        </div>
      )}

      {/* Day picker overlay — moves entry to selected day */}
      {showDayPicker && (
        <DayPicker
          location={{ name: entry.name }}
          pickerOnly
          onClose={() => setShowDayPicker(false)}
          onDone={(day) => { setShowDayPicker(false); if (onMoveToDay) onMoveToDay(day) }}
        />
      )}
    </div>
  )
}
