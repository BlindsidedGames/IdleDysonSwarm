export const AVOCATO_MEDITATION_ROUTE_STEPS = Object.freeze({
  quantum: 0,
  infinity: 1,
  bots: 2,
  skills: 3,
  settings: 4,
  research: 5,
  side: 6,
} as const)

export type AvocatoMeditationPlacement =
  keyof typeof AVOCATO_MEDITATION_ROUTE_STEPS
