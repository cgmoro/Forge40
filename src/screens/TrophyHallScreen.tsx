import React, { useState, useEffect, useCallback } from 'react'
import ScreenShell from '../components/ScreenShell'
import { getRewardState, getRewardEvents } from '../lib/storage'
import { getRankName, isTitanTouched, getProgressToNext, godLevelMsRemaining, isGodLevelAvailable } from '../lib/rewards'
import type { RewardState, RewardEvent } from '../lib/types'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'TODAY'
  if (diffDays === 1) return 'YESTERDAY'
  if (diffDays < 7) return `${diffDays} DAYS AGO`
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  if (days > 0) return `${days}D`
  return `${hours}H`
}

const CrownIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M8 24 L14 44 L50 44 L56 24 L46 32 L40 14 L32 28 L24 14 L18 32 Z" />
    <line x1="14" y1="48" x2="50" y2="48" />
    <line x1="16" y1="52" x2="48" y2="52" />
    <circle cx="32" cy="20" r="2" fill={color} />
    <circle cx="20" cy="26" r="1.5" fill={color} />
    <circle cx="44" cy="26" r="1.5" fill={color} />
  </svg>
)

const SwordIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M32 6 L36 40 L32 46 L28 40 Z" stroke={color} fill={`${color}33`} />
    <line x1="32" y1="6" x2="32" y2="46" stroke={color} />
    <line x1="22" y1="42" x2="42" y2="42" stroke="#8b6f3f" strokeWidth="3" />
    <rect x="29" y="46" width="6" height="10" rx="0.5" fill="rgba(139,111,63,0.4)" stroke="#8b6f3f" />
    <circle cx="32" cy="58" r="2" fill="rgba(201,162,75,0.6)" />
  </svg>
)

const SpearIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <path d="M32 4 L36 18 L32 22 L28 18 Z" fill={`${color}4d`} />
    <line x1="32" y1="22" x2="32" y2="56" />
    <line x1="29" y1="56" x2="35" y2="56" strokeWidth="3" />
    <line x1="28" y1="28" x2="36" y2="28" strokeWidth="1.5" opacity="0.6" />
    <line x1="28" y1="44" x2="36" y2="44" strokeWidth="1.5" opacity="0.6" />
  </svg>
)

const ShieldIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
    <circle cx="32" cy="32" r="24" fill={`${color}33`} />
    <circle cx="32" cy="32" r="20" strokeWidth="1.5" opacity="0.6" />
    <circle cx="32" cy="32" r="6" fill={`${color}66`} />
    <path d="M32 14 L34 26 L46 28 L36 36 L40 48 L32 42 L24 48 L28 36 L18 28 L30 26 Z" strokeWidth="1" opacity="0.5" />
  </svg>
)

