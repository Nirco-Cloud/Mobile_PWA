export const CATEGORIES = [
  { key: 'Izakaya',                   label: 'Izakaya',     icon: 'izakaya.svg' },
  { key: 'Ramen',                     label: 'Ramen',       icon: 'ramen.svg' },
  { key: 'קפה/תה/אלכוהול',            label: 'קפה',         icon: 'cafe.svg' },
  { key: 'סושי יקר ומוקפד',           label: 'סושי יקר',   icon: 'sushi.svg' },
  { key: 'סושי עממי ולא יקר',         label: 'סושי',        icon: 'sushi.svg' },
  { key: 'מסעדות גבוהות / הזמנה',    label: 'Fine Dining', icon: 'fine-dining.svg' },
  { key: 'מסעדות ואוכל רחוב',         label: 'רחוב',        icon: 'street-food.svg' },
  { key: 'חטיפים ומלוחים',            label: 'חטיפים',      icon: 'snack.svg' },
  { key: 'חנויות',                    label: 'חנויות',      icon: 'shopping.svg' },
  { key: 'איזורים ואתרים',            label: 'אזורים',      icon: 'area.svg' },
  { key: 'Hotel',                     label: 'Hotel',       icon: 'hotel.svg' },
  { key: 'Train',                     label: 'Train',       icon: 'train.svg' },
  { key: 'Location',                  label: 'Location',    icon: 'custom.svg' },
  { key: 'Activity',                  label: 'Activity',    icon: 'area.svg' },
  { key: 'Restaurant',                label: 'Restaurant',  icon: 'restaurant.svg' },
]

export const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

export function getCategoryIcon(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return import.meta.env.BASE_URL + 'icons/' + (cat ? cat.icon : 'default.svg')
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
