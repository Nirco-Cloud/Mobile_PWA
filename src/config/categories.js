export const CATEGORIES = [
  { key: 'Izakaya',                    label: 'Izakaya',     icon: 'izakaya.svg' },
  { key: 'Ramen',                      label: 'Ramen',       icon: 'ramen.svg' },
  { key: 'קפה/תה/אלכוהול',             label: 'קפה',         icon: 'cafe.svg' },
  { key: 'סושי יקר ומוקפד',            label: 'סושי יקר',   icon: 'sushi.svg' },
  { key: 'סושי עממי ולא יקר',          label: 'סושי',        icon: 'sushi.svg' },
  { key: 'מסעדות גבוהות / הזמנה',     label: 'Fine Dining', icon: 'fine-dining.svg' },
  { key: 'מסעדות ואוכל רחוב',          label: 'רחוב',        icon: 'street-food.svg' },
  { key: 'חטיפים ומלוחים',             label: 'חטיפים',      icon: 'snack.svg' },
  { key: 'חנויות',                     label: 'חנויות',      icon: 'shopping.svg' },
  { key: 'איזורים ואתרים',             label: 'אזורים',      icon: 'area.svg' },
  { key: 'מלונות',                     label: 'Hotels',      icon: 'hotel.svg' },
  { key: 'custom',                     label: 'Imported',    icon: 'custom.svg' },
  // Import category keys (new)
  { key: 'restaurant',                 label: 'Restaurant',  icon: 'street-food.svg' },
  { key: 'cafe',                       label: 'Cafe',        icon: 'cafe.svg' },
  { key: 'shop',                       label: 'Shop',        icon: 'shopping.svg' },
  { key: 'attraction',                 label: 'Attraction',  icon: 'area.svg' },
  { key: 'hotel',                      label: 'Hotel',       icon: 'hotel.svg' },
  { key: 'train',                      label: 'Train',       icon: 'custom.svg' },
  { key: 'location',                   label: 'Place',       icon: 'custom.svg' },
]

export const ALL_CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

export function getCategoryIcon(category) {
  const cat = CATEGORIES.find((c) => c.key === category)
  return import.meta.env.BASE_URL + 'icons/' + (cat ? cat.icon : 'default.svg')
}
