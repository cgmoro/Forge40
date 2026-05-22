// GodLevelScreen — 4-stage cinematic sequence, Variant A (Stone · Blood · Ember)
// Self-contained: all animations injected via <style> tag, no external libraries.

import React, { useState, useEffect, useRef } from 'react'
import { isGodLevelAvailable, godLevelMsRemaining, awardGodLevel } from '../lib/rewards'
import { getQuoteOfDay } from '../lib/wisdom'

interface Props {
  onClose: () => void
  onComplete: () => void
}

type Stage = 'locked' | 'warning' | 'confirm' | 'explosion'

// ─── Animation keyframes injected once ───────────────────────────────────────

const KEYFRAMES = `
  @keyframes pulseWarn {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes flicker {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.96); }
  }
  @keyframes flickerFast {
    0%, 100% { opacity: 1; }
    40% { opacity: 0.6; }
    60% { opacity: 0.85; }
  }
  @keyframes rise {
    0% { transform: translateY(800px) translateX(0); opacity: 0; }
    10% { opacity: 1; }
    100% { transform: translateY(-100px) translateX(var(--drift, 20px)); opacity: 0; }
  }
  @keyframes btnPulse {
    0%, 100% { box-shadow: 0 0 30px rgba(201,65,11,0.5), inset 0 1px 0 rgba(255,200,150,0.2); }
    50% { box-shadow: 0 0 50px rgba(201,65,11,0.8), inset 0 1px 0 rgba(255,200,150,0.3); }
  }
  @keyframes explode {
    0% { opacity: 0; transform: scale(0.2); }
    20% { opacity: 1; transform: scale(1); }
    100% { opacity: 0.15; transform: scale(2); }
  }
  @keyframes shock {
    0% { width: 20px; height: 20px; opacity: 1; border-width: 4px; }
    100% { width: 900px; height: 900px; opacity: 0; border-width: 1px; }
  }
  @keyframes blast {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--bx, 200px), var(--by, -200px)) scale(0); opacity: 0; }
  }
  @keyframes revealMsg {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }
`

// ─── Ember particle configs ───────────────────────────────────────────────────

const EMBER_PARTICLES = [
  { left: '10%', duration: '4s', delay: '0s', drift: '30px' },
  { left: '25%', duration: '5s', delay: '1s', drift: '-20px' },
  { left: '45%', duration: '4.5s', delay: '0.5s', drift: '15px' },
  { left: '65%', duration: '5.5s', delay: '1.5s', drift: '-40px' },
  { left: '80%', duration: '4s', delay: '2s', drift: '10px' },
  { left: '55%', duration: '6s', delay: '0.8s', drift: '25px' },
  { left: '35%', duration: '4.2s', delay: '2.5s', drift: '-15px' },
  { left: '90%', duration: '5.2s', delay: '1.2s', drift: '-30px' },
]

// ─── Explosion particle configs ───────────────────────────────────────────────

