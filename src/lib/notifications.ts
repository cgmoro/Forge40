// Web Push / Notification utilities

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showLocalNotification(title: string, body: string): void {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    silent: false,
  })
}

export function scheduleWeightPrompt(timeStr: string): void {
  // In a real service worker this would register a periodic sync.
  // For v1, we schedule via setTimeout based on today's target time.
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const ms = target.getTime() - now.getTime()
  setTimeout(() => {
    showLocalNotification('Forge40', 'Step on the scale. Log today\'s weight.')
  }, ms)
}
