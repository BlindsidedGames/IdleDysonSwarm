export const BOTTOM_NAVIGATION_DESTINATION_IDS = [
  'bots',
  'research',
  'skills',
  'infinity',
  'reality',
  'simulations',
  'quantum',
  'store',
  'story',
  'wiki',
  'offline-time',
  'statistics',
  'settings',
] as const

export type BottomNavigationDestinationId =
  (typeof BOTTOM_NAVIGATION_DESTINATION_IDS)[number]

/** Matches the bottom bar that shipped before full navigation customization. */
export const DEFAULT_BOTTOM_NAVIGATION_VISIBILITY = Object.freeze({
  bots: true,
  research: true,
  skills: true,
  infinity: true,
  reality: true,
  simulations: true,
  quantum: true,
  store: false,
  story: false,
  wiki: false,
  'offline-time': false,
  statistics: true,
  settings: true,
} satisfies Record<BottomNavigationDestinationId, boolean>)

export function isBottomNavigationDestinationId(
  value: string,
): value is BottomNavigationDestinationId {
  return (BOTTOM_NAVIGATION_DESTINATION_IDS as readonly string[]).includes(value)
}

export function normalizeBottomNavigationVisibility(
  value: unknown,
  legacy: Readonly<Record<'story' | 'wiki' | 'statistics', boolean>>,
): Readonly<Record<string, boolean>> {
  const normalized: Record<string, boolean> = {
    ...DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
    ...legacy,
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return normalized
  }
  for (const [id, visible] of Object.entries(value)) {
    if (typeof visible === 'boolean') normalized[id] = visible
  }
  return normalized
}
