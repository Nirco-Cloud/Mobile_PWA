import { useAppStore } from '../store/appStore.js'
import { CATEGORIES, ALL_CATEGORY_KEYS } from '../config/categories.js'

export default function CategoryFilter({ onClose }) {
  const activeCategories = useAppStore((s) => s.activeCategories)
  const toggleCategory = useAppStore((s) => s.toggleCategory)
  const setActiveCategories = useAppStore((s) => s.setActiveCategories)

  const allOn = activeCategories.length === ALL_CATEGORY_KEYS.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-2 pb-2">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveCategories(ALL_CATEGORY_KEYS)}
              className="text-xs text-sky-500 font-medium"
            >
              All
            </button>
            <button
              onClick={() => setActiveCategories([])}
              className="text-xs text-gray-400 font-medium"
            >
              None
            </button>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Categories
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500 active:bg-sky-600 text-white text-sm font-bold shadow-lg"
          >
            ← Back to Map
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-4 pb-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategories.includes(cat.key)
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <img
                  src={import.meta.env.BASE_URL + 'icons/' + cat.icon}
                  alt={cat.label}
                  className={`w-7 h-7 ${isActive ? '' : 'opacity-30'}`}
                />
                <span
                  className={`text-[11px] font-medium leading-tight text-center ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="pb-4" />
      </div>
    </>
  )
}
