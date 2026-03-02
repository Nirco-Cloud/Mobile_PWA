const RESOLVER_URL = import.meta.env.VITE_NETLIFY_RESOLVER_URL

/**
 * Resolves a Google Maps URL to { lat, lng, name, enriched? }.
 * Throws on error. Returns the resolved data object.
 */
export async function resolveMapLink(rawUrl) {
  let trimmed = rawUrl.trim()
  if (!trimmed) throw new Error('No URL provided')
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed
  }
  if (!RESOLVER_URL) throw new Error('VITE_NETLIFY_RESOLVER_URL is not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)
  let res
  try {
    res = await fetch(`${RESOLVER_URL}?url=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to resolve')

  if (data.needsGeocode && data.address && window.google?.maps?.Geocoder) {
    const geocoder = new window.google.maps.Geocoder()
    const geoResult = await geocoder.geocode({ address: data.address })
    if (geoResult.results?.[0]) {
      const loc = geoResult.results[0].geometry.location
      data.lat = loc.lat()
      data.lng = loc.lng()
      delete data.needsGeocode

      try {
        const enrichRes = await fetch(
          `${RESOLVER_URL}?mode=enrich&name=${encodeURIComponent(data.name || data.address)}&lat=${data.lat}&lng=${data.lng}`,
          { signal: AbortSignal.timeout(6000) }
        )
        if (enrichRes.ok) {
          const enrichData = await enrichRes.json()
          if (enrichData.enriched) {
            data.enriched = enrichData.enriched
            if (enrichData.enriched.displayName) data.name = enrichData.enriched.displayName
          }
        }
      } catch { /* non-critical */ }
    } else {
      throw new Error('Could not find coordinates for this place')
    }
  } else if (data.needsGeocode) {
    throw new Error('Could not extract coordinates from this link')
  }

  return { data, resolvedUrl: trimmed }
}
