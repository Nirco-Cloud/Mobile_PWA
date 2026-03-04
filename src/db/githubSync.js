import { get as idbGet, set as idbSet, keys as idbKeys, setMany, delMany } from 'idb-keyval'
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
  const config = { ...DEFAULT_CONFIG, ...saved }
  // Reverse migration: a previous bug wrote Mobile_PWA/public/data/plan.json
  // into IDB — revert to the correct trip-data/plan.json target.
  if (config.repo === 'Mobile_PWA' && config.filePath === 'public/data/plan.json') {
    config.repo = 'trip-data'
    config.filePath = 'plan.json'
    await idbSet(KEYS.GITHUB_CONFIG, config, kvStore)
  }
  return config
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

// ── Encoding repair ──────────────────────────────────────────────────────────
// Older push code encoded non-ASCII via btoa(unescape(encodeURIComponent(...))),
// producing double- (or more) encoded UTF-8 bytes stored as Latin-1 code points.
// This function detects and reverses that garbling iteratively.
function fixGarbledString(s) {
  if (!s || typeof s !== 'string') return s
  let result = s
  for (let i = 0; i < 6; i++) {
    // If any char is outside Latin-1 range (e.g. Hebrew U+05xx, CJK U+3xxx),
    // the string is already correctly decoded — stop.
    if ([...result].some((c) => c.codePointAt(0) > 0xff)) break
    // Treat each code point as a raw byte and attempt UTF-8 decode.
    const bytes = Uint8Array.from([...result], (c) => c.codePointAt(0))
    const fixed = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    // Stop if no improvement or replacement chars appeared (not valid UTF-8).
    if (fixed === result || fixed.includes('\ufffd')) break
    result = fixed
  }
  return result
}

function fixEntryEncoding(e) {
  if (!e) return e
  const fix = fixGarbledString
  return { ...e, name: fix(e.name), nameHe: fix(e.nameHe), note: fix(e.note) }
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

  if (res.status === 401 || res.status === 403) throw new Error('AUTH_FAILED')
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub GET ${res.status}: ${body}`)
  }

  const data = await res.json()
  if (!data.sha) throw new Error('GitHub response missing file SHA')
  let entries
  try {
    const decoded = atob(data.content.replace(/\n/g, ''))
    const parsed = JSON.parse(decoded)
    entries = (parsed.entries ?? []).map(normalizePlanEntry).map(fixEntryEncoding).filter((e) => !!e.id)
  } catch {
    throw new Error('GitHub sync file is corrupted or unreadable')
  }
  return { entries, sha: data.sha }
}

export async function pushToGithub(config, entries, sha) {
  const payload = {
    version: SYNC_VERSION,
    syncedAt: new Date().toISOString(),
    entries,
  }
  // Escape all non-ASCII chars as \uXXXX so btoa() works without encoding tricks
  // and the old atob()-only pull code can also decode correctly via JSON.parse
  const jsonStr = JSON.stringify(payload, null, 2).replace(
    /[^\x00-\x7F]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  )
  const content = btoa(jsonStr)

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

  if (res.status === 409) throw new Error('CONFLICT')
  if (res.status === 401 || res.status === 403) throw new Error('AUTH_FAILED')
  if (res.status === 429) throw new Error('RATE_LIMITED')
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
  if (!config.token?.trim()) {
    throw new Error('NO_TOKEN')
  }

  // 1. Read local entries (including tombstones)
  const localEntries = await readAllPlanEntriesIncludingDeleted()

  // Retry loop: on 409 conflict re-pull fresh SHA and retry (max 2 retries)
  for (let attempt = 0; attempt <= 2; attempt++) {
    // 2. Pull remote
    const { entries: remoteEntries, sha } = await pullFromGithub(config)

    // 3. Merge
    const merged = remoteEntries
      ? mergeEntries(localEntries, remoteEntries)
      : localEntries

    // 4. Purge old tombstones and drop any entries with missing ids
    const cleaned = purgeStaleTombstones(merged).filter((e) => !!e.id)

    // 5. Write merged data back to IndexedDB (including tombstones for future sync).
    //    Write first, then delete stale keys — avoids data loss if write fails mid-way
    //    (unlike clear→setMany which would leave the store empty on a write failure).
    if (cleaned.length > 0) {
      await setMany(cleaned.map((e) => [e.id, e]), planStore)
    }
    const existingKeys = await idbKeys(planStore)
    const newIds = new Set(cleaned.map((e) => e.id))
    const staleKeys = existingKeys.filter((k) => !newIds.has(k))
    if (staleKeys.length > 0) {
      await delMany(staleKeys, planStore)
    }

    // 6. Push merged to GitHub
    try {
      await pushToGithub(config, cleaned, sha)
    } catch (err) {
      if (err.message === 'CONFLICT' && attempt < 2) continue // re-pull fresh SHA and retry
      throw err
    }

    // 7. Save timestamp
    const now = new Date().toISOString()
    await setLastSyncTime(now)

    // 8. Return live entries (without tombstones) for the store
    return {
      entries: cleaned.filter((e) => !e.deletedAt),
      syncedAt: now,
    }
  }
}
