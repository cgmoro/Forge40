// Weekly coaching rules engine — pure function, no side effects.
// Extend rule combinations here without touching presentation code.

export interface WeekSummary {
  workoutsScheduled: number
  workoutsCompleted: number
  avgIntensity: number      // 1-10
  avgEnergyAfter: number    // 1-10
  avgEnergyBefore: number   // 1-10
  weightChange: number      // lbs (negative = loss)
  shieldsEarned: number
  streakDays: number
}

export interface CoachingNote {
  type: 'warning' | 'encourage' | 'affirm' | 'challenge'
  message: string
}

export function generateCoachingNote(summary: WeekSummary): CoachingNote {
  const {
    workoutsScheduled,
    workoutsCompleted,
    avgIntensity,
    avgEnergyAfter,
    avgEnergyBefore,
    weightChange,
    shieldsEarned,
    streakDays,
  } = summary

  const completionRate = workoutsScheduled > 0
    ? workoutsCompleted / workoutsScheduled
    : 0

  const energyDelta = avgEnergyAfter - avgEnergyBefore

  // Rule 1: High intensity + energy trending down → pull back
  if (avgIntensity >= 8 && energyDelta <= -1.5) {
    return {
      type: 'warning',
      message: 'Pull back ten percent next week. Your intensity is high and your energy after is trending down. Recovery is not optional — it is the work.',
    }
  }

  // Rule 2: Perfect week + low intensity → push harder
  if (completionRate === 1 && avgIntensity <= 6) {
    return {
      type: 'challenge',
      message: 'Every session done, but the dial is low. Step up the bells next week. You have more to give.',
    }
  }

  // Rule 3: Only 1-2 sessions completed
  if (workoutsCompleted <= 2) {
    return {
      type: 'warning',
      message: 'Discipline is the bridge between goals and accomplishment. Two sessions is a start, not a week. Re-anchor your time blocks.',
    }
  }

  // Rule 4: 3-4 sessions — soft miss
  if (workoutsCompleted >= 3 && workoutsCompleted < workoutsScheduled - 1) {
    return {
      type: 'encourage',
      message: 'Solid work, but there were gaps. One missed session is a slip. Two is a pattern. Close the gap next week.',
    }
  }

  // Rule 5: Perfect week + high intensity + good energy delta
  if (completionRate === 1 && avgIntensity >= 7 && energyDelta >= 0) {
    return {
      type: 'affirm',
      message: 'Every session completed. Intensity high. Energy up after the work. That is the arc. Next week, hold the line.',
    }
  }

  // Rule 6: Weight trending wrong way significantly
  if (weightChange > 1.5) {
    return {
      type: 'warning',
      message: 'Weight is moving the wrong direction. Check the plate, not just the bell. Sleep and nutrition are training.',
    }
  }

  // Rule 7: Weight trending well + good completion
  if (weightChange < -1 && completionRate >= 0.8) {
    return {
      type: 'affirm',
      message: 'The weight is moving and the work is getting done. Hold this pace. Do not accelerate just because it is working.',
    }
  }

  // Rule 8: Long streak
  if (streakDays >= 14) {
    return {
      type: 'affirm',
      message: `${streakDays} days without breaking the line. Consistency is the rarest form of discipline. Keep it.`,
    }
  }

  // Rule 9: Energy consistently low before AND after
  if (avgEnergyBefore <= 4 && avgEnergyAfter <= 4) {
    return {
      type: 'warning',
      message: 'Your energy is low before and after. Sleep debt and chronic stress break athletes. Address recovery before you address volume.',
    }
  }

  // Rule 10: Energy consistently high after
  if (energyDelta >= 2 && completionRate >= 0.8) {
    return {
      type: 'challenge',
      message: 'The work is leaving you with more energy than you started. That is the sign of undertrained. Push the load next week.',
    }
  }

  // Rule 11: Good week, nothing exceptional
  if (completionRate >= 0.8 && avgIntensity >= 6) {
    return {
      type: 'affirm',
      message: 'Solid week. No glory in it, just the work. Show up again next week.',
    }
  }

  // Default
  return {
    type: 'encourage',
    message: 'The week is logged. Whatever was unfinished — leave it there. This week is a clean slate. Begin.',
  }
}
