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
  { key: 'hotel',                     label: 'Hotel',       icon: 'hotel.svg' },
  { key: 'train',                     label: 'Train',       icon: 'train.svg' },
  { key: 'location',                  label: 'Location',    icon: 'custom.svg' },
  { key: 'activity',                  label: 'Activity',    icon: 'area.svg' },
]

export const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

export function getCategoryIcon(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return import.meta.env.BASE_URL + 'icons/' + (cat ? cat.icon : 'default.svg')
}

/** Remap legacy / import category keys to canonical keys. */
export function migrateCategoryLegacy(category) {
  const MAP = {
    'מלונות':     'hotel',
    'custom':     'location',
    'restaurant': 'מסעדות ואוכל רחוב',
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
