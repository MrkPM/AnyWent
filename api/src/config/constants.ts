// Affinity weights for the co-occurrence model (v2)
export const AFFINITY_WEIGHTS = {
  headliner: 0.4,
  support: 0.15,
  sameBill: 0.05,
} as const

// Events not verified within these thresholds are flagged as stale
export const STALE_THRESHOLDS_DAYS = {
  club_night: 7,
  concert: 7,
  exhibition: 30,
  festival: 14,
  opening: 30,
  other: 14,
} as const
