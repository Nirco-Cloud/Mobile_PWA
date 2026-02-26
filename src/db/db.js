import { createStore } from 'idb-keyval'

export const kvStore = createStore('nirco-kv', 'kv')
export const locStore = createStore('nirco-locations', 'locations')
export const importedLocStore = createStore('nirco-imported', 'imported')

export const KEYS = {
  SYNC_COMPLETE: 'syncComplete',
}
