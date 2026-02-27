import { set, del, keys, getMany } from 'idb-keyval'
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
