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
