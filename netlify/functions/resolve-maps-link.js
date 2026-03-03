/**
 * resolve-maps-link.js
 * Netlify serverless function — resolves any Google Maps URL and enriches it
 * with Google Places API (New) data.
 *
 * GET /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>
 *
 * Returns: { name, lat, lng, address, category, placeId, phone, website, rating, openingHours }
 *
 * Supported formats:
 *   - share.google/TOKEN        (Android native share — extracts name from HTML body)
 *   - maps.app.goo.gl/TOKEN     (Android Copy Link — follows HTTP redirect)
 *   - goo.gl/maps/TOKEN         (legacy short link)
 *   - google.com/maps/place/... (full URL with coords)
 *   - maps.google.com/maps/search/?api=1&query=NAME_OR_TOKEN
 *
 * Env vars:
 *   GOOGLE_PLACES_API_KEY  — Must have "Places API (New)" enabled.
 */

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36'

// Google Place type → app category mapping
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
 * Follow redirects and return final URL + HTML body.
 */
async function fetchUrl(inputUrl) {
  const res = await fetch(inputUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  const finalUrl = res.url
  const body = await res.text()
  return { finalUrl, body }
}

/**
 * Extract place name + region code from a share.google response body.
 * Google embeds /search?q=PLACE+NAME&rlz=1C1CHZN_enIL1195IL1195&...
 * The rlz parameter encodes the sharer's country (e.g. IL = Israel, JP = Japan).
 * Returns { name, regionCode } — regionCode may be null.
 */
function extractShareGoogleData(body) {
  const hrefMatch = body.match(/href="\/search\?([^"]+)"/)
  if (!hrefMatch) return { name: null, regionCode: null }

  const qs = hrefMatch[1]

  // Extract place name from q=
  const qMatch = qs.match(/(?:^|&)q=([^&]+)/)
  let name = null
  if (qMatch) {
    try { name = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim() || null }
    catch { name = qMatch[1].replace(/\+/g, ' ').trim() || null }
  }

  // Extract country code from rlz=..._xxCC... (e.g. enIL → IL, enJP → JP)
  let regionCode = null
  const rlzMatch = qs.match(/rlz=[^&]*_[a-z]{2}([A-Z]{2})/)
  if (rlzMatch) regionCode = rlzMatch[1].toLowerCase()

  return { name, regionCode }
}

/**
 * Extract lat/lng from a resolved Google Maps URL or its HTML body.
 */
function extractCoords(url, body) {
  // Strategy 1: @lat,lng in URL
  let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 2: !3d<lat>!4d<lng> in URL
  m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 3: percent-encoded !3d!4d
  const decoded = decodeURIComponent(url)
  m = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 4: @lat,lng in HTML body
  m = body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 5: ?ll=lat,lng (older goo.gl redirect targets)
  m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return null
}

function extractPlaceId(url) {
  const m = url.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

function extractNameFromUrl(url) {
  const m = url.match(/\/place\/([^/@?]+)/)
  if (!m) return null
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() || null
  } catch {
    return m[1].replace(/\+/g, ' ').trim() || null
  }
}

// ─── Places API (New) ─────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 → country name for query enrichment
const REGION_NAMES = {
  il: 'Israel', jp: 'Japan', us: 'United States', gb: 'United Kingdom',
  fr: 'France', de: 'Germany', it: 'Italy', es: 'Spain', au: 'Australia',
  ca: 'Canada', nl: 'Netherlands', be: 'Belgium', ch: 'Switzerland',
  at: 'Austria', se: 'Sweden', no: 'Norway', dk: 'Denmark', fi: 'Finland',
  pt: 'Portugal', gr: 'Greece', tr: 'Turkey', th: 'Thailand', sg: 'Singapore',
  kr: 'South Korea', cn: 'China', tw: 'Taiwan', hk: 'Hong Kong',
  in: 'India', ae: 'UAE', mx: 'Mexico', br: 'Brazil', ar: 'Argentina',
  za: 'South Africa', eg: 'Egypt', ma: 'Morocco',
}

async function fetchPlaceByTextSearch(query, apiKey, regionCode = null) {
  const fieldMask = 'places.id,places.displayName,places.location,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.currentOpeningHours,places.types'
  // Append country name to query for strong geographic anchoring
  const countryName = regionCode ? REGION_NAMES[regionCode] : null
  const textQuery = countryName ? `${query} ${countryName}` : query
  const body = { textQuery }
  if (regionCode) body.regionCode = regionCode
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.places?.[0] ?? null
}

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

function mapPlaceToResult(place, fallbackCoords) {
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

// ─── Handler ──────────────────────────────────────────────────────────────────

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

  // ── Strategy A: share.google/TOKEN ─────────────────────────────────────────
  // Google embeds the place name in the HTML as /search?q=PLACE+NAME.
  // Extract it and use Places Text Search.
  if (/share\.google/i.test(rawUrl)) {
    try {
      const { body } = await fetchUrl(rawUrl)
      const { name: placeName, regionCode } = extractShareGoogleData(body)
      console.log('share.google — name:', placeName, 'region:', regionCode)
      if (placeName && apiKey) {
        const place = await fetchPlaceByTextSearch(placeName, apiKey, regionCode)
        if (place) {
          return { statusCode: 200, headers, body: JSON.stringify(mapPlaceToResult(place, null)) }
        }
      }
      // Name found but no API key / no result — return name-only fallback
      if (placeName) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            name: placeName, lat: null, lng: null, address: null,
            category: 'Location', placeId: null, phone: null,
            website: null, rating: null, openingHours: [],
          }),
        }
      }
    } catch (e) {
      console.warn('share.google resolution failed:', e.message)
    }
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({ error: 'Could not resolve this share link. In Google Maps: tap ··· → Share → Copy link, then paste that URL here.' }),
    }
  }

  // ── Strategy B: maps/search?query=VALUE ────────────────────────────────────
  // Try Places Text Search with the query value first.
  // If the query is an opaque token, also try resolving it via share.google.
  const searchMatch = rawUrl.match(/[?&]query=([^&]+)/)
  if (searchMatch && /maps[./].*search/i.test(rawUrl)) {
    const query = decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')).trim()
    if (apiKey) {
      try {
        // Try direct text search first (works for real place names)
        const place = await fetchPlaceByTextSearch(query, apiKey)
        if (place) {
          return { statusCode: 200, headers, body: JSON.stringify(mapPlaceToResult(place, null)) }
        }
      } catch (e) {
        console.warn('Text search failed:', e.message)
      }

      // Query might be a token — try resolving via share.google
      if (/^[A-Za-z0-9_-]{8,40}$/.test(query)) {
        try {
          const { body } = await fetchUrl(`https://share.google/${query}`)
          const { name: placeName, regionCode } = extractShareGoogleData(body)
          console.log('maps/search token → share.google name:', placeName, 'region:', regionCode)
          if (placeName) {
            const place = await fetchPlaceByTextSearch(placeName, apiKey, regionCode)
            if (place) {
              return { statusCode: 200, headers, body: JSON.stringify(mapPlaceToResult(place, null)) }
            }
          }
        } catch (e) {
          console.warn('Token share.google fallback failed:', e.message)
        }
      }
    }
    // Fall through to URL extraction
  }

  // ── Strategy C: Standard URL resolution ────────────────────────────────────
  // Follow HTTP redirects, extract coords/placeId, enrich via Places API.
  try {
    const { finalUrl, body } = await fetchUrl(rawUrl)

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

    // Enrich via Places API
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

    const result = place
      ? mapPlaceToResult(place, coords)
      : {
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
