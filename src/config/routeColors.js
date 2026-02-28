// 8 visually distinct colors for route lines from current position to each stop
export const ROUTE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function getRouteColor(index) {
  return ROUTE_COLORS[index % ROUTE_COLORS.length]
}

// 18 distinct colors for multi-day polylines & markers (one per trip day)
export const DAY_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899',
  '#06b6d4', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16',
  '#d946ef', '#0ea5e9', '#a855f7', '#fb923c', '#10b981', '#64748b',
]

export function getDayColor(dayNumber) {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length]
}
