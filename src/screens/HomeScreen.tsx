import React, { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import { useApp } from '../lib/AppContext'
import { getTodayWorkout, getCoach, getWeekTheme, getWeekPhase } from '../lib/program'
import { getQuoteOfDay } from '../lib/wisdom'
import { getRankName, isTitanTouched, godLevelMsRemaining, isGodLevelAvailable } from '../lib/rewards'
import { getTodayWeight, getWeightLogs, getAllWorkoutLogs } from '../lib/storage'
import type { Workout } from '../lib/types'
import type { WeightLog } from '../lib/types'

interface Props {
  onBeginWorkout: (workoutId: string) => void
  onGodLevel: () => void
  onLogWeight: () => void
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  if (days > 0) return `${days}D · ${hours}H`
  const mins = Math.floor((totalSec % 3600) / 60)
  return `${hours}H · ${mins}M`
}

function getWorkoutStats(workout: Workout): Array<{ num: string; lab: string }> {
  const isRun = workout.type === 'run_long' || workout.type === 'run_intervals' || workout.type === 'run_tempo'
  if (isRun) {
    const prompts = (workout.round_narration?.length ?? 0) + (workout.coach_cues ? Object.keys(workout.coach_cues).length : 0)
    return [
      { num: 'EASY', lab: 'PACE' },
      { num: 'Z2', lab: 'ZONE' },
      { num: String(prompts || 7), lab: 'PROMPTS' },
    ]
  }
  const moves = workout.main.length
  const roundsBlock = workout.main.find(b => b.sets)
  const rounds = roundsBlock?.sets ?? 3
  const finisher = workout.finisher?.length ?? 0
  return [
    { num: String(moves), lab: 'MOVES' },
    { num: String(rounds), lab: 'ROUNDS' },
    { num: String(finisher || 2), lab: 'FINISHER' },
  ]
}

function getCoachAccentColor(coachId: string): string {
  if (coachId === 'sarge') return '#8b0000'
  if (coachId === 'kai') return '#c9410b'
  return '#6b8a8a'
}

function getCoachAvatarStyle(coachId: string): React.CSSProperties {
  if (coachId === 'sarge') return {
    background: 'radial-gradient(circle at 30% 30%, #2a1010 0%, #0a0405 100%)',
    borderColor: 'rgba(139,0,0,0.5)',
    boxShadow: '0 0 12px rgba(139,0,0,0.3)',
  }
  if (coachId === 'kai') return {
    background: 'radial-gradient(circle at 30% 30%, #3a1a08 0%, #1a0a04 100%)',
    borderColor: 'rgba(201,65,11,0.5)',
    boxShadow: '0 0 12px rgba(201,65,11,0.3)',
  }
  return {
    background: 'radial-gradient(circle at 30% 30%, #1a2828 0%, #08111a 100%)',
    borderColor: 'rgba(107,138,138,0.5)',
    boxShadow: '0 0 12px rgba(107,138,138,0.2)',
  }
}

function getCoachLetterColor(coachId: string): string {
  if (coachId === 'sarge') return '#ff6b6b'
  if (coachId === 'kai') return '#ffaa55'
  return '#a0c0c0'
}

function getCoachNameColor(coachId: string): string {
  if (coachId === 'sarge') return '#ffd0d0'
  if (coachId === 'kai') return '#ffd8b8'
  return '#c8d8d8'
}

export default function HomeScreen({ onBeginWorkout, onGodLevel, onLogWeight }: Props) {
  const { prefs, rewards } = useApp()
  const [todayWeight, setTodayWeight] = useState<WeightLog | undefined>()
  const [yesterdayWeight, setYesterdayWeight] = useState<number | undefined>()
  const [weekShields, setWeekShields] = useState(0)
  const [godLevelAvail, setGodLevelAvail] = useState(false)
  const [godLevelMs, setGodLevelMs] = useState(0)

  const currentWeek = prefs?.currentWeek ?? 1
  const workout = getTodayWorkout(currentWeek)
  const quote = getQuoteOfDay()

  const load = useCallback(async () => {
    const tw = await getTodayWeight()
    setTodayWeight(tw)

    const logs = await getWeightLogs(3)
    const today = new Date().toISOString().split('T')[0]
    const yday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const ydayLog = logs.find(l => l.date === yday && l.date !== today)
    if (ydayLog) setYesterdayWeight(ydayLog.weight)

    const avail = await isGodLevelAvailable()
    setGodLevelAvail(avail)
    if (!avail) {
      const ms = await godLevelMsRemaining()
      setGodLevelMs(ms)
    }

    // Count shields earned this week
    const allLogs = await getAllWorkoutLogs()
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekLogs = allLogs.filter(l => l.startedAt >= weekStart.getTime() && l.status === 'complete')
    const total = weekLogs.reduce((sum, l) => sum + (l.shieldsEarned ?? 0), 0)
    setWeekShields(total)
  }, [])

  useEffect(() => { load() }, [load])

  const rank = rewards ? getRankName(rewards) : 'Initiate'
  const titanTouched = rewards ? isTitanTouched(rewards) : false

  // Determine which coach leads today (from weekly_template fallback if no workout)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayName = dayNames[new Date().getDay()]

  // Fallback to weekly_template logic
  const templateMap: Record<string, string> = {
    monday: 'sarge', tuesday: 'marcus', wednesday: 'kai',
    thursday: 'sarge', friday: 'kai', saturday: 'marcus', sunday: 'sarge',
  }

  let coachIdRaw = workout?.coach ?? templateMap[todayName] ?? 'sarge'
  if (!coachIdRaw || coachIdRaw === 'rest') coachIdRaw = 'sarge'
  const coachId = coachIdRaw as 'sarge' | 'kai' | 'marcus'

  const coach = getCoach(coachId)
  const accentColor = getCoachAccentColor(coachId)
  const avatarStyle = getCoachAvatarStyle(coachId)
  const letterColor = getCoachLetterColor(coachId)
  const nameColor = getCoachNameColor(coachId)

  const showFullName = currentWeek <= 2

  // Coach greeting based on today
  const greetings: Record<string, Record<string, string>> = {
    sarge: {
      monday: 'Monday. You showed up. That\'s the first rep, son. We\'re hitting iron today. No half-reps. The bell don\'t lie. Let\'s move.',
      tuesday: 'Tuesday. Yesterday\'s soreness is today\'s confirmation you did the work. Technical work. Move with intent, not speed.',
      wednesday: 'Mid-week. If you\'re here Wednesday you\'ll be here Sunday. Copy that.',
      thursday: 'Rest day. Not a weak day. The work happens in recovery. Don\'t waste it.',
      friday: 'Friday. Two sessions. Get them both done or don\'t talk to me Monday.',
      saturday: 'Saturday. Long grind today. Settle in.',
      sunday: 'Sunday. Last session of the week. Finish clean.',
    },
    kai: {
      monday: 'Monday, big dog. Fresh week. Let\'s not waste the first day.',
      tuesday: 'Tuesday. Yesterday was strength. Today is skill. Don\'t rush it.',
      wednesday: 'Wednesday, big dog. You felt Monday yesterday, I can tell. Today\'s a complex. Five rounds, six movements, one bell. You\'re going to hate me by round four. Let\'s roll.',
      thursday: 'Rest day. Use it. You\'ll need it Friday.',
      friday: 'Friday. Two-a-day. Run first, then bells. You\'re not tired until the second session says you are.',
      saturday: 'Saturday. Long run. Keep the ego in the car.',
      sunday: 'Sunday grind. Finish the week right.',
    },
    marcus: {
      monday: 'Monday. Begin with the fundamentals. The rest follows.',
      tuesday: 'Tuesday. Technical work. Patience over speed. Every rep a lesson.',
      wednesday: 'Wednesday. The middle of the week asks nothing of you except to continue.',
      thursday: 'Thursday. Rest deliberately. The body mends what the bell breaks.',
      friday: 'Friday. Two sessions. Approach each with the same focus.',
      saturday: 'Saturday. Thirty-five minutes today. Easy pace. The temptation will be to go faster because your legs feel ready. Resist it. The benefit is in the duration, not the speed.',
      sunday: 'Sunday. The bell and silence. Nothing more is needed.',
    },
  }

  const greeting = greetings[coachId]?.[todayName] ?? coach?.signature_phrases?.[0] ?? 'The work is here. Begin.'

  // Weight tile
  const weightTrend = todayWeight && yesterdayWeight
    ? todayWeight.weight - yesterdayWeight
    : null

  // Workout stats
  const workoutStats = workout ? getWorkoutStats(workout) : null

  const scheduledTime = prefs?.workoutTimes?.[todayName] ?? '06:30'

  // Week theme for placeholder
  const weekTheme = getWeekTheme(currentWeek)
  const weekPhase = getWeekPhase(currentWeek)

  const isRestDay = todayName === 'thursday'

  return (
    <ScreenShell>
      <div className="scroll-container h-full" style={{ paddingBottom: 80 }}>

        {/* Status bar */}
        <div
          className="flex justify-between items-center"
          style={{ padding: '60px 24px 12px' }}
        >
          <div
            className="font-display font-extrabold tracking-widest text-xs"
            style={{ color: '#8a8680', letterSpacing: '0.4em' }}
          >
            FORGE<span style={{ color: '#8b0000' }}>40</span>
          </div>
          <div
            className="flex items-center gap-1.5"
            style={{
              background: 'rgba(28,27,25,0.6)',
              border: '1px solid #2e2d2a',
              padding: '6px 10px',
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 10, height: 10, color: '#8b6f3f' }}>
              <circle cx="12" cy="12" r="9" />
            </svg>
            <span
              className="font-mono text-[10px]"
              style={{ color: '#8b6f3f', letterSpacing: '0.1em' }}
            >
              {rank.toUpperCase()}
            </span>
            {titanTouched && (
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: 8, height: 8, color: '#c9410b', filter: 'drop-shadow(0 0 3px rgba(201,65,11,0.6))' }}
              >
                <path d="M12 2 L14 9 L21 9 L15 13 L17 21 L12 16 L7 21 L9 13 L3 9 L10 9 Z" />
              </svg>
            )}
          </div>
        </div>

        {/* Coach hero */}
        <div
          style={{
            padding: '24px 24px 32px',
            borderBottom: '1px solid #1c1b19',
            position: 'relative',
          }}
        >
          {/* Coach accent line */}
          <div
            style={{
              position: 'absolute',
              bottom: -1,
              left: '20%',
              right: '20%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />

          <div className="flex items-center gap-3.5 mb-5">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                flexShrink: 0,
                ...avatarStyle,
              }}
            >
              <span
                className="font-display font-black"
                style={{ fontSize: 24, color: letterColor, textShadow: `0 0 10px ${accentColor}55`, letterSpacing: '0.05em' }}
              >
                {coach?.name?.[0]?.toUpperCase() ?? coachId[0].toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.3em', color: '#8a8680', marginBottom: 4 }}
              >
                TODAY'S COACH
              </div>
              <div
                className="font-display font-extrabold"
                style={{ fontSize: 22, letterSpacing: '0.08em', lineHeight: 1, color: nameColor }}
              >
                {coach?.name?.toUpperCase() ?? coachId.toUpperCase()}
              </div>
              {showFullName && coach?.full_name && (
                <div
                  className="font-display"
                  style={{ fontStyle: 'italic', fontSize: 11, color: '#8a8680', letterSpacing: '0.02em', marginTop: 4 }}
                >
                  — {coach.full_name} —
                </div>
              )}
              {!showFullName && (
                <div
                  className="font-display"
                  style={{ fontStyle: 'italic', fontSize: 11, color: '#8a8680', letterSpacing: '0.02em', marginTop: 4 }}
                >
                  {coachId === 'sarge' && '— Iron discipline. No excuses. —'}
                  {coachId === 'kai' && '— Sharp conditioning. Hybrid edge. —'}
                  {coachId === 'marcus' && '— Stoic philosopher-coach. The long path. —'}
                </div>
              )}
            </div>
          </div>

          <div
            className="font-display"
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: '#e8e2d5',
              fontStyle: 'italic',
              fontWeight: 500,
              letterSpacing: '0.01em',
              padding: '4px 0',
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 0, verticalAlign: '-8px', marginRight: 2, color: `${accentColor}99` }}>"</span>
            {greeting}
            <span style={{ fontSize: 30, lineHeight: 0, verticalAlign: '-8px', marginLeft: 2, color: `${accentColor}99` }}>"</span>
          </div>
        </div>

        {/* Workout section */}
        <div style={{ padding: '28px 20px 20px' }}>
          <div
            className="font-mono text-center"
            style={{ fontSize: 9, letterSpacing: '0.4em', color: '#8a8680', marginBottom: 12 }}
          >
            — TODAY'S FORGE —
          </div>

          {isRestDay ? (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.85) 0%, rgba(20,17,15,0.95) 100%)',
                border: '1px solid #2e2d2a',
                padding: '32px 22px',
                textAlign: 'center',
              }}
            >
              <div
                className="font-display font-extrabold"
                style={{ fontSize: 20, letterSpacing: '0.06em', color: '#8a8680', marginBottom: 8 }}
              >
                REST DAY
              </div>
              <div
                className="font-display"
                style={{ fontStyle: 'italic', fontSize: 14, color: '#5a5852', letterSpacing: '0.02em' }}
              >
                Recover deliberately.
              </div>
            </div>
          ) : workout ? (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.85) 0%, rgba(20,17,15,0.95) 100%)',
                border: '1px solid #2e2d2a',
                padding: '24px 22px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 3,
                  height: '100%',
                  background: 'linear-gradient(180deg, #8b0000, #c9410b)',
                }}
              />

              <div className="flex justify-between items-start mb-4">
                <div style={{ flex: 1 }}>
                  <div
                    className="font-mono"
                    style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680', marginBottom: 6 }}
                  >
                    WEEK {workout.week} · {workout.day.toUpperCase().slice(0, 3)} · {workout.type.toUpperCase().replace(/_/g, ' ')}
                  </div>
                  <div
                    className="font-display font-extrabold"
                    style={{ fontSize: 22, letterSpacing: '0.04em', lineHeight: 1.15, color: '#e8e2d5' }}
                  >
                    {workout.title.split('. ').pop() ?? workout.title}
                  </div>
                </div>
                <div
                  className="font-mono font-bold text-right"
                  style={{ fontSize: 11, color: '#e8e2d5', letterSpacing: '0.1em', flexShrink: 0, marginLeft: 12 }}
                >
                  {workout.duration_min}
                  <span
                    className="font-mono block"
                    style={{ fontSize: 9, color: '#8a8680', marginTop: 2, letterSpacing: '0.2em' }}
                  >
                    MIN
                  </span>
                </div>
              </div>

              {/* Stats blocks */}
              {workoutStats && (
                <div
                  className="flex"
                  style={{ borderTop: '1px solid #2e2d2a', borderBottom: '1px solid #2e2d2a', marginBottom: 18 }}
                >
                  {workoutStats.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        padding: '12px 8px',
                        textAlign: 'center',
                        borderLeft: i > 0 ? '1px solid #2e2d2a' : 'none',
                      }}
                    >
                      <div className="font-mono font-extrabold" style={{ fontSize: 16, color: '#8b6f3f', lineHeight: 1 }}>
                        {s.num}
                      </div>
                      <div className="font-mono" style={{ fontSize: 8, letterSpacing: '0.2em', color: '#8a8680', marginTop: 4 }}>
                        {s.lab}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => onBeginWorkout(workout.id)}
                className="w-full font-display font-extrabold"
                style={{
                  background: '#8b0000',
                  color: '#e8e2d5',
                  border: 'none',
                  padding: '16px',
                  fontSize: 14,
                  letterSpacing: '0.4em',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(139,0,0,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#a30000')}
                onMouseLeave={e => (e.currentTarget.style.background = '#8b0000')}
              >
                BEGIN
              </button>

              <div
                className="flex justify-between items-center font-mono"
                style={{ marginTop: 12, fontSize: 9, letterSpacing: '0.15em', color: '#8a8680' }}
              >
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11 }}>
                    <rect x="3" y="5" width="18" height="16" rx="1" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                  </svg>
                  SCHEDULED · {scheduledTime.replace(':', ':')} {parseInt(scheduledTime.split(':')[0]) < 12 ? 'AM' : 'PM'}
                </span>
                <span>NO CONFLICTS</span>
              </div>
            </div>
          ) : (
            /* Placeholder for weeks without full data */
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.85) 0%, rgba(20,17,15,0.95) 100%)',
                border: '1px solid #2e2d2a',
                padding: '24px 22px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: 3, height: '100%',
                  background: 'linear-gradient(180deg, #8b0000, #c9410b)',
                }}
              />
              <div
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680', marginBottom: 6 }}
              >
                WEEK {currentWeek} · {weekPhase.toUpperCase()} PHASE
              </div>
              <div
                className="font-display font-extrabold"
                style={{ fontSize: 20, letterSpacing: '0.04em', lineHeight: 1.2, color: '#e8e2d5', marginBottom: 12 }}
              >
                {weekTheme}
              </div>
              <div
                className="font-display"
                style={{ fontStyle: 'italic', fontSize: 13, color: '#5a5852', letterSpacing: '0.02em' }}
              >
                Program continues. Stay the course.
              </div>
            </div>
          )}
        </div>

        {/* Quote strip */}
        <div
          style={{
            padding: '28px 24px 24px',
            textAlign: 'center',
            borderTop: '1px solid #1c1b19',
            borderBottom: '1px solid #1c1b19',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(139,111,63,0.06) 0%, transparent 70%)',
          }}
        >
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.4em', color: '#8a8680', marginBottom: 14 }}
          >
            — TODAY'S WISDOM —
          </div>
          <div
            className="font-display mx-auto"
            style={{
              fontStyle: 'italic',
              fontSize: 16,
              lineHeight: 1.5,
              color: '#e8e2d5',
              maxWidth: 300,
              marginBottom: 14,
              letterSpacing: '0.01em',
            }}
          >
            "{quote.quote}"
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 10, letterSpacing: '0.15em', color: '#8b6f3f', marginBottom: 12 }}
          >
            {quote.author.toUpperCase()} · {quote.source.toUpperCase()}
          </div>
          <a
            href={quote.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.3em',
              color: '#8a8680',
              textDecoration: 'none',
              borderBottom: '1px dashed #2e2d2a',
              paddingBottom: 2,
            }}
          >
            READ MORE →
          </a>
        </div>

        {/* Actions row */}
        <div
          style={{
            padding: '20px 20px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {/* Weight tile */}
          <button
            onClick={onLogWeight}
            style={{
              background: 'linear-gradient(180deg, rgba(28,27,25,0.6) 0%, rgba(20,17,15,0.85) 100%)',
              border: '1px solid #2e2d2a',
              padding: '16px 14px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#8b6f3f')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2e2d2a')}
          >
            <div className="flex justify-between items-center">
              <span style={{ width: 22, height: 22, color: '#8b6f3f' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
                  <rect x="3" y="6" width="18" height="14" rx="1" />
                  <circle cx="12" cy="13" r="4" />
                  <line x1="10" y1="13" x2="14" y2="13" />
                  <line x1="12" y1="11" x2="12" y2="15" />
                </svg>
              </span>
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680' }}>
                {todayWeight ? 'TODAY' : 'NOT LOGGED'}
              </span>
            </div>
            {todayWeight ? (
              <>
                <div className="font-mono font-extrabold" style={{ fontSize: 22, color: '#e8e2d5', lineHeight: 1 }}>
                  {todayWeight.weight.toFixed(1)}
                  <span style={{ fontSize: 11, color: '#8a8680', marginLeft: 3 }}>LB</span>
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: '#8a8680', letterSpacing: '0.1em' }}>
                  {weightTrend !== null && (
                    <span style={{ color: weightTrend <= 0 ? '#6fa86f' : '#c9410b' }}>
                      {weightTrend <= 0 ? '↓' : '↑'} {Math.abs(weightTrend).toFixed(1)}
                    </span>
                  )}{' '}
                  FROM YESTERDAY
                </div>
              </>
            ) : (
              <>
                <div className="font-mono font-extrabold" style={{ fontSize: 22, color: '#5a5852', lineHeight: 1 }}>
                  — —
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: '#5a5852', letterSpacing: '0.1em' }}>
                  TAP TO STEP ON SCALE
                </div>
              </>
            )}
          </button>

          {/* Shields tile */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(28,27,25,0.6) 0%, rgba(20,17,15,0.85) 100%)',
              border: '1px solid #2e2d2a',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div className="flex justify-between items-center">
              <span style={{ width: 22, height: 22, color: '#8b6f3f' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
                  <circle cx="12" cy="11" r="6" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                </svg>
              </span>
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680' }}>
                THIS WEEK
              </span>
            </div>
            <div className="font-mono font-extrabold" style={{ fontSize: 22, color: '#e8e2d5', lineHeight: 1 }}>
              {weekShields}
              <span style={{ fontSize: 11, color: '#8a8680', marginLeft: 3 }}>/ 6</span>
            </div>
            <div className="font-mono" style={{ fontSize: 9, color: '#8a8680', letterSpacing: '0.1em' }}>
              SHIELDS THIS WEEK
            </div>
          </div>
        </div>

        {/* God-Level button */}
        <div style={{ padding: '4px 20px 0' }}>
          <button
            onClick={godLevelAvail ? onGodLevel : undefined}
            style={{
              width: '100%',
              background: godLevelAvail
                ? 'linear-gradient(180deg, rgba(20,5,5,0.95) 0%, rgba(10,2,2,1) 100%)'
                : 'linear-gradient(180deg, rgba(15,10,10,0.9) 0%, rgba(10,8,8,1) 100%)',
              border: `1px solid ${godLevelAvail ? 'rgba(139,0,0,0.5)' : 'rgba(60,40,40,0.4)'}`,
              padding: '18px 20px',
              cursor: godLevelAvail ? 'pointer' : 'default',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s',
            }}
          >
            {/* Ember pulse background */}
            {godLevelAvail && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(ellipse at 20% 50%, rgba(201,65,11,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(139,0,0,0.25) 0%, transparent 50%)',
                  animation: 'emberPulse 4s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
            )}
            <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
              <div
                className="font-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.4em',
                  color: godLevelAvail ? '#c9410b' : '#5a5852',
                  marginBottom: 4,
                  textShadow: godLevelAvail ? '0 0 8px rgba(201,65,11,0.5)' : 'none',
                }}
              >
                {godLevelAvail ? 'GATES OPEN' : 'SEALED'}
              </div>
              <div
                className="font-display font-black"
                style={{
                  fontSize: 20,
                  letterSpacing: '0.12em',
                  color: godLevelAvail ? '#e8e2d5' : '#5a5852',
                  lineHeight: 1,
                }}
              >
                GOD-LEVEL
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.2em', color: '#5a5852', marginTop: 6 }}
              >
                {godLevelAvail
                  ? '45 MIN · MAX EFFORT · ONCE PER WEEK'
                  : `GATES OPEN IN ${formatCountdown(godLevelMs)}`}
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                fontSize: 22,
                color: godLevelAvail ? '#c9410b' : '#5a5852',
                fontWeight: 300,
              }}
            >
              →
            </div>
          </button>
        </div>

        <style>{`
          @keyframes emberPulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </ScreenShell>
  )
}
