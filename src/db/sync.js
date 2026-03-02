import { get, set, del, getMany, setMany } from 'idb-keyval'
import { kvStore, planStore, KEYS } from './db.js'
import { writeLocations } from './locations.js'
import { readAllPlanEntriesIncludingDeleted, normalizePlanEntry } from './plannerDb.js'
import { precacheImages } from '../workers/imagePrecache.js'

const JSON_FILES = ['locations.json']

function normalizeRecord(r) {
  return {
    id: r.id,
    name: r.name,
    lat: r.lat ?? r.latitude,
    lng: r.lng ?? r.longitude,
    category: r.category ?? '',
    description: r.description ?? '',
    address: r.address ?? '',
    imageUrl: r.imageUrl ?? '',
    thumbnailUrl: r.thumbnailUrl ?? '',
    icon: r.icon ?? '',
    source: r.source ?? '',
    images: r.images ?? [],
  }
}

function extractRecords(data) {
  if (Array.isArray(data)) return data
  if (data.locations && Array.isArray(data.locations)) return data.locations
  return [data]
}

export async function initializeData() {
  const done = await get(KEYS.SYNC_COMPLETE, kvStore)
  if (done) return

  const base = import.meta.env.BASE_URL

  const results = await Promise.allSettled(
    JSON_FILES.map(async (file) => {
      const res = await fetch(`${base}data/${file}`)
      if (!res.ok) throw new Error(`Failed to fetch ${file}: HTTP ${res.status}`)
      const data = await res.json()
      return extractRecords(data).map(normalizeRecord)
    }),
  )

  const allRecords = []
  const errors = []
  for (const result of results) {
    if (result.status === 'fulfilled') allRecords.push(...result.value)
    else errors.push(result.reason.message)
  }

  if (allRecords.length === 0) {
    throw new Error(`All data files failed to load: ${errors.join('; ')}`)
  }

  await writeLocations(allRecords)

  const imageUrls = allRecords
    .flatMap((r) => [r.imageUrl, r.thumbnailUrl])
    .filter(Boolean)

  if (imageUrls.length > 0) {
    await precacheImages(imageUrls)
  }

  await set(KEYS.SYNC_COMPLETE, true, kvStore)
}

export async function resetSync() {
  await del(KEYS.SYNC_COMPLETE, kvStore)
  await del(KEYS.PLAN_LOADED, kvStore)
}

export async function initializePlan() {
  const done = await get(KEYS.PLAN_LOADED, kvStore)
  if (done) return

  const base = import.meta.env.BASE_URL
  try {
    const res = await fetch(`${base}data/plan.json?v=${Date.now()}`)
    if (!res.ok) return
    const data = await res.json()
    const entries = Array.isArray(data) ? data : (data.entries ?? data.plan ?? [])
    const validated = entries
      .filter((e) => e.id && typeof e.day === 'number' && e.day >= 1 && e.name)
      .map(normalizePlanEntry)
    if (validated.length > 0) {
      // LWW merge: only write baseline entry if no local copy exists or local is older
      const existing = await readAllPlanEntriesIncludingDeleted()
      const existingMap = new Map(existing.map((e) => [e.id, e]))
      const toWrite = validated.filter((incoming) => {
        const local = existingMap.get(incoming.id)
        if (!local) return true
        return (incoming.updatedAt ?? '') > (local.updatedAt ?? '')
      })
      if (toWrite.length > 0) {
        await setMany(toWrite.map((e) => [e.id, e]), planStore)
      }
    }
  } catch {
    // No baseline plan or fetch failed — continue without it
  }
  await set(KEYS.PLAN_LOADED, true, kvStore)
}
