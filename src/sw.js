import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Inject build-time manifest
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Cache images at runtime (CacheFirst, 90 days, 500 entries)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'location-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 90 * 24 * 60 * 60 }),
    ],
  }),
)

// Cache JSON data files at runtime (CacheFirst)
registerRoute(
  ({ url }) => url.pathname.includes('/data/'),
  new CacheFirst({
    cacheName: 'location-data',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
)

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (event.data?.type === 'CACHE_IMAGES') {
    const urls = event.data.urls ?? []
    caches.open('location-images').then((cache) => {
      urls.forEach((url) => {
        cache.add(url).catch((err) => {
          console.warn('[SW] Failed to cache image:', url, err)
        })
      })
    })
  }
})
