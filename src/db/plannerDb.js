import { get, set, keys, getMany, clear, setMany } from 'idb-keyval'
import { planStore } from './db.js'

// Normalize legacy entries (v1/v2) to include owner, meta, valid type, updatedAt, deletedAt
export function normalizePlanEntry(entry) {
  const now = new Date().toISOString()
  return {
    ...entry,
    owner: entry.owner ?? 'shared',
    meta: entry.meta ?? null,
    type: entry.type ?? 'location',
    updatedAt: entry.updatedAt ?? entry.createdAt ?? now,
    deletedAt: entry.deletedAt ?? null,
  }
}

export async function savePlanEntry(entry) {
  const now = new Date().toISOString()
  const full = { ...entry, createdAt: entry.createdAt ?? now, updatedAt: now }
  await set(full.id, full, planStore)
  return full
}

export async function readAllPlanEntries() {
  const allKeys = await keys(planStore)
  const allValues = await getMany(allKeys, planStore)
  return allValues.filter(Boolean).map(normalizePlanEntry).filter((e) => !e.deletedAt)
}

export async function readAllPlanEntriesIncludingDeleted() {
  const allKeys = await keys(planStore)
  const allValues = await getMany(allKeys, planStore)
  return allValues.filter(Boolean).map(normalizePlanEntry)
}

export async function updatePlanEntry(entry) {
  const now = new Date().toISOString()
  const full = { ...entry, updatedAt: now }
  await set(full.id, full, planStore)
  return full
}

export async function deletePlanEntry(id) {
  const existing = await get(id, planStore)
  if (existing) {
    const now = new Date().toISOString()
    const tombstone = { ...existing, deletedAt: now, updatedAt: now }
    await set(id, tombstone, planStore)
  }
}

export async function clearAllPlanEntries() {
  await clear(planStore)
}

export async function writeAllPlanEntries(entries) {
  const pairs = entries.map((e) => [e.id, e])
  await setMany(pairs, planStore)
}

export function exportPlanToFile(entries) {
  const data = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    entries,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trip-plan-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parsePlanFile(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    const entries = Array.isArray(data) ? data : (data.entries ?? data.plan ?? [])

    if (!Array.isArray(entries) || entries.length === 0) {
      return { entries: null, error: 'No plan entries found in file.' }
    }

    const validated = entries
      .filter((e) => e.id && typeof e.day === 'number' && e.name)
      .map(normalizePlanEntry)
    if (validated.length === 0) {
      return { entries: null, error: 'File contains no valid plan entries.' }
    }

    return { entries: validated, error: null }
  } catch {
    return { entries: null, error: 'Invalid JSON file.' }
  }
}
