import { set, del, keys, getMany } from 'idb-keyval'
import { importedLocStore } from './db.js'

export async function saveImportedLocation(loc) {
  await set(loc.id, loc, importedLocStore)
}

export async function readAllImportedLocations() {
  const allKeys = await keys(importedLocStore)
  const allValues = await getMany(allKeys, importedLocStore)
  return allValues.filter(Boolean)
}

export async function deleteImportedLocation(id) {
  await del(id, importedLocStore)
}

export async function updateImportedLocation(loc) {
  await set(loc.id, loc, importedLocStore)
}
