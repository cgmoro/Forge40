import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getPrefs, setPrefs, getRewardState } from './storage'
import type { UserPrefs, RewardState } from './types'

interface AppState {
  prefs: UserPrefs | null
  rewards: RewardState | null
  loading: boolean
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  refreshPrefs: () => Promise<void>
  refreshRewards: () => Promise<void>
  updatePrefs: (p: Partial<UserPrefs>) => Promise<void>
}

export type Tab = 'home' | 'program' | 'trophies' | 'stats' | 'settings'

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setLocalPrefs] = useState<UserPrefs | null>(null)
  const [rewards, setLocalRewards] = useState<RewardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('home')

  const refreshPrefs = useCallback(async () => {
    const p = await getPrefs()
    setLocalPrefs(p)
  }, [])

  const refreshRewards = useCallback(async () => {
    const r = await getRewardState()
    setLocalRewards(r)
  }, [])

  const updatePrefs = useCallback(async (updates: Partial<UserPrefs>) => {
    const next = await setPrefs(updates)
    setLocalPrefs(next)
  }, [])

  useEffect(() => {
    Promise.all([refreshPrefs(), refreshRewards()]).finally(() => setLoading(false))
  }, [refreshPrefs, refreshRewards])

  return (
    <AppContext.Provider
      value={{ prefs, rewards, loading, activeTab, setActiveTab, refreshPrefs, refreshRewards, updatePrefs }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
