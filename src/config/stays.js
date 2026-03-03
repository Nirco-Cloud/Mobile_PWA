import { haversine } from '../utils/haversine.js'

export const stays = [
  {
    id: 'tokyo_start',
    label: 'Tokyo (Shinjuku)',
    hotelId: 'hotel-sunroute-plaza-shinjuku',
    fallbackCenter: { lat: 35.6938, lng: 139.7036 },
    radiusKm: 8,
    regionZoom: 13,
    order: 1,
  },
  {
    id: 'hakone',
    label: 'Hakone',
    hotelId: 'hotel-hakone-ashinoko-hanaori',
    fallbackCenter: { lat: 35.2323, lng: 139.1069 },
    radiusKm: 12,
    regionZoom: 12,
    order: 2,
  },
  {
    id: 'nakatsugawa',
    label: 'Nakatsugawa',
    hotelId: 'hotel-onn-nakatsugawa',
    fallbackCenter: { lat: 35.4888, lng: 137.4999 },
    radiusKm: 15,
    regionZoom: 11,
    order: 3,
  },
  {
    id: 'takayama',
    label: 'Takayama',
    hotelId: 'hotel-miyama-ouan-kyoritsu',
    fallbackCenter: { lat: 36.1461, lng: 137.2519 },
    radiusKm: 12,
    regionZoom: 12,
    order: 4,
  },
  {
    id: 'kanazawa',
    label: 'Kanazawa',
    hotelId: 'hotel-sanraku-kanazawa',
    fallbackCenter: { lat: 36.5613, lng: 136.6562 },
    radiusKm: 8,
    regionZoom: 13,
    order: 5,
  },
  {
    id: 'kyoto',
    label: 'Kyoto',
    hotelId: 'hotel-cross-kyoto',
    fallbackCenter: { lat: 35.0116, lng: 135.7681 },
    radiusKm: 8,
    regionZoom: 13,
    order: 6,
  },
  {
    id: 'tokyo_final',
    label: 'Tokyo (Daiba)',
    hotelId: 'hotel-grand-nikko-tokyo-daiba',
    fallbackCenter: { lat: 35.6274, lng: 139.7752 },
    radiusKm: 8,
    regionZoom: 13,
    order: 7,
  },
]

/** Return the center coordinates for a stay.
 *  Looks up the hotel in `locations` first; falls back to hardcoded city center. */
export function getStayCenter(stay, locations) {
  if (stay?.hotelId && locations?.length) {
    const hotel = locations.find((l) => l.id === stay.hotelId)
    if (hotel?.lat != null && hotel?.lng != null) {
      return { lat: hotel.lat, lng: hotel.lng }
    }
  }
  return stay?.fallbackCenter ?? null
}

export function getStayById(id) {
  return stays.find((s) => s.id === id) ?? null
}

/** Filter allPOIs to those within the stay's radius.
 *  @param {string}   stayId
 *  @param {object[]} allPOIs
 *  @param {object[]} locations  — the full location list (used to resolve hotelId → coords)
 */
export function getPOIsForStay(stayId, allPOIs, locations) {
  const stay = stays.find((s) => s.id === stayId)
  if (!stay) return allPOIs

  const center = getStayCenter(stay, locations)
  if (!center) return allPOIs

  const radiusMeters = stay.radiusKm * 1000
  return allPOIs.filter((poi) => {
    if (poi.lat == null || poi.lng == null) return false
    return haversine(poi.lat, poi.lng, center.lat, center.lng) <= radiusMeters
  })
}
