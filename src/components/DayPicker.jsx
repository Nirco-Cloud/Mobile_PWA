import { useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { savePlanEntry } from '../db/plannerDb.js'
import { useTripConfig } from '../hooks/useTripConfig.js'

const DAYS_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function DayPicker({ location, onClose }) {
  const planEntries  = useAppStore((s) => s.planEntries)
  const addPlanEntry = useAppStore((s) => s.addPlanEntry)
  const { tripDays, dayToDate, getTodayDayNumber } = useTripConfig()
  const todayDay = getTodayDayNumber()
  const [toast, setToast] = useState(null)

  // Hard cutoff — only show today and future days
  // If trip hasn't started yet (todayDay null) → show all days from Day 1
  const startDay   = todayDay ?? 1
  const visibleDays = Array.from({ length: tripDays }, (_, i) => i + 1).filter((d) => d >= startDay)

  async function handleSelectDay(day) {
    const dayEntries = planEntries.filter((e) => e.day === day)
    const entry = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day,
      order: dayEntries.length + 1,
      type: 'location',
      locationId: location.id ?? null,
      name: location.name,
      lat: location.lat ?? null,
      lng: location.lng ?? null,
      note: null,
      owner: 'shared',
      meta: null,
      createdAt: new Date().toISOString(),
    }
    await savePlanEntry(entry)
    addPlanEntry(entry)
    setToast(day)
    setTimeout(() => { setToast(null); onClose() }, 1200)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-70 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
            Add to itinerary
          </p>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
            {location.name}
          </p>
        </div>

        {/* Success toast */}
        {toast && (
          <div className="mx-5 mb-3 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-emerald-500 shrink-0">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Added to Day {toast} ✓
            </span>
          </div>
        )}

        {/* Day grid */}
        <div className="px-4 pb-2 max-h-64 overflow-y-auto">
          {visibleDays.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">
              Trip has ended
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {visibleDays.map((day) => {
                const date    = dayToDate(day)
                const isToday = todayDay === day
                const count   = planEntries.filter((e) => e.day === day && !e.deletedAt).length

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    disabled={!!toast}
                    className={`relative flex flex-col items-center justify-center rounded-2xl py-2.5 px-1 border transition-all active:scale-95 select-none ${
                      isToday
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 active:border-sky-400 active:bg-sky-50 dark:active:bg-sky-900/20'
                    }`}
                  >
                    {/* TODAY badge */}
                    {isToday && (
                      <span className="absolute top-1.5 left-0 right-0 text-center text-[8px] font-bold text-amber-500 uppercase tracking-wide leading-none">
                        today
                      </span>
                    )}

                    <span className={`text-[10px] font-semibold ${isToday ? 'text-amber-500 dark:text-amber-400 mt-3' : 'text-gray-400 dark:text-gray-500'}`}>
                      {DAYS_SHORT[date.getDay()]}
                    </span>
                    <span className={`text-sm font-bold leading-tight ${isToday ? 'text-amber-700 dark:text-amber-300' : 'text-gray-800 dark:text-gray-100'}`}>
                      {date.getDate()}
                    </span>
                    <span className={`text-[9px] leading-tight ${isToday ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {MONTHS_SHORT[date.getMonth()]}
                    </span>
                    <span className={`text-[9px] font-medium mt-0.5 ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      D{day}
                    </span>

                    {/* Green dot — already has entries */}
                    {count > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Cancel */}
        <div className="px-4 pt-2 pb-3 border-t border-gray-100 dark:border-gray-800 mt-2">
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
