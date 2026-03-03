/**
 * resolve-maps-link.js
 * Netlify serverless function — resolves a Google Maps URL and enriches it
 * with Google Places API (New) data when a server-side key is available.
 *
 * GET /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>
 *
 * Returns: { name, lat, lng, address, category, placeId, phone, website, rating, openingHours }
 *
 * Env vars:
 *   GOOGLE_PLACES_API_KEY  — server-side key (unrestricted or IP-restricted).
 *                            Must have "Places API (New)" enabled on the project.
 *                            If absent or blocked, the function still returns coords
 *                            and a name extracted from the URL.
 */

// Google Place type → app category mapping (approved)
const TYPE_TO_CATEGORY = {
  restaurant:         'Restaurant',
  food:               'Restaurant',
  meal_delivery:      'Restaurant',
  meal_takeaway:      'Restaurant',
  bar:                'Izakaya',
  night_club:         'Izakaya',
  liquor_store:       'Izakaya',
  cafe:               'קפה/תה/אלכוהול',
  bakery:             'קפה/תה/אלכוהול',
  lodging:            'Hotel',
  transit_station:    'Train',
  train_station:      'Train',
  subway_station:     'Train',
  store:              'חנויות',
  shopping_mall:      'חנויות',
  clothing_store:     'חנויות',
  convenience_store:  'חנויות',
  tourist_attraction: 'איזורים ואתרים',
  museum:             'איזורים ואתרים',
  park:               'איזורים ואתרים',
  place_of_worship:   'איזורים ואתרים',
  amusement_park:     'איזורים ואתרים',
  point_of_interest:  'Location',
  establishment:      'Location',
}

function mapTypes(types = []) {
  for (const t of types) {
    const mapped = TYPE_TO_CATEGORY[t.toLowerCase()]
    if (mapped) return mapped
  }
  return 'Location'
}

/**
 * Follow redirects and return the final URL + HTML body text.
 * Uses a mobile UA so Google Maps serves a readable page.
 */
async function resolveUrl(inputUrl) {
  const res = await fetch(inputUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  const finalUrl = res.url
  const body = await res.text()
  return { finalUrl, body }
}

/**
 * Extract lat/lng from a resolved Google Maps URL or its HTML body.
 * Tries four progressive strategies.
 */
function extractCoords(url, body) {
  // Strategy 1: @lat,lng[,Xz] in URL path
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 2: !3d<lat>!4d<lng> in URL (some share formats)
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 3: percent-encoded form %213d / %214d
  const decoded = decodeURIComponent(url)
  m = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 4: @lat,lng in HTML body (canonical link or OG tags)
  m = body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 5: ?ll=lat,lng or &ll=lat,lng (older goo.gl/maps redirect targets)
  m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return null
}

/**
 * Extract place_id from URL or body (if present).
 */
function extractPlaceId(url) {
  const m = url.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

/**
 * Extract place name from URL path segment /place/Name+Here/ or /maps/place/Name/
 */
function extractNameFromUrl(url) {
  // Matches /place/SomeName/ or /place/Some+Name/@...
  const m = url.match(/\/place\/([^/@?]+)/)
  if (!m) return null
  // URL-decode and replace + with space
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() || null
  } catch {
    return m[1].replace(/\+/g, ' ').trim() || null
  }
}

/**
 * Places API (New) — Nearby Search, returns first result's place_id.
 * Requires key with "Places API (New)" enabled and no HTTP referrer restriction.
 */
async function fetchNearbyPlaceNew(lat, lng, apiKey) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 50 },
      },
      maxResultCount: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.places?.[0]?.id ?? null
}

/**
 * Places API (New) — Place Details by place_id.
 */
async function fetchPlaceDetailsNew(placeId, apiKey) {
  const fieldMask = 'id,displayName,location,formattedAddress,internationalPhoneNumber,websiteUri,rating,currentOpeningHours,types'
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
  })
  if (!res.ok) return null
  return res.json()
}

/**
 * Map new Places API (New) place object to our response shape.
 */
function mapNewPlaceToResult(place, fallbackCoords) {
  const types = place.types ?? []
  return {
    name:         place.displayName?.text ?? null,
    lat:          place.location?.latitude  ?? fallbackCoords?.lat ?? null,
    lng:          place.location?.longitude ?? fallbackCoords?.lng ?? null,
    address:      place.formattedAddress    ?? null,
    category:     mapTypes(types),
    placeId:      place.id                  ?? null,
    phone:        place.internationalPhoneNumber ?? null,
    website:      place.websiteUri          ?? null,
    rating:       place.rating              ?? null,
    openingHours: place.currentOpeningHours?.weekdayDescriptions ?? [],
  }
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const rawUrl = event.queryStringParameters?.url
  if (!rawUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing url parameter' }) }
  }

  // share.google links require JavaScript execution to resolve — not possible server-side
  if (/share\.google/i.test(rawUrl)) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({ error: 'share_google_unsupported' }),
    }
  }

  try {
    // Step 1: Resolve redirects + get final URL and body
    const { finalUrl, body } = await resolveUrl(rawUrl)

    // Step 2: Extract coords, place_id, and name from URL
    const coords  = extractCoords(finalUrl, body)
    const placeId = extractPlaceId(finalUrl) || extractPlaceId(body)
    const urlName = extractNameFromUrl(finalUrl) || extractNameFromUrl(rawUrl)

    if (!coords && !placeId) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: 'Could not extract location from URL' }),
      }
    }

    // Step 3: Enrich via Places API (New) if key is available
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    let place = null

    if (apiKey) {
      try {
        let resolvedPlaceId = placeId
        if (!resolvedPlaceId && coords) {
          resolvedPlaceId = await fetchNearbyPlaceNew(coords.lat, coords.lng, apiKey)
        }
        if (resolvedPlaceId) {
          place = await fetchPlaceDetailsNew(resolvedPlaceId, apiKey)
        }
      } catch (apiErr) {
        console.warn('Places API enrichment failed (non-fatal):', apiErr.message)
      }
    }

    // Step 4: Build response — API data where available, URL extraction as fallback
    let result
    if (place) {
      result = mapNewPlaceToResult(place, coords)
    } else {
      result = {
        name:         urlName ?? 'Unnamed Place',
        lat:          coords?.lat  ?? null,
        lng:          coords?.lng  ?? null,
        address:      null,
        category:     'Location',
        placeId:      placeId ?? null,
        phone:        null,
        website:      null,
        rating:       null,
        openingHours: [],
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) }
  } catch (err) {
    console.error('resolve-maps-link error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to resolve URL', details: err.message }),
    }
  }
}
