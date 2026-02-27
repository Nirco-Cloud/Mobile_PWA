import { set, del, keys, getMany, clear, setMany } from 'idb-keyval'
import { planStore } from './db.js'

export async function savePlanEntry(entry) {
  await set(entry.id, entry, planStore)
}

export async function readAllPlanEntries() {
  const allKeys = await keys(planStore)
  const allValues = await getMany(allKeys, planStore)
  return allValues.filter(Boolean)
}

export async function updatePlanEntry(entry) {
  await set(entry.id, entry, planStore)
}

export async function deletePlanEntry(id) {
  await del(id, planStore)
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
    version: '1.0.0',
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

    const validated = entries.filter((e) => e.id && typeof e.day === 'number' && e.name)
    if (validated.length === 0) {
      return { entries: null, error: 'File contains no valid plan entries.' }
    }

    return { entries: validated, error: null }
  } catch {
    return { entries: null, error: 'Invalid JSON file.' }
  }
}
