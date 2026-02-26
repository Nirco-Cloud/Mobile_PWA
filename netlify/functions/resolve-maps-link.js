// Netlify serverless function: resolve Google Maps short/full links → coordinates
// Deployed at: /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>

const ALLOWED_ORIGINS = [
  'https://nirco.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const GOOGLE_MAPS_HOSTS = [
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'www.google.com',
]

function isGoogleMapsUrl(url) {
  try {
    const parsed = new URL(url)
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
  // Format 1: /@lat,lng,zoom  (most common — place pages, directions)
  const atMatch = url.match(/@([-\d.]+),([-\d.]+)/)
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  }

  // Format 2: ?q=lat,lng  (search query with coordinates)
  const qMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/)
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  }

  // Format 3: /dir//lat,lng  (directions destination)
  const dirMatch = url.match(/\/dir\/\/([-\d.]+),([-\d.]+)/)
  if (dirMatch) {
    return { lat: parseFloat(dirMatch[1]), lng: parseFloat(dirMatch[2]) }
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

exports.handler = async (event) => {
  const origin = event.headers?.origin || ''
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
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
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    const finalUrl = response.url
    const coords = parseCoordinates(finalUrl)

    if (!coords) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: 'Could not extract coordinates from URL',
          finalUrl,
        }),
      }
    }

    const name = parsePlaceName(finalUrl)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        lat: coords.lat,
        lng: coords.lng,
        name,
        finalUrl,
      }),
    }
  } catch (err) {
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
