// Full-screen container with optional tab bar and scrollable body

import type { ReactNode } from 'react'
import TabBar from './TabBar'

interface Props {
  children: ReactNode
  showTabs?: boolean
  className?: string
}

export default function ScreenShell({ children, showTabs = true, className = '' }: Props) {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a0b 0%, #14110f 100%)' }}>
      {/* Noise grain */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.015) 1px, transparent 1px),
            radial-gradient(circle at 60% 70%, rgba(255,255,255,0.01) 1px, transparent 1px)`,
          backgroundSize: '60px 60px, 80px 80px',
        }}
      />
      <div className={`relative z-[2] flex-1 overflow-hidden ${className}`}>
        {children}
      </div>
      {showTabs && <TabBar />}
    </div>
  )
}
