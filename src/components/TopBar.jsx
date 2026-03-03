import { useState } from 'react'
import { useAppStore } from '../store/appStore.js'
import { stays, getStayCenter } from '../config/stays.js'

const SORTED_STAYS = [...stays].sort((a, b) => a.order - b.order)

export default function TopBar() {
  const selectedStay    = useAppStore((s) => s.selectedStay)
  const setSelectedStay = useAppStore((s) => s.setSelectedStay)
  const mode            = useAppStore((s) => s.mode)
  const setMode         = useAppStore((s) => s.setMode)
  const demoMode        = useAppStore((s) => s.demoMode)
  const setPosition     = useAppStore((s) => s.setPosition)
  const locations       = useAppStore((s) => s.locations)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const currentStay = stays.find((s) => s.id === selectedStay) ?? stays[0]

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
      style={{ height: 48 }}
    >
      {/* Stay selector dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold text-sm active:bg-sky-100 dark:active:bg-sky-900/50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span className="max-w-[140px] truncate">{currentStay.label}</span>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />

            {/* Dropdown list */}
            <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              {SORTED_STAYS.map((stay) => (
                <button
                  key={stay.id}
                  onClick={() => {
                    setSelectedStay(stay.id)
                    if (demoMode) {
                      const center = getStayCenter(stay, locations)
                      if (center) setPosition(center)
                    }
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                    stay.id === selectedStay
                      ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700/60'
                  }`}
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-5 text-center shrink-0">
                    {stay.order}
                  </span>
                  {stay.label}
                  {stay.id === selectedStay && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-auto text-sky-500 shrink-0">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Explore | Overview segmented control */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
        {['explore', 'overview'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3.5 py-1.5 font-medium capitalize transition-colors ${
              mode === m
                ? 'bg-sky-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-700/60'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}
