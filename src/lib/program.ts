// Program loader — wraps program.json and exposes typed helpers.

import programData from '../data/program.json'
import type { Workout, CoachId } from './types'

// Raw JSON types (loose, from program.json)
interface RawBlock {
  id: string
  name: string
  type: string
  sets?: number
  reps?: number | string
  duration_seconds?: number
  weight?: string
  side?: string
  video_id?: string
  cue?: string
}

interface RawWorkout {
  id: string
  day: string
  coach: string
  title: string
  type: string
  duration_min: number
  coach_intro?: string
  coach_cues?: Record<string, string>
  warmup?: RawBlock[]
  main?: RawBlock[]
  finisher?: RawBlock[]
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

function toWorkout(raw: RawWorkout, week: number): Workout {
  return {
    id: raw.id,
    week,
    day: raw.day,
    coach: raw.coach as CoachId,
    title: raw.title,
    type: raw.type as Workout['type'],
    duration_min: raw.duration_min,
    coach_intro: raw.coach_intro ?? '',
    coach_cues: raw.coach_cues ?? {},
    warmup: (raw.warmup ?? []) as Workout['warmup'],
    main: (raw.main ?? []) as Workout['main'],
    finisher: raw.finisher as Workout['finisher'],
    round_narration: raw.round_narration,
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

export function getTodayWorkout(weekNum: number, programStartDate?: string): Workout | undefined {
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
