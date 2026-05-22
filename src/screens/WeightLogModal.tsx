import { useState } from 'react'
import { saveWeightLog } from '../lib/storage'
import type { WeightLog } from '../lib/types'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function WeightLogModal({ onClose, onSaved }: Props) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const displayDate = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  async function handleSave() {
    const num = parseFloat(value)
    if (!num || num < 50 || num > 500) return
    setSaving(true)
    const log: WeightLog = {
      id: `wl-${Date.now()}`,
      date: dateStr,
      weight: num,
      loggedAt: Date.now(),
    }
    await saveWeightLog(log)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full"
        style={{
          background: 'linear-gradient(180deg, #1c1b19 0%, #0a0a0b 100%)',
          border: '1px solid #2e2d2a',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          padding: '32px 24px 48px',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-6">
          <div style={{ width: 40, height: 4, background: '#2e2d2a', borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="font-mono text-xs tracking-widest mb-2"
            style={{ color: '#8a8680', letterSpacing: '0.3em' }}
          >
            LOG WEIGHT
          </div>
          <div
            className="font-display font-bold text-lg tracking-wide"
            style={{ color: '#e8e2d5', letterSpacing: '0.08em' }}
          >
            {displayDate.toUpperCase()}
          </div>
        </div>

        {/* Input */}
        <div className="flex items-end justify-center gap-3 mb-10">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="000.0"
            autoFocus
            className="font-mono font-bold text-right bg-transparent outline-none"
            style={{
              fontSize: 56,
              color: '#e8e2d5',
              width: 180,
              borderBottom: '2px solid #2e2d2a',
              paddingBottom: 4,
              letterSpacing: '0.02em',
            }}
          />
          <div
            className="font-mono font-bold pb-3"
            style={{ color: '#8a8680', fontSize: 18, letterSpacing: '0.15em' }}
          >
            LBS
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!value || saving}
          className="w-full font-display font-bold tracking-widest"
          style={{
            background: value ? '#8b0000' : '#1c1b19',
            color: value ? '#e8e2d5' : '#5a5852',
            border: '1px solid',
            borderColor: value ? '#8b0000' : '#2e2d2a',
            padding: '18px 0',
            fontSize: 14,
            letterSpacing: '0.4em',
            transition: 'all 0.2s',
            cursor: value ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'SAVING...' : 'SAVE'}
        </button>

        <button
          onClick={onClose}
          className="w-full font-mono text-xs mt-4"
          style={{ color: '#5a5852', letterSpacing: '0.2em', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}
