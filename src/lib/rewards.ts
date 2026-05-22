// Reward calculation logic.
// Shield → Spear (10) → Sword (5 spears) → Crown (4 swords)
// Titan marks are parallel — each God-Level completion earns one.

import {
  getRewardState,
  setRewardState,
  saveRewardEvent,
  getRewardState as _getState,
} from './storage'
import type { RewardState, RewardEvent } from './types'

const SPEAR_THRESHOLD = 10
const SWORD_THRESHOLD = 5  // spears per sword
const CROWN_THRESHOLD = 4  // swords per crown

export type RankName =
  | 'Initiate'
  | 'Hoplite'
  | 'Phalanx Leader'
  | 'Strategos'
  | 'Spartan King'

export function getRankName(state: RewardState): RankName {
  if (state.crowns >= 1) return 'Spartan King'
  if (state.swords >= 1) return 'Strategos'
  if (state.spears >= 1) return 'Phalanx Leader'
  if (state.shields >= 1) return 'Hoplite'
  return 'Initiate'
}

export function isTitanTouched(state: RewardState): boolean {
  return state.titanMarks > 0
}

export function getDisplayRank(state: RewardState): string {
  const base = getRankName(state)
  if (isTitanTouched(state)) return `${base} — Titan-touched`
  return base
}

// Returns shields needed to reach next spear, or spears to next sword, etc.
export function getProgressToNext(state: RewardState): {
  label: string
  current: number
  needed: number
} {
  if (state.crowns >= 1 && state.swords >= CROWN_THRESHOLD) {
    // Max rank — show total shields
    return { label: 'SHIELDS TOTAL', current: state.shields, needed: 0 }
  }
  if (state.swords >= 1) {
    const leftover = state.swords % CROWN_THRESHOLD
    return {
      label: 'TO NEXT CROWN',
      current: leftover,
      needed: CROWN_THRESHOLD,
    }
  }
  if (state.spears >= 1) {
    const leftover = state.spears % SWORD_THRESHOLD
    return {
      label: 'TO NEXT SWORD',
      current: leftover,
      needed: SWORD_THRESHOLD,
    }
  }
  const leftover = state.shields % SPEAR_THRESHOLD
  return {
    label: 'TO NEXT SPEAR',
    current: leftover,
    needed: SPEAR_THRESHOLD,
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function rollupShields(state: RewardState, events: RewardEvent[]): Promise<RewardState> {
  let s = { ...state }
  // Roll shields → spears
  while (s.shields >= SPEAR_THRESHOLD) {
    s.shields -= SPEAR_THRESHOLD
    s.spears += 1
    events.push({ id: uid(), type: 'spear', count: 1, source: 'rollup', earnedAt: Date.now() })
  }
  // Roll spears → swords
  while (s.spears >= SWORD_THRESHOLD) {
    s.spears -= SWORD_THRESHOLD
    s.swords += 1
    events.push({ id: uid(), type: 'sword', count: 1, source: 'rollup', earnedAt: Date.now() })
  }
  // Roll swords → crowns
  while (s.swords >= CROWN_THRESHOLD) {
    s.swords -= CROWN_THRESHOLD
    s.crowns += 1
    events.push({ id: uid(), type: 'crown', count: 1, source: 'rollup', earnedAt: Date.now() })
  }
  return s
}

export interface ShieldAward {
  shields: number
  bonus: number
  events: RewardEvent[]
  newState: RewardState
  newItems: Array<'spear' | 'sword' | 'crown'>
}

export async function awardShields(
  base: number,
  intensity: number,
  source: string,
): Promise<ShieldAward> {
  const state = await getRewardState()
  const events: RewardEvent[] = []

  const bonus = intensity >= 8 ? 1 : 0
  const total = base + bonus

  const shieldEvent: RewardEvent = {
    id: uid(),
    type: 'shield',
    count: total,
    source,
    earnedAt: Date.now(),
  }
  events.push(shieldEvent)

  const before = { ...state }
  let next = { ...state, shields: state.shields + total }

  const newItems: Array<'spear' | 'sword' | 'crown'> = []
  const prevSpears = before.spears
  const prevSwords = before.swords
  const prevCrowns = before.crowns

  next = await rollupShields(next, events)

  if (next.spears > prevSpears) {
    for (let i = 0; i < next.spears - prevSpears; i++) newItems.push('spear')
  }
  if (next.swords > prevSwords) {
    for (let i = 0; i < next.swords - prevSwords; i++) newItems.push('sword')
  }
  if (next.crowns > prevCrowns) {
    for (let i = 0; i < next.crowns - prevCrowns; i++) newItems.push('crown')
  }

  await setRewardState(next)
  for (const e of events) await saveRewardEvent(e)

  return { shields: base, bonus, events, newState: next, newItems }
}

export async function awardGodLevel(): Promise<ShieldAward & { titanMark: boolean }> {
  const state = await _getState()
  const events: RewardEvent[] = []

  const titanEvent: RewardEvent = {
    id: uid(),
    type: 'titan',
    count: 1,
    source: 'god_level',
    earnedAt: Date.now(),
  }
  events.push(titanEvent)

  const godShields = 5
  const shieldEvent: RewardEvent = {
    id: uid(),
    type: 'shield',
    count: godShields,
    source: 'god_level',
    earnedAt: Date.now(),
  }
  events.push(shieldEvent)

  let next = {
    ...state,
    shields: state.shields + godShields,
    titanMarks: state.titanMarks + 1,
    lastGodLevelAt: Date.now(),
  }

  const newItems: Array<'spear' | 'sword' | 'crown'> = []
  const prevSpears = state.spears
  const prevSwords = state.swords
  const prevCrowns = state.crowns

  next = { ...(await rollupShields(next, events)), titanMarks: next.titanMarks, lastGodLevelAt: next.lastGodLevelAt }

  if (next.spears > prevSpears) {
    for (let i = 0; i < next.spears - prevSpears; i++) newItems.push('spear')
  }
  if (next.swords > prevSwords) {
    for (let i = 0; i < next.swords - prevSwords; i++) newItems.push('sword')
  }
  if (next.crowns > prevCrowns) {
    for (let i = 0; i < next.crowns - prevCrowns; i++) newItems.push('crown')
  }

  await setRewardState(next)
  for (const e of events) await saveRewardEvent(e)

  return { shields: godShields, bonus: 0, events, newState: next, newItems, titanMark: true }
}

export function godLevelCooldownMs(): number {
  return 7 * 24 * 60 * 60 * 1000
}

export async function isGodLevelAvailable(): Promise<boolean> {
  const state = await getRewardState()
  if (!state.lastGodLevelAt) return true
  return Date.now() - state.lastGodLevelAt >= godLevelCooldownMs()
}

export async function godLevelMsRemaining(): Promise<number> {
  const state = await getRewardState()
  if (!state.lastGodLevelAt) return 0
  const elapsed = Date.now() - state.lastGodLevelAt
  return Math.max(0, godLevelCooldownMs() - elapsed)
}