const BLAST_PARTICLES: Array<{ bx: string; by: string }> = [
  { bx: '180px', by: '-160px' },
  { bx: '-140px', by: '-180px' },
  { bx: '160px', by: '140px' },
  { bx: '-180px', by: '120px' },
  { bx: '220px', by: '0px' },
  { bx: '-200px', by: '30px' },
  { bx: '60px', by: '-240px' },
  { bx: '-80px', by: '220px' },
  { bx: '240px', by: '-80px' },
  { bx: '-240px', by: '-60px' },
  { bx: '100px', by: '240px' },
  { bx: '-120px', by: '-220px' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function GodLevelScreen({ onClose, onComplete }: Props) {
  const [stage, setStage] = useState<Stage | null>(null) // null while loading
  const [msRemaining, setMsRemaining] = useState(0)
  const [quote, setQuote] = useState('')
  const [explosionKey, setExplosionKey] = useState(0) // force re-mount on stage 4
  const completedRef = useRef(false)

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const available = await isGodLevelAvailable()
      if (available) {
        setStage('warning')
      } else {
        const ms = await godLevelMsRemaining()
        setMsRemaining(ms)
        const q = getQuoteOfDay()
        setQuote(`"${q.quote}" — ${q.author}`)
        setStage('locked')
      }
    }
    init()
  }, [])

  // ─── Stage 4: countdown then complete ─────────────────────────────────────

  useEffect(() => {
    if (stage !== 'explosion') return
    // After 4s total, award and complete
    const t = setTimeout(async () => {
      if (completedRef.current) return
      completedRef.current = true
      try {
        await awardGodLevel()
      } catch (e) {
        console.error(e)
      }
      onComplete()
    }, 4000)
    return () => clearTimeout(t)
  }, [stage, onComplete])

  // ─── Shared overlay style ─────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 2000,
    fontFamily: "'Manrope', sans-serif",
    color: '#e8e2d5',
    overflowY: 'auto',
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (stage === null) {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          ...overlayStyle,
          background: '#0a0a0b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.3em', color: '#5a5852',
          }}>LOADING</span>
        </div>
      </>
    )
  }

  // ─── Stage 1: Locked ─────────────────────────────────────────────────────

  if (stage === 'locked') {
    const totalSec = Math.floor(msRemaining / 1000)
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)

    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          ...overlayStyle,
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(139,0,0,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(201,65,11,0.15) 0%, transparent 70%),
            linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)
          `,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            padding: '70px 32px 40px',
            minHeight: '100vh',
          }}>
            {/* Topbar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 60,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.2em', color: '#5a5852',
            }}>
              <button
                onClick={onClose}
                style={{
                  color: '#8a8680', fontSize: 18, background: 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >←</button>
              <span>UNAVAILABLE</span>
            </div>

            {/* Title block */}
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.4em',
                color: '#8b0000', marginBottom: 14,
              }}>SEALED</div>

              {/* Lock icon */}
              <div style={{ width: 64, height: 64, margin: '0 auto 20px', opacity: 0.85 }}>
                <svg viewBox="0 0 64 64" fill="none" stroke="#8b0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
                  <rect x="14" y="28" width="36" height="28" rx="2" />
                  <path d="M22 28 V20 a10 10 0 0 1 20 0 V28" />
                  <circle cx="32" cy="40" r="3" fill="#8b0000" />
                  <line x1="32" y1="43" x2="32" y2="48" />
                </svg>
              </div>

              <div style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 800, fontSize: 38,
                letterSpacing: '0.08em', lineHeight: 1.05,
                color: '#e8e2d5', marginBottom: 8,
              }}>GOD-LEVEL</div>
              <div style={{
                fontSize: 13, color: '#8a8680',
                letterSpacing: '0.04em', maxWidth: 280,
                margin: '0 auto', lineHeight: 1.5,
              }}>The gates open once every seven days.<br />Recovery is the work.</div>
            </div>

            {/* Countdown card */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(28,27,25,0.6) 0%, rgba(20,17,15,0.9) 100%)',
              border: '1px solid #2e2d2a',
              borderTop: '1px solid rgba(139,0,0,0.3)',
              padding: '28px 24px',
              marginTop: 'auto',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -1, left: '20%', right: '20%', height: 1,
                background: 'linear-gradient(90deg, transparent, #8b0000, transparent)',
              }} />
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, letterSpacing: '0.3em',
                color: '#8a8680', marginBottom: 14, textAlign: 'center',
              }}>GATES OPEN IN</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                {[
                  { num: days, unit: 'DAYS' },
                  { num: hours, unit: 'HOURS' },
                  { num: mins, unit: 'MIN' },
                ].map(({ num, unit }) => (
                  <div key={unit}>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 34, fontWeight: 800,
                      color: '#c9410b', lineHeight: 1,
                    }}>{num}</div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9, letterSpacing: '0.25em',
                      color: '#5a5852', marginTop: 8,
                    }}>{unit}</div>
                  </div>
                ))}
              </div>
              {quote && (
                <div style={{
                  textAlign: 'center',
                  fontFamily: "'Cinzel', serif",
                  fontStyle: 'italic', fontSize: 12,
                  color: '#5a5852', marginTop: 24, letterSpacing: '0.03em',
                }}>{quote}</div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── Stage 2: Warning ─────────────────────────────────────────────────────

  if (stage === 'warning') {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          ...overlayStyle,
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(139,0,0,0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(201,65,11,0.15) 0%, transparent 70%),
            linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)
          `,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            padding: '80px 32px 40px',
            minHeight: '100vh',
            position: 'relative',
          }}>
            {/* Pulsing red overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.4) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 100%, rgba(201,65,11,0.3) 0%, transparent 60%)
              `,
              animation: 'pulseWarn 3s ease-in-out infinite',
            }} />

            {/* Warning triangle icon */}
            <div style={{
              width: 56, height: 56, margin: '0 auto 28px',
              color: '#c9410b',
              animation: 'flicker 2s ease-in-out infinite',
            }}>
              <svg viewBox="0 0 56 56" fill="none" stroke="#c9410b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
                <path d="M28 6 L52 50 L4 50 Z" />
                <line x1="28" y1="22" x2="28" y2="36" />
                <circle cx="28" cy="42" r="1.5" fill="#c9410b" />
              </svg>
            </div>

            <div style={{
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.5em',
              color: '#c9410b', marginBottom: 24,
              position: 'relative',
            }}>YOU ARE ABOUT TO ENTER</div>

            <div style={{
              textAlign: 'center',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900, fontSize: 44,
              letterSpacing: '0.06em', lineHeight: 0.95,
              marginBottom: 4,
              textShadow: '0 0 30px rgba(201,65,11,0.4)',
              position: 'relative',
            }}>GOD-LEVEL</div>
            <div style={{
              textAlign: 'center',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900, fontSize: 44,
              letterSpacing: '0.06em', lineHeight: 0.95,
              color: '#8b0000', marginBottom: 36,
              textShadow: '0 0 30px rgba(139,0,0,0.6)',
              position: 'relative',
            }}>MODE</div>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              borderTop: '1px solid #2e2d2a', borderBottom: '1px solid #2e2d2a',
              padding: '20px 0', marginBottom: 28,
              position: 'relative',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24, fontWeight: 800, color: '#e8e2d5',
                }}>45<span style={{ fontSize: 14 }}>MIN</span></div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.25em',
                  color: '#8a8680', marginTop: 6,
                }}>DURATION</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid #2e2d2a' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 24, fontWeight: 800, color: '#e8e2d5',
                }}>MAX</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.25em',
                  color: '#8a8680', marginTop: 6,
                }}>EFFORT</div>
              </div>
            </div>

            <div style={{
              fontSize: 13, lineHeight: 1.7,
              color: '#c8c2b5', textAlign: 'center',
              maxWidth: 290, margin: '0 auto 32px',
              fontStyle: 'italic',
              fontFamily: "'Cinzel', serif",
              position: 'relative',
            }}>
              This replaces today's workout. There is no pause, no scale-down, no half-rep escape.<br /><br />
              You earn five shields and a Titan mark, or you don't.
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              <button
                onClick={() => setStage('confirm')}
                style={{
                  background: '#8b0000', color: '#e8e2d5', border: 'none',
                  padding: 18,
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800, fontSize: 15,
                  letterSpacing: '0.3em', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#a30000'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(139,0,0,0.6)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#8b0000'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                }}
              >I UNDERSTAND</button>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', color: '#8a8680',
                  border: '1px solid #2e2d2a', padding: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.25em', cursor: 'pointer',
                }}
              >RETREAT</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── Stage 3: Confirm ─────────────────────────────────────────────────────

  if (stage === 'confirm') {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div style={{
          ...overlayStyle,
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(139,0,0,0.3) 0%, transparent 70%),
            linear-gradient(180deg, #0a0a0b 0%, #1a0808 100%)
          `,
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            padding: '90px 32px 40px',
            minHeight: '100vh',
            position: 'relative',
          }}>
            {/* Ember particles */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {EMBER_PARTICLES.map((p, i) => (
                <span key={i} style={{
                  position: 'absolute',
                  bottom: 0,
                  left: p.left,
                  width: 3, height: 3,
                  background: '#c9410b',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #c9410b, 0 0 12px #8b0000',
                  animationName: 'rise',
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  ['--drift' as string]: p.drift,
                }} />
              ))}
            </div>

            {/* Content */}
            <div style={{
              position: 'relative', zIndex: 2,
              textAlign: 'center',
              display: 'flex', flexDirection: 'column',
              minHeight: 'calc(100vh - 130px)',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.5em',
                color: '#c9410b', marginBottom: 16,
                animation: 'flickerFast 1.5s ease-in-out infinite',
              }}>NO RETREAT · NO RETURN</div>

              <div style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900, fontSize: 56,
                letterSpacing: '0.04em', lineHeight: 0.9,
                color: '#e8e2d5', marginBottom: 8,
                textShadow: '0 0 20px rgba(201,65,11,0.6), 0 0 40px rgba(139,0,0,0.4)',
              }}>FORGE<br />OR<br />FOLD</div>

              <div style={{
                fontFamily: "'Cinzel', serif",
                fontStyle: 'italic', fontSize: 14,
                color: '#c9410b', marginBottom: 40,
                letterSpacing: '0.05em',
              }}>— Last word before iron.</div>

              <div style={{ marginTop: 'auto', marginBottom: 32 }}>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 22, fontWeight: 600,
                  lineHeight: 1.3, color: '#e8e2d5',
                  marginBottom: 28, letterSpacing: '0.02em',
                }}>What kind of man walks out of this room?</div>

                <button
                  onClick={() => {
                    setExplosionKey(k => k + 1)
                    setStage('explosion')
                  }}
                  style={{
                    background: 'linear-gradient(180deg, #c9410b 0%, #8b0000 100%)',
                    color: '#fff',
                    border: '1px solid #c9410b',
                    padding: 22, width: '100%',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900, fontSize: 18,
                    letterSpacing: '0.4em', cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(201,65,11,0.5), inset 0 1px 0 rgba(255,200,150,0.2)',
                    animation: 'btnPulse 2s ease-in-out infinite',
                  }}
                >FORGE ME</button>

                <button
                  onClick={onClose}
                  style={{
                    background: 'none', border: 'none',
                    color: '#5a5852',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, letterSpacing: '0.3em',
                    marginTop: 18, cursor: 'pointer',
                    textTransform: 'uppercase',
                    display: 'block', width: '100%',
                  }}
                >NOT TODAY</button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── Stage 4: Explosion ───────────────────────────────────────────────────

  if (stage === 'explosion') {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <div key={explosionKey} style={{
          ...overlayStyle,
          background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          minHeight: '100vh',
        }}>
          {/* Central radial flash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255,220,180,0.9) 0%, rgba(201,65,11,0.6) 30%, transparent 70%)',
            animation: 'explode 2.5s ease-out forwards',
          }} />

          {/* Three shockwave rings */}
          {[
            { delay: '0s', color: '#c9410b' },
            { delay: '0.2s', color: '#8b0000' },
            { delay: '0.4s', color: '#ffaa44' },
          ].map((sw, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 20, height: 20,
              borderRadius: '50%',
              border: `2px solid ${sw.color}`,
              transform: 'translate(-50%, -50%)',
              animationName: 'shock',
              animationDuration: '2s',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'forwards',
              animationDelay: sw.delay,
            }} />
          ))}

          {/* 12 blast particles */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {BLAST_PARTICLES.map((p, i) => (
              <span key={i} style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: 6, height: 6,
                background: '#ffaa44',
                borderRadius: '50%',
                boxShadow: '0 0 8px #c9410b',
                animationName: 'blast',
                animationDuration: '1.5s',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'forwards',
                ['--bx' as string]: p.bx,
                ['--by' as string]: p.by,
              }} />
            ))}
          </div>

          {/* FORGED stamp — fades in at 1.5s */}
          <div style={{
            position: 'relative', zIndex: 10,
            textAlign: 'center',
            opacity: 0,
            animation: 'revealMsg 1s ease-out 1.5s forwards',
          }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900, fontSize: 38,
              letterSpacing: '0.1em',
              color: '#ffaa44',
              textShadow: '0 0 30px #c9410b, 0 0 60px #8b0000',
              marginBottom: 12,
            }}>FORGED</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: '0.4em', color: '#c9410b',
            }}>BEGIN IN 3 · 2 · 1</div>
          </div>
        </div>
      </>
    )
  }

  return null
}
