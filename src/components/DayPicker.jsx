import { useAppStore } from '../store/appStore.js'
import { savePlanEntry } from '../db/plannerDb.js'
import { useTripConfig } from '../hooks/useTripConfig.js'

export default function DayPicker({ location, onClose }) {
  const planEntries  = useAppStore((s) => s.planEntries)
  const addPlanEntry = useAppStore((s) => s.addPlanEntry)
  const { tripDays, formatDayLabel, getTodayDayNumber } = useTripConfig()
  const todayDay = getTodayDayNumber()

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
    onClose()
  }

  const days = Array.from({ length: tripDays }, (_, i) => i + 1)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-70 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div className="px-4 pb-2">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Add to Day
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-3">
            {location.name}
          </p>

          {/* 3-column grid */}
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pb-1">
            {days.map((day) => {
              const count   = planEntries.filter((e) => e.day === day).length
              const isToday = todayDay === day

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-2.5 text-center border transition-colors active:scale-95 ${
                    isToday
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  {isToday && (
                    <span className="absolute top-1 right-1 text-[9px] font-bold text-sky-500 leading-none">
                      TODAY
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Day {day}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                    {formatDayLabel(day).split(' · ')[0]}
                  </span>
                  {count > 0 && (
                    <span className="mt-1 text-[10px] font-medium text-sky-500">
                      {count} stop{count > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
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
