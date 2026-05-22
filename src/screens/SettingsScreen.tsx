import React, { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import { useApp } from '../lib/AppContext'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_ABBR: Record<string, string> = {
  monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
  thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN',
}

interface ToggleProps {
  enabled: boolean
  onToggle: () => void
}

function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: `1px solid ${enabled ? '#c9410b' : '#2e2d2a'}`,
        background: enabled ? 'rgba(201,65,11,0.3)' : '#1c1b19',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
      aria-label={enabled ? 'Disable' : 'Enable'}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: enabled ? 22 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: enabled ? '#c9410b' : '#5a5852',
          transition: 'all 0.2s',
        }}
      />
    </button>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        className="font-mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.4em',
          color: '#5a5852',
          padding: '0 20px',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(28,27,25,0.6) 0%, rgba(20,17,15,0.85) 100%)',
          border: '1px solid #2e2d2a',
          margin: '0 20px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

interface RowProps {
  label: string
  children: React.ReactNode
  last?: boolean
}

function Row({ label, children, last }: RowProps) {
  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: last ? 'none' : '1px solid #1c1b19',
      }}
    >
      <span
        className="font-body"
        style={{ fontSize: 14, color: '#e8e2d5' }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

export default function SettingsScreen() {
  const { prefs, updatePrefs } = useApp()

  const [startingWeight, setStartingWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [weightTime, setWeightTime] = useState('06:30')
  const [calConnected, setCalConnected] = useState(false)
  const [workoutTimes, setWorkoutTimes] = useState<Partial<Record<string, string>>>({})

  useEffect(() => {
    if (!prefs) return
    setStartingWeight(prefs.startingWeight?.toString() ?? '')
    setGoalWeight(prefs.goalWeight?.toString() ?? '')
    setWeightUnit(prefs.weightUnit ?? 'lbs')
    setNotifEnabled(prefs.notificationsEnabled ?? false)
    setWeightTime(prefs.weightPromptTime ?? '06:30')
    setCalConnected(prefs.googleCalendarConnected ?? false)
    setWorkoutTimes(prefs.workoutTimes ?? {})
  }, [prefs])

  const save = useCallback(async (updates: Parameters<typeof updatePrefs>[0]) => {
    await updatePrefs(updates)
  }, [updatePrefs])

  const handleStartingWeight = useCallback(async (val: string) => {
    setStartingWeight(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 50 && n < 500) {
      await save({ startingWeight: n })
    }
  }, [save])

  const handleGoalWeight = useCallback(async (val: string) => {
    setGoalWeight(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 50 && n < 500) {
      await save({ goalWeight: n })
    }
  }, [save])

  const handleWeightUnit = useCallback(async (unit: 'lbs' | 'kg') => {
    setWeightUnit(unit)
    await save({ weightUnit: unit })
  }, [save])

  const handleNotif = useCallback(async () => {
    const next = !notifEnabled
    setNotifEnabled(next)
    if (next && 'Notification' in window) {
      await Notification.requestPermission()
    }
    await save({ notificationsEnabled: next })
  }, [notifEnabled, save])

  const handleWeightTime = useCallback(async (t: string) => {
    setWeightTime(t)
    await save({ weightPromptTime: t })
  }, [save])

  const handleWorkoutTime = useCallback(async (day: string, t: string) => {
    const next = { ...workoutTimes, [day]: t }
    setWorkoutTimes(next)
    await save({ workoutTimes: next })
  }, [workoutTimes, save])

  const handleCalConnect = useCallback(async () => {
    const next = !calConnected
    setCalConnected(next)
    await save({ googleCalendarConnected: next })
  }, [calConnected, save])

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e8e2d5',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    textAlign: 'right',
    width: 80,
  }

  const timeInputStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #2e2d2a',
    outline: 'none',
    color: '#e8e2d5',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    padding: '4px 8px',
    letterSpacing: '0.05em',
    cursor: 'pointer',
  }

  return (
    <ScreenShell>
      <div className="scroll-container h-full" style={{ paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ padding: '60px 24px 24px' }}>
          <div
            className="font-display font-extrabold"
            style={{ fontSize: 28, letterSpacing: '0.1em', color: '#e8e2d5' }}
          >
            SETTINGS
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.3em', color: '#5a5852', marginTop: 4 }}
          >
            FORGE40 CONFIGURATION
          </div>
        </div>

        {/* User section */}
        <Section title="BODY METRICS">
          <Row label="Starting Weight">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={startingWeight}
                onChange={e => handleStartingWeight(e.target.value)}
                placeholder="000.0"
                style={inputStyle}
              />
              <span className="font-mono" style={{ fontSize: 11, color: '#8a8680' }}>
                {weightUnit.toUpperCase()}
              </span>
            </div>
          </Row>
          <Row label="Goal Weight">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={goalWeight}
                onChange={e => handleGoalWeight(e.target.value)}
                placeholder="000.0"
                style={inputStyle}
              />
              <span className="font-mono" style={{ fontSize: 11, color: '#8a8680' }}>
                {weightUnit.toUpperCase()}
              </span>
            </div>
          </Row>
          <Row label="Weight Unit" last>
            <div className="flex gap-2">
              {(['lbs', 'kg'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => handleWeightUnit(u)}
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    padding: '5px 12px',
                    background: weightUnit === u ? 'rgba(201,65,11,0.2)' : 'transparent',
                    border: `1px solid ${weightUnit === u ? '#c9410b' : '#2e2d2a'}`,
                    color: weightUnit === u ? '#c9410b' : '#5a5852',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="NOTIFICATIONS">
          <Row label="Enable Notifications">
            <Toggle enabled={notifEnabled} onToggle={handleNotif} />
          </Row>
          <Row label="Weight Prompt Time" last>
            <input
              type="time"
              value={weightTime}
              onChange={e => handleWeightTime(e.target.value)}
              style={timeInputStyle}
            />
          </Row>
        </Section>

        {/* Calendar */}
        <Section title="CALENDAR">
          <Row label="Google Calendar" last>
            <button
              onClick={handleCalConnect}
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                padding: '8px 14px',
                background: calConnected ? 'rgba(107,138,138,0.15)' : 'transparent',
                border: `1px solid ${calConnected ? '#6b8a8a' : '#2e2d2a'}`,
                color: calConnected ? '#6b8a8a' : '#8a8680',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {calConnected ? 'CONNECTED' : 'CONNECT'}
            </button>
          </Row>
        </Section>

        {/* Workout times */}
        <Section title="WORKOUT TIMES">
          {DAYS.map((day, i) => (
            <Row key={day} label={DAY_ABBR[day]} last={i === DAYS.length - 1}>
              <input
                type="time"
                value={workoutTimes[day] ?? '06:30'}
                onChange={e => handleWorkoutTime(day, e.target.value)}
                style={timeInputStyle}
              />
            </Row>
          ))}
        </Section>

        {/* About */}
        <Section title="ABOUT">
          <Row label="Program">
            <span className="font-mono" style={{ fontSize: 11, color: '#5a5852', letterSpacing: '0.1em' }}>
              FORGE40
            </span>
          </Row>
          <Row label="Duration">
            <span className="font-mono" style={{ fontSize: 11, color: '#5a5852' }}>
              12 WEEKS
            </span>
          </Row>
          <Row label="Version" last>
            <span className="font-mono" style={{ fontSize: 11, color: '#5a5852' }}>
              1.0.0
            </span>
          </Row>
        </Section>

        {/* Program info */}
        <div
          style={{
            margin: '0 20px 28px',
            padding: '16px',
            background: 'rgba(28,27,25,0.3)',
            border: '1px solid #1c1b19',
          }}
        >
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.2em', color: '#5a5852', lineHeight: 1.8 }}
          >
            KB STRENGTH + RUNNING · INTERMEDIATE<br />
            5 TRAINING DAYS · 20-45 MIN PER SESSION<br />
            GOAL: FAT LOSS + MUSCLE GAIN
          </div>
        </div>

      </div>
    </ScreenShell>
  )
}
