import { useState } from 'react'
import { ENTRY_TYPES, CREATABLE_TYPES } from '../config/entryTypes.js'
import { useAppStore } from '../store/appStore.js'
import { savePlanEntry } from '../db/plannerDb.js'

export default function EntryCreatorSheet({ targetDay, onClose }) {
  const planEntries  = useAppStore((s) => s.planEntries)
  const addPlanEntry = useAppStore((s) => s.addPlanEntry)

  const [selectedType, setSelectedType] = useState(null) // null = step 1 (type picker)
  const [meta, setMeta]     = useState({})
  const [name, setName]     = useState('')
  const [note, setNote]     = useState('')
  const [owner, setOwner]   = useState('shared')

  const typeDef = selectedType ? ENTRY_TYPES[selectedType] : null

  function handleTypeSelect(type) {
    setSelectedType(type)
    setMeta({})
    setName('')
    setNote('')
  }

  function handleMetaChange(key, value) {
    setMeta((prev) => ({ ...prev, [key]: value }))
  }

  function handleBack() {
    setSelectedType(null)
    setMeta({})
    setName('')
    setNote('')
  }

  async function handleSave() {
    const dayEntries = planEntries.filter((e) => e.day === targetDay)
    const derivedName = name.trim() || (typeDef?.deriveName?.(meta)) || typeDef?.label || 'Entry'

    const entry = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day: targetDay,
      order: dayEntries.length + 1,
      type: selectedType,
      locationId: null,
      name: derivedName,
      lat: null,
      lng: null,
      note: selectedType === 'note' ? note : null,
      owner,
      meta: selectedType === 'note' ? null : (Object.keys(meta).length > 0 ? meta : null),
      createdAt: new Date().toISOString(),
    }

    const saved = await savePlanEntry(entry)
    addPlanEntry(saved)
    onClose()
  }

  const canSave = selectedType === 'note'
    ? note.trim().length > 0
    : name.trim().length > 0 || (typeDef?.deriveName && typeDef.deriveName(meta) !== typeDef.label)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-60 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-70 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '80dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {selectedType === null ? (
          /* ── Step 1: Type picker grid ─────────────────────────────── */
          <div className="px-4 pb-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Add Entry — Day {targetDay}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              Choose entry type
            </p>

            <div className="grid grid-cols-3 gap-2">
              {CREATABLE_TYPES.map((type) => {
                const def = ENTRY_TYPES[type]
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 active:scale-95 transition-transform"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: def.accentColor + '20' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={def.accentColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d={def.icon} />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                      {def.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Step 2: Dynamic form ─────────────────────────────────── */
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Header with back */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleBack}
                className="p-1 rounded-lg text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
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
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {typeDef.label} — Day {targetDay}
              </h3>
            </div>

            {/* Name (except note) */}
            {selectedType !== 'note' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Name (auto-fills from details)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={typeDef.deriveName?.(meta) || typeDef.label}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            )}

            {/* Meta fields */}
            {typeDef.metaFields.map((field) => (
              <div key={field.key} className="mb-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type === 'datetime' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'}
                  value={meta[field.key] || ''}
                  onChange={(e) => handleMetaChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            ))}

            {/* Note text area (for note type) */}
            {selectedType === 'note' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Write your note…"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                />
              </div>
            )}

            {/* Owner toggle */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Visibility
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOwner('shared')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    owner === 'shared'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Shared
                </button>
                <button
                  onClick={() => setOwner('nirco')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    owner === 'nirco'
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Private
                </button>
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40"
              style={{ backgroundColor: typeDef.accentColor }}
            >
              Save {typeDef.label}
            </button>
          </div>
        )}

        {/* Cancel */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 active:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
