import { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import { useApp } from '../lib/AppContext'
import { getWeightLogs, getAllWorkoutLogs } from '../lib/storage'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import type { WeightLog, WorkoutLog } from '../lib/types'

type Range = '7d' | '30d' | '12w'

function formatChartDate(dateStr: string, range: Range): string {
  const [, m, d] = dateStr.split('-').map(Number)
  if (range === '12w') return `${m}/${d}`
  return `${m}/${d}`
}

function groupByWeek(logs: WeightLog[]): { date: string; weight: number }[] {
  if (logs.length === 0) return []
  const groups: Record<string, number[]> = {}
  for (const l of logs) {
    const d = new Date(l.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!groups[key]) groups[key] = []
    groups[key].push(l.weight)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weights]) => ({
      date,
      weight: Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10,
    }))
}

function calcStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0
  const completed = logs.filter(l => l.status === 'complete')
  if (completed.length === 0) return 0

  const days = new Set(
    completed.map(l => new Date(l.startedAt).toISOString().split('T')[0])
  )
  const sortedDays = Array.from(days).sort().reverse()

  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)

  for (const day of sortedDays) {
    const d = new Date(day)
    const diff = Math.round((current.getTime() - d.getTime()) / 86400000)
    if (diff <= 1) {
      streak++
      current = d
    } else {
      break
    }
  }
  return streak
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#1c1b19',
          border: '1px solid #2e2d2a',
          padding: '8px 12px',
        }}
      >
        <div className="font-mono" style={{ fontSize: 10, color: '#8a8680', letterSpacing: '0.1em' }}>{label}</div>
        <div className="font-mono font-bold" style={{ fontSize: 14, color: '#e8e2d5' }}>
          {payload[0].value} <span style={{ fontSize: 10, color: '#8a8680' }}>LBS</span>
        </div>
      </div>
    )
  }
  return null
}

