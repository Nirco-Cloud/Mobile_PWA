/**
 * resolve-maps-link.js
 * Cloudflare Pages Function — resolves any Google Maps URL and enriches it
 * with Google Places API (New) data.
 *
 * GET /api/resolve-maps-link?url=<encoded-maps-url>
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
 * Env vars (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   GOOGLE_PLACES_API_KEY  — Must have "Places API (New)" enabled.
 */

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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
 * useDesktop=true sends a desktop UA (smaller body, easier coord extraction).
 */
async function fetchUrl(inputUrl, useDesktop = false) {
  const res = await fetch(inputUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': useDesktop ? DESKTOP_UA : MOBILE_UA,
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
  // Strategy 1: !3d<lat>!4d<lng> — actual pin location (highest priority)
  let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 2: percent-encoded !3d!4d
  const decoded = decodeURIComponent(url)
  m = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 3: ?ll=lat,lng (older goo.gl redirect targets)
  m = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 4: @lat,lng in URL — map viewport center (fallback, may be offset)
  m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 5: og:image center=lat%2Clng (reliable Google Maps HTML body signal)
  m = body.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Strategy 6: APP_INITIALIZATION_STATE=[[[scale,lng,lat — format: [scale, lng, lat]
  m = body.match(/APP_INITIALIZATION_STATE=\[\[\[[\d.]+,(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) }

  // Strategy 7: @lat,lng in HTML body — last resort, can match spurious URLs
  m = body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  return null
}

function extractPlaceId(url) {
  const m = url.match(/place_id[=:]([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

function extractNameFromUrl(url) {
  // /place/NAME/ path (standard place URL)
  const m = url.match(/\/place\/([^/@?]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() || null
    } catch {
      return m[1].replace(/\+/g, ' ').trim() || null
    }
  }
  // ?q=NAME query param (?q=...&ftid=... style URLs)
  const q = url.match(/[?&]q=([^&]+)/)
  if (q) {
    try {
      return decodeURIComponent(q[1].replace(/\+/g, ' ')).trim() || null
    } catch {
      return q[1].replace(/\+/g, ' ').trim() || null
    }
  }
  return null
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

async function geocodePlace(query, apiKey, regionCode = null) {
  const params = new URLSearchParams({ address: query, key: apiKey })
  if (regionCode) params.set('region', regionCode)
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null
  const r = data.results[0]
  return {
    placeId: r.place_id ?? null,
    lat:     r.geometry?.location?.lat ?? null,
    lng:     r.geometry?.location?.lng ?? null,
  }
}

async function enrichHebrewName(place, apiKey) {
  if (!place?.id) return
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${place.id}?languageCode=iw`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'displayName' },
    })
    if (res.ok) {
      const data = await res.json()
      const heName = data.displayName?.text
      if (heName && heName !== place.displayName?.text) place._nameHe = heName
    }
  } catch { /* non-fatal */ }
}

async function fetchPlaceByTextSearch(query, apiKey, regionCode = null) {
  const fieldMask = 'places.id,places.displayName,places.location,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.currentOpeningHours,places.types'
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
  const place = data.places?.[0] ?? null
  if (place) await enrichHebrewName(place, apiKey)
  return place
}

async function resolveByName(query, apiKey, regionCode = null) {
  let geocodedCoords = null

  try {
    const geo = await geocodePlace(query, apiKey, regionCode)
    console.log('Geocode result:', JSON.stringify(geo))
    if (geo?.placeId) {
      const place = await fetchPlaceDetailsNew(geo.placeId, apiKey)
      if (place) return place
    }
    if (geo?.lat && geo?.lng) geocodedCoords = { lat: geo.lat, lng: geo.lng }
  } catch (e) {
    console.warn('Geocoding failed:', e.message)
  }

  if (geocodedCoords) {
    try {
      const nearbyId = await fetchNearbyPlaceNew(geocodedCoords.lat, geocodedCoords.lng, apiKey)
      if (nearbyId) {
        const place = await fetchPlaceDetailsNew(nearbyId, apiKey)
        if (place) return place
      }
    } catch (e) {
      console.warn('Nearby search fallback failed:', e.message)
    }
  }

  try {
    return await fetchPlaceByTextSearch(query, apiKey, regionCode)
  } catch (e) {
    console.warn('Text search fallback failed:', e.message)
    return null
  }
}

async function fetchPlaceByNameAndCoords(name, lat, lng, apiKey) {
  const fieldMask = 'places.id,places.displayName,places.location,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.currentOpeningHours,places.types'
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      textQuery: name,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 500.0,
        },
      },
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const place = data.places?.[0] ?? null
  if (place) await enrichHebrewName(place, apiKey)
  return place
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
  const [enRes, heRes] = await Promise.all([
    fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fieldMask },
    }),
    fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=iw`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'displayName' },
    }),
  ])
  if (!enRes.ok) return null
  const place = await enRes.json()
  if (heRes.ok) {
    const heData = await heRes.json()
    const heName = heData.displayName?.text
    if (heName && heName !== place.displayName?.text) place._nameHe = heName
  }
  return place
}

function mapPlaceToResult(place, fallbackCoords) {
  const types = place.types ?? []
  const result = {
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
  if (place._nameHe) result.nameHe = place._nameHe
  return result
}

// ─── Cloudflare Pages Function Handler ────────────────────────────────────────

export async function onRequest(context) {
  const { request, env } = context

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  const rawUrl = new URL(request.url).searchParams.get('url')
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400, headers })
  }

  const apiKey = env.GOOGLE_PLACES_API_KEY

  // ── Strategy A: share.google/TOKEN ─────────────────────────────────────────
  if (/share\.google/i.test(rawUrl)) {
    try {
      // Step 1: Try manual redirect first to capture the Location header.
      // Google blocks server-side fetches to share.google by following to /error,
      // but the first 302 redirect often points to maps.app.goo.gl which we can resolve.
      const manualRes = await fetch(rawUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': MOBILE_UA,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      const location = manualRes.headers.get('location')
      const isDebug = new URL(request.url).searchParams.get('debug') === '1'
      console.log('share.google manual redirect → status:', manualRes.status, 'location:', location)
      if (isDebug) {
        return new Response(JSON.stringify({ manualStatus: manualRes.status, location, allHeaders: Object.fromEntries(manualRes.headers) }), { status: 200, headers })
      }

      if (location && /maps\.app\.goo\.gl|maps\.google\.|google\.[a-z.]+\/maps/i.test(location)) {
        // Redirect points to a resolvable maps URL — fall through to Strategy C
        const useDesktop = /maps\.app\.goo\.gl/i.test(location)
        const { finalUrl, body } = await fetchUrl(location, useDesktop)
        const coords  = extractCoords(finalUrl, body)
        const placeId = extractPlaceId(finalUrl) || extractPlaceId(body)
        const urlName = extractNameFromUrl(finalUrl) || extractNameFromUrl(location)
        if (coords || placeId) {
          let place = null
          if (apiKey) {
            try {
              let resolvedPlaceId = placeId
              if (!resolvedPlaceId && urlName && coords) {
                place = await fetchPlaceByNameAndCoords(urlName, coords.lat, coords.lng, apiKey)
              }
              if (!place && !resolvedPlaceId && coords) {
                resolvedPlaceId = await fetchNearbyPlaceNew(coords.lat, coords.lng, apiKey)
              }
              if (!place && resolvedPlaceId) {
                place = await fetchPlaceDetailsNew(resolvedPlaceId, apiKey)
              }
            } catch (apiErr) {
              console.warn('Places API enrichment failed:', apiErr.message)
            }
          }
          const result = place
            ? mapPlaceToResult(place, coords)
            : { name: urlName ?? 'Unnamed Place', lat: coords?.lat ?? null, lng: coords?.lng ?? null,
                address: null, category: 'Location', placeId: placeId ?? null,
                phone: null, website: null, rating: null, openingHours: [] }
          return new Response(JSON.stringify(result), { status: 200, headers })
        }
      }

      // Step 2: Follow redirect and try to parse the HTML body for place name
      const { body, finalUrl: shareGoogleFinalUrl } = await fetchUrl(rawUrl)
      console.log('share.google followed → finalUrl:', shareGoogleFinalUrl)
      const { name: placeName, regionCode } = extractShareGoogleData(body)
      console.log('share.google — name:', placeName, 'region:', regionCode)
      if (placeName && apiKey) {
        const place = await resolveByName(placeName, apiKey, regionCode)
        if (place) {
          return new Response(JSON.stringify(mapPlaceToResult(place, null)), { status: 200, headers })
        }
      }
      if (placeName) {
        return new Response(JSON.stringify({
          name: placeName, lat: null, lng: null, address: null,
          category: 'Location', placeId: null, phone: null,
          website: null, rating: null, openingHours: [],
        }), { status: 200, headers })
      }
    } catch (e) {
      console.warn('share.google resolution failed:', e.message)
    }
    return new Response(JSON.stringify({
      error: 'Could not resolve this share link. In Google Maps: tap ··· → Share → Copy link, then paste that URL here.',
    }), { status: 422, headers })
  }

  // ── Strategy B: maps/search?query=VALUE ────────────────────────────────────
  const searchMatch = rawUrl.match(/[?&]query=([^&]+)/)
  if (searchMatch && /maps[./].*search/i.test(rawUrl)) {
    const query = decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')).trim()
    if (apiKey) {
      try {
        const place = await resolveByName(query, apiKey)
        if (place) {
          return new Response(JSON.stringify(mapPlaceToResult(place, null)), { status: 200, headers })
        }
      } catch (e) {
        console.warn('resolveByName failed:', e.message)
      }

      if (/^[A-Za-z0-9_-]{8,40}$/.test(query)) {
        try {
          const { body } = await fetchUrl(`https://share.google/${query}`)
          const { name: placeName, regionCode } = extractShareGoogleData(body)
          console.log('maps/search token → share.google name:', placeName, 'region:', regionCode)
          if (placeName) {
            const place = await resolveByName(placeName, apiKey, regionCode)
            if (place) {
              return new Response(JSON.stringify(mapPlaceToResult(place, null)), { status: 200, headers })
            }
          }
        } catch (e) {
          console.warn('Token share.google fallback failed:', e.message)
        }
      }
    }
  }

  // ── Strategy C: Standard URL resolution ────────────────────────────────────
  try {
    const useDesktop = /maps\.app\.goo\.gl/i.test(rawUrl)
    const { finalUrl, body } = await fetchUrl(rawUrl, useDesktop)

    const coords  = extractCoords(finalUrl, body)
    const placeId = extractPlaceId(finalUrl) || extractPlaceId(body)
    const urlName = extractNameFromUrl(finalUrl) || extractNameFromUrl(rawUrl)

    if (!coords && !placeId) {
      return new Response(JSON.stringify({ error: 'Could not extract location from URL' }), { status: 422, headers })
    }

    let place = null
    if (apiKey) {
      try {
        let resolvedPlaceId = placeId
        if (!resolvedPlaceId && urlName && coords) {
          place = await fetchPlaceByNameAndCoords(urlName, coords.lat, coords.lng, apiKey)
        }
        if (!place && !resolvedPlaceId && coords) {
          resolvedPlaceId = await fetchNearbyPlaceNew(coords.lat, coords.lng, apiKey)
        }
        if (!place && resolvedPlaceId) {
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

    return new Response(JSON.stringify(result), { status: 200, headers })
  } catch (err) {
    console.error('resolve-maps-link error:', err)
    return new Response(JSON.stringify({ error: 'Failed to resolve URL', details: err.message }), { status: 500, headers })
  }
}
