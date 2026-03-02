// Netlify serverless function: resolve Google Maps short/full links → coordinates
// Deployed at: /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>


const GOOGLE_MAPS_HOSTS = [
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'www.google.com',
  'share.google',
]

function isGoogleMapsUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'share.google') return true
    return (
      GOOGLE_MAPS_HOSTS.includes(parsed.hostname) &&
      (parsed.pathname.includes('/maps') ||
        parsed.hostname === 'maps.app.goo.gl' ||
        parsed.pathname.startsWith('/maps'))
    )
  } catch {
    return false
  }
}

function parseCoordinates(url) {
  // Priority: exact place coords first, viewport coords last.
  // /@lat,lng is the VIEWPORT center, not the place — a server in the US
  // can get US viewport coords even when the actual place is in Japan.

  // 1. !3dlat!4dlng — exact place coordinates in proto-encoded data
  const dataMatch = url.match(/!3d([-\d.]+)!4d([-\d.]+)/)
  if (dataMatch) {
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
  }

  // 2. ?q=lat,lng — search query with coordinates
  const qMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/)
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  }

  // 3. ll=lat,lng — older Maps URLs
  const llMatch = url.match(/[?&]ll=([-\d.]+),([-\d.]+)/)
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
  }

  // 4. /dir//lat,lng — directions destination
  const dirMatch = url.match(/\/dir\/\/([-\d.]+),([-\d.]+)/)
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) }
  }

  // 5. /@lat,lng — viewport center (LAST — least reliable, can reflect server location)
  const atMatch = url.match(/@([-\d.]+),([-\d.]+)/)
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  }

  return null
}

