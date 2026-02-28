import { get as idbGet, set as idbSet, clear as idbClear, setMany } from 'idb-keyval'
import { kvStore, planStore, KEYS } from './db.js'
import {
  readAllPlanEntriesIncludingDeleted,
  normalizePlanEntry,
} from './plannerDb.js'

const SYNC_VERSION = '3.0.0'
const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const DEFAULT_CONFIG = {
  token: '',
  owner: 'Nirco-Cloud',
  repo: 'trip-data',
  branch: 'main',
  filePath: 'plan.json',
}

// ── Config persistence ───────────────────────────────────────────────────────

export async function getGithubConfig() {
  const saved = await idbGet(KEYS.GITHUB_CONFIG, kvStore)
  return { ...DEFAULT_CONFIG, ...saved }
}

export async function setGithubConfig(config) {
  await idbSet(KEYS.GITHUB_CONFIG, config, kvStore)
}

export async function getLastSyncTime() {
  return (await idbGet(KEYS.GITHUB_LAST_SYNC, kvStore)) ?? null
}

async function setLastSyncTime(ts) {
  await idbSet(KEYS.GITHUB_LAST_SYNC, ts, kvStore)
}

// ── GitHub API helpers ───────────────────────────────────────────────────────

function apiUrl(config) {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.filePath}?ref=${config.branch}`
}

function headers(config) {
  return {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

export async function pullFromGithub(config) {
  const res = await fetch(apiUrl(config), { headers: headers(config) })

  if (res.status === 404) {
    return { entries: null, sha: null }
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub GET ${res.status}: ${body}`)
  }

  const data = await res.json()
  const decoded = atob(data.content)
  const parsed = JSON.parse(decoded)
  const entries = (parsed.entries ?? []).map(normalizePlanEntry)
  return { entries, sha: data.sha }
}

export async function pushToGithub(config, entries, sha) {
  const payload = {
    version: SYNC_VERSION,
    syncedAt: new Date().toISOString(),
    entries,
  }
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))))

  const body = {
    message: `sync ${new Date().toISOString()}`,
    content,
    branch: config.branch,
  }
  if (sha) body.sha = sha

  const res = await fetch(apiUrl(config), {
    method: 'PUT',
    headers: headers(config),
    body: JSON.stringify(body),
  })

  if (res.status === 409) {
    throw new Error('CONFLICT')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub PUT ${res.status}: ${text}`)
  }

  return await res.json()
}

// ── Merge logic ──────────────────────────────────────────────────────────────

export function mergeEntries(local, remote) {
  const map = new Map()

  for (const entry of local) {
    map.set(entry.id, entry)
  }

  for (const entry of remote) {
    const existing = map.get(entry.id)
    if (!existing) {
      map.set(entry.id, entry)
    } else {
      // Last-write-wins based on updatedAt
      const existingTime = new Date(existing.updatedAt ?? existing.createdAt ?? 0).getTime()
      const remoteTime = new Date(entry.updatedAt ?? entry.createdAt ?? 0).getTime()
      if (remoteTime > existingTime) {
        map.set(entry.id, entry)
      }
    }
  }

  return [...map.values()]
}

export function purgeStaleTombstones(entries) {
  const cutoff = Date.now() - TOMBSTONE_MAX_AGE_MS
  return entries.filter((e) => {
    if (!e.deletedAt) return true
    return new Date(e.deletedAt).getTime() > cutoff
  })
}

// ── Main sync function ───────────────────────────────────────────────────────

export async function syncPlanEntries() {
  if (!navigator.onLine) {
    throw new Error('OFFLINE')
  }

  const config = await getGithubConfig()
  if (!config.token) {
    throw new Error('NO_TOKEN')
  }

  // 1. Read local entries (including tombstones)
  const localEntries = await readAllPlanEntriesIncludingDeleted()

  // 2. Pull remote
  const { entries: remoteEntries, sha } = await pullFromGithub(config)

  // 3. Merge
  const merged = remoteEntries
    ? mergeEntries(localEntries, remoteEntries)
    : localEntries

  // 4. Purge old tombstones
  const cleaned = purgeStaleTombstones(merged)

  // 5. Write merged data back to IndexedDB (including tombstones for future sync)
  await idbClear(planStore)
  if (cleaned.length > 0) {
    const pairs = cleaned.map((e) => [e.id, e])
    await setMany(pairs, planStore)
  }

  // 6. Push merged to GitHub
  await pushToGithub(config, cleaned, sha)

  // 7. Save timestamp
  const now = new Date().toISOString()
  await setLastSyncTime(now)

  // 8. Return live entries (without tombstones) for the store
  return {
    entries: cleaned.filter((e) => !e.deletedAt),
    syncedAt: now,
  }
}
