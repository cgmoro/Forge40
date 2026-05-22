import React, { useState } from 'react'
import { useApp } from '../lib/AppContext'

export default function OnboardingScreen() {
  const { updatePrefs } = useApp()
  const [step, setStep] = useState(1)
  const [startingWeight, setStartingWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [notifTime, setNotifTime] = useState('06:30')

  const canProceedStep2 = startingWeight.length > 0 && parseFloat(startingWeight) > 50

  async function handleComplete() {
    const sw = parseFloat(startingWeight)
    const gw = parseFloat(goalWeight)
    await updatePrefs({
      onboardingComplete: true,
      startingWeight: isNaN(sw) ? undefined : sw,
      goalWeight: isNaN(gw) ? undefined : gw,
      weightPromptTime: notifTime,
      programStartDate: new Date().toISOString().split('T')[0],
    })
  }

  async function handleEnableNotifications() {
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
    await updatePrefs({ notificationsEnabled: true })
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)',
    padding: '40px 32px',
    position: 'relative',
    overflow: 'hidden',
  }

  if (step === 1) {
    return (
      <div style={containerStyle}>
        {/* Background grain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(ellipse at 50% 10%, rgba(139,0,0,0.08) 0%, transparent 50%),
              radial-gradient(circle at 20% 30%, rgba(255,255,255,0.015) 1px, transparent 1px),
              radial-gradient(circle at 60% 70%, rgba(255,255,255,0.01) 1px, transparent 1px)
            `,
            backgroundSize: 'auto, 60px 60px, 80px 80px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 320 }}>
          {/* Brand */}
          <div
            className="font-display font-black"
            style={{
              fontSize: 48,
              letterSpacing: '0.2em',
              color: '#e8e2d5',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            FORGE<span style={{ color: '#8b0000' }}>40</span>
          </div>

          {/* Blood line */}
          <div
            style={{
              width: 80,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #8b0000, transparent)',
              margin: '16px auto 24px',
            }}
          />

          <div
            className="font-display font-bold"
            style={{
              fontSize: 18,
              letterSpacing: '0.08em',
              color: '#8a8680',
              lineHeight: 1.4,
              marginBottom: 48,
            }}
          >
            THIS IS 40,{' '}
            <span style={{ color: '#e8e2d5', fontStyle: 'italic' }}>FORGED.</span>
          </div>

          <div
            className="font-body"
            style={{
              fontSize: 15,
              color: '#5a5852',
              lineHeight: 1.7,
              marginBottom: 60,
              letterSpacing: '0.01em',
            }}
          >
            Twelve weeks. Kettlebells and road work. No excuses offered. None accepted.
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full font-display font-extrabold"
            style={{
              background: '#8b0000',
              color: '#e8e2d5',
              border: '1px solid #8b0000',
              padding: '18px 0',
              fontSize: 14,
              letterSpacing: '0.4em',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(139,0,0,0.3)',
              transition: 'all 0.2s',
            }}
          >
            BEGIN FORGE
          </button>

          <div
            className="font-mono"
            style={{
              fontSize: 9,
              color: '#3a3833',
              letterSpacing: '0.15em',
              marginTop: 16,
            }}
          >
            1 OF 3
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div style={containerStyle}>
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 360 }}>
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.4em', color: '#5a5852', marginBottom: 24, textAlign: 'center' }}
          >
            SETUP
          </div>

          <div
            className="font-display font-extrabold"
            style={{ fontSize: 28, letterSpacing: '0.08em', color: '#e8e2d5', marginBottom: 8, textAlign: 'center' }}
          >
            YOUR BASELINE
          </div>
          <div
            className="font-display"
            style={{ fontStyle: 'italic', fontSize: 14, color: '#5a5852', marginBottom: 40, textAlign: 'center' }}
          >
            Honest numbers only.
          </div>

          {/* Starting weight */}
          <div style={{ marginBottom: 24 }}>
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680', marginBottom: 10 }}
            >
              STARTING WEIGHT (LBS)
            </div>
            <div
              style={{
                background: '#1c1b19',
                border: `1px solid ${startingWeight ? '#8b6f3f' : '#2e2d2a'}`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'border-color 0.2s',
              }}
            >
              <input
                type="number"
                inputMode="decimal"
                value={startingWeight}
                onChange={e => setStartingWeight(e.target.value)}
                placeholder="000.0"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e8e2d5',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              />
              <span className="font-mono" style={{ fontSize: 13, color: '#8a8680' }}>LBS</span>
            </div>
          </div>

          {/* Goal weight */}
          <div style={{ marginBottom: 24 }}>
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680', marginBottom: 10 }}
            >
              GOAL WEIGHT (LBS) · OPTIONAL
            </div>
            <div
              style={{
                background: '#1c1b19',
                border: `1px solid ${goalWeight ? '#8b6f3f' : '#2e2d2a'}`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'border-color 0.2s',
              }}
            >
              <input
                type="number"
                inputMode="decimal"
                value={goalWeight}
                onChange={e => setGoalWeight(e.target.value)}
                placeholder="000.0"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e8e2d5',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              />
              <span className="font-mono" style={{ fontSize: 13, color: '#8a8680' }}>LBS</span>
            </div>
          </div>

          {/* Notification time */}
          <div style={{ marginBottom: 40 }}>
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.25em', color: '#8a8680', marginBottom: 10 }}
            >
              DAILY WEIGHT PROMPT TIME
            </div>
            <div
              style={{
                background: '#1c1b19',
                border: '1px solid #2e2d2a',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <input
                type="time"
                value={notifTime}
                onChange={e => setNotifTime(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#e8e2d5',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              />
              <button
                onClick={handleEnableNotifications}
                className="font-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #2e2d2a',
                  color: '#5a5852',
                  cursor: 'pointer',
                }}
              >
                ENABLE
              </button>
            </div>
          </div>

          <button
            onClick={() => canProceedStep2 && setStep(3)}
            disabled={!canProceedStep2}
            className="w-full font-display font-extrabold"
            style={{
              background: canProceedStep2 ? '#8b0000' : '#1c1b19',
              color: canProceedStep2 ? '#e8e2d5' : '#3a3833',
              border: `1px solid ${canProceedStep2 ? '#8b0000' : '#1c1b19'}`,
              padding: '18px 0',
              fontSize: 14,
              letterSpacing: '0.4em',
              cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            CONTINUE
          </button>

          <div
            className="font-mono text-center"
            style={{ fontSize: 9, color: '#3a3833', letterSpacing: '0.15em', marginTop: 16 }}
          >
            2 OF 3
          </div>
        </div>
      </div>
    )
  }

  // Step 3: First quote
  return (
    <div style={containerStyle}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(139,111,63,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: '0.4em', color: '#5a5852', marginBottom: 32 }}
        >
          — A WORD BEFORE —
        </div>

        <div
          className="font-display"
          style={{
            fontStyle: 'italic',
            fontSize: 20,
            lineHeight: 1.55,
            color: '#e8e2d5',
            letterSpacing: '0.01em',
            marginBottom: 24,
          }}
        >
          "Waste no more time arguing what a good man should be. Be one."
        </div>

        <div
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: '0.15em', color: '#8b6f3f', marginBottom: 60 }}
        >
          MARCUS AURELIUS · MEDITATIONS X
        </div>

        <div
          className="font-body"
          style={{ fontSize: 14, color: '#5a5852', lineHeight: 1.7, marginBottom: 48 }}
        >
          The work begins today. The calendar does not negotiate. Neither does the bell.
        </div>

        <button
          onClick={handleComplete}
          className="w-full font-display font-extrabold"
          style={{
            background: '#8b0000',
            color: '#e8e2d5',
            border: '1px solid #8b0000',
            padding: '18px 0',
            fontSize: 14,
            letterSpacing: '0.4em',
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(139,0,0,0.3)',
            transition: 'all 0.2s',
          }}
        >
          ENTER THE FORGE
        </button>

        <div
          className="font-mono"
          style={{ fontSize: 9, color: '#3a3833', letterSpacing: '0.15em', marginTop: 16 }}
        >
          3 OF 3
        </div>
      </div>
    </div>
  )
}
