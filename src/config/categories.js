export const CATEGORIES = [
  { key: 'Restaurant',                label: 'Restaurant',  icon: 'restaurant.svg',  color: '#f97316' },
  { key: 'Ramen',                     label: 'Ramen',       icon: 'ramen.svg',        color: '#ef4444' },
  { key: 'קפה/תה/אלכוהול',            label: 'קפה',         icon: 'cafe.svg',         color: '#ec4899' },
  { key: 'סושי יקר ומוקפד',           label: 'סושי יקר',   icon: 'sushi.svg',        color: '#14b8a6' },
  { key: 'סושי עממי ולא יקר',         label: 'סושי',        icon: 'sushi.svg',        color: '#2dd4bf' },
  { key: 'מסעדות גבוהות / הזמנה',    label: 'Fine Dining', icon: 'fine-dining.svg',  color: '#8b5cf6' },
  { key: 'Izakaya',                   label: 'Izakaya',     icon: 'izakaya.svg',      color: '#f59e0b' },
  { key: 'מסעדות ואוכל רחוב',         label: 'רחוב',        icon: 'street-food.svg',  color: '#fb923c' },
  { key: 'חטיפים ומלוחים',            label: 'חטיפים',      icon: 'snack.svg',        color: '#eab308' },
  { key: 'חנויות',                    label: 'חנויות',      icon: 'shopping.svg',     color: '#10b981' },
  { key: 'איזורים ואתרים',            label: 'אזורים',      icon: 'area.svg',         color: '#3b82f6' },
  { key: 'Activity',                  label: 'Activity',    icon: 'area.svg',         color: '#a855f7' },
  { key: 'Train',                     label: 'Train',       icon: 'train.svg',        color: '#6b7280' },
  { key: 'Location',                  label: 'Location',    icon: 'custom.svg',       color: '#64748b' },
  { key: 'Hotel',                     label: 'Hotel',       icon: 'hotel.svg',        color: '#6366f1' },
]

export const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

export function getCategoryIcon(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return import.meta.env.BASE_URL + 'icons/' + (cat ? cat.icon : 'default.svg')
}

export function getCategoryColor(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return cat?.color ?? '#6b7280'
}

/** Remap legacy / import category keys to canonical keys. */
export function migrateCategoryLegacy(category) {
  const MAP = {
    // Capitalization migrations — old lowercase keys → new canonical keys
    'hotel':      'Hotel',
    'train':      'Train',
    'location':   'Location',
    'activity':   'Activity',
    // Legacy label migrations
    'מלונות':     'Hotel',
    'custom':     'Location',
    'restaurant': 'Restaurant',
    'cafe':       'קפה/תה/אלכוהול',
    'shop':       'חנויות',
    'attraction': 'איזורים ואתרים',
  }
  return MAP[category] ?? category
}

/** Apply migrateCategoryLegacy to every location in an array. */
export function migrateLocations(locs) {
  return locs.map((l) => ({ ...l, category: migrateCategoryLegacy(l.category) }))
}
