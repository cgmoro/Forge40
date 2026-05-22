import { useState, useRef, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { useApp } from '../lib/AppContext'
import { getWorkoutsForWeek, getWeekTheme, getWeekPhase, getCoach, TOTAL_WEEKS } from '../lib/program'
import type { Workout } from '../lib/types'

const coachColors: Record<string, string> = {
  sarge: '#8b0000',
  kai: '#c9410b',
  marcus: '#6b8a8a',
}

const typeLabels: Record<string, string> = {
  kb_strength: 'KB STRENGTH',
  kb_technical: 'KB TECHNICAL',
  kb_conditioning: 'KB CONDITIONING',
  kb_grind: 'KB GRIND',
  kb_short: 'KB SHORT',
  run_long: 'LONG RUN',
  run_intervals: 'INTERVALS',
  run_tempo: 'TEMPO RUN',
  two_a_day: 'TWO-A-DAY',
  god_level: 'GOD-LEVEL',
}

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const dayAbbr: Record<string, string> = {
  monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
  thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN',
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const coach = getCoach(workout.coach)
  const accent = coachColors[workout.coach] ?? '#8b6f3f'
  const isRun = workout.type.startsWith('run_')

  // Count blocks
  const moveCount = workout.main?.length ?? 0
  const roundsBlock = workout.main?.find(b => b.sets)
  const rounds = roundsBlock?.sets ?? 3
  const finisherCount = workout.finisher?.length ?? 0

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(28,27,25,0.7) 0%, rgba(20,17,15,0.9) 100%)',
        border: '1px solid #2e2d2a',
        marginBottom: 10,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 3, height: '100%',
          background: accent,
          opacity: 0.8,
        }}
      />

      <div style={{ padding: '16px 16px 16px 20px' }}>
        {/* Top row */}
        <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <span
                className="font-mono"
                style={{ fontSize: 8, letterSpacing: '0.2em', color: accent, textTransform: 'uppercase' }}
              >
                {coach?.name ?? workout.coach.toUpperCase()}
              </span>
              <span style={{ color: '#2e2d2a', fontSize: 8 }}>·</span>
              <span
                className="font-mono"
                style={{ fontSize: 8, letterSpacing: '0.15em', color: '#5a5852', textTransform: 'uppercase' }}
              >
                {typeLabels[workout.type] ?? workout.type.toUpperCase()}
              </span>
            </div>
            <div
              className="font-display font-bold"
              style={{ fontSize: 16, letterSpacing: '0.05em', color: '#e8e2d5', lineHeight: 1.2 }}
            >
              {workout.title.split('. ').slice(1).join('. ') || workout.title}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div
              className="font-mono font-bold"
              style={{ fontSize: 18, color: '#e8e2d5', lineHeight: 1 }}
            >
              {workout.duration_min}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 8, color: '#5a5852', letterSpacing: '0.15em' }}
            >
              MIN
            </div>
          </div>
        </div>

        {/* Stats row */}
        {(moveCount > 0 || finisherCount > 0) && (
          <div className="flex gap-3 mt-3">
            {!isRun && moveCount > 0 && (
              <span
                className="font-mono"
                style={{ fontSize: 9, color: '#8b6f3f', letterSpacing: '0.1em' }}
              >
                {moveCount} MOVES
              </span>
            )}
            {!isRun && (
              <span
                className="font-mono"
                style={{ fontSize: 9, color: '#5a5852', letterSpacing: '0.1em' }}
              >
                {rounds} ROUNDS
              </span>
            )}
            {isRun && (
              <>
                <span className="font-mono" style={{ fontSize: 9, color: '#8b6f3f', letterSpacing: '0.1em' }}>
                  EASY PACE
                </span>
                <span className="font-mono" style={{ fontSize: 9, color: '#5a5852', letterSpacing: '0.1em' }}>
                  ZONE 2
                </span>
              </>
            )}
            {!isRun && finisherCount > 0 && (
              <span
                className="font-mono"
                style={{ fontSize: 9, color: '#5a5852', letterSpacing: '0.1em' }}
              >
                +FINISHER
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProgramScreen() {
  const { prefs } = useApp()
  const currentWeek = prefs?.currentWeek ?? 1
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const scrollRef = useRef<HTMLDivElement>(null)

  const workouts = getWorkoutsForWeek(selectedWeek)
  const theme = getWeekTheme(selectedWeek)
  const phase = getWeekPhase(selectedWeek)
  const hasFullData = workouts.length > 0

  // Sort workouts by day order
  const sorted = [...workouts].sort((a, b) =>
    dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
  )

  // Scroll selected week pill into view
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const pill = container.querySelector(`[data-week="${selectedWeek}"]`) as HTMLElement
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedWeek])

  return (
    <ScreenShell>
      <div className="flex flex-col h-full" style={{ paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ padding: '60px 24px 20px', flexShrink: 0 }}>
          <div
            className="font-display font-extrabold"
            style={{ fontSize: 28, letterSpacing: '0.1em', color: '#e8e2d5' }}
          >
            PROGRAM
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: '#5a5852', marginTop: 4 }}
          >
            12-WEEK FORGE PROTOCOL
          </div>
        </div>

        {/* Week selector */}
        <div
          ref={scrollRef}
          className="scroll-container"
          style={{
            display: 'flex',
            gap: 8,
            padding: '0 20px 20px',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => {
            const isCurrent = w === currentWeek
            const isSelected = w === selectedWeek
            return (
              <button
                key={w}
                data-week={w}
                onClick={() => setSelectedWeek(w)}
                className="font-mono flex-shrink-0"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  padding: '8px 14px',
                  background: isSelected
                    ? 'rgba(201,65,11,0.2)'
                    : isCurrent
                    ? 'rgba(139,111,63,0.1)'
                    : 'transparent',
                  border: `1px solid ${
                    isSelected ? '#c9410b' : isCurrent ? '#8b6f3f' : '#2e2d2a'
                  }`,
                  color: isSelected ? '#c9410b' : isCurrent ? '#8b6f3f' : '#5a5852',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                W{w}
                {isCurrent && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: '#8b6f3f',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Week content */}
        <div className="scroll-container flex-1" style={{ padding: '0 20px' }}>

          {/* Week header */}
          <div
            style={{
              marginBottom: 20,
              padding: '18px 18px',
              background: 'linear-gradient(180deg, rgba(28,27,25,0.6) 0%, rgba(20,17,15,0.8) 100%)',
              border: '1px solid #2e2d2a',
              borderLeft: `3px solid #8b6f3f`,
            }}
          >
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.3em', color: '#8b6f3f', marginBottom: 6 }}
            >
              WEEK {selectedWeek} · {phase.toUpperCase()} PHASE
            </div>
            <div
              className="font-display font-bold"
              style={{ fontSize: 16, letterSpacing: '0.05em', color: '#e8e2d5' }}
            >
              {theme}
            </div>
          </div>

          {hasFullData ? (
            <>
              {sorted.map(wo => (
                <div key={wo.id}>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.25em',
                      color: '#5a5852',
                      marginBottom: 6,
                      paddingLeft: 4,
                    }}
                  >
                    {dayAbbr[wo.day] ?? wo.day.toUpperCase()}
                  </div>
                  <WorkoutCard workout={wo} />
                </div>
              ))}

              {/* Thursday rest */}
              {!sorted.find(w => w.day === 'thursday') && (
                <div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 9, letterSpacing: '0.25em', color: '#5a5852', marginBottom: 6, paddingLeft: 4 }}
                  >
                    THU
                  </div>
                  <div
                    style={{
                      background: 'linear-gradient(180deg, rgba(28,27,25,0.4) 0%, rgba(20,17,15,0.6) 100%)',
                      border: '1px solid #1c1b19',
                      padding: '16px 20px',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      className="font-display"
                      style={{ fontStyle: 'italic', fontSize: 13, color: '#5a5852' }}
                    >
                      Rest. Recover deliberately.
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Placeholder for weeks 3–12 */
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.5) 0%, rgba(20,17,15,0.7) 100%)',
                border: '1px solid #2e2d2a',
                padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <div
                className="font-display font-bold"
                style={{ fontSize: 16, letterSpacing: '0.1em', color: '#5a5852', marginBottom: 12 }}
              >
                WEEK {selectedWeek} AHEAD
              </div>
              <div
                className="font-display"
                style={{ fontStyle: 'italic', fontSize: 14, color: '#5a5852', lineHeight: 1.6, marginBottom: 16 }}
              >
                {theme}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.2em', color: '#3a3833' }}
              >
                FULL SESSION DATA UNLOCKS AS YOU PROGRESS
              </div>
            </div>
          )}

          <div style={{ height: 20 }} />
        </div>
      </div>
    </ScreenShell>
  )
}
