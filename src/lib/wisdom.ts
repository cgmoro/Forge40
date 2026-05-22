// Deterministic quote selection by day — same day, same quote, every reload.

import wisdom from '../data/wisdom.json'

export interface WisdomEntry {
  id: string
  quote: string
  author: string
  source: string
  link: string
  theme: string
}

const quotes = wisdom as WisdomEntry[]

// Returns the same quote for a given calendar date
export function getQuoteOfDay(date: Date = new Date()): WisdomEntry {
  const dayOfYear = getDayOfYear(date)
  const idx = dayOfYear % quotes.length
  return quotes[idx]
}

// Returns a different quote for pre-workout (offset by half the list)
export function getPreWorkoutQuote(date: Date = new Date()): WisdomEntry {
  const dayOfYear = getDayOfYear(date)
  const idx = (dayOfYear + Math.floor(quotes.length / 2)) % quotes.length
  return quotes[idx]
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}
