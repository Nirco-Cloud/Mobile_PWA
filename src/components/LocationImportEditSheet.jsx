import { useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { saveImportedLocation } from '../db/importedLocations.js'
import { savePlanEntry } from '../db/plannerDb.js'
import { useTripConfig } from '../hooks/useTripConfig.js'

const DAYS_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const IMPORT_CATEGORIES = [
  { key: 'מסעדות ואוכל רחוב', label: 'Restaurant', color: '#f97316' },
  { key: 'קפה/תה/אלכוהול',    label: 'Cafe',       color: '#8b5cf6' },
  { key: 'איזורים ואתרים',    label: 'Attraction', color: '#ec4899' },
  { key: 'חנויות',             label: 'Shop',       color: '#10b981' },
  { key: 'hotel',              label: 'Hotel',      color: '#6366f1' },
  { key: 'train',              label: 'Train',      color: '#f97316' },
  { key: 'location',           label: 'Location',   color: '#6b7280' },
]

function detectCategory(name) {
  if (!name) return 'location'
  const n = name.toLowerCase()
  if (/hotel|inn|hostel|ryokan|lodge|resort|guesthouse|guest house|motel/.test(n)) return 'hotel'
  if (/cafe|coffee|kissaten|tearoom|tea room|bakery|patisserie|bar|pub|brewery|winery|sake/.test(n)) return 'קפה/תה/אלכוהול'
  if (/store|shop|market|mall|boutique|department|supermarket|drugstore|pharmacy/.test(n)) return 'חנויות'
  if (/shrine|jinja|temple|park|garden|museum|castle|tower|palace|onsen|hot spring|waterfall/.test(n)) return 'איזורים ואתרים'
  if (/station|railway|terminal/.test(n)) return 'train'
  if (/ramen|noodle|soba|udon|sushi|sashimi|izakaya|yakitori|omakase|kaiseki|restaurant|diner|eatery|bbq|grill|curry|tempura|tonkatsu|yakiniku/.test(n)) return 'מסעדות ואוכל רחוב'
  return 'location'
}

export default function LocationImportEditSheet({ data, sourceUrl, onClose }) {
  if (!data) return null

  const enriched = data.enriched || {}

  const [name,        setName]        = useState(data.name || '')
  const [description, setDescription] = useState(enriched.description || '')
  const [address,     setAddress]     = useState(enriched.address || '')
  const [phone,       setPhone]       = useState(enriched.phone || '')
  const [rating,      setRating]      = useState(enriched.rating != null ? String(enriched.rating) : '')
  const [website,     setWebsite]     = useState(enriched.website || '')
  const [notes,       setNotes]       = useState('')
  const [category,    setCategory]    = useState(enriched.suggestedCategory || detectCategory(data.name || ''))
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayGrid, setShowDayGrid] = useState(false)
  const [hoursOpen,   setHoursOpen]   = useState(false)
  const [saving,      setSaving]      = useState(false)

  const addImportedLocation = useAppStore((s) => s.addImportedLocation)
  const addPlanEntry        = useAppStore((s) => s.addPlanEntry)

  const { tripDays, dayToDate } = useTripConfig()
  const allDays = Array.from({ length: tripDays }, (_, i) => i + 1)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const loc = {
        id:           `imported_${Date.now()}`,
        name:         name.trim() || `Imported ${new Date().toLocaleDateString()}`,
        lat:          data.lat,
        lng:          data.lng,
        category,
        importedAt:   new Date().toISOString(),
        sourceUrl:    sourceUrl || '',
        address:      address.trim(),
        phone:        phone.trim(),
        website:      website.trim(),
        rating:       rating !== '' ? parseFloat(rating) : null,
        openingHours: enriched.openingHours ?? null,
        description:  description.trim(),
        notes:        notes.trim(),
      }
      await saveImportedLocation(loc)
      addImportedLocation(loc)

      if (selectedDay) {
        const entry = {
          id:         `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          day:        selectedDay,
          order:      Date.now(),
          type:       'location',
          locationId: loc.id,
          name:       loc.name,
          lat:        loc.lat,
          lng:        loc.lng,
          note:       null,
          owner:      'shared',
          meta:       null,
          createdAt:  new Date().toISOString(),
        }
        await savePlanEntry(entry)
        addPlanEntry(entry)
      }

      navigator.vibrate?.(15)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-white dark:bg-gray-900 flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-full text-gray-500 active:bg-gray-100 dark:active:bg-gray-800"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">New Location</h2>
          <p className="text-xs font-mono text-sky-500">
            {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
          </p>
        </div>
        {enriched.rating != null && (
          <span className="shrink-0 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5 font-medium">
            ⭐ {enriched.rating}
          </span>
        )}
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Place name…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="From Google Places…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📍 Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Phone + Rating row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📞 Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+81 3-…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">⭐ Rating</label>
            <input
              type="number"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="4.5"
              min="0"
              max="5"
              step="0.1"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">🌐 Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Opening hours */}
        {enriched.openingHours?.length > 0 && (
          <div>
            <button
              onClick={() => setHoursOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <span>🕐</span>
              <span>Opening hours</span>
              <span className="text-gray-400 text-xs">{hoursOpen ? '▲' : '▼'}</span>
            </button>
            {hoursOpen && (
              <ul className="mt-1.5 space-y-0.5 pl-6">
                {enriched.openingHours.map((h, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400">{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Personal notes — amber */}
        <div>
          <label className="block text-xs font-medium text-amber-600 mb-1">✍️ Personal Notes / הערות אישיות</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            dir="auto"
            rows={4}
            placeholder="הוסף הערות אישיות..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-100 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>

        {/* Category chips */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Category</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {IMPORT_CATEGORIES.map((c) => {
              const selected = category === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    selected
                      ? 'border-transparent text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  style={selected ? { backgroundColor: c.color, borderColor: c.color } : {}}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day picker */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📅 Add to Day</label>
          {selectedDay ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDayGrid((v) => !v)}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 rounded-xl text-left"
              >
                📅 Day {selectedDay} · {(() => { const d = dayToDate(selectedDay); return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` })()}
              </button>
              <button
                onClick={() => { setSelectedDay(null); setShowDayGrid(false) }}
                className="p-2 text-gray-400 active:text-red-400"
                aria-label="Clear day"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDayGrid((v) => !v)}
              className="w-full px-3 py-2 text-sm text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-left active:bg-gray-50 dark:active:bg-gray-800"
            >
              📅 Pick a day…
            </button>
          )}

          {showDayGrid && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 grid grid-cols-5 gap-1">
              {allDays.map((d) => {
                const date = dayToDate(d)
                const isSel = selectedDay === d
                return (
                  <button
                    key={d}
                    onClick={() => { setSelectedDay(d); setShowDayGrid(false) }}
                    className={`flex flex-col items-center rounded-xl py-2 px-1 text-center transition-colors ${
                      isSel
                        ? 'bg-indigo-500 text-white'
                        : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-600 dark:text-gray-300 active:bg-indigo-100'
                    }`}
                  >
                    <span className="text-[9px] font-medium opacity-70">{DAYS_SHORT[date.getDay()]}</span>
                    <span className="text-sm font-bold leading-tight">{date.getDate()}</span>
                    <span className="text-[9px] opacity-60">{MONTHS_SHORT[date.getMonth()]}</span>
                    <span className="text-[9px] font-semibold opacity-50">D{d}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom spacer so last field isn't hidden by save button */}
        <div className="h-4" />
      </div>

      {/* Footer — Save button */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-sky-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 active:bg-sky-600 flex items-center justify-center gap-2"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : selectedDay ? (
            <>
              Save + Add to Day {selectedDay}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          ) : (
            'Save Location'
          )}
        </button>
      </div>
    </div>
  )
}