const TitanStarIcon = ({ filled, date }: { filled: boolean; date?: string }) => (
  <div
    style={{
      aspectRatio: '1',
      background: filled
        ? 'linear-gradient(135deg, rgba(139,0,0,0.6) 0%, rgba(60,0,0,0.95) 100%)'
        : 'linear-gradient(135deg, rgba(60,20,8,0.6) 0%, rgba(30,10,4,0.9) 100%)',
      border: `1px solid ${filled ? '#c9410b' : 'rgba(201,65,11,0.3)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      ...(filled ? {
        boxShadow: 'inset 0 0 12px rgba(201,65,11,0.3), 0 0 8px rgba(201,65,11,0.2)',
      } : {}),
    }}
  >
    {filled && (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,200,100,0.15) 0%, transparent 60%)',
        }}
      />
    )}
    <svg
      viewBox="0 0 32 32"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.5"
      style={{
        width: '60%',
        height: '60%',
        color: filled ? '#c9410b' : 'rgba(90,88,82,0.4)',
        filter: filled ? 'drop-shadow(0 0 4px rgba(201,65,11,0.5))' : 'none',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <path d="M16 2 L18 12 L28 12 L20 18 L23 28 L16 22 L9 28 L12 18 L4 12 L14 12 Z" />
    </svg>
    {filled && date && (
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7,
          color: 'rgba(232,226,213,0.6)',
          letterSpacing: '0.1em',
        }}
      >
        {date}
      </div>
    )}
  </div>
)

interface TierCardProps {
  tier: 'crown' | 'sword' | 'spear' | 'shield'
  count: number
  progressLabel?: string
  isCurrent: boolean
}

function TierCard({ tier, count, progressLabel, isCurrent }: TierCardProps) {
  const earned = count > 0
  const tierDefs = {
    crown: {
      name: 'CROWN',
      meta: '4 SWORDS · LAUREL',
      label: 'CROWNS',
      maxWidth: 250,
      color: earned ? '#c9a24b' : '#5a5852',
      iconColor: earned ? '#c9a24b' : '#5a5852',
    },
    sword: {
      name: 'SWORD',
      meta: '5 SPEARS · XIPHOS',
      label: 'SWORDS',
      maxWidth: 290,
      color: '#b8b8b8',
      iconColor: '#b8b8b8',
    },
    spear: {
      name: 'SPEAR',
      meta: '10 SHIELDS · IRON DORY',
      label: 'SPEARS',
      maxWidth: 330,
      color: '#8b6f3f',
      iconColor: '#8b6f3f',
    },
    shield: {
      name: 'SHIELD',
      meta: '1 PER WORKOUT · ASPIS',
      label: 'SHIELDS',
      maxWidth: 370,
      color: '#8b6f3f',
      iconColor: '#8b6f3f',
    },
  }

  const def = tierDefs[tier]
  const recentDots = Math.min(count, 10)
  const overflow = count > 10 ? count - 10 : 0

  const cardStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    transition: 'all 0.3s',
    cursor: earned ? 'pointer' : 'default',
    opacity: earned ? 1 : 0.35,
    ...(tier === 'crown' && earned ? {
      background: 'linear-gradient(180deg, rgba(50,35,18,0.7) 0%, rgba(30,20,8,0.95) 100%)',
      border: '1px solid rgba(201,162,75,0.5)',
      boxShadow: '0 0 30px rgba(201,162,75,0.15)',
    } : {
      background: 'linear-gradient(180deg, rgba(28,27,25,0.7) 0%, rgba(20,17,15,0.9) 100%)',
      border: '1px solid #2e2d2a',
    }),
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: def.maxWidth }}>
        {/* Gold top line for crown earned */}
        {tier === 'crown' && earned && (
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #c9a24b, transparent)', marginBottom: -1 }} />
        )}
        <div style={cardStyle}>
          <div style={{ width: 52, height: 52, flexShrink: 0, filter: earned ? 'none' : 'grayscale(1)' }}>
            {tier === 'crown' && <CrownIcon color={def.iconColor} />}
            {tier === 'sword' && <SwordIcon color={def.iconColor} />}
            {tier === 'spear' && <SpearIcon color={def.iconColor} />}
            {tier === 'shield' && <ShieldIcon color={def.iconColor} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="font-display font-bold"
              style={{
                fontSize: 14,
                letterSpacing: '0.18em',
                color: tier === 'crown' && earned ? '#c9a24b' : earned ? '#e8e2d5' : '#5a5852',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {def.name}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 9, letterSpacing: '0.15em', color: '#8a8680', marginBottom: 8 }}
            >
              {def.meta}
            </div>
            {progressLabel && (
              <div
                className="font-mono"
                style={{
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  color: isCurrent ? '#c9410b' : earned ? '#8b6f3f' : '#5a5852',
                }}
              >
                {progressLabel}
              </div>
            )}

            {earned && count > 0 && (
              <div className="flex items-center flex-wrap mt-2" style={{ gap: 4 }}>
                {Array.from({ length: recentDots }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: tier === 'crown' ? '#c9a24b' : '#8b6f3f',
                      boxShadow: tier === 'crown'
                        ? '0 0 8px rgba(201,162,75,0.5)'
                        : '0 0 6px rgba(139,111,63,0.4)',
                    }}
                  />
                ))}
                {overflow > 0 && (
                  <span
                    className="font-mono"
                    style={{ fontSize: 9, letterSpacing: '0.1em', color: '#8a8680', marginLeft: 4 }}
                  >
                    +{overflow}
                  </span>
                )}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
            <div
              className="font-mono font-extrabold"
              style={{
                fontSize: 28,
                color: tier === 'crown' && earned ? '#c9a24b' : earned ? '#e8e2d5' : '#5a5852',
                lineHeight: 1,
              }}
            >
              {count}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 8, letterSpacing: '0.15em', color: '#8a8680', marginTop: 4 }}
            >
              {def.label}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TrophyHallScreen() {
  const [rewards, setRewards] = useState<RewardState | null>(null)
  const [events, setEvents] = useState<RewardEvent[]>([])
  const [godLevelMs, setGodLevelMs] = useState(0)
  const [godAvail, setGodAvail] = useState(false)

  const load = useCallback(async () => {
    const r = await getRewardState()
    setRewards(r)
    const ev = await getRewardEvents(10)
    setEvents(ev)
    const avail = await isGodLevelAvailable()
    setGodAvail(avail)
    if (!avail) {
      const ms = await godLevelMsRemaining()
      setGodLevelMs(ms)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (!rewards) {
    return (
      <ScreenShell>
        <div className="flex items-center justify-center h-full">
          <div className="font-mono text-xs" style={{ color: '#5a5852', letterSpacing: '0.3em' }}>
            LOADING...
          </div>
        </div>
      </ScreenShell>
    )
  }

  const rank = getRankName(rewards)
  const titanTouched = isTitanTouched(rewards)
  const progress = getProgressToNext(rewards)
  const progressPct = progress.needed > 0 ? Math.round((progress.current / progress.needed) * 100) : 100

  // Build tier progress labels
  const shieldProgress = (() => {
    const toNextSpear = 10 - (rewards.shields % 10)
    if (rewards.shields === 0) return '0 EARNED'
    return `${rewards.shields} EARNED · ${toNextSpear} TO NEXT SPEAR`
  })()

  const spearProgress = (() => {
    if (rewards.spears === 0) return '0 OF 5 EARNED'
    const toNextSword = 5 - (rewards.spears % 5)
    return `${rewards.spears} EARNED · ${toNextSword} TO NEXT SWORD`
  })()

  const swordProgress = (() => {
    if (rewards.swords === 0) return '0 OF 4 EARNED'
    const toNextCrown = 4 - (rewards.swords % 4)
    return `${rewards.swords} EARNED · ${toNextCrown} TO NEXT CROWN`
  })()

  const crownProgress = (() => {
    if (rewards.crowns === 0) return '0 OF 4 EARNED'
    return `${rewards.crowns} EARNED`
  })()

  // Titan dates from events
  const titanEvents = events.filter(e => e.type === 'titan')
  const titanDates = titanEvents.map(e => {
    const d = new Date(e.earnedAt)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  })

  // Determine active tier
  const activeTier = rewards.crowns > 0 ? 'crown'
    : rewards.swords > 0 ? 'sword'
    : rewards.spears > 0 ? 'spear'
    : 'shield'

  return (
    <ScreenShell>
      <div className="scroll-container h-full" style={{ paddingBottom: 80 }}>

        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            padding: '60px 24px 16px',
            background: 'linear-gradient(180deg, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.85) 80%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ width: 22 }} />
          <div
            className="font-display font-bold"
            style={{ fontSize: 12, letterSpacing: '0.4em', color: '#8a8680' }}
          >
            TROPHY HALL
          </div>
          <div style={{ width: 22 }} />
        </div>

        {/* Rank banner */}
        <div
          style={{
            textAlign: 'center',
            padding: '28px 24px 36px',
            position: 'relative',
            borderBottom: '1px solid #1c1b19',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: -1,
              left: '30%',
              right: '30%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, #8b0000, transparent)',
            }}
          />
          <div
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: '0.4em', color: '#8a8680', marginBottom: 12 }}
          >
            CURRENT RANK
          </div>
          <div
            className="font-display font-extrabold"
            style={{ fontSize: 32, letterSpacing: '0.08em', color: '#e8e2d5', lineHeight: 1, marginBottom: 4 }}
          >
            {rank.toUpperCase()}
          </div>
          {titanTouched && (
            <div
              className="font-display"
              style={{
                fontStyle: 'italic',
                fontSize: 11,
                color: '#c9410b',
                letterSpacing: '0.15em',
                marginBottom: 14,
                textShadow: '0 0 12px rgba(201,65,11,0.4)',
              }}
            >
              — Titan-touched —
            </div>
          )}

          <div style={{ margin: '20px auto 0', maxWidth: 260 }}>
            <div
              className="flex justify-between font-mono"
              style={{ fontSize: 9, letterSpacing: '0.2em', color: '#8a8680', marginBottom: 8 }}
            >
              <span>{progress.label}</span>
              <span>{progress.current} / {progress.needed}</span>
            </div>
            <div style={{ height: 4, background: '#1c1b19', position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  right: `${100 - progressPct}%`,
                  background: 'linear-gradient(90deg, #8b6f3f, #c9410b)',
                  boxShadow: '0 0 8px rgba(201,65,11,0.5)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Altar / Pyramid */}
        <div
          style={{
            padding: '40px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
          }}
        >
          {/* Vertical spine */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              bottom: 20,
              left: '50%',
              width: 1,
              background: 'linear-gradient(180deg, transparent 0%, rgba(139,111,63,0.2) 20%, rgba(139,111,63,0.2) 80%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          <TierCard
            tier="crown"
            count={rewards.crowns}
            progressLabel={crownProgress}
            isCurrent={activeTier === 'crown'}
          />
          <TierCard
            tier="sword"
            count={rewards.swords}
            progressLabel={swordProgress}
            isCurrent={activeTier === 'sword'}
          />
          <TierCard
            tier="spear"
            count={rewards.spears}
            progressLabel={spearProgress}
            isCurrent={activeTier === 'spear'}
          />
          <TierCard
            tier="shield"
            count={rewards.shields}
            progressLabel={shieldProgress}
            isCurrent={activeTier === 'shield'}
          />
        </div>

        {/* Parallel track divider */}
        <div
          style={{
            width: '80%',
            textAlign: 'center',
            margin: '32px auto 16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, #2e2d2a, transparent)',
            }}
          />
          <span
            className="font-mono"
            style={{
              position: 'relative',
              background: '#0a0a0b',
              padding: '0 16px',
              fontSize: 9,
              letterSpacing: '0.4em',
              color: '#8a8680',
            }}
          >
            PARALLEL TRACK
          </span>
        </div>

        {/* Titan section */}
        <div style={{ padding: '20px 24px 0', marginTop: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              className="font-mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.4em',
                color: '#c9410b',
                marginBottom: 8,
                textShadow: '0 0 10px rgba(201,65,11,0.4)',
              }}
            >
              GOD-LEVEL CONQUERED
            </div>
            <div
              className="font-display font-extrabold"
              style={{ fontSize: 20, letterSpacing: '0.15em', color: '#e8e2d5', marginBottom: 6 }}
            >
              TITAN MARKS
            </div>
            <div
              className="font-display"
              style={{ fontStyle: 'italic', fontSize: 11, color: '#8a8680', letterSpacing: '0.03em' }}
            >
              — Forged in the white-hot fire —
            </div>
          </div>

          {/* 5-tile grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              padding: 16,
              background: 'linear-gradient(180deg, rgba(40,20,10,0.4) 0%, rgba(20,10,5,0.6) 100%)',
              border: '1px solid rgba(201,65,11,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -1,
                left: 0,
                right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent, #c9410b, transparent)',
              }}
            />
            {Array.from({ length: 5 }).map((_, i) => (
              <TitanStarIcon
                key={i}
                filled={i < rewards.titanMarks}
                date={titanDates[i]}
              />
            ))}
          </div>

          <div
            className="font-mono text-center"
            style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.2em', color: '#c9410b' }}
          >
            <strong style={{ fontSize: 14, fontWeight: 800, color: '#e8e2d5' }}>
              {rewards.titanMarks}
            </strong>{' '}
            TITAN MARKS{godAvail ? ' · GATE OPEN' : ` · NEXT GATE OPENS IN ${formatCountdown(godLevelMs)}`}
          </div>
        </div>

        {/* Recent forge feed */}
        <div style={{ padding: '32px 24px 20px' }}>
          <div
            className="font-display font-bold text-center"
            style={{ fontSize: 13, letterSpacing: '0.3em', color: '#8a8680', marginBottom: 16 }}
          >
            — RECENT FORGE —
          </div>

          <div
            style={{
              background: 'linear-gradient(180deg, rgba(28,27,25,0.5) 0%, rgba(20,17,15,0.7) 100%)',
              border: '1px solid #2e2d2a',
            }}
          >
            {events.length === 0 ? (
              <div
                style={{ padding: '24px 16px', textAlign: 'center' }}
              >
                <div
                  className="font-mono"
                  style={{ fontSize: 10, color: '#5a5852', letterSpacing: '0.2em' }}
                >
                  NO FORGE EVENTS YET. BEGIN.
                </div>
              </div>
            ) : (
              events.slice(0, 5).map((ev, i) => {
                const isTitan = ev.type === 'titan'
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      borderBottom: i < Math.min(events.length, 5) - 1 ? '1px solid #2e2d2a' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isTitan ? 'rgba(139,0,0,0.3)' : 'rgba(139,111,63,0.15)',
                        border: `1px solid ${isTitan ? 'rgba(201,65,11,0.5)' : 'rgba(139,111,63,0.3)'}`,
                      }}
                    >
                      {isTitan ? (
                        <svg
                          viewBox="0 0 32 32"
                          fill="currentColor"
                          style={{
                            width: '60%',
                            height: '60%',
                            color: '#c9410b',
                            filter: 'drop-shadow(0 0 3px rgba(201,65,11,0.6))',
                          }}
                        >
                          <path d="M16 2 L18 12 L28 12 L20 18 L23 28 L16 22 L9 28 L12 18 L4 12 L14 12 Z" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 32 32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: '60%', height: '60%', color: '#8b6f3f' }}
                        >
                          <circle cx="16" cy="16" r="12" fill="rgba(139,111,63,0.2)" />
                          <circle cx="16" cy="16" r="3" fill="currentColor" />
                        </svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#e8e2d5', lineHeight: 1.3 }}>
                        {isTitan ? (
                          <>
                            <strong
                              className="font-display font-bold"
                              style={{ color: '#c9410b', letterSpacing: '0.1em' }}
                            >
                              TITAN MARK
                            </strong>{' '}
                            earned. God-level conquered. +5 shields.
                          </>
                        ) : ev.type === 'spear' ? (
                          <>
                            <strong className="font-display font-bold" style={{ letterSpacing: '0.1em' }}>
                              SPEAR
                            </strong>{' '}
                            forged. 10 shields claimed.
                          </>
                        ) : ev.type === 'sword' ? (
                          <>
                            <strong className="font-display font-bold" style={{ letterSpacing: '0.1em' }}>
                              SWORD
                            </strong>{' '}
                            forged. 5 spears claimed.
                          </>
                        ) : ev.type === 'crown' ? (
                          <>
                            <strong className="font-display font-bold" style={{ letterSpacing: '0.1em' }}>
                              CROWN
                            </strong>{' '}
                            earned. The highest honor.
                          </>
                        ) : (
                          <>
                            <strong className="font-display font-bold" style={{ letterSpacing: '0.1em' }}>
                              +{ev.count} SHIELD{ev.count !== 1 ? 'S' : ''}
                            </strong>
                            {'. '}{ev.source}.
                          </>
                        )}
                      </div>
                      <div
                        className="font-mono"
                        style={{ fontSize: 9, letterSpacing: '0.1em', color: '#8a8680', marginTop: 2 }}
                      >
                        {formatDate(ev.earnedAt)}
                        {new Date(ev.earnedAt).toDateString() === new Date().toDateString() &&
                          ` · ${formatTime(ev.earnedAt)}`}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
