// Default trip dates — overridable via Settings
export const DEFAULT_TRIP_START = new Date(2026, 10, 3)  // November 3, 2026
export const DEFAULT_TRIP_END   = new Date(2026, 10, 19) // November 19, 2026

const DAYS_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Build trip helper functions bound to a specific date range. */
export function makeTripHelpers(tripStart, tripEnd) {
  const startMs = new Date(new Date(tripStart).setHours(0, 0, 0, 0)).getTime()
  const endMs   = new Date(new Date(tripEnd).setHours(0, 0, 0, 0)).getTime()
  const tripDays = Math.round((endMs - startMs) / 86400000) + 1

  function dayToDate(day) {
    const d = new Date(startMs)
    d.setDate(d.getDate() + (day - 1))
    return d
  }

  function dateToDayNumber(date) {
    const t = new Date(date).setHours(0, 0, 0, 0)
    if (t < startMs || t > endMs) return null
    return Math.floor((t - startMs) / 86400000) + 1
  }

  function getTodayDayNumber() {
    return dateToDayNumber(new Date())
  }

  function formatDayLabel(day) {
    const d = dayToDate(day)
    return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} · ${DAYS_SHORT[d.getDay()]}`
  }

  return { tripDays, dayToDate, dateToDayNumber, getTodayDayNumber, formatDayLabel }
}

/** Format a Date → "YYYY-MM-DD" for <input type="date"> */
export function toDateInput(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse "YYYY-MM-DD" → local midnight Date */
export function fromDateInput(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
