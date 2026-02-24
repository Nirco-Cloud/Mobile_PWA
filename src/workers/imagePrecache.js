export async function precacheImages(urls) {
  if (!urls?.length) return
  const sw = navigator.serviceWorker?.controller
  if (!sw) {
    // SW not yet active — wait for it then retry
    await new Promise((resolve) => {
      navigator.serviceWorker?.addEventListener('controllerchange', resolve, { once: true })
    })
    const newSw = navigator.serviceWorker?.controller
    if (!newSw) return
    newSw.postMessage({ type: 'CACHE_IMAGES', urls })
    return
  }
  sw.postMessage({ type: 'CACHE_IMAGES', urls })
}
