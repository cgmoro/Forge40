// WorkoutPlayerScreen — 7-state workout player
// Manages its own state machine. Full-screen overlay above the main app.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { getWorkoutById } from '../lib/program'
import { saveWorkoutLog, getPendingRatingLog } from '../lib/storage'
import { awardShields } from '../lib/rewards'
import type { Workout, WorkoutLog, Block } from '../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlayerState =
  | 'energy_check'
  | 'warmup'
  | 'active_set'
  | 'rest'
  | 'checkin'
  | 'finisher'
  | 'rating'

interface QueueEntry {
  phase: 'warmup' | 'main' | 'finisher'
  blockIndex: number
  block: Block
  setIndex: number // which set we're on (0-based)
  totalSets: number
  totalBlocks: number
  isLastSet: boolean
}

interface Props {
  workoutId: string
  onClose: () => void
  onComplete: (log: WorkoutLog) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

function coachLabel(coach: string): string {
  return coach.toUpperCase()
}

function coachColor(coach: string): string {
  if (coach === 'sarge') return '#8b0000'
  if (coach === 'kai') return '#c9410b'
  return '#6b8a8a'
}
// Keep coachLabel + coachColor available for coach cue borders
void coachColor

// Build a flat play queue from workout blocks
function buildQueue(workout: Workout): QueueEntry[] {
  const queue: QueueEntry[] = []

  const pushPhase = (blocks: Block[], phase: 'warmup' | 'main' | 'finisher') => {
    const movementBlocks = blocks.filter(b => b.type !== 'rest' && b.type !== 'note')
    movementBlocks.forEach((block, blockIndex) => {
      const sets = block.sets ?? 1
      for (let s = 0; s < sets; s++) {
        queue.push({
          phase,
          blockIndex,
          block,
          setIndex: s,
          totalSets: sets,
          totalBlocks: movementBlocks.length,
          isLastSet: s === sets - 1,
        })
      }
    })
  }

  if (workout.warmup?.length) pushPhase(workout.warmup, 'warmup')
  if (workout.main?.length) pushPhase(workout.main, 'main')
  if (workout.finisher?.length) pushPhase(workout.finisher, 'finisher')

  return queue
}

// Extract blocks from raw program.json format (blocks array with block types)
function extractBlocksFromRaw(workout: Workout): {
  warmup: Block[]
  main: Block[]
  finisher: Block[]
  coachIntro: string
} {
  // If workout already has proper arrays, use them
  if (
    (workout.warmup && workout.warmup.length > 0) ||
    (workout.main && workout.main.length > 0)
  ) {
    return {
      warmup: workout.warmup ?? [],
      main: workout.main ?? [],
      finisher: workout.finisher ?? [],
      coachIntro: workout.coach_intro ?? '',
    }
  }
  return {
    warmup: [],
    main: [],
    finisher: [],
    coachIntro: workout.coach_intro ?? '',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <polygon points="5 3 19 12 5 21" fill="currentColor" />
    </svg>
  )
}

function AudioOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
      <path d="M11 5 L6 9 H2 V15 H6 L11 19 Z" />
      <path d="M15 9 a3 3 0 0 1 0 6" />
      <path d="M18 6 a7 7 0 0 1 0 12" />
    </svg>
  )
}

function AudioOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
      <path d="M11 5 L6 9 H2 V15 H6 L11 19 Z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function VideoDemoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
      <polygon points="10 8 16 12 10 16" fill="currentColor" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutPlayerScreen({ workoutId, onClose, onComplete }: Props) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState>('energy_check')
  const [energyBefore, setEnergyBefore] = useState<number>(5)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [paused, setPaused] = useState(false)

  // Queue / progress
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [, setCheckinDismissed] = useState(false)
  const [checkinTriggered, setCheckinTriggered] = useState(false)
  const [prevStateBeforeCheckin, setPrevStateBeforeCheckin] = useState<PlayerState>('active_set')

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [elapsedTotal, setElapsedTotal] = useState(0)

  // Log state
  const [logId] = useState(() => `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [startedAt] = useState(Date.now)
  const [pendingLog, setPendingLog] = useState<WorkoutLog | null>(null)

  // Rating state (state 7)
  const [energyAfter, setEnergyAfter] = useState<number>(5)
  const [intensity, setIntensity] = useState<number>(5)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Simplified player (weeks 3-12 without block data)
  const [isSimplified, setIsSimplified] = useState(false)
  const [simplifiedTimer, setSimplifiedTimer] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalElapsedRef = useRef(0)

  // ─── Init: check for pending rating or load fresh workout ─────────────────

  useEffect(() => {
    async function init() {
      // Check for a pending rating first
      const pending = await getPendingRatingLog()
      if (pending && pending.workoutId === workoutId) {
        setPendingLog(pending)
        if (pending.energyBefore !== undefined) setEnergyBefore(pending.energyBefore)
        setPlayerState('rating')
        return
      }

      const wo = getWorkoutById(workoutId)
      if (!wo) return
      setWorkout(wo)

      const { warmup, main, finisher } = extractBlocksFromRaw(wo)
      const hasBlocks = warmup.length > 0 || main.length > 0 || finisher.length > 0

      if (!hasBlocks) {
        setIsSimplified(true)
        setSimplifiedTimer(wo.duration_min * 60)
      } else {
        const q = buildQueue({ ...wo, warmup, main, finisher: finisher.length ? finisher : undefined })
        setQueue(q)
        const totalSecs = wo.duration_min * 60
        setTotalDuration(totalSecs)
      }
    }
    init()
  }, [workoutId])

  // ─── Timer management ─────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback((seconds: number, onDone: () => void) => {
    stopTimer()
    setTimeRemaining(seconds)
    timerRef.current = setInterval(() => {
      if (paused) return
      setTimeRemaining(prev => {
        const next = prev - 1
        totalElapsedRef.current += 1
        setElapsedTotal(totalElapsedRef.current)
        if (next <= 0) {
          stopTimer()
          setTimeout(onDone, 500)
          return 0
        }
        return next
      })
    }, 1000)
  }, [paused, stopTimer])

  // ─── Audio via Web Speech API ─────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (!audioEnabled) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.9
    window.speechSynthesis.speak(utt)
  }, [audioEnabled])

  // ─── Advance queue ────────────────────────────────────────────────────────

  const advanceQueue = useCallback((idx: number) => {
    const q = queue
    if (idx >= q.length) {
      // Done — go to rating
      saveWorkoutLog({
        id: logId,
        workoutId,
        startedAt,
        status: 'pending_rating',
        energyBefore,
        week: workout?.week ?? 1,
      })
      setPlayerState('rating')
      return
    }

    const entry = q[idx]
    setQueueIndex(idx)

    if (entry.phase === 'warmup') {
      setPlayerState('warmup')
    } else if (entry.phase === 'finisher') {
      setPlayerState('finisher')
    } else {
      setPlayerState('active_set')
    }

    const dur = entry.block.duration_seconds ?? 45
    startTimer(dur, () => {
      // After set ends, check if we need rest or checkin
      const nextIdx = idx + 1
      if (nextIdx < q.length) {
        const next = q[nextIdx]
        const needsRest = entry.phase === 'main' && !entry.isLastSet && next.phase === 'main'
        if (needsRest) {
          // Show rest
          setQueueIndex(nextIdx)
          setPlayerState('rest')
          startTimer(15, () => advanceQueue(nextIdx))
        } else {
          // Check halfway mark
          const halfPoint = Math.floor(q.filter(e => e.phase === 'main').length / 2)
          const mainEntries = q.filter((e, i) => e.phase === 'main' && i <= idx)
          if (!checkinTriggered && mainEntries.length >= halfPoint && halfPoint > 0) {
            setCheckinTriggered(true)
            setPrevStateBeforeCheckin(entry.phase === 'finisher' ? 'finisher' : 'active_set')
            setPlayerState('checkin')
            // Don't advance yet — checkin dismissal does it
          } else {
            advanceQueue(nextIdx)
          }
        }
      } else {
        advanceQueue(nextIdx)
      }
    })

    // Speak cue if available
    const cue = entry.block.cue ?? (workout?.coach_cues?.[entry.block.id] ?? '')
    if (cue) speak(cue)
  }, [queue, logId, workoutId, startedAt, energyBefore, workout, startTimer, speak, checkinTriggered])

  // ─── Begin workout (after energy check) ──────────────────────────────────

  function beginWorkout() {
    if (isSimplified) {
      setPlayerState('warmup')
      startTimer(simplifiedTimer, () => {
        saveWorkoutLog({
          id: logId,
          workoutId,
          startedAt,
          status: 'pending_rating',
          energyBefore,
          week: workout?.week ?? 1,
        })
        setPlayerState('rating')
      })
      return
    }
    if (queue.length === 0) {
      saveWorkoutLog({
        id: logId,
        workoutId,
        startedAt,
        status: 'pending_rating',
        energyBefore,
        week: workout?.week ?? 1,
      })
      setPlayerState('rating')
      return
    }
    advanceQueue(0)
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  // ─── Submit rating ────────────────────────────────────────────────────────

  async function submitRating() {
    if (submitting) return
    setSubmitting(true)
    try {
      const logToSave: WorkoutLog = {
        id: pendingLog?.id ?? logId,
        workoutId,
        startedAt: pendingLog?.startedAt ?? startedAt,
        completedAt: Date.now(),
        status: 'complete',
        energyBefore: pendingLog?.energyBefore ?? energyBefore,
        energyAfter,
        intensity,
        note: note.trim() || undefined,
        week: workout?.week ?? pendingLog?.week ?? 1,
      }

      const award = await awardShields(2, intensity, workoutId)
      logToSave.shieldsEarned = award.shields + award.bonus

      await saveWorkoutLog(logToSave)
      onComplete(logToSave)
    } catch (e) {
      console.error(e)
      setSubmitting(false)
    }
  }

  // ─── Checkin dismiss ──────────────────────────────────────────────────────

  function dismissCheckin() {
    setCheckinDismissed(true)
    setPlayerState(prevStateBeforeCheckin)
    // Resume queue from current index
    advanceQueue(queueIndex)
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const currentEntry = queue[queueIndex] ?? null
  const nextEntry = queue[queueIndex + 1] ?? null
  const progressPct = totalDuration > 0 ? Math.min(100, (elapsedTotal / totalDuration) * 100) : 0

  const workoutMeta = workout
    ? `${workout.duration_min} MIN · ${coachLabel(workout.coach)} · ${workout.type.replace(/_/g, ' ').toUpperCase()}`
    : ''

  const workoutWeekDay = workout
    ? `WK ${workout.week} · DAY ${workout.day.slice(0, 3).toUpperCase()} · ${coachLabel(workout.coach)}`
    : ''

  // ─── Render helpers ───────────────────────────────────────────────────────

  function TopBar() {
    return (
      <div style={{
        padding: '60px 20px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 5,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28,
            border: '1px solid #2e2d2a',
            color: '#8a8680',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 300,
          }}
        >✕</button>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.3em',
          color: '#8a8680',
        }}>{workoutWeekDay}</span>
        <button
          onClick={() => setAudioEnabled(a => !a)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: audioEnabled ? '#8b6f3f' : '#8a8680',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.15em',
            background: 'transparent',
            border: '1px solid #2e2d2a',
            padding: '5px 10px',
            cursor: 'pointer',
          }}
        >
          {audioEnabled ? <AudioOnIcon /> : <AudioOffIcon />}
          {audioEnabled ? 'AUDIO ON' : 'MUTED'}
        </button>
      </div>
    )
  }

  function ProgressStrip({ label, extra }: { label: string; extra?: string }) {
    const elapsed = formatTime(elapsedTotal)
    const total = formatTime(totalDuration)
    return (
      <div style={{ padding: '20px 20px 0', position: 'relative', zIndex: 5 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.2em', color: '#8a8680',
          marginBottom: 6,
        }}>
          <span>{label}</span>
          <span>{extra ?? `${elapsed} / ${total}`}</span>
        </div>
        <div style={{ height: 2, background: '#1c1b19', position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0, width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #8b6f3f, #c9410b)',
            boxShadow: '0 0 6px rgba(201,65,11,0.4)',
          }} />
        </div>
      </div>
    )
  }

  function CoachCue({ cue, borderColor }: { cue: string; borderColor?: string }) {
    const bc = borderColor ?? '#8b0000'
    const labelColor = bc
    return (
      <div style={{
        background: 'linear-gradient(180deg, rgba(28,27,25,0.85) 0%, rgba(20,17,15,0.95) 100%)',
        borderLeft: `3px solid ${bc}`,
        padding: '14px 18px',
        margin: '0 24px 20px',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.25em',
          color: labelColor, marginBottom: 4,
        }}>— {coachLabel(workout?.coach ?? 'sarge')} —</div>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontStyle: 'italic',
          fontSize: 13, lineHeight: 1.5, color: '#e8e2d5',
        }}>{cue}</div>
      </div>
    )
  }

  function MovementDisplay({ entry, timerColor, timerLabel, isFinisher }: {
    entry: QueueEntry
    timerColor: string
    timerLabel: string
    isFinisher?: boolean
  }) {
    const specs = [
      entry.block.weight,
      typeof entry.block.reps === 'number'
        ? `${entry.block.reps} REPS`
        : entry.block.reps?.toUpperCase(),
      entry.block.duration_seconds ? `${entry.block.duration_seconds}s` : null,
    ].filter(Boolean).join(' · ')

    const fontSize = isFinisher ? 110 : (playerState === 'active_set' ? 100 : 72)
    const timerShadow = playerState === 'active_set'
      ? '0 0 30px rgba(201,65,11,0.4)'
      : isFinisher
        ? '0 0 40px rgba(201,65,11,0.6)'
        : 'none'

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}>
        {entry.totalBlocks > 1 && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.3em', color: '#8a8680',
            marginBottom: 16,
          }}>
            {entry.phase.toUpperCase()} · MOVE {entry.blockIndex + 1} OF {entry.totalBlocks}
          </div>
        )}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 800, fontSize: 34,
          letterSpacing: '0.04em', lineHeight: 1,
          color: '#e8e2d5', textAlign: 'center', marginBottom: 8,
        }}>{entry.block.name}</div>
        {specs && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, fontWeight: 700,
            letterSpacing: '0.2em', color: '#8b6f3f',
            marginBottom: 24,
          }}>{specs}</div>
        )}
        {entry.block.video_id && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#8a8680',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.2em',
            border: '1px solid #2e2d2a',
            padding: '6px 12px', marginBottom: 32, cursor: 'pointer',
          }}>
            <VideoDemoIcon />
            WATCH DEMO
          </div>
        )}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: fontSize,
            fontWeight: 800, color: timerColor,
            lineHeight: 1, letterSpacing: '-0.02em',
            textShadow: timerShadow,
          }}>{formatTime(timeRemaining)}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.3em',
            color: timerColor, marginTop: 8,
          }}>{timerLabel}</div>
        </div>
      </div>
    )
  }

  function PlayerActions({ primaryLabel, onPrimary }: { primaryLabel: string; onPrimary: () => void }) {
    return (
      <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
        <button
          onClick={() => setPaused(p => !p)}
          style={{
            flex: '0 0 auto', width: 56,
            background: 'transparent',
            border: '1px solid #2e2d2a',
            color: '#8a8680',
            padding: '18px 0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button
          onClick={onPrimary}
          style={{
            flex: 1,
            background: playerState === 'finisher' ? '#c9410b' : '#8b0000',
            color: '#e8e2d5', border: 'none',
            padding: 18,
            fontFamily: "'Cinzel', serif",
            fontWeight: 800, fontSize: 14,
            letterSpacing: '0.3em', cursor: 'pointer',
            boxShadow: playerState === 'finisher'
              ? '0 0 30px rgba(201,65,11,0.5)'
              : '0 0 20px rgba(139,0,0,0.3)',
          }}
        >
          {primaryLabel}
        </button>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!workout && playerState !== 'rating') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#0a0a0b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8a8680', fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, letterSpacing: '0.3em',
      }}>
        LOADING
      </div>
    )
  }

  const screenStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: `
      radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.05) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 100%, rgba(201,65,11,0.04) 0%, transparent 60%),
      linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)
    `,
    color: '#e8e2d5',
    overflowY: 'auto',
    fontFamily: "'Manrope', sans-serif",
  }

  // ─── State 1: Energy Check ────────────────────────────────────────────────

  if (playerState === 'energy_check') {
    return (
      <div style={screenStyle}>
        <div style={{
          position: 'relative', zIndex: 2,
          height: '100%', minHeight: '100vh',
          padding: '60px 24px 30px',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Back arrow */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 60, left: 20,
              color: '#8a8680', fontSize: 22,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >←</button>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#8a8680', marginBottom: 14,
            }}>— BEFORE WE BEGIN —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 26,
              letterSpacing: '0.04em', color: '#e8e2d5',
              lineHeight: 1.15, marginBottom: 4,
            }}>{workout?.title ?? 'Workout'}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.2em', color: '#8a8680',
              marginTop: 8,
            }}>{workoutMeta}</div>
          </div>

          {/* Coach quote card */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(28,27,25,0.7) 0%, rgba(20,17,15,0.9) 100%)',
            border: '1px solid #2e2d2a',
            padding: '22px 22px',
            marginBottom: 32,
            position: 'relative', textAlign: 'center',
          }}>
            <div style={{
              position: 'absolute', top: -1, left: '20%', right: '20%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #8b0000, transparent)',
            }} />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.3em',
              color: '#8b6f3f', marginBottom: 12,
            }}>— {coachLabel(workout?.coach ?? 'sarge')} —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontStyle: 'italic', fontSize: 14,
              lineHeight: 1.5, color: '#e8e2d5',
            }}>{workout?.coach_intro ?? 'Tell me where you\'re at. Honest, not heroic.'}</div>
          </div>

          {/* Question */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700, fontSize: 16,
              letterSpacing: '0.05em', color: '#e8e2d5', marginBottom: 6,
            }}>How's your energy?</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.2em', color: '#8a8680',
            }}>1 = SPENT  ·  10 = LOADED</div>
          </div>

          {/* Energy scale */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 4, marginBottom: 14,
          }}>
            {Array.from({ length: 10 }, (_, i) => {
              const val = i + 1
              const isActive = val === energyBefore
              const isDimmed = val < energyBefore
              return (
                <div
                  key={val}
                  onClick={() => setEnergyBefore(val)}
                  style={{
                    aspectRatio: '1 / 3',
                    background: isActive
                      ? 'linear-gradient(180deg, #c9410b, #8b0000)'
                      : '#1c1b19',
                    border: `1px solid ${isActive ? '#c9410b' : '#2e2d2a'}`,
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.45 : 1,
                    boxShadow: isActive ? '0 0 10px rgba(201,65,11,0.5)' : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              )
            })}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: '0.15em', color: '#8a8680',
            marginBottom: 30,
          }}>
            <span>1</span>
            <span style={{ color: '#e8e2d5' }}>{energyBefore}</span>
            <span>10</span>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={beginWorkout}
              style={{
                width: '100%',
                background: '#8b0000',
                color: '#e8e2d5', border: 'none',
                padding: 18,
                fontFamily: "'Cinzel', serif",
                fontWeight: 800, fontSize: 14,
                letterSpacing: '0.4em', cursor: 'pointer',
                boxShadow: '0 0 24px rgba(139,0,0,0.3)',
              }}
            >CONFIRM · BEGIN</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── State 7: Post-Workout Rating ─────────────────────────────────────────

  if (playerState === 'rating') {
    const displayedEnergyBefore = pendingLog?.energyBefore ?? energyBefore
    const wo = workout ?? { title: 'Workout', week: pendingLog?.week ?? 1, day: 'monday', coach: 'sarge', duration_min: 0, type: 'kb_strength' } as Workout

    return (
      <div style={screenStyle}>
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '60px 24px 30px',
          display: 'flex', flexDirection: 'column',
          minHeight: '100vh',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#8b6f3f', marginBottom: 12,
            }}>— WORK COMPLETE —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 28,
              letterSpacing: '0.04em', lineHeight: 1.1,
              color: '#e8e2d5', marginBottom: 6,
            }}>{wo.title}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.2em', color: '#8a8680',
            }}>
              {wo.duration_min > 0 ? `${wo.duration_min} MIN · ` : ''}{coachLabel(wo.coach)} · {wo.type.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>

          {/* Shields stamp */}
          <div style={{
            textAlign: 'center', margin: '0 0 28px',
            padding: '16px 24px',
            background: 'linear-gradient(180deg, rgba(139,111,63,0.15) 0%, rgba(60,40,18,0.3) 100%)',
            border: '1px solid #8b6f3f',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -1, left: '30%', right: '30%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #8b6f3f, transparent)',
            }} />
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900, fontSize: 32,
              letterSpacing: '0.1em', color: '#8b6f3f',
              lineHeight: 1, marginBottom: 4,
            }}>+2</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.3em', color: '#8a8680',
            }}>SHIELDS · PENDING RATING</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.15em', color: '#c9410b',
              marginTop: 8,
            }}>+1 INTENSITY BONUS LOCKS IF YOU RATE ≥ 8</div>
          </div>

          {/* Starting energy recap */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            background: 'rgba(28,27,25,0.5)',
            border: '1px dashed #2e2d2a',
            marginBottom: 24,
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.2em', color: '#8a8680',
            }}>STARTING ENERGY · LOGGED PRE-SESSION</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 800, color: '#8b6f3f',
              letterSpacing: '0.1em',
            }}>{displayedEnergyBefore} / 10</span>
          </div>

          {/* Energy After slider */}
          <RatingBlock
            label="ENERGY · AFTER"
            value={energyAfter}
            onChange={setEnergyAfter}
            type="energy"
          />

          {/* Intensity slider */}
          <RatingBlock
            label="INTENSITY"
            value={intensity}
            onChange={setIntensity}
            type="intensity"
          />

          {/* Note */}
          <div style={{ margin: '20px 0 24px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.25em',
              color: '#8a8680', marginBottom: 8,
            }}>A LINE FROM TODAY <span style={{ color: '#5a5852' }}>(OPTIONAL)</span></div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What did the work feel like?"
              style={{
                width: '100%',
                background: 'rgba(28,27,25,0.7)',
                border: '1px solid #2e2d2a',
                color: '#e8e2d5',
                padding: '12px 14px',
                fontFamily: "'Manrope', sans-serif",
                fontSize: 13, fontStyle: 'italic',
                resize: 'none', height: 60,
                outline: 'none',
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={submitRating}
            disabled={submitting}
            style={{
              width: '100%',
              background: submitting ? '#5a0000' : '#8b0000',
              color: '#e8e2d5', border: 'none',
              padding: 18,
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 14,
              letterSpacing: '0.4em', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 0 24px rgba(139,0,0,0.3)',
              marginTop: 'auto',
            }}
          >LOG THE WORK</button>
        </div>
      </div>
    )
  }

  // ─── States 2-6: In-workout ───────────────────────────────────────────────

  const entry = currentEntry
  const nextEnt = nextEntry

  // Simplified player (no block data)
  if (isSimplified) {
    const cue = workout
      ? Object.values(workout.coach_cues ?? {})[0] ?? workout.coach_intro ?? ''
      : ''

    return (
      <div style={screenStyle}>
        <TopBar />
        <ProgressStrip label="WORKOUT" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: 30 }}>
          <div style={{ textAlign: 'center', padding: '20px 24px 24px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#8b6f3f', marginBottom: 8,
            }}>— IN PROGRESS —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 22,
              letterSpacing: '0.06em', color: '#e8e2d5',
            }}>{workout?.title ?? ''}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 72, fontWeight: 800,
              color: '#e8e2d5', lineHeight: 1,
            }}>{formatTime(timeRemaining)}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.3em',
              color: '#8a8680', marginTop: 8,
            }}>TIME REMAINING</div>
          </div>
          {cue && (
            <CoachCue cue={cue} />
          )}
          <PlayerActions
            primaryLabel="FINISH EARLY"
            onPrimary={() => {
              stopTimer()
              saveWorkoutLog({
                id: logId, workoutId, startedAt,
                status: 'pending_rating', energyBefore,
                week: workout?.week ?? 1,
              })
              setPlayerState('rating')
            }}
          />
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div style={{ ...screenStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8a8680', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.3em' }}>
          LOADING
        </div>
      </div>
    )
  }

  // State 2: Warmup
  if (playerState === 'warmup') {
    return (
      <div style={screenStyle}>
        <TopBar />
        <ProgressStrip label="WARM-UP" />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: 30 }}>
          <div style={{ textAlign: 'center', padding: '20px 24px 24px' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#8b6f3f', marginBottom: 8,
            }}>— WARM-UP · MOVE {entry.blockIndex + 1} OF {entry.totalBlocks} —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 22,
              letterSpacing: '0.06em', color: '#e8e2d5',
            }}>Loosen the hinge.</div>
          </div>
          <MovementDisplay entry={entry} timerColor="#e8e2d5" timerLabel="TIME REMAINING" />
          <CoachCue cue={entry.block.cue ?? workout?.coach_cues?.[entry.block.id] ?? ''} />
          <PlayerActions primaryLabel="NEXT" onPrimary={() => advanceQueue(queueIndex + 1)} />
        </div>
      </div>
    )
  }

  // State 3: Active Set
  if (playerState === 'active_set') {
    const roundLabel = entry.totalSets > 1
      ? `ROUND ${entry.setIndex + 1} OF ${entry.totalSets} · MOVE ${entry.blockIndex + 1} OF ${entry.totalBlocks}`
      : `MOVE ${entry.blockIndex + 1} OF ${entry.totalBlocks}`
    const duration = entry.block.duration_seconds ?? 45

    return (
      <div style={screenStyle}>
        <TopBar />
        <ProgressStrip label={`MAIN · ROUND ${entry.setIndex + 1} / ${entry.totalSets}`} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: 30 }}>
          {/* Round banner */}
          <div style={{
            textAlign: 'center', padding: '18px 24px',
            background: 'rgba(139,0,0,0.08)',
            borderBottom: '1px solid rgba(139,0,0,0.3)',
            borderTop: '1px solid rgba(139,0,0,0.3)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#c9410b', marginBottom: 6,
            }}>— {roundLabel} —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 18,
              letterSpacing: '0.1em', color: '#e8e2d5',
            }}>WORK · {duration} SECONDS</div>
          </div>

          {/* Big ember timer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 34,
              letterSpacing: '0.04em', color: '#e8e2d5',
              textAlign: 'center', marginBottom: 8,
            }}>{entry.block.name}</div>
            {(() => {
              const specs = [
                entry.block.weight,
                typeof entry.block.reps === 'number' ? `${entry.block.reps} REPS` : entry.block.reps?.toUpperCase(),
              ].filter(Boolean).join(' · ')
              return specs ? (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.2em', color: '#8b6f3f',
                  marginBottom: 24,
                }}>{specs}</div>
              ) : null
            })()}
            {entry.block.video_id && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#8a8680', fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.2em',
                border: '1px solid #2e2d2a', padding: '6px 12px',
                marginBottom: 32, cursor: 'pointer',
              }}>
                <VideoDemoIcon /> WATCH DEMO
              </div>
            )}
            <div style={{ textAlign: 'center', margin: '30px 0 24px' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 100, fontWeight: 800,
                color: '#c9410b', lineHeight: 1,
                textShadow: '0 0 30px rgba(201,65,11,0.4)',
              }}>{formatTime(timeRemaining)}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.4em',
                color: '#c9410b', marginTop: 8,
              }}>WORK</div>
            </div>
          </div>

          <CoachCue cue={entry.block.cue ?? workout?.coach_cues?.[entry.block.id] ?? ''} />
          <PlayerActions primaryLabel="FINISHED EARLY" onPrimary={() => advanceQueue(queueIndex + 1)} />
        </div>
      </div>
    )
  }

  // State 4: Rest
  if (playerState === 'rest') {
    const upNextEntry = nextEnt
    const upNextSpecs = upNextEntry ? [
      upNextEntry.block.weight,
      typeof upNextEntry.block.reps === 'number' ? `${upNextEntry.block.reps} REPS` : upNextEntry.block.reps?.toUpperCase(),
      upNextEntry.block.duration_seconds ? `${upNextEntry.block.duration_seconds} SECONDS` : null,
    ].filter(Boolean).join(' · ') : ''

    return (
      <div style={screenStyle}>
        <TopBar />
        <ProgressStrip label={entry ? `MAIN · ROUND ${entry.setIndex + 1} / ${entry.totalSets}` : 'REST'} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: 30 }}>
          {/* Rest banner */}
          <div style={{
            textAlign: 'center', padding: '18px 24px',
            background: 'rgba(107,138,138,0.08)',
            borderBottom: '1px solid rgba(107,138,138,0.3)',
            borderTop: '1px solid rgba(107,138,138,0.3)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#6b8a8a', marginBottom: 6,
            }}>— REST · BREATHE —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 18,
              letterSpacing: '0.1em', color: '#e8e2d5',
            }}>15 SECONDS</div>
          </div>

          {/* Marcus timer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 100, fontWeight: 800,
                color: '#6b8a8a', lineHeight: 1,
                textShadow: '0 0 30px rgba(107,138,138,0.3)',
              }}>{formatTime(timeRemaining)}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.3em',
                color: '#6b8a8a', marginTop: 8,
              }}>REST</div>
            </div>
          </div>

          {/* Up next card */}
          {upNextEntry && (
            <div style={{
              margin: '0 24px 20px',
              padding: '16px 18px',
              background: 'linear-gradient(180deg, rgba(20,17,15,0.6) 0%, rgba(14,12,10,0.8) 100%)',
              border: '1px solid #2e2d2a',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.3em',
                color: '#8a8680', marginBottom: 8,
              }}>— UP NEXT —</div>
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 700, fontSize: 16,
                color: '#e8e2d5', marginBottom: 4,
              }}>{upNextEntry.block.name}</div>
              {upNextSpecs && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.15em', color: '#8b6f3f',
                }}>{upNextSpecs}</div>
              )}
            </div>
          )}

          <CoachCue
            cue={entry?.block.cue ?? workout?.coach_cues?.[entry?.block.id ?? ''] ?? 'Breathe. Reset. The next set begins fresh.'}
            borderColor="#6b8a8a"
          />
          <PlayerActions primaryLabel="SKIP REST" onPrimary={() => {
            stopTimer()
            advanceQueue(queueIndex)
          }} />
        </div>
      </div>
    )
  }

  // State 5: Mid-workout check-in modal (overlaid on active state)
  if (playerState === 'checkin') {
    return (
      <div style={screenStyle}>
        <TopBar />
        <ProgressStrip label="HALFWAY POINT" extra={`${formatTime(elapsedTotal)} / ${formatTime(totalDuration)}`} />

        {/* Modal backdrop */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 20,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 20px',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(28,27,25,0.95) 0%, rgba(20,17,15,1) 100%)',
            border: '1px solid #3a3833',
            padding: '32px 24px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -1, left: '15%', right: '15%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #8b0000, transparent)',
            }} />
            <div style={{
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.4em',
              color: '#c9410b', marginBottom: 12,
            }}>— HALFWAY · CHECK-IN —</div>
            <div style={{
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.2em',
              color: '#8a8680', marginBottom: 14,
            }}>{coachLabel(workout?.coach ?? 'sarge')}</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700, fontSize: 20,
              lineHeight: 1.3, textAlign: 'center',
              color: '#e8e2d5', marginBottom: 8,
              letterSpacing: '0.02em',
            }}>How's that landing?</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontStyle: 'italic', fontSize: 12,
              color: '#8a8680', textAlign: 'center',
              marginBottom: 28,
            }}>— The rest of the workout depends on this. —</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'light', marker: 'L', markerColor: '#6b8a8a', label: 'LIGHT', cue: 'I have more to give' },
                { key: 'right', marker: 'R', markerColor: '#8b6f3f', label: 'RIGHT', cue: 'Working hard, holding form' },
                { key: 'heavy', marker: 'H', markerColor: '#c9410b', label: 'HEAVY', cue: 'Bell wins, form is slipping' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={dismissCheckin}
                  style={{
                    background: 'transparent', border: '1px solid #2e2d2a',
                    color: '#e8e2d5', padding: '16px 18px',
                    cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <span style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900, fontSize: 18,
                    letterSpacing: '0.05em', width: 28,
                    flexShrink: 0, color: opt.markerColor,
                  }}>{opt.marker}</span>
                  <span style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 700, fontSize: 14,
                      letterSpacing: '0.08em', marginBottom: 2,
                    }}>{opt.label}</div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, letterSpacing: '0.1em', color: '#8a8680',
                    }}>{opt.cue}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // State 6: Finisher
  if (playerState === 'finisher') {
    return (
      <div style={{
        ...screenStyle,
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(201,65,11,0.06) 0%, transparent 70%),
          radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.05) 0%, transparent 50%),
          linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)
        `,
      }}>
        <TopBar />
        <ProgressStrip
          label={`FINISHER · ${entry?.totalBlocks ?? 1} MOVE${(entry?.totalBlocks ?? 1) > 1 ? 'S' : ''}`}
          extra={`${formatTime(elapsedTotal)} / ${formatTime(totalDuration)}`}
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: 30 }}>
          {/* Finisher banner */}
          <div style={{
            textAlign: 'center', padding: '18px 24px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201,65,11,0.15) 50%, transparent 100%)',
            borderBottom: '1px solid #c9410b',
            borderTop: '1px solid #c9410b',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.5em',
              color: '#c9410b', marginBottom: 6,
              textShadow: '0 0 10px rgba(201,65,11,0.4)',
            }}>— FINISHER · ROUND {(entry?.setIndex ?? 0) + 1} OF {entry?.totalSets ?? 1} —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900, fontSize: 22,
              letterSpacing: '0.15em', color: '#e8e2d5',
              textShadow: '0 0 14px rgba(201,65,11,0.3)',
            }}>EMPTY THE BELL</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800, fontSize: 34,
              letterSpacing: '0.04em', color: '#e8e2d5',
              textAlign: 'center', marginBottom: 8,
            }}>{entry.block.name}</div>
            {(() => {
              const specs = [
                entry.block.weight,
                typeof entry.block.reps === 'number' ? `${entry.block.reps} REPS` : entry.block.reps?.toUpperCase(),
              ].filter(Boolean).join(' · ')
              return specs ? (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.2em', color: '#8b6f3f',
                  marginBottom: 24,
                }}>{specs}</div>
              ) : null
            })()}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 110, fontWeight: 800,
                color: '#c9410b', lineHeight: 1,
                textShadow: '0 0 40px rgba(201,65,11,0.6)',
              }}>{formatTime(timeRemaining)}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.3em',
                color: '#c9410b', marginTop: 8,
              }}>FINISH STRONG</div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(180deg, rgba(28,27,25,0.85) 0%, rgba(20,17,15,0.95) 100%)',
            borderLeft: '3px solid #c9410b',
            padding: '14px 18px', margin: '0 24px 20px',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: '0.25em',
              color: '#c9410b', marginBottom: 4,
            }}>— {coachLabel(workout?.coach ?? 'sarge')} · LAST PUSH —</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontStyle: 'italic', fontSize: 13,
              lineHeight: 1.5, color: '#e8e2d5',
            }}>{entry.block.cue ?? 'Last round. The bell goes down empty. Finish the way you started.'}</div>
          </div>

          <PlayerActions primaryLabel="FINISHED EARLY" onPrimary={() => {
            stopTimer()
            saveWorkoutLog({
              id: logId, workoutId, startedAt,
              status: 'pending_rating', energyBefore,
              week: workout?.week ?? 1,
            })
            setPlayerState('rating')
          }} />
        </div>
      </div>
    )
  }

  return null
}

// ─── Rating Block sub-component ───────────────────────────────────────────────

function RatingBlock({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  type: 'energy' | 'intensity'
}) {
  const activeColor = type === 'intensity' ? '#c9410b' : '#8b6f3f'
  const activeBg = type === 'intensity'
    ? 'linear-gradient(180deg, #c9410b, #8b0000)'
    : 'linear-gradient(180deg, #8b6f3f, #5a4827)'
  const activeBorder = activeColor
  const valueColor = type === 'intensity' ? '#c9410b' : '#e8e2d5'

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: '0.25em', color: '#8a8680',
        }}>{label}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 16, fontWeight: 800, color: valueColor,
        }}>{value}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const val = i + 1
          const isActive = val === value
          const isDimmed = val < value
          return (
            <div
              key={val}
              onClick={() => onChange(val)}
              style={{
                height: 10,
                background: isActive ? activeBg : '#1c1b19',
                border: `1px solid ${isActive ? activeBorder : '#2e2d2a'}`,
                cursor: 'pointer',
                opacity: isDimmed ? 0.4 : 1,
                boxShadow: isActive && type === 'intensity' ? '0 0 6px rgba(201,65,11,0.4)' : 'none',
                transition: 'all 0.15s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
