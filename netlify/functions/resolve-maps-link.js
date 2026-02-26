// Netlify serverless function: resolve Google Maps short/full links → coordinates
// Deployed at: /.netlify/functions/resolve-maps-link?url=<encoded-maps-url>


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

  // Format 2: !3dlat!4dlng  (data-encoded place URLs from Android/mobile share)
  const dataMatch = url.match(/!3d([-\d.]+)!4d([-\d.]+)/)
  if (dataMatch) {
    return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
  }

  // Format 3: ?q=lat,lng  (search query with coordinates)
  const qMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/)
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  }

  // Format 4: ll=lat,lng  (older Maps URLs)
  const llMatch = url.match(/[?&]ll=([-\d.]+),([-\d.]+)/)
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
  }

  // Format 5: /dir//lat,lng  (directions destination)
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
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    const finalUrl = response.url

    // Step 1: try to parse coordinates from the URL itself
    let coords = parseCoordinates(finalUrl)

    // Step 2: fallback — read HTML body and try multiple patterns
    if (!coords) {
      const html = await response.text()

      // %212d{lng}%213d{lat} — appears in static map URLs embedded in the HTML
      // (%21 = !, 2d = longitude marker, 3d = latitude marker)
      const encodedMatch = html.match(/%212d([-\d.]+)%213d([-\d.]+)/)
      if (encodedMatch) {
        coords = { lat: parseFloat(encodedMatch[2]), lng: parseFloat(encodedMatch[1]) }
      }

      // @lat,lng,zoom — appears in canonical URLs and script data
      if (!coords) {
        const atMatch = html.match(/@([-\d]+\.\d{4,}),([-\d]+\.\d{4,})/)
        if (atMatch) {
          coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
        }
      }
    }

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
