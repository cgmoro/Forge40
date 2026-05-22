import { useApp, type Tab } from '../lib/AppContext'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home',
    label: 'HOME',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 11L12 3L21 11V21H3Z" />
      </svg>
    ),
  },
  {
    id: 'program',
    label: 'PROGRAM',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="4" y="4" width="16" height="16" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    id: 'trophies',
    label: 'TROPHIES',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="11" r="6" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="8" y1="21" x2="16" y2="21" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'STATS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="4" y1="20" x2="4" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="20" y1="20" x2="20" y2="14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12L21 12M3 12L5 12M12 19L12 21M12 3L12 5M16.5 7.5L18 6M6 18L7.5 16.5M16.5 16.5L18 18M6 6L7.5 7.5" />
      </svg>
    ),
  },
]

export default function TabBar() {
  const { activeTab, setActiveTab } = useApp()

  return (
    <div
      className="absolute bottom-0 left-0 right-0 safe-bottom z-50 flex justify-around items-center"
      style={{
        height: 70,
        background: 'linear-gradient(180deg, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0.98) 100%)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #1c1b19',
        paddingBottom: 8,
      }}
    >
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className="flex flex-col items-center gap-1 transition-colors duration-150"
          style={{ color: activeTab === t.id ? '#c9410b' : '#5a5852' }}
        >
          {t.icon}
          <span className="font-mono text-[8px] tracking-widest">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
