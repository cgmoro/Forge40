import { useState } from 'react'
import { AppProvider, useApp } from './lib/AppContext'
import OnboardingScreen from './screens/OnboardingScreen'
import HomeScreen from './screens/HomeScreen'
import TrophyHallScreen from './screens/TrophyHallScreen'
import StatsScreen from './screens/StatsScreen'
import ProgramScreen from './screens/ProgramScreen'
import SettingsScreen from './screens/SettingsScreen'
import WeightLogModal from './screens/WeightLogModal'
import WorkoutPlayerScreen from './screens/WorkoutPlayerScreen'
import GodLevelScreen from './screens/GodLevelScreen'

type ActiveModal =
  | null
  | { type: 'workout'; workoutId: string }
  | { type: 'godlevel' }
  | { type: 'weight' }

function AppShell() {
  const { prefs, loading, activeTab, refreshPrefs, refreshRewards } = useApp()
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="font-display font-bold"
          style={{ fontSize: 12, letterSpacing: '0.4em', color: '#5a5852' }}
        >
          FORGE<span style={{ color: '#8b0000' }}>40</span>
        </div>
      </div>
    )
  }

  if (!prefs?.onboardingComplete) {
    return <OnboardingScreen />
  }

  function renderScreen() {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onBeginWorkout={(workoutId) => setActiveModal({ type: 'workout', workoutId })}
            onGodLevel={() => setActiveModal({ type: 'godlevel' })}
            onLogWeight={() => setActiveModal({ type: 'weight' })}
          />
        )
      case 'trophies':
        return <TrophyHallScreen />
      case 'stats':
        return <StatsScreen />
      case 'program':
        return <ProgramScreen />
      case 'settings':
        return <SettingsScreen />
      default:
        return (
          <HomeScreen
            onBeginWorkout={(workoutId) => setActiveModal({ type: 'workout', workoutId })}
            onGodLevel={() => setActiveModal({ type: 'godlevel' })}
            onLogWeight={() => setActiveModal({ type: 'weight' })}
          />
        )
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {renderScreen()}

      {/* Workout overlay */}
      {activeModal?.type === 'workout' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <WorkoutPlayerScreen
            workoutId={activeModal.workoutId}
            onClose={() => setActiveModal(null)}
            onComplete={async () => {
              await refreshRewards()
              setActiveModal(null)
            }}
          />
        </div>
      )}

      {/* God-level overlay */}
      {activeModal?.type === 'godlevel' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
          <GodLevelScreen
            onClose={() => setActiveModal(null)}
            onComplete={async () => {
              await refreshRewards()
              setActiveModal(null)
            }}
          />
        </div>
      )}

      {/* Weight log modal */}
      {activeModal?.type === 'weight' && (
        <WeightLogModal
          onClose={() => setActiveModal(null)}
          onSaved={async () => {
            await refreshPrefs()
            await refreshRewards()
            setActiveModal(null)
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
