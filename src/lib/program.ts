// Program loader — wraps program.json and exposes typed helpers.

import programData from '../data/program.json'
import type { Workout, CoachId } from './types'

// Raw JSON types — actual program.json uses a `blocks` array with a `block` discriminator
interface RawMovement {
  name: string
  reps?: string | number
  weight?: string
  video_key?: string
  cue?: string
}

interface RawBlockEntry {
  block: string // 'intro' | 'warmup' | 'main' | 'finisher' | 'outro'
  narration?: string
  duration_sec?: number
  structure?: string
  movements?: RawMovement[]
  narration_per_round?: string[]
  midpoint_checkin?: boolean
}

interface RawWorkout {
  id: string
  day: string
  coach: string
  title: string
  type: string
  duration_min: number
  // New format: blocks array
  blocks?: RawBlockEntry[]
  // Legacy format fields (kept for compatibility)
  coach_intro?: string
  coach_cues?: Record<string, string>
  warmup?: unknown[]
  main?: unknown[]
  finisher?: unknown[]
  round_narration?: string[]
  substitution_light?: string
  substitution_heavy?: string
}

interface RawWeek {
  week: number
  phase: string
  theme: string
  workouts?: RawWorkout[]
  summary?: string
}

import type { Block } from './types'

function movementsToBlocks(movements: RawMovement[]): Block[] {
  return movements.map((m, i) => ({
    id: `m-${i}`,
    name: m.name,
    type: 'movement' as const,
    reps: typeof m.reps === 'number' ? m.reps : undefined,
    weight: m.weight,
    video_id: m.video_key,
    cue: m.cue,
  }))
}

function toWorkout(raw: RawWorkout, week: number): Workout {
  // Parse blocks array (new format)
  let warmup: Block[] = []
  let main: Block[] = []
  let finisher: Block[] | undefined = undefined
  let coachIntro = raw.coach_intro ?? ''
  let roundNarration: string[] | undefined = undefined

  if (raw.blocks) {
    for (const b of raw.blocks) {
      if (b.block === 'intro' && b.narration) {
        coachIntro = b.narration
      } else if (b.block === 'warmup' && b.movements) {
        warmup = movementsToBlocks(b.movements)
      } else if (b.block === 'main' && b.movements) {
        main = movementsToBlocks(b.movements)
        if (b.narration_per_round) {
          roundNarration = b.narration_per_round
        }
      } else if (b.block === 'finisher' && b.movements) {
        finisher = movementsToBlocks(b.movements)
      }
    }
  }

  // Determine rounds from main block structure string e.g. "4 rounds, 45s work / 15s rest per movement"
  let mainRounds = 3
  if (raw.blocks) {
    const mainBlock = raw.blocks.find(b => b.block === 'main')
    if (mainBlock?.structure) {
      const m = mainBlock.structure.match(/^(\d+)\s+round/i)
      if (m) mainRounds = parseInt(m[1])
    }
  }

  // Assign sets (rounds) to each main movement block
  if (main.length > 0) {
    main = main.map(b => ({ ...b, sets: mainRounds }))
  }

  return {
    id: raw.id,
    week,
    day: raw.day,
    coach: raw.coach as CoachId,
    title: raw.title,
    type: raw.type as Workout['type'],
    duration_min: raw.duration_min,
    coach_intro: coachIntro,
    coach_cues: raw.coach_cues ?? {},
    warmup,
    main,
    finisher,
    round_narration: roundNarration ?? raw.round_narration,
    substitution_light: raw.substitution_light,
    substitution_heavy: raw.substitution_heavy,
  }
}

const weeks = (programData.weeks as RawWeek[])

// Get all fully-defined workouts (only weeks that have the workouts array)
export function getAllWorkouts(): Workout[] {
  const result: Workout[] = []
  for (const week of weeks) {
    if (week.workouts) {
      for (const wo of week.workouts) {
        result.push(toWorkout(wo, week.week))
      }
    }
  }
  return result
}

export function getWorkoutsForWeek(weekNum: number): Workout[] {
  const week = weeks.find(w => w.week === weekNum)
  if (!week?.workouts) return []
  return week.workouts.map(wo => toWorkout(wo, weekNum))
}

export function getWorkoutById(id: string): Workout | undefined {
  for (const week of weeks) {
    if (!week.workouts) continue
    const found = week.workouts.find(w => w.id === id)
    if (found) return toWorkout(found, week.week)
  }
  return undefined
}

export function getTodayWorkout(weekNum: number, _programStartDate?: string): Workout | undefined {
  const workouts = getWorkoutsForWeek(weekNum)
  if (workouts.length === 0) return undefined

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = dayNames[new Date().getDay()]
  return workouts.find(w => w.day === today)
}

export function getCoach(coachId: CoachId) {
  const coaches = (programData as Record<string, unknown>).coaches as Record<string, {
    name: string
    full_name: string
    personality: string
    voice_traits: string[]
    leads: string[]
    signature_phrases: string[]
  }>
  return coaches[coachId]
}

export function getWeekPhase(weekNum: number): string {
  const week = weeks.find(w => w.week === weekNum)
  return week?.phase ?? 'Foundation'
}

export function getWeekTheme(weekNum: number): string {
  const week = weeks.find(w => w.week === weekNum)
  return week?.theme ?? ''
}

export const TOTAL_WEEKS = 12
