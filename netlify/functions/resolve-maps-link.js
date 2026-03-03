/**
 * resolve-maps-link.js
 * Netlify serverless function — resolves a Google Maps URL and enriches it
 * with Google Places API data.
 *
 * GET /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>
 *
 * Returns: { name, lat, lng, address, category, placeId, phone, website, rating, openingHours }
 */

// Google Place type → app category mapping (approved mapping)
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
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t]
  }
  return 'Location'
}

/**
 * Follow redirects and return the final URL + HTML body.
 * Uses a browser-like UA so Google Maps doesn't refuse the request.
 */
async function resolveUrl(inputUrl) {
  const res = await fetch(inputUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36',
    },
  })
  const finalUrl = res.url
  const body = await res.text()
  return { finalUrl, body }
}

/**
 * Extract lat/lng from a resolved URL.
 * Strategy 1: @lat,lng in URL path
 * Strategy 2: !3d<lat>!4d<lng> encoded in URL or body
 * Strategy 3: @lat,lng in body text
 */
function extractCoords(url, body) {
  // Strategy 1: @lat,lng,Xz in URL
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 2: !3d<lat>!4d<lng> (URL-encoded Android share links)
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 3: encoded form %213d / %214d
  const decoded = decodeURIComponent(url)
  m = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 4: @lat,lng in HTML body
  m = body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return null
}

/**
 * Extract place_id from the URL (if present).
 */
function extractPlaceId(url) {
  const m = url.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

/**
 * Call Google Places API — Place Details by place_id.
 */
async function fetchPlaceDetails(placeId, apiKey) {
  const fields = 'name,geometry,formatted_address,formatted_phone_number,website,rating,opening_hours,types,place_id'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK') return null
  return data.result
}

/**
 * Call Google Places API — Nearby Search by coordinates.
 * Returns the closest place (first result).
 */
async function fetchNearbyPlace(lat, lng, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null
  // Return the closest result's place_id for a details lookup
  return data.results[0].place_id
}

/**
 * Format opening hours array from Google Places API.
 */
function formatOpeningHours(openingHours) {
  if (!openingHours?.weekday_text?.length) return []
  return openingHours.weekday_text
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

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfigured: missing API key' }) }
  }

  try {
    // Step 1: Resolve redirects + get final URL
    const { finalUrl, body } = await resolveUrl(rawUrl)

    // Step 2: Try to find place_id or coords
    const placeId = extractPlaceId(finalUrl) || extractPlaceId(body)
    const coords = extractCoords(finalUrl, body)

    let placeDetails = null

    if (placeId) {
      // Prefer place_id → direct Details call
      placeDetails = await fetchPlaceDetails(placeId, apiKey)
    } else if (coords) {
      // Fallback: nearest POI via Nearby Search → Details
      const nearbyPlaceId = await fetchNearbyPlace(coords.lat, coords.lng, apiKey)
      if (nearbyPlaceId) {
        placeDetails = await fetchPlaceDetails(nearbyPlaceId, apiKey)
      }
    }

    if (!placeDetails && !coords) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: 'Could not extract location from URL' }),
      }
    }

    // Step 3: Build response
    const result = {
      name:         placeDetails?.name ?? 'Unnamed Place',
      lat:          placeDetails?.geometry?.location?.lat ?? coords?.lat ?? null,
      lng:          placeDetails?.geometry?.location?.lng ?? coords?.lng ?? null,
      address:      placeDetails?.formatted_address ?? null,
      category:     mapTypes(placeDetails?.types),
      placeId:      placeDetails?.place_id ?? placeId ?? null,
      phone:        placeDetails?.formatted_phone_number ?? null,
      website:      placeDetails?.website ?? null,
      rating:       placeDetails?.rating ?? null,
      openingHours: formatOpeningHours(placeDetails?.opening_hours),
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
