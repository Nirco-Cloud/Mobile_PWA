import { set, getMany, keys } from 'idb-keyval'
import { locStore } from './db.js'

export async function writeLocations(records) {
  await Promise.all(records.map((r) => set(r.id, r, locStore)))
}

export async function readAllLocations() {
  const allKeys = await keys(locStore)
  const allValues = await getMany(allKeys, locStore)
  return allValues.filter(Boolean)
}

export async function writeLocation(record) {
  await set(record.id, record, locStore)
}