function parsePlaceName(url) {
  // Extract from /maps/place/PlaceName/@...
  const placeMatch = url.match(/\/maps\/place\/([^/@?&#]+)/)
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
  }
  return null
}

function isShareGoogleUrl(url) {
  try {
    return new URL(url).hostname === 'share.google'
  } catch {
    return false
  }
}

function parseShareGooglePage(finalUrl, html) {
  // 1. Look for embedded Google Search URL with kgmid + q param
  //    e.g. /search?kgmid=/g/xxx&q=Place+Name
  const searchMatch = html.match(/\/search\?[^"'\s<>]*kgmid=[^"'\s<>]*/)
  if (searchMatch) {
    try {
      const raw = searchMatch[0].replace(/&amp;/g, '&')
      const searchUrl = new URL('https://www.google.com' + raw)
      const q = searchUrl.searchParams.get('q')
      if (q) return q.replace(/\+/g, ' ')
    } catch { /* continue */ }
  }

  // 2. Fallback: q param in the final URL itself (google.com/share.google?q=...)
  try {
    const parsed = new URL(finalUrl)
    const q = parsed.searchParams.get('q')
    if (q) return q.replace(/\+/g, ' ')
  } catch { /* continue */ }

  // 3. Fallback: look for <title> content
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
  if (titleMatch) {
    const title = titleMatch[1].trim()
    // Ignore generic Google titles
    if (title && !title.toLowerCase().includes('google')) return title
  }

  return null
}

// Map Google Places types → builder CATEGORIES
function mapGoogleTypeToCategory(types = [], primaryType = '') {
  const all = [primaryType, ...types].filter(Boolean).map(t => t.toLowerCase())

  if (all.some(t => t.includes('ramen'))) return 'Ramen'
  if (all.some(t => t.includes('izakaya'))) return 'Izakaya'
  if (all.some(t => t.includes('sushi'))) return 'סושי עממי ולא יקר'
  if (all.some(t => t.includes('cafe') || t.includes('coffee') || t.includes('tea') || t === 'bar')) return 'קפה/תה/אלכוהול'
  if (all.some(t => t.includes('restaurant') || t.includes('food') || t.includes('meal'))) return 'מסעדות ואוכל רחוב'
  if (all.some(t => t.includes('snack') || t.includes('bakery') || t.includes('confectionery') || t.includes('dessert') || t.includes('ice_cream'))) return 'חטיפים ומלוחים'
  if (all.some(t => t.includes('hotel') || t.includes('lodging') || t.includes('motel') || t.includes('inn') || t.includes('hostel'))) return 'hotel'
  if (all.some(t => t.includes('train') || t.includes('subway') || t.includes('transit') || t.includes('station') || t.includes('railway'))) return 'train'
  if (all.some(t => t.includes('store') || t.includes('shop') || t.includes('mall') || t.includes('market') || t.includes('supermarket') || t.includes('department'))) return 'חנויות'
  if (all.some(t => t.includes('shrine') || t.includes('temple') || t.includes('park') || t.includes('tourist') || t.includes('landmark') || t.includes('museum') || t.includes('castle') || t.includes('garden') || t.includes('natural'))) return 'איזורים ואתרים'
  if (all.some(t => t.includes('amusement') || t.includes('entertainment') || t.includes('night_club') || t.includes('bowling') || t.includes('arcade'))) return 'activity'

  return null
}

async function enrichWithPlacesAPI(name, coords) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { _debug: 'no API key in env' }
  if (!name || !coords) return { _debug: 'missing name or coords' }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.types',
          'places.primaryType',
          'places.rating',
          'places.userRatingCount',
          'places.editorialSummary',
          'places.regularOpeningHours',
          'places.internationalPhoneNumber',
          'places.websiteUri',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: name,
        locationBias: {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: 150.0,
          },
        },
        maxResultCount: 1,
        languageCode: 'en',
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { _debug: `Places API ${response.status}`, _error: errText.slice(0, 300) }
    }

    const data = await response.json()
    const place = data.places?.[0]
    if (!place) return { _debug: 'no places returned', _query: name }

    const types = place.types || []
    const primaryType = place.primaryType || ''

    return {
      placeId: place.id || null,
      displayName: place.displayName?.text || null,
      address: place.formattedAddress || null,
      types,
      primaryType,
      suggestedCategory: mapGoogleTypeToCategory(types, primaryType),
      rating: place.rating || null,
      ratingCount: place.userRatingCount || null,
      phone: place.internationalPhoneNumber || null,
      website: place.websiteUri || null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
      description: place.editorialSummary?.text || null,
    }
  } catch (err) {
    return { _debug: 'exception', _error: err.message }
  }
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const { url } = event.queryStringParameters || {}

  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing url parameter' }),
    }
  }

  if (!isGoogleMapsUrl(url)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Not a recognized Google Maps URL' }),
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response
    try {
      response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const finalUrl = response.url

    // share.google links are Knowledge Panel shares — no coordinates,
    // extract place name and let client geocode it
    if (isShareGoogleUrl(url)) {
      const reader = response.body.getReader()
      let html = ''
      while (html.length < 8192) {
        const { done, value } = await reader.read()
        if (done) break
        html += new TextDecoder().decode(value)
      }
      reader.cancel()

      const placeName = parseShareGooglePage(finalUrl, html)
      if (placeName) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            name: placeName,
            address: placeName,
            needsGeocode: true,
            finalUrl,
          }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'Could not extract place name from this share.google link',
        }),
      }
    }

    // Step 1: try to parse coordinates from the URL itself
    let coords = parseCoordinates(finalUrl)

    // Step 2: fallback — scan HTML for coordinate patterns.
    // NOTE: %212d/%213d (OG static map) is deliberately skipped —
    //       it always contains the VIEWER's location, not the place.
    if (!coords) {
      const reader = response.body.getReader()
      let html = ''
      while (html.length < 4096) {
        const { done, value } = await reader.read()
        if (done) break
        html += new TextDecoder().decode(value)
      }
      reader.cancel()

      // @lat,lng,zoom — appears in canonical URLs and script data
      const atMatch = html.match(/@([-\d]+\.\d{4,}),([-\d]+\.\d{4,})/)
      if (atMatch) {
        coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
      }
    }

    const name = parsePlaceName(finalUrl)

    // Step 3: if still no coords, return address for client-side geocoding.
    // Android GPS share links (g_st=aw) often have no coords in URL/HTML,
    // but the address is in the URL path.
    if (!coords) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          name,
          address: name,
          needsGeocode: true,
          finalUrl,
        }),
      }
    }

    // Step 4: enrich with Places API (non-blocking — failure returns basic data)
    const enriched = await enrichWithPlacesAPI(name, coords)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        lat: coords.lat,
        lng: coords.lng,
        name: enriched?.displayName || name,
        finalUrl,
        // Places API enrichment (null if API not configured or place not found)
        enriched: enriched || null,
      }),
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        statusCode: 504,
        headers,
        body: JSON.stringify({ error: 'URL resolution timed out — the link took too long to respond' }),
      }
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to resolve URL',
        message: err.message,
      }),
    }
  }
}
