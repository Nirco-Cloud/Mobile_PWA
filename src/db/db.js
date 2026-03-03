import { createStore } from 'idb-keyval'

export const kvStore = createStore('nirco-kv', 'kv')
export const locStore = createStore('nirco-locations', 'locations')
export const planStore = createStore('nirco-plans', 'plans')
export const userPoisStore = createStore('nirco-user-pois', 'pois')

export const KEYS = {
  SYNC_COMPLETE: 'syncComplete',
  PLAN_LOADED: 'planLoaded',
  GITHUB_CONFIG: 'githubConfig',
  GITHUB_LAST_SYNC: 'githubLastSync',
}
