export interface EventWindow {
  id:             string
  city: {
    id:      string
    name:    string
    slug:    string
    country: { code: string; name: string }
  }
  startDate:      string   // ISO date YYYY-MM-DD
  endDate:        string   // ISO date YYYY-MM-DD
  eventCount:     number
  affinityScore:  number   // baseline if unauthenticated; personalised if signed in
  densityProfile: number[] // 12 values 0–100, one per 8-hour slot across the window
  daysUntil:      number   // computed: startDate − today
}

export interface WindowsResponse {
  windows: EventWindow[]
}
