// Core domain types for Forge40

export type CoachId = 'sarge' | 'kai' | 'marcus'

export type WorkoutType =
  | 'kb_strength'
  | 'kb_technical'
  | 'kb_conditioning'
  | 'kb_grind'
  | 'kb_short'
  | 'run_long'
  | 'run_intervals'
  | 'run_tempo'
  | 'two_a_day'
  | 'god_level'

export type RewardTier = 'shield' | 'spear' | 'sword' | 'crown'

export interface Workout {
  id: string
  week: number
  day: string // 'monday' | 'tuesday' etc.
  coach: CoachId
  title: string
  type: WorkoutType
  duration_min: number
  warmup: Block[]
  main: Block[]
  finisher?: Block[]
  coach_intro: string
  coach_cues: Record<string, string>
  round_narration?: string[]
  substitution_light?: string
  substitution_heavy?: string
}

export interface Block {
  id: string
  name: string
  type: 'movement' | 'rest' | 'run' | 'note'
  sets?: number
  reps?: number | string
  duration_seconds?: number
  weight?: string
  side?: 'both' | 'left_right'
  video_id?: string // key into movements.json
  cue?: string
}

// ─── Logged records ───────────────────────────────────────────────────────────

export interface WorkoutLog {
  id: string
  workoutId: string
  startedAt: number // epoch ms
  completedAt?: number
  status: 'in_progress' | 'complete' | 'incomplete' | 'pending_rating'
  energyBefore?: number
  energyAfter?: number
  intensity?: number
  note?: string
  shieldsEarned?: number
  week: number
}

export interface WeightLog {
  id: string
  date: string // YYYY-MM-DD
  weight: number // lbs
  loggedAt: number
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export interface RewardState {
  shields: number
  spears: number
  swords: number
  crowns: number
  titanMarks: number
  lastGodLevelAt?: number // epoch ms
}

export interface RewardEvent {
  id: string
  type: 'shield' | 'spear' | 'sword' | 'crown' | 'titan'
  count: number
  source: string
  earnedAt: number
}

// ─── User preferences ────────────────────────────────────────────────────────

export interface UserPrefs {
  startingWeight?: number
  goalWeight?: number
  weightUnit: 'lbs' | 'kg'
  weightPromptTime: string // 'HH:MM'
  notificationsEnabled: boolean
  audioEnabled: boolean
  currentWeek: number
  programStartDate?: string // YYYY-MM-DD
  onboardingComplete: boolean
  googleCalendarConnected: boolean
  workoutTimes: Partial<Record<string, string>> // day → 'HH:MM'
}

// ─── Google Calendar ──────────────────────────────────────────────────────────

export interface CalendarTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}