export default function StatsScreen() {
  const { prefs } = useApp()
  const [range, setRange] = useState<Range>('30d')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])

  const load = useCallback(async () => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 84
    const wl = await getWeightLogs(days)
    setWeightLogs(wl)
    const wkl = await getAllWorkoutLogs()
    setWorkoutLogs(wkl)
  }, [range])

  useEffect(() => { load() }, [load])

  // Chart data
  const chartData = (() => {
    if (range === '12w') {
      return groupByWeek(weightLogs).map(d => ({
        ...d,
        label: formatChartDate(d.date, range),
      }))
    }
    return weightLogs.map(l => ({
      date: l.date,
      weight: l.weight,
      label: formatChartDate(l.date, range),
    }))
  })()

  // Stats
  const completedLogs = workoutLogs.filter(l => l.status === 'complete')
  const last7Workouts = completedLogs.slice(-7)
  const avgIntensity = last7Workouts.length > 0
    ? Math.round(last7Workouts.reduce((s, l) => s + (l.intensity ?? 5), 0) / last7Workouts.length * 10) / 10
    : 0
  const totalWorkouts = completedLogs.length
  const streak = calcStreak(workoutLogs)

  const currentWeight = weightLogs.length > 0
    ? weightLogs[weightLogs.length - 1].weight
    : undefined
  const goalWeight = prefs?.goalWeight

  const goalPct = currentWeight && goalWeight && prefs?.startingWeight
    ? Math.min(100, Math.max(0, Math.round(
        ((prefs.startingWeight - currentWeight) / (prefs.startingWeight - goalWeight)) * 100
      )))
    : 0

  const recent5 = completedLogs.slice(-5).reverse()

  const yMin = chartData.length > 0
    ? Math.floor(Math.min(...chartData.map(d => d.weight)) - 3)
    : 150
  const yMax = chartData.length > 0
    ? Math.ceil(Math.max(...chartData.map(d => d.weight)) + 3)
    : 220

  return (
    <ScreenShell>
      <div className="scroll-container h-full" style={{ paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ padding: '60px 24px 24px' }}>
          <div
            className="font-display font-extrabold"
            style={{ fontSize: 28, letterSpacing: '0.1em', color: '#e8e2d5' }}
          >
            STATS
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: '#5a5852', marginTop: 4 }}
          >
            PERFORMANCE RECORD
          </div>
        </div>

        {/* Weight chart */}
        <div style={{ padding: '0 20px 24px' }}>
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(28,27,25,0.8) 0%, rgba(20,17,15,0.95) 100%)',
              border: '1px solid #2e2d2a',
              padding: '20px 0 16px',
            }}
          >
            {/* Chart header + toggle */}
            <div className="flex justify-between items-center" style={{ padding: '0 20px', marginBottom: 16 }}>
              <div>
                <div
                  className="font-mono"
                  style={{ fontSize: 9, letterSpacing: '0.3em', color: '#8a8680', marginBottom: 4 }}
                >
                  WEIGHT TREND
                </div>
                {currentWeight && (
                  <div className="font-mono font-bold" style={{ fontSize: 18, color: '#e8e2d5' }}>
                    {currentWeight.toFixed(1)}{' '}
                    <span style={{ fontSize: 11, color: '#8a8680' }}>LBS</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {(['7d', '30d', '12w'] as Range[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: '0.15em',
                      padding: '5px 10px',
                      background: range === r ? 'rgba(201,65,11,0.2)' : 'transparent',
                      border: `1px solid ${range === r ? '#c9410b' : '#2e2d2a'}`,
                      color: range === r ? '#c9410b' : '#5a5852',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2d2a" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#5a5852', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fill: '#5a5852', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#c9410b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#c9410b', stroke: '#1c1b19', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="font-mono text-center" style={{ color: '#5a5852', fontSize: 11, letterSpacing: '0.2em' }}>
                  LOG WEIGHT TO SEE TREND
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat tiles */}
        <div
          style={{
            padding: '0 20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {[
            { label: 'AVG INTENSITY', value: avgIntensity || '—', sub: 'LAST 7' },
            { label: 'WORKOUTS', value: totalWorkouts, sub: 'TOTAL' },
            { label: 'STREAK', value: streak, sub: 'DAYS' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.7) 0%, rgba(20,17,15,0.9) 100%)',
                border: '1px solid #2e2d2a',
                padding: '14px 12px',
                textAlign: 'center',
              }}
            >
              <div
                className="font-mono font-extrabold"
                style={{ fontSize: 24, color: '#e8e2d5', lineHeight: 1 }}
              >
                {s.value}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 7, letterSpacing: '0.2em', color: '#8a8680', marginTop: 4 }}
              >
                {s.sub}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 7, letterSpacing: '0.15em', color: '#5a5852', marginTop: 2 }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Goal progress */}
        {goalWeight && prefs?.startingWeight && (
          <div style={{ padding: '0 20px 24px' }}>
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.7) 0%, rgba(20,17,15,0.9) 100%)',
                border: '1px solid #2e2d2a',
                padding: '18px 20px',
              }}
            >
              <div
                className="font-mono"
                style={{ fontSize: 9, letterSpacing: '0.3em', color: '#8a8680', marginBottom: 12 }}
              >
                GOAL PROGRESS
              </div>
              <div className="flex justify-between items-end" style={{ marginBottom: 8 }}>
                <div>
                  <div className="font-mono font-bold" style={{ fontSize: 18, color: '#e8e2d5' }}>
                    {currentWeight?.toFixed(1) ?? prefs.startingWeight.toFixed(1)}{' '}
                    <span style={{ fontSize: 10, color: '#8a8680' }}>LBS</span>
                  </div>
                  <div className="font-mono" style={{ fontSize: 8, color: '#5a5852', letterSpacing: '0.1em', marginTop: 2 }}>
                    CURRENT
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold" style={{ fontSize: 18, color: '#8b6f3f' }}>
                    {goalWeight.toFixed(1)}{' '}
                    <span style={{ fontSize: 10, color: '#5a5852' }}>LBS</span>
                  </div>
                  <div className="font-mono" style={{ fontSize: 8, color: '#5a5852', letterSpacing: '0.1em', marginTop: 2 }}>
                    GOAL
                  </div>
                </div>
              </div>
              <div style={{ height: 4, background: '#1c1b19', position: 'relative', overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${goalPct}%`,
                    background: 'linear-gradient(90deg, #8b6f3f, #c9410b)',
                    boxShadow: '0 0 8px rgba(201,65,11,0.4)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <div
                className="font-mono text-right"
                style={{ fontSize: 9, color: '#8a8680', marginTop: 6, letterSpacing: '0.1em' }}
              >
                {goalPct}% TO GOAL
              </div>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        <div style={{ padding: '0 20px 24px' }}>
          <div
            className="font-display font-bold"
            style={{ fontSize: 13, letterSpacing: '0.3em', color: '#8a8680', marginBottom: 14 }}
          >
            RECENT SESSIONS
          </div>

          {recent5.length === 0 ? (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.5) 0%, rgba(20,17,15,0.7) 100%)',
                border: '1px solid #2e2d2a',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div className="font-mono" style={{ fontSize: 10, color: '#5a5852', letterSpacing: '0.2em' }}>
                NO SESSIONS LOGGED YET.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(28,27,25,0.5) 0%, rgba(20,17,15,0.7) 100%)',
                border: '1px solid #2e2d2a',
              }}
            >
              {recent5.map((log, i) => {
                const date = new Date(log.startedAt)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: i < recent5.length - 1 ? '1px solid #2e2d2a' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="font-mono"
                        style={{ fontSize: 9, letterSpacing: '0.1em', color: '#8a8680', marginBottom: 3 }}
                      >
                        {dateStr.toUpperCase()} · WK {log.week}
                      </div>
                      <div
                        className="font-display font-bold"
                        style={{ fontSize: 13, letterSpacing: '0.06em', color: '#e8e2d5' }}
                      >
                        WORKOUT {log.workoutId.toUpperCase()}
                      </div>
                    </div>
                    {log.intensity !== undefined && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div
                          className="font-mono font-bold"
                          style={{ fontSize: 18, color: '#c9410b', lineHeight: 1 }}
                        >
                          {log.intensity}
                        </div>
                        <div
                          className="font-mono"
                          style={{ fontSize: 7, color: '#5a5852', letterSpacing: '0.1em' }}
                        >
                          /10
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
