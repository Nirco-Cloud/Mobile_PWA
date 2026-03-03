/**
 * userPoisDb.js — CRUD helpers for user-added POIs (personal saved places).
 *
 * Schema:
 * {
 *   id:           string  (uuid)
 *   name:         string
 *   lat:          number | null
 *   lng:          number | null
 *   address:      string | null
 *   category:     string          (app category key, e.g. 'Restaurant')
 *   placeId:      string | null   (Google place_id, for dedup)
 *   phone:        string | null
 *   website:      string | null
 *   rating:       number | null
 *   openingHours: string[]        (weekday_text from Places API)
 *   notes:        string | null   (user free-text note)
 *   createdAt:    string          (ISO timestamp)
 * }
 */

import { get, set, del, keys, getMany } from 'idb-keyval'
import { userPoisStore } from './db.js'

function uuid() {
  return crypto.randomUUID?.() ?? `poi-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function normalizeUserPoi(poi) {
  return {
    openingHours: [],
    notes: null,
    phone: null,
    website: null,
    rating: null,
    placeId: null,
    address: null,
    category: 'Location',
    ...poi,
    id: poi.id ?? uuid(),
    createdAt: poi.createdAt ?? new Date().toISOString(),
  }
}

export async function saveUserPoi(poi) {
  const normalized = normalizeUserPoi(poi)
  await set(normalized.id, normalized, userPoisStore)
  return normalized
}

export async function readAllUserPois() {
  const allKeys = await keys(userPoisStore)
  if (!allKeys.length) return []
  const values = await getMany(allKeys, userPoisStore)
  return values.filter(Boolean)
}

export async function deleteUserPoi(id) {
  await del(id, userPoisStore)
}

export async function updateUserPoi(poi) {
  const existing = await get(poi.id, userPoisStore)
  if (!existing) throw new Error(`UserPoi ${poi.id} not found`)
  const updated = { ...existing, ...poi }
  await set(updated.id, updated, userPoisStore)
  return updated
}

export async function clearAllUserPois() {
  const allKeys = await keys(userPoisStore)
  await Promise.all(allKeys.map((k) => del(k, userPoisStore)))
}

export async function getUserPoiByPlaceId(placeId) {
  if (!placeId) return null
  const all = await readAllUserPois()
  return all.find((p) => p.placeId === placeId) ?? null
}
