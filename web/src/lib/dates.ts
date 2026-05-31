export function toDateInput(date: Date): string {
  // Use local date parts, not toISOString() — toISOString() converts to UTC first,
  // which shifts the date back by 1 day for users in positive UTC offset timezones near midnight.
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function upcomingWeekend(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay() // 0 Sun, 6 Sat
  const daysUntilFri = day <= 5 ? 5 - day : 6  // next Friday
  const fri = new Date(now)
  fri.setDate(now.getDate() + daysUntilFri)
  const sun = new Date(fri)
  sun.setDate(fri.getDate() + 2)
  return { from: toDateInput(fri), to: toDateInput(sun) }
}

// Format a YYYY-MM-DD date string as "Thursday 4 Jun" for date group headers.
// Uses local noon to avoid DST edge-case shifts.
export function formatGroupDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
}
