// StorageAdapter — IndexedDB implementation via idb.
// Swap to Supabase by replacing this file; the interface stays stable.

import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'
import type {
  WorkoutLog,
  WeightLog,
  RewardState,
  RewardEvent,
  UserPrefs,
  CalendarTokens,
} from './types'

const DB_NAME = 'forge40'
const DB_VERSION = 1

type DB = {
  workoutLogs: { key: string; value: WorkoutLog; indexes: { byDate: number } }
  weightLogs: { key: string; value: WeightLog; indexes: { byDate: string } }
  rewardEvents: { key: string; value: RewardEvent; indexes: { byDate: number } }
  keyval: { key: string; value: unknown }
}

let _db: IDBPDatabase<DB> | null = null

async function getDB(): Promise<IDBPDatabase<DB>> {
  if (_db) return _db
  _db = await openDB<DB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('workoutLogs')) {
        const s = db.createObjectStore('workoutLogs', { keyPath: 'id' })
        s.createIndex('byDate', 'startedAt')
      }
      if (!db.objectStoreNames.contains('weightLogs')) {
        const s = db.createObjectStore('weightLogs', { keyPath: 'id' })
        s.createIndex('byDate', 'date')
      }
      if (!db.objectStoreNames.contains('rewardEvents')) {
        const s = db.createObjectStore('rewardEvents', { keyPath: 'id' })
        s.createIndex('byDate', 'earnedAt')
      }
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval')
      }
    },
  })
  return _db
}

// ─── Generic key-value ────────────────────────────────────────────────────────

async function kv_get<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return db.get('keyval', key) as Promise<T | undefined>
}

async function kv_set<T>(key: string, value: T): Promise<void> {
  const db = await getDB()
  await db.put('keyval', value, key)
}

// ─── User prefs ───────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPrefs = {
  weightUnit: 'lbs',
  weightPromptTime: '06:30',
  notificationsEnabled: false,
  audioEnabled: true,
  currentWeek: 1,
  onboardingComplete: false,
  googleCalendarConnected: false,
  workoutTimes: {},
}

export async function getPrefs(): Promise<UserPrefs> {
  const stored = await kv_get<UserPrefs>('prefs')
  return { ...DEFAULT_PREFS, ...stored }
}

export async function setPrefs(prefs: Partial<UserPrefs>): Promise<UserPrefs> {
  const current = await getPrefs()
  const next = { ...current, ...prefs }
  await kv_set('prefs', next)
  return next
}

// ─── Reward state ─────────────────────────────────────────────────────────────

const DEFAULT_REWARDS: RewardState = {
  shields: 0,
  spears: 0,
  swords: 0,
  crowns: 0,
  titanMarks: 0,
}

export async function getRewardState(): Promise<RewardState> {
  const stored = await kv_get<RewardState>('rewards')
  return { ...DEFAULT_REWARDS, ...stored }
}

export async function setRewardState(state: RewardState): Promise<void> {
  await kv_set('rewards', state)
}

// ─── Workout logs ─────────────────────────────────────────────────────────────

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const db = await getDB()
  await db.put('workoutLogs', log)
}

export async function getWorkoutLog(id: string): Promise<WorkoutLog | undefined> {
  const db = await getDB()
  return db.get('workoutLogs', id)
}

export async function getAllWorkoutLogs(): Promise<WorkoutLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('workoutLogs', 'byDate')
}

export async function getPendingRatingLog(): Promise<WorkoutLog | undefined> {
  const logs = await getAllWorkoutLogs()
  return logs.find(l => l.status === 'pending_rating')
}

// ─── Weight logs ──────────────────────────────────────────────────────────────

export async function saveWeightLog(log: WeightLog): Promise<void> {
  const db = await getDB()
  await db.put('weightLogs', log)
}

export async function getWeightLogs(days = 90): Promise<WeightLog[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('weightLogs', 'byDate')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return all.filter(w => w.date >= cutoffStr)
}

export async function getTodayWeight(): Promise<WeightLog | undefined> {
  const today = new Date().toISOString().split('T')[0]
  const db = await getDB()
  const all = await db.getAllFromIndex('weightLogs', 'byDate', today)
  return all[all.length - 1]
}

// ─── Reward events ────────────────────────────────────────────────────────────

export async function saveRewardEvent(event: RewardEvent): Promise<void> {
  const db = await getDB()
  await db.put('rewardEvents', event)
}

export async function getRewardEvents(limit = 20): Promise<RewardEvent[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('rewardEvents', 'byDate')
  return all.reverse().slice(0, limit)
}

// ─── Calendar tokens ──────────────────────────────────────────────────────────

export async function getCalendarTokens(): Promise<CalendarTokens | undefined> {
  return kv_get<CalendarTokens>('calendarTokens')
}

export async function setCalendarTokens(tokens: CalendarTokens): Promise<void> {
  await kv_set('calendarTokens', tokens)
}

export async function clearCalendarTokens(): Promise<void> {
  const db = await getDB()
  await db.delete('keyval', 'calendarTokens')
}
